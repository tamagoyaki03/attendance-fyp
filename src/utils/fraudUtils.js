import supabase from "../config/supabaseClient";

// Haversine distance in kilometers
function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function getSessionContext(sessionId) {
  const { data: session, error: sessionError } = await supabase
    .from("attendance_session")
    .select("id, course_lecture_id, course_tutorial_id, date, start_time, end_time")
    .eq("id", sessionId)
    .single();
  if (sessionError || !session) throw sessionError || new Error("Session not found");

  let classInfo = null;
  let classType = null;
  let courseCode = null;
  if (session.course_lecture_id) {
    classType = "lecture";
    const { data, error } = await supabase
      .from("course_lecture")
      .select("id, course_code, latitude, longitude, lecture_location")
      .eq("id", session.course_lecture_id)
      .single();
    if (error) throw error;
    classInfo = { lat: data?.latitude, lng: data?.longitude, location: data?.lecture_location };
    courseCode = data?.course_code || null;
  } else if (session.course_tutorial_id) {
    classType = "tutorial";
    const { data, error } = await supabase
      .from("course_tutorial")
      .select("id, course_code, latitude, longitude, tutorial_location")
      .eq("id", session.course_tutorial_id)
      .single();
    if (error) throw error;
    classInfo = { lat: data?.latitude, lng: data?.longitude, location: data?.tutorial_location };
    courseCode = data?.course_code || null;
  }

  // Build enrollment map for resolving user_id
  const enrollmentField = classType === "tutorial" ? "tutorial_enrollment_id" : "lecture_enrollment_id";

  const { data: records, error: recErr } = await supabase
    .from("attendance_record")
    .select(`${enrollmentField}`)
    .eq("session_id", sessionId);
  if (recErr) throw recErr;
  const enrollmentIds = Array.from(
    new Set((records || []).map((r) => r[enrollmentField]).filter(Boolean))
  );

  let enrollmentMap = {};
  if (enrollmentIds.length) {
    if (classType === "tutorial") {
      const { data: enrolls } = await supabase
        .from("enrollment_tutorial")
        .select("id, student_id")
        .in("id", enrollmentIds);
      (enrolls || []).forEach((e) => (enrollmentMap[e.id] = e.student_id));
    } else {
      const { data: enrolls } = await supabase
        .from("enrollment_lecture")
        .select("id, student_id")
        .in("id", enrollmentIds);
      (enrolls || []).forEach((e) => (enrollmentMap[e.id] = e.student_id));
    }
  }

  // Build session window
  const startIso = session.date && session.start_time ? `${session.date}T${session.start_time}` : null;
  const endIso = session.date && session.end_time ? `${session.date}T${session.end_time}` : null;
  const start = startIso ? new Date(startIso) : null;
  let end = endIso ? new Date(endIso) : null;
  if (start && !end) {
    // Fallback to 2-hour window if end_time missing
    end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  }

  return { classInfo, classType, courseCode, enrollmentMap, start, end };
}

async function upsertIssue({
  userId,
  sessionId,
  type,
  description,
  latitude,
  longitude,
  expectedLatitude,
  expectedLongitude,
  distanceKm,
  expectedTime,
  actualTime,
}) {
  // Prevent duplicates per user-session-type
  const { data: existing } = await supabase
    .from("fraud_detection_alerts")
    .select("id, status")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .eq("alert_type", type)
    .eq("status", "open")
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Keep as open if previously resolved
    return existing.id;
  }

  // Build insert object without course_code to avoid schema cache issues
  const insertData = {
    user_id: userId,
    session_id: sessionId,
    alert_type: type,
    description,
    status: "open",
  };
  
  // Add optional fields only if they have values
  if (latitude != null) insertData.latitude = latitude;
  if (longitude != null) insertData.longitude = longitude;
  if (expectedLatitude != null) insertData.expected_latitude = expectedLatitude;
  if (expectedLongitude != null) insertData.expected_longitude = expectedLongitude;
  if (distanceKm != null) insertData.distance_km = distanceKm;
  if (expectedTime) insertData.expected_time = expectedTime;
  if (actualTime) insertData.actual_time = actualTime;

  const { data, error } = await supabase
    .from("fraud_detection_alerts")
    .insert(insertData)
    .select("id")
    .single();

  if (error) {
    return null;
  }
  return data?.id || null;
}

