# Fraud Detection & Alerts System — Detailed Technical Documentation

## 🎯 System Overview

The Fraud Detection System is a **real-time anomaly detection engine** that monitors attendance submissions for suspicious patterns. It automatically flags check-ins that violate location or time constraints, enabling lecturers and admins to investigate and resolve potential fraud cases.

**Complexity Rating**: **HIGH**

---

## 📊 Architecture Components

### 1. **Database Layer** (PostgreSQL + Supabase)

#### **Table: `fraud_detection_settings`**
**Purpose**: Centralized admin-configurable thresholds for fraud detection rules.

```sql
CREATE TABLE fraud_detection_settings (
  id SERIAL PRIMARY KEY,
  max_distance_km DECIMAL(4,2) DEFAULT 1.00,    -- Max allowed distance from class
  time_buffer_minutes INTEGER DEFAULT 5,         -- Grace period before/after session
  updated_at TIMESTAMPTZ DEFAULT NOW()
);
```

**Key Features**:
- ✅ Single-row configuration (admin updates via UI)
- ✅ Row-Level Security (RLS): Only admins can UPDATE
- ✅ All users can SELECT (lecturers read settings during session start)

**Example Data**:
```
id | max_distance_km | time_buffer_minutes | updated_at
---+-----------------+---------------------+-------------------------
1  | 1.00            | 5                   | 2026-01-11 14:30:00+08
```

---

#### **Table: `fraud_detection_alerts`**
**Purpose**: Stores detected anomalies with full audit trail and resolution workflow.

```sql
CREATE TABLE fraud_detection_alerts (
  id UUID PRIMARY KEY,
  user_id UUID REFERENCES users(id),              -- Student flagged
  session_id UUID REFERENCES attendance_session(id),
  course_code VARCHAR(50),                        -- E.g., "CS1101"
  alert_type VARCHAR(50),                         -- "Location Anomaly" | "Time Anomaly"
  description TEXT,                               -- Human-readable explanation
  
  -- Location anomaly data
  latitude DECIMAL(10,8),                         -- Student's check-in location
  longitude DECIMAL(11,8),
  expected_latitude DECIMAL(10,8),                -- Class location
  expected_longitude DECIMAL(11,8),
  distance_km DECIMAL(10,2),                      -- Calculated distance
  
  -- Time anomaly data
  expected_time TIMESTAMPTZ,                      -- Session start/end time
  actual_time TIMESTAMPTZ,                        -- Student's check-in time
  
  -- Workflow management
  severity VARCHAR(20) DEFAULT 'medium',          -- low | medium | high
  status VARCHAR(20) DEFAULT 'open',              -- open | reviewed | resolved
  resolution_notes TEXT,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  resolved_at TIMESTAMPTZ
);
```

**Severity Levels**:
- **HIGH**: Distance > 5 km OR check-in before session start time
- **MEDIUM**: Distance 2-5 km OR check-in outside buffer window
- **LOW**: Distance 1-2 km (within threshold but flagged)

**Alert Lifecycle**:
```
open → reviewed → resolved
  ↓       ↓          ↓
Create  Investigate  Take Action
        (Email)     (Update attendance status)
```

**RLS Policies** (6 total):
1. ✅ Admins: Full SELECT/INSERT/UPDATE access
2. ✅ Lecturers: SELECT/UPDATE for their own sessions only
3. ✅ System: INSERT allowed (for automated detection)
4. ❌ Students: No access to fraud_detection_alerts table

**Indexes for Performance**:
```sql
CREATE INDEX fraud_detection_alerts_user_id_idx ON fraud_detection_alerts(user_id);
CREATE INDEX fraud_detection_alerts_session_id_idx ON fraud_detection_alerts(session_id);
CREATE INDEX fraud_detection_alerts_status_idx ON fraud_detection_alerts(status);
CREATE INDEX fraud_detection_alerts_created_at_idx ON fraud_detection_alerts(created_at DESC);
```

---

### 2. **Detection Engine** (`fraudUtils.js`)

#### **Core Algorithm: Haversine Distance**
Calculates geographic distance between two points on Earth's surface.

```javascript
function haversineKm(lat1, lon1, lat2, lon2) {
  const R = 6371; // Earth radius in km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a = Math.sin(dLat/2) ** 2 + 
            Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * 
            Math.sin(dLon/2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c; // Distance in kilometers
}
```

