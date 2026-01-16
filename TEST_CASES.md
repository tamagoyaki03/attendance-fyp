# Unit Testing Test Cases Documentation

## Table of Contents
1. [Utility Functions Tests](#utility-functions-tests)
2. [Component Tests](#component-tests)
3. [Page Tests](#page-tests)
4. [Integration Tests](#integration-tests)

---

## Utility Functions Tests

### 1. Storage Utils Tests (`storageUtils.js`)

#### Test Suite: getStoredUser()
- **TC-SU-001**: Should return user object from localStorage when available
  - Setup: Store valid user JSON in localStorage
  - Execute: Call getStoredUser()
  - Expected: Returns parsed user object with correct properties
  
- **TC-SU-002**: Should return user object from sessionStorage when localStorage is empty
  - Setup: Clear localStorage, store user in sessionStorage
  - Execute: Call getStoredUser()
  - Expected: Returns parsed user object from sessionStorage

- **TC-SU-003**: Should return null when neither storage contains user data
  - Setup: Clear both localStorage and sessionStorage
  - Execute: Call getStoredUser()
  - Expected: Returns null

- **TC-SU-004**: Should prioritize localStorage over sessionStorage
  - Setup: Store different users in both storages
  - Execute: Call getStoredUser()
  - Expected: Returns user from localStorage, not sessionStorage

- **TC-SU-005**: Should handle malformed JSON gracefully
  - Setup: Store invalid JSON string in localStorage
  - Execute: Call getStoredUser()
  - Expected: Throws JSON parsing error

#### Test Suite: clearStoredUser()
- **TC-SU-006**: Should remove user from localStorage
  - Setup: Store user in localStorage
  - Execute: Call clearStoredUser()
  - Expected: localStorage.removeItem called with 'user' key

- **TC-SU-007**: Should remove user from sessionStorage
  - Setup: Store user in sessionStorage
  - Execute: Call clearStoredUser()
  - Expected: sessionStorage.removeItem called with 'user' key

- **TC-SU-008**: Should clear both storages simultaneously
  - Setup: Store user in both storages
  - Execute: Call clearStoredUser()
  - Expected: Both removeItem methods called

#### Test Suite: getStoredUserString()
- **TC-SU-009**: Should return raw user string from localStorage
  - Setup: Store JSON string in localStorage
  - Execute: Call getStoredUserString()
  - Expected: Returns exact string from localStorage

- **TC-SU-010**: Should return empty object string if no data exists
  - Setup: Clear both storages
  - Execute: Call getStoredUserString()
  - Expected: Returns '{}' as fallback

---

### 2. Attendance Utils Tests (`attendanceUtils.js`)

#### Test Suite: calculateAttendanceRate()
- **TC-AU-001**: Should calculate correct attendance rate for lecture
  - Setup: Create test data with 50 enrolled students, 100 sessions, 4000 present records
  - Execute: Call calculateAttendanceRate(classId, 'Lecture')
  - Expected: Returns attendanceRate of 80%, totalStudents: 50, totalSessions: 100

- **TC-AU-002**: Should return 0 attendance rate when no sessions exist
  - Setup: Class with enrollments but no sessions
  - Execute: Call calculateAttendanceRate(classId, 'Lecture')
  - Expected: Returns {attendanceRate: 0, totalStudents: 50, totalSessions: 0}

- **TC-AU-003**: Should return 0 when no students enrolled
  - Setup: Class with sessions but no enrollments
  - Execute: Call calculateAttendanceRate(classId, 'Lecture')
  - Expected: Returns {attendanceRate: 0, totalStudents: 0, totalSessions: 0}

- **TC-AU-004**: Should calculate tutorial attendance rate
  - Setup: Create tutorial class data
  - Execute: Call calculateAttendanceRate(classId, 'Tutorial')
  - Expected: Returns correct tutorial attendance stats

- **TC-AU-005**: Should handle database errors gracefully
  - Setup: Mock Supabase error response
  - Execute: Call calculateAttendanceRate(classId, 'Lecture')
  - Expected: Returns {attendanceRate: 0, totalStudents: 0, totalSessions: 0}

#### Test Suite: getDetailedAttendanceStats()
- **TC-AU-006**: Should return detailed breakdown with student list
  - Setup: Create enrollments with user data
  - Execute: Call getDetailedAttendanceStats(classId, 'Lecture')
  - Expected: Returns array of students with names, emails, and attendance status

- **TC-AU-007**: Should categorize attendance as present, absent, late
  - Setup: Create mixed attendance records
  - Execute: Call getDetailedAttendanceStats(classId, 'Lecture')
  - Expected: Correct counts for presentCount, absentCount, lateCount

- **TC-AU-008**: Should calculate overall attendance rate percentage
  - Setup: 80 present out of 100 possible attendances
  - Execute: Call getDetailedAttendanceStats(classId, 'Lecture')
  - Expected: attendanceRate equals 80

---

### 3. Fraud Utils Tests (`fraudUtils.js`)

#### Test Suite: Haversine Distance Calculation
- **TC-FU-001**: Should calculate correct distance between two coordinates
  - Setup: London coordinates (51.5074, -0.1278) and Paris (48.8566, 2.3522)
  - Execute: Call haversineKm(51.5074, -0.1278, 48.8566, 2.3522)
  - Expected: Distance approximately 340 km

- **TC-FU-002**: Should return 0 for same coordinates
  - Setup: Same latitude and longitude
  - Execute: Call haversineKm(lat, lon, lat, lon)
  - Expected: Returns 0 km

- **TC-FU-003**: Should calculate distance with equator crossing
  - Setup: Coordinates from north and south hemispheres
  - Execute: Call haversineKm with opposite coordinates
  - Expected: Correct positive distance value

#### Test Suite: getSessionContext()
- **TC-FU-004**: Should fetch session details including location
  - Setup: Create session with lecture reference
  - Execute: Call getSessionContext(sessionId)
  - Expected: Returns classInfo with latitude, longitude, location

- **TC-FU-005**: Should resolve tutorial session context
  - Setup: Create tutorial session
  - Execute: Call getSessionContext(sessionId)
  - Expected: Returns tutorial classInfo and enrollment map

- **TC-FU-006**: Should return null if session not found
  - Setup: Invalid session ID
  - Execute: Call getSessionContext(invalidId)
  - Expected: Throws error "Session not found"

- **TC-FU-007**: Should build session time window correctly
  - Setup: Session with start and end times
  - Execute: Call getSessionContext(sessionId)
  - Expected: Returns start and end Date objects with 2-hour fallback if no end time

#### Test Suite: Fraud Detection Flags
- **TC-FU-008**: Should detect location fraud when distance exceeds threshold
  - Setup: Attendance marked 50km from expected location
  - Execute: Trigger fraud detection with location check
  - Expected: Creates fraud alert with location_fraud flag

- **TC-FU-009**: Should detect impossible travel (multiple locations in short time)
  - Setup: Two attendance records 500km apart within 30 minutes
  - Execute: Trigger fraud detection
  - Expected: Creates fraud alert with travel_fraud flag

- **TC-FU-010**: Should detect duplicate check-in at same session
  - Setup: Same student marked present twice for one session
  - Execute: Trigger fraud detection
  - Expected: Creates fraud alert with duplicate_flag

---

### 4. Geolocation Utils Tests (`geolocationUtils.js`)

#### Test Suite: getCurrentLocation()
- **TC-GU-001**: Should return current position when granted permission
  - Setup: Mock navigator.geolocation success
  - Execute: Call getCurrentLocation()
  - Expected: Returns {latitude, longitude, accuracy}

- **TC-GU-002**: Should reject when geolocation is not supported
  - Setup: Mock navigator.geolocation as undefined
  - Execute: Call getCurrentLocation()
  - Expected: Rejects with "Geolocation is not supported"

- **TC-GU-003**: Should handle user denying permission
  - Setup: Mock geolocation with PERMISSION_DENIED error
  - Execute: Call getCurrentLocation()
  - Expected: Rejects with "User denied the request"

- **TC-GU-004**: Should handle location timeout
  - Setup: Mock geolocation with TIMEOUT error
  - Execute: Call getCurrentLocation()
  - Expected: Rejects with "request to get user location timed out"

- **TC-GU-005**: Should handle unavailable location
  - Setup: Mock geolocation with POSITION_UNAVAILABLE error
  - Execute: Call getCurrentLocation()
  - Expected: Rejects with "Location information is unavailable"

#### Test Suite: geocodeAddress()
- **TC-GU-006**: Should successfully geocode a valid address
  - Setup: Mock OpenStreetMap API response for "London, UK"
  - Execute: Call geocodeAddress("London, UK")
  - Expected: Returns {latitude, longitude, display_name}

- **TC-GU-007**: Should handle address not found
  - Setup: Mock API returning empty array
  - Execute: Call geocodeAddress("InvalidPlace123456")
  - Expected: Throws error "Location not found"

- **TC-GU-008**: Should handle network errors
  - Setup: Mock fetch rejection
  - Execute: Call geocodeAddress("address")
  - Expected: Throws network error

- **TC-GU-009**: Should encode address properly
  - Setup: Address with special characters "Street & Lane"
  - Execute: Call geocodeAddress("Street & Lane")
  - Expected: URL encodes the address properly

---

### 5. Analytics Utils Tests (`analyticsUtils.js`)

#### Test Suite: calculateAttendanceMetrics()
- **TC-AN-001**: Should calculate total possible attendance across all courses
  - Setup: 2 lecture courses with 30 students and 10 sessions, 2 tutorial courses with 20 students and 8 sessions
  - Execute: Call calculateAttendanceMetrics('2024-01-01', '2024-12-31')
  - Expected: totalPossible = (30*10) + (30*10) + (20*8) + (20*8) = 1120

- **TC-AN-002**: Should count present records correctly
  - Setup: 900 attendance records with status 'present'
  - Execute: Call calculateAttendanceMetrics(startDate, endDate)
  - Expected: presentCount = 900

- **TC-AN-003**: Should filter by date range correctly
  - Setup: Sessions in January and sessions in June
  - Execute: Call calculateAttendanceMetrics('2024-01-01', '2024-01-31')
  - Expected: Only counts January sessions

- **TC-AN-004**: Should handle date range with no data
  - Setup: Query range with no sessions or attendance records
  - Execute: Call calculateAttendanceMetrics('2024-01-01', '2024-01-02')
  - Expected: Returns {totalPossible: 0, presentCount: 0, lateCount: 0, absentCount: 0}

---

## Component Tests

### 1. Button Component Tests

#### Test Suite: Button Rendering
- **TC-BC-001**: Should render with default props
  - Setup: Render Button with text "Click me"
  - Execute: Check rendered output
  - Expected: Button with primary variant and medium size

- **TC-BC-002**: Should apply variant styles correctly
  - Setup: Render Button with variant="secondary"
  - Execute: Check className
  - Expected: Contains secondary variant classes

- **TC-BC-003**: Should apply size styles correctly
  - Setup: Render Button with size="large"
  - Execute: Check className
  - Expected: Contains large size classes (h-[48px], px-6, py-3)

- **TC-BC-004**: Should disable button when disabled prop is true
  - Setup: Render Button with disabled={true}
  - Execute: Check disabled attribute
  - Expected: Button has disabled attribute and cursor-not-allowed class

#### Test Suite: Button Interactions
- **TC-BC-005**: Should call onClick handler when clicked
  - Setup: Render Button with onClick mock
  - Execute: Click button
  - Expected: onClick handler called once

- **TC-BC-006**: Should not call onClick when disabled
  - Setup: Render disabled Button with onClick mock
  - Execute: Click button
  - Expected: onClick handler not called

- **TC-BC-007**: Should handle non-function onClick prop
  - Setup: Render Button with onClick={null}
  - Execute: Click button
  - Expected: No error thrown

---

### 2. Dropdown Component Tests

#### Test Suite: Dropdown Rendering
- **TC-DC-001**: Should render with default placeholder
  - Setup: Render Dropdown with no value
  - Execute: Check rendered text
  - Expected: Shows "Select an option"

- **TC-DC-002**: Should display selected option
  - Setup: Render Dropdown with value="option1", options array
  - Execute: Check displayed text
  - Expected: Shows selected option label

- **TC-DC-003**: Should apply disabled styling
  - Setup: Render Dropdown with disabled={true}
  - Execute: Check classes
  - Expected: Has cursor-not-allowed and opacity-50

#### Test Suite: Dropdown Interactions
- **TC-DC-004**: Should open dropdown on click
  - Setup: Render Dropdown
  - Execute: Click dropdown
  - Expected: Dropdown menu appears (isOpen = true)

- **TC-DC-005**: Should close dropdown when option selected
  - Setup: Render open dropdown
  - Execute: Click on option
  - Expected: Dropdown closes and onChange called

- **TC-DC-006**: Should call onChange with selected value
  - Setup: Render Dropdown with onChange mock
  - Execute: Click option with value="test"
  - Expected: onChange called with option object

- **TC-DC-007**: Should close on outside click
  - Setup: Render Dropdown and click outside
  - Execute: Click outside dropdown ref
  - Expected: Dropdown closes

- **TC-DC-008**: Should not open when disabled
  - Setup: Render disabled Dropdown
  - Execute: Click dropdown
  - Expected: Dropdown remains closed

---

### 3. ProtectedRoute Component Tests

#### Test Suite: Authentication Guard
- **TC-PR-001**: Should render protected component when user is authenticated
  - Setup: ProtectedRoute with auth user
  - Execute: Render component
  - Expected: Protected page content displays

- **TC-PR-002**: Should redirect to login when user not authenticated
  - Setup: ProtectedRoute with no auth user
  - Execute: Render component
  - Expected: Redirects to /login page

- **TC-PR-003**: Should render nothing while checking auth status
  - Setup: ProtectedRoute during auth loading
  - Execute: Render component
  - Expected: Shows loading state or nothing

---

### 4. AttendanceStats Component Tests

#### Test Suite: Stats Display
- **TC-AS-001**: Should display attendance rate percentage
  - Setup: Render with attendanceRate=85.5
  - Execute: Check rendered text
  - Expected: Shows "85.5%"

- **TC-AS-002**: Should display total students count
  - Setup: Render with totalStudents=150
  - Execute: Check rendered text
  - Expected: Shows "150 students"

- **TC-AS-003**: Should display session count
  - Setup: Render with totalSessions=20
  - Execute: Check rendered text
  - Expected: Shows "20 sessions"

#### Test Suite: Stats Calculation
- **TC-AS-004**: Should calculate and display present percentage
  - Setup: 100 present out of 200 possible
  - Execute: Render component
  - Expected: Shows 50% present rate

- **TC-AS-005**: Should handle zero attendance gracefully
  - Setup: No attendance records
  - Execute: Render component
  - Expected: Shows 0% with message

---

## Page Tests

### 1. AbsenceManagement Page Tests

#### Test Suite: Tab Navigation
- **TC-AM-001**: Should display Absences tab by default
  - Setup: Render AbsenceManagement page
  - Execute: Check active tab
  - Expected: First tab (Absences) is active

- **TC-AM-002**: Should switch to MC Submissions tab
  - Setup: Render page, click MC Submissions tab
  - Execute: Check content
  - Expected: Shows MCSubmissions component

- **TC-AM-003**: Should switch to Leave Requests tab
  - Setup: Render page, click Leave Requests tab
  - Execute: Check content
  - Expected: Shows LeaveRequestList component

- **TC-AM-004**: Should switch to Email Settings tab
  - Setup: Render page, click Email Settings tab
  - Execute: Check content
  - Expected: Shows email template textarea

#### Test Suite: Absence Stats
- **TC-AM-005**: Should load and display absence statistics
  - Setup: Render with mock user and database data
  - Execute: Wait for data load
  - Expected: Stats cards show totalAbsences, mcSubmitted, pendingReview

- **TC-AM-006**: Should show loading state while fetching stats
  - Setup: Render with pending data request
  - Execute: Check rendering
  - Expected: Shows CircularProgress spinners

- **TC-AM-007**: Should handle no classes assigned to lecturer
  - Setup: User with no courses
  - Execute: Render page
  - Expected: Shows 0 absences with empty state

#### Test Suite: Absence Filtering
- **TC-AM-008**: Should filter absences by student name
  - Setup: Multiple absence records, search for "John"
  - Execute: Enter "John" in search
  - Expected: Only shows John's absences

- **TC-AM-009**: Should filter absences by course code
  - Setup: Multiple courses with absences
  - Execute: Search for "CS101"
  - Expected: Only shows CS101 absences

- **TC-AM-010**: Should filter by status
  - Setup: Absences with different statuses
  - Execute: Search for "Pending"
  - Expected: Only pending absences shown

- **TC-AM-011**: Should be case-insensitive search
  - Setup: Search for "john" and "JOHN"
  - Execute: Enter different cases
  - Expected: Both return same results

#### Test Suite: Email Settings
- **TC-AM-012**: Should load default email template on first load
  - Setup: New lecturer with no settings
  - Execute: Navigate to Email Settings tab
  - Expected: Shows DEFAULT_EMAIL_TEMPLATE

- **TC-AM-013**: Should load saved email template
  - Setup: Lecturer with existing email_settings
  - Execute: Render page
  - Expected: Shows saved template from database

- **TC-AM-014**: Should validate template is not empty
  - Setup: Clear template textarea
  - Execute: Click Update button
  - Expected: Shows error "Email template cannot be empty"

- **TC-AM-015**: Should validate required placeholders
  - Setup: Template missing [Student Name]
  - Execute: Click Update button
  - Expected: Shows error "must include: [Student Name]"

- **TC-AM-016**: Should validate all required placeholders
  - Setup: Template missing [Absence Date] and [Submission Link]
  - Execute: Click Update button
  - Expected: Shows error "must include: [Absence Date], [Submission Link]"

- **TC-AM-015b**: Should require Absence Date placeholder
  - Setup: Template without [Absence Date]
  - Execute: Click Update button
  - Expected: Shows error "must include: [Absence Date]"

- **TC-AM-015c**: Should require Submission Link placeholder
  - Setup: Template without [Submission Link]
  - Execute: Click Update button
  - Expected: Shows error "must include: [Submission Link]"

- **TC-AM-017**: Should update email settings successfully
  - Setup: Valid template with all placeholders
  - Execute: Click Update button
  - Expected: Shows success message "updated successfully"

- **TC-AM-018**: Should handle update error gracefully
  - Setup: Mock database error
  - Execute: Click Update button
  - Expected: Shows error message "Failed to update email settings"

#### Test Suite: Data Integration
- **TC-AM-019**: Should fetch enrolled students for lecturer's courses
  - Setup: Lecturer with 3 courses, 150 total enrollments
  - Execute: Render page
  - Expected: Loads all 150 student records

- **TC-AM-020**: Should identify absences correctly
  - Setup: Session with 50 enrolled, 40 attendance records
  - Execute: Calculate absences
  - Expected: Shows 10 absences

- **TC-AM-021**: Should match MC submissions to absences
  - Setup: Absence with MC submitted
  - Execute: Render absence table
  - Expected: Marks row as mcSubmitted=true

- **TC-AM-022**: Should categorize MC status correctly
  - Setup: MC with status 'pending_review'
  - Execute: Display in table
  - Expected: Shows "Under Review"

---

### 2. AttendanceManagement Page Tests

#### Test Suite: Class Selection
- **TC-ATM-001**: Should load lecturer's classes
  - Setup: Lecturer with 5 courses
  - Execute: Render page
  - Expected: Dropdown shows all 5 courses

- **TC-ATM-002**: Should filter sessions by selected class
  - Setup: Select specific course
  - Execute: Check displayed sessions
  - Expected: Only shows sessions for selected course

#### Test Suite: QR Code Generation
- **TC-ATM-003**: Should generate QR code for session
  - Setup: Active session selected
  - Execute: Click generate QR button
  - Expected: QR code appears with session data encoded

#### Test Suite: Attendance Recording
- **TC-ATM-004**: Should mark student as present
  - Setup: Student in attendance list
  - Execute: Click present button
  - Expected: Updates record with status='present'

- **TC-ATM-005**: Should mark student as late
  - Setup: Student in attendance list
  - Execute: Click late button
  - Expected: Updates record with status='late'

---

## Integration Tests

### 1. Authentication Flow

#### Test Suite: Login to Dashboard
- **TC-INT-001**: Should login and store user session
  - Setup: Login form with valid credentials
  - Execute: Submit login form
  - Expected: User data stored in sessionStorage, redirects to dashboard

- **TC-INT-002**: Should persist session on page reload
  - Setup: User logged in, page refreshed
  - Execute: Load page
  - Expected: User remains logged in

- **TC-INT-003**: Should clear session on logout
  - Setup: User logged in, clicks logout
  - Execute: Click logout button
  - Expected: Session cleared, redirects to login

---

### 2. Absence Recording Workflow

#### Test Suite: Complete Absence Process
- **TC-INT-004**: Should record attendance and generate absence
  - Setup: Session with students
  - Execute: Mark some as absent, save
  - Expected: Absence records created in database

- **TC-INT-005**: Should trigger absence notification email
  - Setup: Absence created
  - Execute: System processes email queue
  - Expected: Email sent to student with absence details

- **TC-INT-006**: Should allow student to submit MC
  - Setup: Absence created for student
  - Execute: Student uploads MC document
  - Expected: MC record created with status='pending_review'

- **TC-INT-007**: Should allow lecturer to approve MC
  - Setup: MC submission exists
  - Execute: Lecturer reviews and approves
  - Expected: MC status='approved', absence resolved

---

### 3. Fraud Detection Workflow

#### Test Suite: Fraud Alert Generation
- **TC-INT-008**: Should detect location fraud and create alert
  - Setup: Student marked present 100km from class location
  - Execute: Trigger fraud detection
  - Expected: Fraud alert created with flag reason

- **TC-INT-009**: Should flag impossible travel
  - Setup: Student in Location A at 10:00, Location B at 10:15 (500km apart)
  - Execute: Trigger fraud detection
  - Expected: Creates alert with travel_fraud flag

#### Test Suite: Fraud Review Process
- **TC-INT-010**: Should show fraud alerts to lecturer
  - Setup: Fraud alerts exist
  - Execute: Navigate to FraudDetection page
  - Expected: Displays all fraud alerts

- **TC-INT-011**: Should allow manual review of flags
  - Setup: Flagged attendance record
  - Execute: Lecturer views and marks as valid/invalid
  - Expected: Updates record with manual review status

---

### 4. Report Generation

#### Test Suite: Attendance Report
- **TC-INT-012**: Should generate attendance report by date range
  - Setup: Select date range
  - Execute: Generate report
  - Expected: CSV/Excel file with attendance data

- **TC-INT-013**: Should include statistics in report
  - Setup: Generate report
  - Execute: Check report content
  - Expected: Includes attendance rate, student breakdown

- **TC-INT-014**: Should allow filtering by class in report
  - Setup: Generate report with class filter
  - Execute: Select specific course
  - Expected: Report contains only selected course data

---

## Error Handling Tests

### 1. Network Error Handling

- **TC-ERR-001**: Should handle Supabase connection error
  - Setup: Mock database unavailable
  - Execute: Render page
  - Expected: Shows error message, not crash

- **TC-ERR-002**: Should retry failed requests
  - Setup: Temporary network failure
  - Execute: Trigger data fetch
  - Expected: Retries automatically, succeeds on recovery

### 2. Validation Error Handling

- **TC-ERR-003**: Should validate email template format
  - Setup: Invalid email template
  - Execute: Try to save
  - Expected: Shows validation errors

- **TC-ERR-004**: Should prevent submission of incomplete forms
  - Setup: Form with required field empty
  - Execute: Click submit
  - Expected: Shows required field errors

---

## Performance Tests

- **TC-PERF-001**: Should load attendance page within 3 seconds
  - Setup: Page with 1000 absence records
  - Execute: Load page
  - Expected: Renders in < 3 seconds

- **TC-PERF-002**: Should filter 1000 records instantly
  - Setup: Search with 1000 absence records
  - Execute: Type search query
  - Expected: Filters displayed in < 500ms

---

## Accessibility Tests

- **TC-ACC-001**: All buttons should have accessible labels
  - Setup: Inspect button elements
  - Execute: Check for aria-label or text content
  - Expected: All buttons are labeled

- **TC-ACC-002**: Form inputs should have associated labels
  - Setup: Inspect form
  - Execute: Check input labels
  - Expected: All inputs have labels

- **TC-ACC-003**: Should be keyboard navigable
  - Setup: Use Tab key to navigate
  - Execute: Tab through page
  - Expected: All interactive elements reachable via keyboard
