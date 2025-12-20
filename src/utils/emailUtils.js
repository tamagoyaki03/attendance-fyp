import supabase from "../config/supabaseClient";

/**
 * Send absence notification emails to absent students
 * Template MUST be passed from caller - no default templates here.
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
    console.log("No absent students to notify");
    return { success: true, sentCount: 0, message: "No absent students to notify" };
  }

  // Validate that template is provided
  if (!emailTemplate || emailTemplate.trim() === "") {
    console.error("ERROR: Email template is required but was not provided. Check that AbsenceManagement is passing the template.");
    return {
      success: false,
      sentCount: 0,
      failedCount: absentStudents.length,
      message: "Email template not configured. Please update email settings in Absence Management.",
    };
  }

  try {
    const baseUrl = window.location.origin;

    // Prepare email data for each student
    const emailsToSend = [];
    
    for (const student of absentStudents) {
      if (!student.email || !student.name) {
        console.warn("Skipping student - missing email or name:", student);
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

    console.log(`📧 Sending ${emailsToSend.length} absence notification emails...`);

    // DEVELOPMENT MODE: Set to false to send real emails via Gmail
    const DEMO_MODE = false; // Changed to false for real email sending
    
    if (DEMO_MODE) {
      console.log("🔧 DEMO MODE: Emails logged to console only (no real emails sent)");
      emailsToSend.forEach((email, index) => {
        console.log(`  ${index + 1}. ✉️ ${email.studentName} <${email.to}>`);
        console.log(`     Subject: ${email.subject}`);
        console.log(`     Preview: ${email.html.substring(0, 100)}...`);
      });
      
      // Still log to database
      try {
        for (const email of emailsToSend) {
          await supabase.from('absence_emails').insert({
            student_id: email.studentId,
            lecturer_id: lecturerId,
          });
        }
        console.log(`✅ Logged ${emailsToSend.length} notifications to database`);
      } catch (dbError) {
        console.warn("⚠️ Database logging skipped:", dbError.message);
      }
      
      return {
        success: true,
        sentCount: emailsToSend.length,
        failedCount: 0,
        message: `Email notifications logged (DEMO MODE - ${emailsToSend.length} students)`,
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
      console.error("Error calling email function:", error);
      // Fallback: log to console if Edge Function fails
      console.warn("⚠️ Email service unavailable. Logging notifications to console:");
      emailsToSend.forEach(email => {
        console.log(`  ✉️ ${email.studentName} (${email.to})`);
        console.log(`     Subject: ${email.subject}`);
      });
      
      return {
        success: false,
        sentCount: 0,
        failedCount: emailsToSend.length,
        message: "Email service unavailable. Please check Supabase Edge Function setup.",
      };
    }

    console.log(`✅ Email sending completed: ${data.sentCount} sent, ${data.failedCount} failed`);
    
    if (data.failedEmails && data.failedEmails.length > 0) {
      console.error("❌ Failed emails details:");
      data.failedEmails.forEach((failedEmail, index) => {
        console.error(`  ${index + 1}. Email: ${failedEmail.email}`);
        console.error(`     Error: ${failedEmail.error}`);
      });
    }

    return {
      success: data.success,
      sentCount: data.sentCount,
      failedCount: data.failedCount,
      message: data.message,
      failedEmails: data.failedEmails, // Include failed details for debugging
    };

  } catch (error) {
    console.error("Error in sendAbsenceNotificationEmails:", error);
    return {
      success: false,
      sentCount: 0,
      failedCount: absentStudents.length,
      message: "Error sending absence notification emails: " + error.message,
      error: error.message,
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
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
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
        reminderFrequency: data.reminder_frequency || "3days",
      };
    }

    return {
      emailTemplate: defaultTemplate,
      ccEmails: "",
      emailTiming: "immediate",
      reminderFrequency: "3days",
    };
  } catch (error) {
    console.error("Error fetching email settings:", error);
    return {
      emailTemplate: `Dear [Student Name],

We have noticed that you were absent from [Course Code] - [Course Name] on [Absence Date].

According to university policy, all absences must be documented with a valid Medical Certificate (MC) or Letter of Absence. Please submit your documentation within 7 days using the following link: [Submission Link].

If you have any questions or need assistance, please contact the Student Affairs Office.

Thank you,
[University Name] Attendance Management System`,
      ccEmails: "",
      emailTiming: "immediate",
      reminderFrequency: "3days",
    };
  }
};
