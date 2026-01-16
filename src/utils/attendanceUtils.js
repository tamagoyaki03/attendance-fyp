import supabase from "../config/supabaseClient";

export const calculateAttendanceRate = async (classId, classType) => {
  try {
    const enrollmentTable = classType === "Lecture" ? "enrollment_lecture" : "enrollment_tutorial";
    const courseIdField = classType === "Lecture" ? "course_id" : "tutorial_id";
    const sessionField = classType === "Lecture" ? "course_lecture_id" : "course_tutorial_id";

    // Get total number of enrolled students
    const { data: enrollments, error: enrollmentError } = await supabase
      .from(enrollmentTable)
      .select("student_id")
      .eq(courseIdField, classId);

    if (enrollmentError) {
      return { attendanceRate: 0, totalStudents: 0, totalSessions: 0 };
    }

    const totalStudents = enrollments.length;

    if (totalStudents === 0) {
      return { attendanceRate: 0, totalStudents: 0, totalSessions: 0 };
    }

    // Get all attendance sessions for this class
    const { data: sessions, error: sessionsError } = await supabase
      .from("attendance_session")
      .select("id")
      .eq(sessionField, classId);

    if (sessionsError) {
      return { attendanceRate: 0, totalStudents, totalSessions: 0 };
    }

    const totalSessions = sessions?.length || 0;

    if (totalSessions === 0) {
      return { attendanceRate: 0, totalStudents, totalSessions: 0 };
    }

    // Get all attendance records for these sessions
    const sessionIds = sessions.map(s => s.id);
    const { data: attendanceRecords, error: attendanceError } = await supabase
      .from("attendance_record")
      .select("status")
      .in("session_id", sessionIds);

    if (attendanceError) {
      return { attendanceRate: 0, totalStudents, totalSessions };
    }

    // Calculate present records (status = 'present')
    const presentRecords = attendanceRecords?.filter(record => record.status === 'present') || [];
    const totalPossibleAttendance = totalStudents * totalSessions;
    const attendanceRate = totalPossibleAttendance > 0 
      ? (presentRecords.length / totalPossibleAttendance) * 100 
      : 0;

    return {
      attendanceRate: Math.round(attendanceRate * 100) / 100,
      totalStudents,
      totalSessions,
      presentCount: presentRecords.length,
      totalPossibleAttendance
    };

  } catch {
    return { attendanceRate: 0, totalStudents: 0, totalSessions: 0 };
  }
};

export const calculateOverallAttendanceRate = async (classId, classType) => {
  const stats = await calculateAttendanceRate(classId, classType);
  return stats.attendanceRate;
};

