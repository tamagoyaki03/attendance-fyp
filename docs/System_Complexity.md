# System Complexity — Attendance FYP

Repository: tamagoyaki03/attendance-fyp  
Date: 11 Jan 2026

| Feature | Complexity | Description | Reason for Complexity |
|---|---|---|---|
| Attendance Capture (QR + modes) | High | Generates/scans QR and manages live attendance sessions across online/physical modes. Prevents duplicates and ensures session integrity. | Concurrency, device variability, anti-replay protections, timing windows, error handling. |
| Geolocation Validation | Medium | Captures and validates location during attendance flows. | Permission handling, GPS accuracy variance, spoofing safeguards, fallback logic. |
| Fraud Detection & Alerts | High | Flags anomalies (e.g., suspicious patterns) and renders detection charts; supports alerting workflows. | Rule/threshold tuning, minimizing false positives, performant aggregation, alert lifecycles. |
| Data Validation & Integrity | High | Enforces uniqueness, status transitions, and manual overrides for attendance records. | Real-time checks, DB constraints, edge cases for time windows, consistency across clients. |
| Reporting & Export | Medium | Builds absence/fraud/attendance reports with filters and pagination. | Export formatting, dynamic query parameters, large result sets. |
| Analytics Dashboards | Medium | Trends, stats, and top absence reasons with interactive charts. | Real-time aggregations, rendering performance, chart library nuances. |
| Class & Schedule Management | Medium | Create/edit classes and schedules with validations. | Overlap detection, recurrence handling, complex UI state management. |
| Email Notifications | Medium | Sends post-lecture absence emails via Supabase function and client triggers. | Asynchronous execution, rate limits, retries, configuration management. |
| Authentication & Session Management | Medium | Login/signup/reset with Supabase; manages sessions securely. | Session persistence, error states, secure storage, edge-case authentication flows. |
| Absence Document Uploads (MC) | Medium | Uploads and validates medical certificates with metadata linking. | File type/size checks, secure storage, verification workflow integration. |

## Key Implementation References
- Attendance: src/components/Event/QRGenerator.jsx, src/components/Event/AttendanceSession.jsx, src/pages/Dialogs/onlineAttendanceDialog.jsx
- Location: src/components/LocationInput.jsx, src/utils/geolocationUtils.js
- Fraud: src/components/Event/FraudDetectionChart.jsx, src/components/FlaggedAttendanceList.jsx, src/utils/fraudUtils.js, supabase/migrations/20251220_create_fraud_detection_settings_table.sql, supabase/migrations/20251220_create_fraud_detection_alerts_table.sql
- Data Integrity: src/utils/attendanceUtils.js, supabase/migrations/20251220_update_attendance_record_unique_constraint.sql, supabase/migrations/20251220_allow_flagged_status_in_attendance_record.sql, supabase/migrations/20251220_add_marked_manually_to_attendance_record.sql
- Reporting/Analytics: src/components/Event/ReportGenerator.jsx, src/pages/ReportsPage.jsx, src/components/FraudTable.jsx, src/components/AbsenceTable.jsx, src/pages/AnalyticsPage.jsx, src/components/AttendanceStats.jsx, src/components/Event/AttendanceTrends.jsx, src/components/Event/TopAbsenceReason.jsx
- Classes/Scheduling: src/pages/ManageClasses.jsx, src/components/Event/AddClassDialog.jsx, src/components/Event/EditClassDialog.jsx, src/components/ScheduleInput.jsx
- Email: supabase/functions/send-absence-email/index.ts, src/utils/sendAbsenceAfterLectureEnd.js, supabase/migrations/20251220_create_email_settings_table.sql
- Auth: src/pages/Login.jsx, src/pages/SignUp.jsx, src/pages/ForgotPassword.jsx, src/config/supabaseClient.js
- Absence Docs: src/pages/SubmitAbsenceDocumentPage.jsx, src/components/MCSubmission.jsx

> This document provides a one-page overview of functional areas and their complexity drivers to support planning, estimation, and risk assessment.

## Proof Snippets (Code & DB References)

