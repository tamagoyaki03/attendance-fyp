# Email Placeholder Replacement - How It Works

## Complete Flow Diagram

```
┌─────────────────────────────────────────────────────────────────┐
│  1. LECTURER CREATES EMAIL TEMPLATE (AbsenceManagement.jsx)     │
└─────────────────────────────────────────────────────────────────┘
                              │
                              ▼
        Template with placeholders is stored:
        ┌──────────────────────────────────────────────────┐
        │ Dear [Student Name],                             │
        │                                                  │
        │ We noticed you were absent from                 │
        │ [Course Code] - [Course Name] on [Absence Date] │
        │                                                  │
        │ Please submit here: [Submission Link]           │
        │                                                  │
        │ Thank you,                                       │
        │ [University Name]                                │
        └──────────────────────────────────────────────────┘
                              │
                              ▼
        ┌─────────────────────────────────────────┐
        │ Saved to database:                      │
        │ email_settings table                    │
        │ ├─ lecturer_id: "lec-123"              │
        │ └─ email_template: "Dear [Student..."  │
        └─────────────────────────────────────────┘
```

---

## Step-by-Step Placeholder Replacement

### 2. STUDENT IS MARKED ABSENT

When attendance session ends and absence is detected:

```javascript
// In sendAbsenceEmailsAfterLectureEnd.js or MCSubmission.jsx
// Real data collected from database:

const absentStudents = [
  {
    name: "John Smith",           // ← Real student name
    email: "john@university.edu",  // ← Real email
    student_id: "STU-001"          // ← Real student ID
  }
];

const classData = {
  course_code: "CS101",            // ← Real course code
  course_title: "Data Structures", // ← Real course name
  course_lecture_id: "LEC-456"
};

const sessionDate = "2024-01-12";  // ← Real session date
```

---

### 3. PLACEHOLDER REPLACEMENT LOGIC

**File:** [src/utils/emailUtils.js](src/utils/emailUtils.js#L53-L62)

```javascript
// Get template from database
const emailTemplate = await fetchFromDatabase(lecturerId); 
// Returns: "Dear [Student Name], We noticed you were absent from [Course Code]..."

// REPLACEMENT HAPPENS HERE:
let personalizedEmail = emailTemplate
  // Replace [Student Name] → "John Smith"
  .replace(/\[Student Name\]/g, "John Smith")
  
  // Replace [Course Code] → "CS101"
  .replace(/\[Course Code\]/g, "CS101")
  
  // Replace [Course Name] → "Data Structures"
  .replace(/\[Course Name\]/g, "Data Structures")
  
  // Replace [Absence Date] → "1/12/2024"
  .replace(/\[Absence Date\]/g, new Date().toLocaleDateString())
  
  // Replace [Submission Link] → clickable HTML link
  .replace(/\[Submission Link\]/g, 
    `<a href="https://app.com/student-absence/submit?studentId=STU-001&name=John+Smith">
      Submit Absence Document
    </a>`)
  
  // Replace [University Name] → system name
  .replace(/\[University Name\]/g, "Attendance Management System")
  
  // Convert newlines to HTML line breaks
  .replace(/\n/g, '<br>');
```

---

## 4. EMAIL BEFORE & AFTER REPLACEMENT

### BEFORE (Template with Placeholders):
```
Dear [Student Name],

We have noticed that you were absent from [Course Code] - [Course Name] on [Absence Date].

According to university policy, all absences must be documented with a valid Medical Certificate (MC) or Letter of Absence. 

Please submit your documentation using the following link: [Submission Link]

If you have any questions, please contact the Student Affairs Office.

Thank you,
[University Name] Attendance Management System
```

### AFTER (Actual Email Sent to Student):
```
Dear John Smith,

We have noticed that you were absent from CS101 - Data Structures on 1/12/2024.

According to university policy, all absences must be documented with a valid Medical Certificate (MC) or Letter of Absence. 

Please submit your documentation using the following link: Submit Absence Document

If you have any questions, please contact the Student Affairs Office.

Thank you,
Attendance Management System Attendance Management System
```

---

## 5. EMAIL SENDING PROCESS

```javascript
// Step 1: Prepare array of personalized emails
const emailsToSend = [
  {
    to: "john@university.edu",
    subject: "Absence Notification - CS101",
    html: "<html>Dear John Smith,<br>We have noticed that you were absent from CS101...</html>",
    studentId: "STU-001",
    studentName: "John Smith"
  },
  {
    to: "jane@university.edu",
    subject: "Absence Notification - CS101",
    html: "<html>Dear Jane Doe,<br>We have noticed that you were absent from CS101...</html>",
    studentId: "STU-002",
    studentName: "Jane Doe"
  }
];

// Step 2: Call Supabase Edge Function to send via Gmail
const { data, error } = await supabase.functions.invoke('send-absence-email', {
  body: {
    emails: emailsToSend,
    lecturerId: "lec-123"
  }
});
```

---

## 6. SUPABASE EDGE FUNCTION

**File:** [supabase/functions/send-absence-email/index.ts](supabase/functions/send-absence-email/index.ts#L60-L70)

```typescript
// In Supabase Edge Function (send-absence-email)
for (const emailData of emails) {
  try {
    // emailData contains already-personalized HTML
    await client.send({
      from: GMAIL_EMAIL,           // System email
      to: emailData.to,             // Student email
      subject: emailData.subject,   // "Absence Notification - CS101"
      html: emailData.html,         // Full personalized HTML email
    });

    console.log(`✅ Email sent to ${emailData.to}`);
    
    // Log to database for record-keeping
    await supabaseClient
      .from('absence_emails')
      .insert({
        student_id: emailData.studentId,
        lecturer_id: lecturerId,
      });
  } catch (error) {
    console.error(`❌ Failed to send email to ${emailData.to}`, error);
  }
}
```

---

## Complete Data Flow Example

```
TEMPLATE STORED:
┌──────────────────────────────────────┐
│ "Dear [Student Name],                │
│ You were absent from [Course Code]..." │
└──────────────────────────────────────┘
           ↓
STUDENT 1: John Smith (STU-001)
           ↓
REPLACE PLACEHOLDERS:
┌──────────────────────────────────────┐
│ "Dear John Smith,                    │
│ You were absent from CS101..."        │
└──────────────────────────────────────┘
           ↓
SEND VIA EMAIL to john@university.edu
           ↓
┌──────────────────────────────────────────────────┐
│ ✅ Email delivered                               │
│ ✅ Logged to absence_emails table                │
└──────────────────────────────────────────────────┘

(Same process repeats for each absent student)
```

---

## The 5 Required Placeholders

| Placeholder | Gets Replaced With | Source |
|-------------|-------------------|--------|
| `[Student Name]` | Student's actual name | users table |
| `[Course Code]` | Course code like "CS101" | course_lecture/course_tutorial table |
| `[Course Name]` | Full course name like "Data Structures" | course_lecture/course_tutorial table |
| `[Absence Date]` | Date formatted as "1/12/2024" | attendance_session.date |
| `[Submission Link]` | Full URL to submit absence document | Generated dynamically with student ID |

---

## Key Functions Involved

1. **AbsenceManagement.jsx** - Lecturer creates/updates template
2. **emailUtils.js** `sendAbsenceNotificationEmails()` - Does the actual `.replace()` operations
3. **sendAbsenceAfterLectureEnd.js** - Triggered when lecture ends to send emails
4. **send-absence-email (Edge Function)** - Uses Gmail SMTP to actually send the emails
5. **Database Tables**:
   - `email_settings` - Stores lecturer's custom template
   - `absence_emails` - Logs which emails were sent
