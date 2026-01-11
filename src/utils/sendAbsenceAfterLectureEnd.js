import supabase from "../config/supabaseClient";
import { sendAbsenceNotificationEmails, getEmailSettings } from "./emailUtils";

/**
 * Checks if any attendance sessions have ended (course_lecture.lecture_end_time < now) and sends absence emails if not already sent.
 * Should be called periodically (e.g., via setInterval or useEffect in AttendanceManagementPage).
 */
export async function sendAbsenceEmailsAfterLectureEnd(userId) {
  // 1. Get all lectures for this lecturer
  const { data: lectures, error: lectureError } = await supabase
    .from("course_lecture")
    .select("id, course_code, course_title, lecture_end_time, lecturer_id")
    .eq("lecturer_id", userId);
  if (lectureError) {
    console.error("Error fetching lectures:", lectureError);
    return;
  }
  const now = new Date();
  for (const lecture of lectures) {
    if (!lecture.lecture_end_time) continue;
    // Parse lecture_end_time as today (assume format HH:mm:ss)
    const [h, m, s] = lecture.lecture_end_time.split(":").map(Number);
    const endDate = new Date(now);
    endDate.setHours(h, m, s || 0, 0);
    if (now < endDate) continue; // Not ended yet
    // 2. Find attendance_session for this lecture
    const { data: sessions, error: sessionError } = await supabase
      .from("attendance_session")
      .select("id, created_at")
      .eq("course_lecture_id", lecture.id);
    if (sessionError || !sessions || sessions.length === 0) continue;
    for (const session of sessions) {
      // 3. Check if absence emails already sent (log in absence_emails table)
      const { data: emailsSent, error: emailLogError } = await supabase
        .from("absence_emails")
        .select("id")
        .eq("session_id", session.id);
      if (emailsSent && emailsSent.length > 0) continue; // Already sent
      // 4. Get enrolled students
      const { data: enrolled, error: enrollError } = await supabase
        .from("enrollment_lecture")
        .select("student_id")
        .eq("id", lecture.id);
      if (enrollError) continue;
      const enrolledIds = (enrolled || []).map(e => e.student_id);
      // 5. Get present students
      const { data: presentRecords, error: presentError } = await supabase
        .from("attendance_record")
        .select("student_id")
        .eq("session_id", session.id)
        .eq("status", "present");
      if (presentError) continue;
      const presentIds = (presentRecords || []).map(r => r.student_id);
      // 6. Absent = enrolled - present
      const absentIds = enrolledIds.filter(id => !presentIds.includes(id));
      if (absentIds.length === 0) continue;
      // 7. Get absent students' emails
      const { data: users, error: userError } = await supabase
        .from("users")
        .select("id, email, name")
        .in("id", absentIds);
      if (userError) continue;
      // 8. Get email template
      const emailSettings = await getEmailSettings(lecture.lecturer_id);
      // 9. Send emails
      await sendAbsenceNotificationEmails(users, lecture, emailSettings.emailTemplate, lecture.lecturer_id, session.id);
      // 10. Log sent (insert into absence_emails)
      for (const student of users) {
        await supabase.from("absence_emails").insert({
          student_id: student.id,
          lecturer_id: lecture.lecturer_id,
          session_id: session.id
        });
      }
    }
  }
}