- Attendance Capture: [src/components/Event/AttendanceSession.jsx](../src/components/Event/AttendanceSession.jsx#L1-L240) – QR string includes class/session/password; expiry and end-time updates; fraud monitor start/cleanup.
- QR Generation: [src/components/Event/QRGenerator.jsx](../src/components/Event/QRGenerator.jsx#L1-L50) – Encodes type/course/password; clipboard copy utility.
- Online Mode Payload: [src/pages/Dialogs/onlineAttendanceDialog.jsx](../src/pages/Dialogs/onlineAttendanceDialog.jsx#L1-L120) – Recording link + quiz JSON capture.
- Geolocation Utilities: [src/utils/geolocationUtils.js](../src/utils/geolocationUtils.js#L1-L80) – High-accuracy GPS with timeout/error codes.
- Geolocation UI: [src/components/LocationInput.jsx](../src/components/LocationInput.jsx#L1-L200) – Debounced Nominatim search, GPS fetch, map preview.
- Fraud Detection Engine: [src/utils/fraudUtils.js](../src/utils/fraudUtils.js#L1-L210) – Haversine distance, time-window anomaly detection, realtime supabase channel, alert upsert.
- Fraud Settings/Alerts Schema: [supabase/migrations/20251220_create_fraud_detection_settings_table.sql](../supabase/migrations/20251220_create_fraud_detection_settings_table.sql#L1-L20), [supabase/migrations/20251220_create_fraud_detection_alerts_table.sql](../supabase/migrations/20251220_create_fraud_detection_alerts_table.sql#L1-L120).
- Fraud Visuals & Triage: [src/components/Event/FraudDetectionChart.jsx](../src/components/Event/FraudDetectionChart.jsx#L1-L120), [src/components/FraudTable.jsx](../src/components/FraudTable.jsx#L1-L200), [src/components/FlaggedAttendanceList.jsx](../src/components/FlaggedAttendanceList.jsx#L1-L160).
- Data Integrity Constraints: [supabase/migrations/20251220_update_attendance_record_unique_constraint.sql](../supabase/migrations/20251220_update_attendance_record_unique_constraint.sql#L1-L20), [supabase/migrations/20251220_allow_flagged_status_in_attendance_record.sql](../supabase/migrations/20251220_allow_flagged_status_in_attendance_record.sql#L1-L10), [supabase/migrations/20251220_add_marked_manually_to_attendance_record.sql](../supabase/migrations/20251220_add_marked_manually_to_attendance_record.sql).
- Attendance Metrics: [src/utils/attendanceUtils.js](../src/utils/attendanceUtils.js#L1-L200) – Rate calculations across sessions/enrollments.
- Reporting/Export: [src/components/Event/ReportGenerator.jsx](../src/components/Event/ReportGenerator.jsx#L1-L220) – Class/session/student CSV pivots.
- Analytics: [src/pages/AnalyticsPage.jsx](../src/pages/AnalyticsPage.jsx#L1-L200), [src/components/Event/AttendanceTrends.jsx](../src/components/Event/AttendanceTrends.jsx#L1-L200), [src/components/Event/TopAbsenceReason.jsx](../src/components/Event/TopAbsenceReason.jsx#L1-L200), [src/components/AttendanceStats.jsx](../src/components/AttendanceStats.jsx#L1-L120).
- Classes & Scheduling: [src/pages/ManageClasses.jsx](../src/pages/ManageClasses.jsx#L1-L200), [src/components/Event/AddClassDialog.jsx](../src/components/Event/AddClassDialog.jsx#L1-L200), [src/components/Event/EditClassDialog.jsx](../src/components/Event/EditClassDialog.jsx#L1-L200), [src/components/ScheduleInput.jsx](../src/components/ScheduleInput.jsx#L1-L200).
- Email Notifications: [supabase/functions/send-absence-email/index.ts](../supabase/functions/send-absence-email/index.ts#L1-L200), [src/utils/sendAbsenceAfterLectureEnd.js](../src/utils/sendAbsenceAfterLectureEnd.js#L1-L200), [supabase/migrations/20251220_create_email_settings_table.sql](../supabase/migrations/20251220_create_email_settings_table.sql#L1-L60).
- Auth Flows: [src/pages/Login.jsx](../src/pages/Login.jsx#L1-L200), [src/pages/SignUp.jsx](../src/pages/SignUp.jsx#L1-L200), [src/pages/ForgotPassword.jsx](../src/pages/ForgotPassword.jsx#L1-L200), [src/config/supabaseClient.js](../src/config/supabaseClient.js#L1-L20).
- Absence Docs: [src/pages/SubmitAbsenceDocumentPage.jsx](../src/pages/SubmitAbsenceDocumentPage.jsx#L1-L200), [src/components/MCSubmission.jsx](../src/components/MCSubmission.jsx#L1-L200) – Upload, storage URL, review lifecycle.