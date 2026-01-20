import supabase from "../config/supabaseClient";
import { sendAbsenceNotificationEmails, getEmailSettings } from "./emailUtils";

/**
 * Periodically checks ended sessions and triggers absence email sending.
 * This file ONLY detects absentees and calls Edge Functions.
 */
export async function sendAbsenceEmailsAfterLectureEnd(userId) {
  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const currentDay = now.getDay();

  // ---------------------------
  // 1. Fetch lectures & tutorials
  // ---------------------------
  const [{ data: lectures }, { data: tutorials }] = await Promise.all([
    supabase
      .from("course_lecture")
      .select("id, course_code, course_title, lecture_end_time, lecturer_id, day_of_week")
      .eq("lecturer_id", userId),

    supabase
      .from("course_tutorial")
      .select("id, course_code, course_title, tutorial_end_time, lecturer_id, day_of_week")
      .eq("lecturer_id", userId),
  ]);

  // ---------------------------
  // 2. Process both types
  // ---------------------------
  await Promise.all([
    ...(lectures || []).map(l =>
      processClass({
        type: "lecture",
        classData: l,
        endTimeField: "lecture_end_time",
        enrollmentTable: "enrollment_lecture",
        enrollmentKey: "course_id",
        attendanceKey: "lecture_enrollment_id",
        sessionKey: "course_lecture_id",
        userId,
        now,
        today,
        currentDay,
      })
    ),

    ...(tutorials || []).map(t =>
      processClass({
        type: "tutorial",
        classData: t,
        endTimeField: "tutorial_end_time",
        enrollmentTable: "enrollment_tutorial",
        enrollmentKey: "tutorial_id",
        attendanceKey: "tutorial_enrollment_id",
        sessionKey: "course_tutorial_id",
        userId,
        now,
        today,
        currentDay,
      })
    ),
  ]);
}

/**
 * Handles one lecture/tutorial generically
 */
async function processClass({
  type,
  classData,
  endTimeField,
  enrollmentTable,
  enrollmentKey,
  attendanceKey,
  sessionKey,
  userId,
  now,
  today,
  currentDay,
}) {
  if (!classData[endTimeField]) return;
  if (classData.day_of_week !== currentDay) return;

  const [h, m, s] = classData[endTimeField].split(":").map(Number);
  const endDate = new Date(now);
  endDate.setHours(h, m, s || 0, 0);

  const windowMs = type === "lecture" ? 60 * 60 * 1000 : 10 * 60 * 1000;
  if (now <= endDate || now > new Date(endDate.getTime() + windowMs)) return;

  // ---------------------------
  // Find sessions today
  // ---------------------------
  const { data: sessions } = await supabase
    .from("attendance_session")
    .select("id, created_at")
    .eq(sessionKey, classData.id)
    .eq("date", today);

  if (!sessions?.length) return;

  for (const session of sessions) {
    // ---------------------------
    // Get enrollments
    // ---------------------------
    const { data: enrolled } = await supabase
      .from(enrollmentTable)
      .select("id, student_id")
      .eq(enrollmentKey, classData.id);

    if (!enrolled?.length) continue;

    // ---------------------------
    // Attendance records
    // ---------------------------
    const { data: attendance } = await supabase
      .from("attendance_record")
      .select(`${attendanceKey}, status`)
      .eq("session_id", session.id);

    const statusMap = new Map();
    (attendance || []).forEach(r =>
      statusMap.set(r[attendanceKey], r.status)
    );

    console.log("ENROLLED:", enrolled); // All enrolled students
    console.log("ATTENDANCE RECORDS:", attendance); // All attendance records for the session

    // ---------------------------
    // Absence logic (PHYSICAL + ONLINE)
    // ---------------------------
    const absentStudents = enrolled.filter(e => {
      const status = statusMap.get(e.id);
      if (!status) return true;        // physical
      if (status === "absent") return true; // online
      return false;
    });

    console.log("ABSENT STUDENTS:", absentStudents); // All detected absentees
    console.log("ABSENT IDS:", absentStudents.map(s => s.student_id)); // IDs of absentees

    if (!absentStudents.length) continue;

    // ---------------------------
    // Exclude MC + Leave
    // ---------------------------
    const absentIds = absentStudents.map(s => s.student_id);
    const sessionDate =
      session.created_at?.split("T")[0] ?? today;

    const [{ data: mcs }, { data: leaves }] = await Promise.all([
      supabase
        .from("mc_submissions")
        .select("student_id")
        .in("student_id", absentIds)
        .eq("status", "approved")
        .eq("session_id", session.id),

      supabase
        .from("leave_requests")
        .select("user_id")
        .in("user_id", absentIds)
        .eq("status", "approved")
        .eq("session_id", session.id)
    ]);

    const excluded = new Set([
      ...(mcs || []).map(m => m.student_id),
      ...(leaves || []).map(l => l.user_id),
    ]);

    const finalAbsentIds = absentIds.filter(id => !excluded.has(id));
    if (!finalAbsentIds.length) continue;

    console.log("EXCLUDED IDS (MC/Leave):", Array.from(excluded));
    console.log("FINAL ABSENT IDS:", finalAbsentIds);

    // ---------------------------
    // Fetch users + send
    // ---------------------------
    const { data: users } = await supabase
      .from("users")
      .select("id, email, name, matric_number")
      .in("id", finalAbsentIds);

    if (!users?.length) continue;

    const emailSettings = await getEmailSettings(classData.lecturer_id);

    await sendAbsenceNotificationEmails(
      users,
      classData,
      emailSettings.emailTemplate,
      classData.lecturer_id,
      session.id
    );
  }
}
