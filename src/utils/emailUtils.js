import supabase from "../config/supabaseClient";

/**
 * Send absence notification emails to absent students
 * Template is retrieved from Absence Management settings. A default template is used only if the lecturer has not configured one.
 * This ensures the database-stored template from AbsenceManagement is always used.
 * @param {Array} absentStudents - Array of absent student objects with email and student_id
 * @param {Object} classData - Class information (course_code, course_title)
 * @param {string} emailTemplate - Email template content (REQUIRED - must come from AbsenceManagement DB)
 * @param {string} lecturerId - ID of the lecturer sending the email
 * @param {number} sessionId - ID of the attendance session
 * @returns {Promise} Result of email sending operation
 */
export const sendAbsenceNotificationEmails = async (
  absentStudents,
  classData,
  emailTemplate,
  lecturerId,
  sessionId = null
) => {
  if (!absentStudents || absentStudents.length === 0) {
    return { success: true, sentCount: 0, message: "No absent students to notify" };
  }

  // Validate that template is provided
  if (!emailTemplate || emailTemplate.trim() === "") {
    return {
      success: false,
      sentCount: 0,
      failedCount: absentStudents.length,
      message: "Email template not configured. Please update email settings in Absence Management.",
    };
  }

  try {
    const baseUrl = import.meta.env.VITE_APP_URL;

    // Prepare email data for each student
    const emailsToSend = [];
    
    for (const student of absentStudents) {
      const skippedStudents = [];

      if (!student.email || !student.name) {
        skippedStudents.push(student.student_id);
        continue;
      }

      // Create personalized submission link with student data
  const submitAbsenceLink = `${baseUrl}/student-absence/submit?studentId=${encodeURIComponent(student.student_id)}&name=${encodeURIComponent(student.name)}${sessionId ? `&sessionId=${sessionId}` : ''}`;

      // Personalize the email template and convert newlines to HTML breaks
      let personalizedTemplate = emailTemplate
        .replace(/\[Student Name\]/g, student.name)
        .replace(/\[Course Name\]/g, classData?.course_title || classData?.name || "Your Course")
        .replace(/\[Course Code\]/g, classData?.course_code || "")
        .replace(/\[Absence Date\]/g, new Date().toLocaleDateString())
        .replace(
          /\[Submission Link\]/g,
          `<a href="${submitAbsenceLink}" style="color: #2563eb; text-decoration: underline;">Submit Absence Document</a>`
        )
        .replace(/\[University Name\]/g, "Attendance Management System")
        .replace(/\n/g, '<br>'); // Convert newlines to HTML breaks

      emailsToSend.push({
        to: student.email,
        subject: `Absence Notification - ${classData?.course_code || "Course"}`,
        html: personalizedTemplate,
        studentId: student.student_id,
        studentName: student.name
      });
    }

    if (emailsToSend.length === 0) {
      return { 
        success: true, 
        sentCount: 0, 
        failedCount: 0,
        message: "No valid emails to send" 
      };
    }

    // PRODUCTION MODE: Call Supabase Edge Function to send emails
    const { data, error } = await supabase.functions.invoke('send-absence-email', {
      body: {
        emails: emailsToSend,
        lecturerId: lecturerId
      }
    });

    if (error) {
      // Fallback: log to console if Edge Function fails
      emailsToSend.forEach(() => {
      });
      
      return {
        success: false,
        sentCount: 0,
        failedCount: emailsToSend.length,
        message: "Email service unavailable. Please check Supabase Edge Function setup.",
      };
    }

    
    if (data.failedEmails && data.failedEmails.length > 0) {
      data.failedEmails.forEach(() => {
      });
    }

    return {
      success: data.success,
      sentCount: data.sentCount,
      failedCount: data.failedCount,
      message: data.message,
      failedEmails: data.failedEmails, // Include failed details for debugging
    };

  } catch (catchErr) {
    return {
      success: false,
      sentCount: 0,
      failedCount: absentStudents.length,
      message: "Error sending absence notification emails: " + catchErr.message,
      error: catchErr.message,
    };
  }
};

/**
 * Get email settings for a lecturer
 * @param {string} lecturerId - ID of the lecturer
 * @returns {Promise<Object>} Email settings object
 */
export const getEmailSettings = async (lecturerId) => {
  try {
    const { data, error } = await supabase
      .from("email_settings")
      .select("*")
      .eq("lecturer_id", lecturerId)
      .maybeSingle(); // Use maybeSingle() to handle 0 rows gracefully

    // If error and not "not found", but still return default settings
    if (error && error.code !== "PGRST116" && !error.message?.includes('406')) {
      // Non-critical error, continue with default settings
    }

    const defaultTemplate = `Dear [Student Name],

We have noticed that you were absent from [Course Code] - [Course Name] on [Absence Date].

According to university policy, all absences must be documented with a valid Medical Certificate (MC) or Letter of Absence. Please submit your documentation within 7 days using the following link: [Submission Link].

If you have any questions or need assistance, please contact the Student Affairs Office.

Thank you,
[University Name] Attendance Management System`;

    if (data) {
      // Normalize DB snake_case fields to camelCase used by UI callers
      return {
        emailTemplate: data.email_template || defaultTemplate,
        ccEmails: data.cc_emails || "",
        emailTiming: data.email_timing || "immediate",
      };
    }

    return {
      emailTemplate: defaultTemplate,
      ccEmails: "",
      emailTiming: "immediate",
    };
  } catch {
    return {
      emailTemplate: `Dear [Student Name],

We have noticed that you were absent from [Course Code] - [Course Name] on [Absence Date].

According to university policy, all absences must be documented with a valid Medical Certificate (MC) or Letter of Absence. Please submit your documentation within 7 days using the following link: [Submission Link].

If you have any questions or need assistance, please contact the Student Affairs Office.

Thank you,
[University Name] Attendance Management System`,
      ccEmails: "",
      emailTiming: "immediate",
    };
  }
};
