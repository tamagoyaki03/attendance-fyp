import supabase from "../config/supabaseClient";

/**
 * Calculate total possible attendance by summing up:
 * - Each lecture enrollment × lecture sessions
 * - Each tutorial enrollment × tutorial sessions
 * 
 * @param {string} startDate - Start date in yyyy-MM-dd format
 * @param {string} endDate - End date in yyyy-MM-dd format
 * @returns {Promise<{totalPossible: number, presentCount: number, excusedCount: number, absentCount: number}>}
 */
export async function calculateAttendanceMetrics(startDate, endDate) {
  try {
    // Get all courses
    const { data: lectureCoursesData } = await supabase
      .from("course_lecture")
      .select("id");

    const { data: tutorialCoursesData } = await supabase
      .from("course_tutorial")
      .select("id");

    const lectureCourseIds = (lectureCoursesData || []).map((c) => c.id);
    const tutorialCourseIds = (tutorialCoursesData || []).map((c) => c.id);

    let totalPossible = 0;

    // Calculate for lecture courses
    for (const courseId of lectureCourseIds) {
      // Get enrollment count for this course
      const { data: enrollments } = await supabase
        .from("enrollment_lecture")
        .select("id")
        .eq("course_id", courseId);

      const enrollmentCount = (enrollments || []).length;

      // Get session count for this course in date range
      const { data: sessions } = await supabase
        .from("attendance_session")
        .select("id")
        .eq("course_lecture_id", courseId)
        .gte("date", startDate)
        .lte("date", endDate);

      const sessionCount = (sessions || []).length;

      // Add to total possible
      totalPossible += enrollmentCount * sessionCount;
    }

    // Calculate for tutorial courses
    for (const courseId of tutorialCourseIds) {
      // Get enrollment count for this course
      const { data: enrollments } = await supabase
        .from("enrollment_tutorial")
        .select("id")
        .eq("tutorial_id", courseId);

      const enrollmentCount = (enrollments || []).length;

      // Get session count for this course in date range
      const { data: sessions } = await supabase
        .from("attendance_session")
        .select("id")
        .eq("course_tutorial_id", courseId)
        .gte("date", startDate)
        .lte("date", endDate);

      const sessionCount = (sessions || []).length;

      // Add to total possible
      totalPossible += enrollmentCount * sessionCount;
    }

    // Get attendance records in date range
    const { data: sessionsData } = await supabase
      .from("attendance_session")
      .select("id")
      .gte("date", startDate)
      .lte("date", endDate);

    const sessionIds = (sessionsData || []).map((s) => s.id);

    let attendanceRecords = [];
    if (sessionIds.length > 0) {
      const { data: recordsData } = await supabase
        .from("attendance_record")
        .select("id, status")
        .in("session_id", sessionIds);
      attendanceRecords = recordsData || [];
    }

    const presentCount = attendanceRecords.filter(
      (r) => r.status === "present"
    ).length;
    const excusedCount = attendanceRecords.filter((r) => r.status === "excused").length;
    const absentCount = Math.max(totalPossible - presentCount - excusedCount, 0);

    return {
      totalPossible,
      presentCount,
      excusedCount,
      absentCount,
    };
  } catch (error) {
    return {
      totalPossible: 0,
      presentCount: 0,
      excusedCount: 0,
      absentCount: 0,
    };
  }
}