async function analyzeRecord(sessionId, record, ctx, opts) {
  const issues = [];
  const { classInfo, enrollmentMap, start, end } = ctx;
  const { maxKm = 1.0, timeBufferMinutes = 5 } = opts || {};


  const created = record?.created_at ? new Date(record.created_at) : null;
  const reasons = [];

  const enrollmentKey = record.lecture_enrollment_id || record.tutorial_enrollment_id;
  let userId = enrollmentKey ? enrollmentMap?.[enrollmentKey] : undefined;
  

  // If userId not in map, look it up from the enrollment table
  if (!userId && enrollmentKey) {
    const isTutorial = record.tutorial_enrollment_id != null;
    const tableName = isTutorial ? "enrollment_tutorial" : "enrollment_lecture";
    const { data, error } = await supabase
      .from(tableName)
      .select("student_id")
      .eq("id", enrollmentKey)
      .single();
    
    if (!error && data) {
      userId = data.student_id;
    }
  }

  // If userId is still missing, we still flag the attendance record; fraud alerts will be skipped.

  // Location anomaly detection
  let distance = null;
  let hasLocationAnomaly = false;
  if (
    classInfo?.lat != null &&
    classInfo?.lng != null &&
    record?.latitude != null &&
    record?.longitude != null
  ) {
    distance = haversineKm(
      Number(classInfo.lat),
      Number(classInfo.lng),
      Number(record.latitude),
      Number(record.longitude)
    );
    if (distance > maxKm) {
      hasLocationAnomaly = true;
      issues.push({
        type: "Location Anomaly",
        description: `Check-in ${distance.toFixed(2)} km away from class location.`,
      });
      reasons.push(`Far from class: ${distance.toFixed(2)}km`);
    }
  }

  // Time anomaly detection
  let hasTimeAnomaly = false;
  let isEarly = false;
  if (start && end && created) {
    const early = new Date(start.getTime() - timeBufferMinutes * 60 * 1000);
    const late = new Date(end.getTime() + timeBufferMinutes * 60 * 1000);
    if (created < early || created > late) {
      isEarly = created < early;
      hasTimeAnomaly = true;
      issues.push({
        type: "Time Anomaly",
        description: `Check-in at ${created.toISOString()} outside session window (${start.toISOString()} - ${end.toISOString()}).`,
      });
      // Only show late check-ins, not early - and prevent duplicates
      if (!isEarly && !reasons.includes(`Late for Check In`)) {
        reasons.push(`Late for Check In`);
      }
    }
  }

  // Create single combined fraud alert if any anomaly detected
  if (userId && (hasLocationAnomaly || hasTimeAnomaly)) {
    const anomalyType = hasLocationAnomaly && hasTimeAnomaly ? "Combined Anomaly" : 
                       hasLocationAnomaly ? "Location Anomaly" : "Time Anomaly";
    
    // Use the same format as flag_reason: simple and readable
    let description = "";
    if (hasLocationAnomaly && hasTimeAnomaly) {
      description = `Far from class: ${distance.toFixed(2)}km\nLate for Check In`;
    } else if (hasLocationAnomaly) {
      description = `Far from class: ${distance.toFixed(2)}km`;
    } else if (hasTimeAnomaly) {
      description = isEarly ? `Early Check In` : `Late for Check In`;
    }
    
    const severity = (distance && distance > 5) || (isEarly && created < start) ? "high" : 
                    (distance && distance > 2) ? "medium" : "low";
    
    await upsertIssue({
      userId,
      sessionId,
      type: anomalyType,
      description,
      latitude: hasLocationAnomaly ? Number(record.latitude) : null,
      longitude: hasLocationAnomaly ? Number(record.longitude) : null,
      expectedLatitude: hasLocationAnomaly ? Number(classInfo.lat) : null,
      expectedLongitude: hasLocationAnomaly ? Number(classInfo.lng) : null,
      distanceKm: distance,
      expectedTime: hasTimeAnomaly ? start : null,
      actualTime: record.created_at,
      severity,
    });
  }

  // Flag the attendance record in-place when any anomaly occurs
  
  if (reasons.length && record?.id) {
    const reasonText = reasons.join("\n");
    try {
      await supabase
        .from("attendance_record")
        .update({ status: "flagged", flag_reason: reasonText })
        .eq("id", record.id);
    } catch {
      // Error handled silently
    }
  }
  

  return issues;
}

// Start realtime monitoring for a session: analyze new attendance_record inserts
export async function startFraudMonitoring(sessionId, options = {}) {
  try {
    const ctx = await getSessionContext(sessionId);

    // Analyze existing records once (in case some inserted before monitor starts)
    const { data: existing } = await supabase
      .from("attendance_record")
      .select("id, session_id, created_at, latitude, longitude, status, lecture_enrollment_id, tutorial_enrollment_id")
      .eq("session_id", sessionId);
    
    
    for (const rec of existing || []) {
      await analyzeRecord(sessionId, rec, ctx, options);
    }

    const channel = supabase
      .channel(`fraud-monitor-${sessionId}`)
      .on(
        'postgres_changes',
        { 
          event: 'INSERT', 
          schema: 'public', 
          table: 'attendance_record', 
          filter: `session_id=eq.${sessionId}` 
        },
        async (payload) => {
          const rec = payload.new;
          await analyzeRecord(sessionId, rec, ctx, options);
        }
      )
      .subscribe(() => {
        // Subscription status handled silently
      });

    return channel;
  } catch {
    return null;
  }
}

export async function stopFraudMonitoring(channel) {
  if (!channel) return;
  try {
    await supabase.removeChannel(channel);
  } catch {
    // Error handled silently
  }
}