**Example**:
- Class Location: `3.1390° N, 101.6869° E` (Kuala Lumpur)
- Student Check-in: `3.1490° N, 101.6869° E`
- Distance: **1.11 km** → **FLAGGED** (exceeds 1.0 km threshold)

---

#### **Real-Time Monitoring Pipeline**

**Step 1: Session Context Retrieval** (`getSessionContext`)
```javascript
async function getSessionContext(sessionId) {
  // 1. Fetch session details (start_time, end_time, date)
  const session = await fetchSession(sessionId);
  
  // 2. Determine class type (lecture vs tutorial)
  const classType = session.course_lecture_id ? "lecture" : "tutorial";
  
  // 3. Fetch class location (latitude, longitude) from course_lecture/course_tutorial
  const classInfo = await fetchClassLocation(classType, classId);
  
  // 4. Build enrollment map (enrollment_id → student_id)
  const enrollmentMap = await buildEnrollmentMap(sessionId, classType);
  
  // 5. Calculate session time window
  const start = new Date(`${session.date}T${session.start_time}`);
  const end = new Date(`${session.date}T${session.end_time}`);
  
  return { classInfo, classType, courseCode, enrollmentMap, start, end };
}
```

**Step 2: Real-Time Subscription** (`startFraudMonitoring`)
```javascript
export async function startFraudMonitoring(sessionId, options = {}) {
  const ctx = await getSessionContext(sessionId);
  
  // Analyze existing records (catch records inserted before monitoring started)
  const existingRecords = await fetchAttendanceRecords(sessionId);
  for (const record of existingRecords) {
    await analyzeRecord(sessionId, record, ctx, options);
  }
  
  // Subscribe to real-time INSERT events
  const channel = supabase
    .channel(`fraud-monitor-${sessionId}`)
    .on('postgres_changes', {
      event: 'INSERT',
      schema: 'public',
      table: 'attendance_record',
      filter: `session_id=eq.${sessionId}`
    }, async (payload) => {
      const newRecord = payload.new;
      await analyzeRecord(sessionId, newRecord, ctx, options);
    })
    .subscribe();
  
  return channel; // Stored in AttendanceSession.jsx for cleanup
}
```