// Get detailed attendance breakdown with student list
export const getDetailedAttendanceStats = async (classId, classType) => {
  try {
    const enrollmentTable = classType === "Lecture" ? "enrollment_lecture" : "enrollment_tutorial";
    const courseIdField = classType === "Lecture" ? "course_id" : "tutorial_id";
    const sessionField = classType === "Lecture" ? "course_lecture_id" : "course_tutorial_id";
    const enrollmentIdField = classType === "Lecture" ? "lecture_enrollment_id" : "tutorial_enrollment_id";

    // Get enrolled students with user details
    const { data: enrollments, error: enrollmentError } = await supabase
      .from(enrollmentTable)
      .select(`
        id,
        student_id,
        users(id, name, email)
      `)
      .eq(courseIdField, classId);

    if (enrollmentError) {
      return {
        totalStudents: 0,
        presentCount: 0,
        absentCount: 0,
        flaggedCount: 0,
        attendanceRate: 0,
        totalSessions: 0,
        totalOverallSessions: 0,
        students: []
      };
    }

    const totalStudents = enrollments?.length || 0;

    if (totalStudents === 0) {
      return {
        totalStudents: 0,
        presentCount: 0,
        absentCount: 0,
        flaggedCount: 0,
        attendanceRate: 0,
        totalSessions: 0,
        totalOverallSessions: 0,
        students: []
      };
    }

    // Get current week start and end dates
    const now = new Date();
    const dayOfWeek = now.getDay();
    const weekStart = new Date(now);
    weekStart.setDate(now.getDate() - dayOfWeek);
    weekStart.setHours(0, 0, 0, 0);
    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);
    weekEnd.setHours(23, 59, 59, 999);

    // Get all attendance sessions for this class for THIS WEEK ONLY
    const { data: weekSessions, error: weekSessionsError } = await supabase
      .from("attendance_session")
      .select("id")
      .eq(sessionField, classId)
      .gte("created_at", weekStart.toISOString())
      .lte("created_at", weekEnd.toISOString());

    if (weekSessionsError) {
      return {
        totalStudents,
        presentCount: 0,
        absentCount: 0,
        flaggedCount: 0,
        attendanceRate: 0,
        totalSessions: 0,
        totalOverallSessions: 0,
        students: enrollments.map(e => ({
          name: e.users?.name || "Unknown",
          email: e.users?.email || "",
          status: "absent"
        }))
      };
    }

    const totalWeekSessions = weekSessions?.length || 0;

    // Get ALL attendance sessions for overall rate calculation
    const { data: allSessions } = await supabase
      .from("attendance_session")
      .select("id")
      .eq(sessionField, classId);

    const totalOverallSessions = allSessions?.length || 0;

    // Get attendance records for THIS WEEK ONLY
    let presentCount = 0;
    let absentCount = 0;
    let flaggedCount = 0;
    let weekAttendanceRecords = [];

    if (totalWeekSessions > 0) {
      const weekSessionIds = weekSessions.map(s => s.id);
      const { data: attendanceRecords, error: attendanceError } = await supabase
        .from("attendance_record")
        .select(`id, ${enrollmentIdField}, status, session_id, flag_reason`)
        .in("session_id", weekSessionIds);

      if (!attendanceError) {
        weekAttendanceRecords = attendanceRecords || [];
        presentCount = weekAttendanceRecords.filter(r => r.status === 'present').length || 0;
        absentCount = weekAttendanceRecords.filter(r => r.status === 'absent').length || 0;
        flaggedCount = weekAttendanceRecords.filter(r => r.flag_reason).length || 0;
      }
    }

    // Get ALL attendance records for overall attendance rate
    let overallAttendanceRecords = [];
    if (totalOverallSessions > 0) {
      const allSessionIds = allSessions.map(s => s.id);
      const { data: allAttendanceRecords, error: allAttendanceError } = await supabase
        .from("attendance_record")
        .select(`status`)
        .in("session_id", allSessionIds);

      if (!allAttendanceError) {
        overallAttendanceRecords = allAttendanceRecords || [];
      }
    }

    // Calculate OVERALL attendance rate: (total present across all sessions) / (total sessions * total students)
    const totalPresentAllTime = overallAttendanceRecords.filter(r => r.status === 'present').length || 0;
    const totalPossibleAttendance = totalStudents * totalOverallSessions;
    const attendanceRate = totalPossibleAttendance > 0
      ? Math.round(((totalPresentAllTime / totalPossibleAttendance) * 100) * 100) / 100
      : 0;

    // Map students with their latest attendance status from THIS WEEK
    const students = enrollments.map(enrollment => {
      const latestRecord = weekAttendanceRecords.find(r => r[enrollmentIdField] === enrollment.id);
      return {
        id: enrollment.student_id,
        name: enrollment.users?.name || "Unknown",
        email: enrollment.users?.email || "",
        status: latestRecord?.status || "absent"
      };
    });

    return {
      totalStudents,
      presentCount,
      absentCount,
      flaggedCount,
      attendanceRate,
      totalSessions: totalWeekSessions,
      totalOverallSessions,
      totalRecords: weekAttendanceRecords?.length || 0,
      students
    };

  } catch {
    return {
      totalStudents: 0,
      presentCount: 0,
      absentCount: 0,
      flaggedCount: 0,
      attendanceRate: 0,
      totalSessions: 0,
      totalOverallSessions: 0,
      students: []
    };
  }
};