**Trigger**: Runs when lecturer clicks "Start Attendance" in [`AttendanceSession.jsx`](../src/components/Event/AttendanceSession.jsx#L259-L270)

---

#### **Step 3: Anomaly Detection** (`analyzeRecord`)

**Location Anomaly Detection**:
```javascript
// Check if student check-in is too far from class location
if (classInfo?.lat && classInfo?.lng && record?.latitude && record?.longitude) {
  const distance = haversineKm(
    classInfo.lat, classInfo.lng,
    record.latitude, record.longitude
  );
  
  if (distance > maxKm) { // maxKm from fraud_detection_settings
    const severity = distance > 5 ? "high" : distance > 2 ? "medium" : "low";
    
    await upsertIssue({
      userId: student.id,
      sessionId,
      type: "Location Anomaly",
      description: `Check-in ${distance.toFixed(2)} km away from class location (max ${maxKm} km).`,
      latitude: record.latitude,
      longitude: record.longitude,
      expectedLatitude: classInfo.lat,
      expectedLongitude: classInfo.lng,
      distanceKm: distance,
      severity
    });
  }
}
```

**Time Anomaly Detection**:
```javascript
// Check if check-in is outside session time window + buffer
if (start && end && record?.created_at) {
  const checkInTime = new Date(record.created_at);
  const earlyLimit = new Date(start.getTime() - timeBufferMinutes * 60 * 1000);
  const lateLimit = new Date(end.getTime() + timeBufferMinutes * 60 * 1000);
  
  if (checkInTime < earlyLimit || checkInTime > lateLimit) {
    const isEarly = checkInTime < earlyLimit;
    const severity = isEarly && checkInTime < start ? "high" : "medium";
    
    await upsertIssue({
      userId: student.id,
      sessionId,
      type: "Time Anomaly",
      description: `Check-in at ${checkInTime.toISOString()} outside session window.`,
      expectedTime: start,
      actualTime: record.created_at,
      severity
    });
  }
}
```

**Deduplication Logic** (`upsertIssue`):
```javascript
// Prevent duplicate alerts for same user + session + type
const { data: existing } = await supabase
  .from("fraud_detection_alerts")
  .select("id")
  .eq("user_id", userId)
  .eq("session_id", sessionId)
  .eq("alert_type", type)
  .eq("status", "open")
  .maybeSingle();

if (existing) return existing.id; // Don't create duplicate alert

// Otherwise, insert new alert
await supabase.from("fraud_detection_alerts").insert({ ... });
```

---

### 3. **Admin Configuration UI** (`FraudDetection.jsx`)

**Page**: [/src/pages/FraudDetection.jsx](../src/pages/FraudDetection.jsx)

**Features**:
1. **Location Analysis Card**
   - Input: Max Distance (0.1 - 5.0 km, step 0.1)
   - Default: 1.0 km
   - Description: "Compare student check-in vs class location"

2. **Time Analysis Card**
   - Input: Late Buffer (1 - 30 minutes, step 1)
   - Default: 5 minutes
   - Description: "Check for suspicious timestamps"

3. **Update Settings Button**
   - Only visible/enabled for admins
   - Updates `fraud_detection_settings` table
   - Snackbar confirmation: "Settings updated successfully!"

**Access Control**:
```javascript
useEffect(() => {
  const fetchRole = async () => {
    const user = await supabase.auth.getUser();
    const { data } = await supabase
      .from("users")
      .select("role")
      .eq("id", user.id)
      .single();
    setIsAdmin(data?.role === "admin");
  };
  fetchRole();
}, []);

// Button disabled if !isAdmin
<Button disabled={!isAdmin || loading} onClick={handleUpdateSettings}>
  Update Settings
</Button>
```

---

### 4. **Alert Management UI** (`FraudTable.jsx`)

**Page**: Embedded in [FraudDetection.jsx](../src/pages/FraudDetection.jsx#L196)

**Table Columns**:
| Column | Data | Example |
|--------|------|---------|
| Student | Name + Matric No. | "Tan Ah Kow (U2103456X)" |
| Course Code | From session | "CS1101" |
| Date & Time | Alert created_at | "Jan 10, 2026 14:35" |
| Details | Alert description | "Check-in 2.34 km away..." |
| Status | Chip (open/reviewed/resolved) | 🔴 Open |
| Actions | View Details button | → Opens dialog |

**Workflow Actions** (in Details Dialog):
1. **Resolve Alert** (`handleResolve`)
   ```javascript
   await supabase
     .from("fraud_detection_alerts")
     .update({ 
       status: "resolved", 
       resolved_at: new Date(),
       resolution_notes: notes 
     })
     .eq("id", alertId);
   ```

2. **Update Attendance Status** (`handleUpdateAttendance`)
   ```javascript
   // Options: "present", "absent", "excused"
   await supabase
     .from("attendance_record")
     .update({ status: newStatus })
     .eq("id", alert.attendance_record.id);
   ```

3. **Email Student** (`handleEmailStudent`)
   ```javascript
   await supabase.functions.invoke('send-absence-email', {
     body: {
       emails: [{
         to: student.email,
         subject: `Attendance Alert - ${courseCode}`,
         html: `Your attendance for ${courseCode} has been flagged...`
       }]
     }
   });
   ```

**Details Dialog Tabs**:
- **Tab 1: Alert Details**
  - Student info (name, matric no., email)
  - Course code
  - Alert type + severity
  - Description
  - Timestamp
  - Status badge

- **Tab 2: Location Analysis** (if location anomaly)
  - **Map View** (if available)
  - Student check-in: `(lat, lng)` → Pin on map
  - Class location: `(lat, lng)` → Pin on map
  - Distance: `X.XX km` (color-coded: red if > threshold)
  - Visual: "2.34 km away from class location"

- **Tab 3: Time Analysis** (if time anomaly)
  - Session window: `9:00 AM - 11:00 AM`
  - Check-in time: `8:45 AM` → "15 minutes early"
  - Buffer window: `±5 minutes`
  - Visual: Timeline chart showing check-in vs session boundaries

---

### 5. **Visualization Components**

#### **FraudDetectionChart.jsx** (Time Series)
**Chart Type**: Area Chart (Recharts library)

**Data**: Daily fraud alert counts over time range (7/30/90 days, 1 year)

```javascript
const chartData = [
  { date: "Jan 1", attempts: 3 },
  { date: "Jan 2", attempts: 0 },
  { date: "Jan 3", attempts: 5 },
  { date: "Jan 4", attempts: 2 },
  // ...
];
```

**SQL Query**:
```javascript
const { data } = await supabase
  .from('fraud_detection_alerts')
  .select('created_at')
  .gte('created_at', startDate)
  .lte('created_at', endDate);

// Group by date and count
const attemptsByDate = data.reduce((acc, alert) => {
  const dateStr = format(alert.created_at, 'MMM d');
  acc[dateStr] = (acc[dateStr] || 0) + 1;
  return acc;
}, {});
```

**Visual**: Red area chart showing fraud trends over time.

---

#### **FlaggedAttendanceList.jsx** (Session-Specific)
**Purpose**: Show flagged students for a specific attendance session (used in AttendanceManagement.jsx)

**Features**:
- Distance calculation (Haversine)
- Location analysis per student
- Quick "Mark Present" override
- Details dialog with map (if available)

**Integration**:
```jsx
<FlaggedAttendanceList
  students={flaggedStudents}
  session={currentSession}
  sessionInfo={{ class_latitude: 3.139, class_longitude: 101.687 }}
  onRefresh={fetchTodayAttendanceData}
/>
```

---

## 🔄 Complete Data Flow Example

### Scenario: Student Scans QR Code 3 km Away from Class

```
┌─────────────────────────────────────────────────────────────────┐
│ 1. LECTURER STARTS SESSION                                      │
│    - AttendanceSession.jsx opens                                 │
│    - Generates QR: "course|123|uuid-pw|session-id"              │
│    - Calls startFraudMonitoring(sessionId, {maxKm: 1.0, ...})   │
│    - Subscribes to postgres_changes channel                      │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 2. STUDENT SCANS QR CODE                                         │
│    - Student app parses QR data                                  │
│    - Gets geolocation: lat=3.169, lng=101.687                   │
│    - Submits attendance: INSERT INTO attendance_record          │
│      (session_id, lecture_enrollment_id, latitude, longitude)   │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 3. POSTGRES TRIGGERS REALTIME EVENT                              │
│    - Supabase Realtime detects INSERT on attendance_record      │
│    - Broadcasts to channel "fraud-monitor-{sessionId}"          │
│    - Payload: { new: { id, session_id, lat, lng, ... } }       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 4. FRAUD DETECTION ANALYZES RECORD                               │
│    - fraudUtils.analyzeRecord() called                           │
│    - Fetches class location: (3.139, 101.687)                   │
│    - Calculates distance:                                        │
│      haversineKm(3.139, 101.687, 3.169, 101.687) = 3.33 km     │
│    - Threshold: 1.0 km                                           │
│    - 3.33 > 1.0 → LOCATION ANOMALY DETECTED                     │
│    - Severity: "medium" (2 < 3.33 < 5)                          │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 5. ALERT CREATED IN DATABASE                                     │
│    INSERT INTO fraud_detection_alerts (                          │
│      user_id: student-uuid,                                      │
│      session_id: session-uuid,                                   │
│      alert_type: "Location Anomaly",                             │
│      description: "Check-in 3.33 km away...",                    │
│      latitude: 3.169,                                            │
│      longitude: 101.687,                                         │
│      expected_latitude: 3.139,                                   │
│      expected_longitude: 101.687,                                │
│      distance_km: 3.33,                                          │
│      severity: "medium",                                         │
│      status: "open"                                              │
│    )                                                             │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 6. LECTURER VIEWS ALERT (FraudDetection.jsx)                    │
│    - FraudTable queries fraud_detection_alerts                   │
│    - Shows: "Tan Ah Kow | CS1101 | 3.33 km away | 🔴 Open"     │
│    - Clicks "View Details"                                       │
└─────────────────────────────────────────────────────────────────┘
                              ↓
┌─────────────────────────────────────────────────────────────────┐
│ 7. LECTURER INVESTIGATES & RESOLVES                              │
│    - Views location map (if available)                           │
│    - Student location: 3.33 km from class                        │
│    - Actions taken:                                              │
│      1. Sends email to student                                   │
│      2. Updates attendance status to "absent"                    │
│      3. Adds resolution notes: "Confirmed not at class location" │
│      4. Marks alert as "resolved"                                │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🛡️ Security Features

### 1. **Row-Level Security (RLS)**
- ✅ Only admins/lecturers can view fraud alerts
- ✅ Students cannot see fraud_detection_alerts table
- ✅ Lecturers only see alerts for their own sessions
- ✅ Service role can insert alerts (for automated detection)

### 2. **Deduplication**
- ✅ Prevents multiple alerts for same user + session + type
- ✅ Only creates new alert if status != "open"
- ✅ Avoids spam if student submits multiple times

### 3. **Audit Trail**
- ✅ `created_at`: When alert was generated
- ✅ `updated_at`: When status last changed
- ✅ `resolved_at`: When marked resolved
- ✅ `resolution_notes`: Lecturer's investigation notes

### 4. **Real-Time Performance**
- ✅ Postgres indexes on user_id, session_id, status, created_at
- ✅ Realtime subscription only for active sessions
- ✅ Channel cleanup when dialog closes (`stopFraudMonitoring`)

---

## 📈 Why This System is HIGH Complexity

### Technical Challenges Solved:

1. **Geospatial Calculations**
   - Haversine formula for accurate distance on Earth's curved surface
   - Handles latitude/longitude precision (8 decimal places)
   - Accounts for different coordinate systems

2. **Real-Time Streaming**
   - Supabase Postgres Changes (websocket-based)
   - Channel management (subscribe/unsubscribe)
   - Concurrent monitoring of multiple sessions

3. **State Management**
   - Session context caching (class location, enrollment map)
   - Alert deduplication logic
   - Multi-tab dialog state (location/time analysis)

4. **Database Design**
   - Separate settings table (admin-controlled thresholds)
   - Alert table with foreign keys + cascades
   - RLS policies for multi-role access control
   - Performance indexes for query optimization

5. **User Workflows**
   - Multi-step alert resolution (review → resolve)
   - Email integration (send-absence-email Edge Function)
   - Attendance status override (present/absent/excused)
   - Resolution notes + timestamp tracking

6. **Visualization**
   - Time series chart (fraud trends over time)
   - Map integration (student vs class location)
   - Distance color-coding (green/yellow/red)
   - Severity badges (low/medium/high)

---

## 🚀 Proof of Implementation

### File Evidence:
| Component | File | Lines | Purpose |
|-----------|------|-------|---------|
| Detection Engine | `fraudUtils.js` | 1-266 | Haversine, real-time monitoring, analyzeRecord |
| Admin Settings | `FraudDetection.jsx` | 1-225 | Configure thresholds (distance, time buffer) |
| Alert Table | `FraudTable.jsx` | 1-620 | View alerts, resolve, email, update attendance |
| Chart | `FraudDetectionChart.jsx` | 1-125 | Time series of fraud attempts |
| Flagged List | `FlaggedAttendanceList.jsx` | 1-456 | Session-specific flagged students |
| DB Schema | `20251220_create_fraud_detection_alerts_table.sql` | 1-163 | Alert table + RLS policies |
| DB Settings | `20251220_create_fraud_detection_settings_table.sql` | 1-15 | Settings table + RLS |
| Integration | `AttendanceSession.jsx` | 259-270 | Start monitoring on session start |

---

## 📝 Summary

The Fraud Detection System is a **comprehensive, enterprise-grade solution** for identifying suspicious attendance submissions. It combines:

✅ **Geospatial Analysis** (Haversine distance calculations)  
✅ **Temporal Analysis** (time window + buffer validation)  
✅ **Real-Time Monitoring** (Postgres Changes subscription)  
✅ **Admin-Configurable Rules** (max_distance_km, time_buffer_minutes)  
✅ **Multi-Role Workflows** (admin/lecturer resolution process)  
✅ **Audit Trail** (full lifecycle tracking)  
✅ **Security** (RLS policies, deduplication, role-based access)  
✅ **Visualization** (charts, maps, severity indicators)  

This system ensures **academic integrity** while providing lecturers with the tools to investigate and resolve fraud cases efficiently.
