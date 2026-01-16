# Tutorial QR Code Check-in Foreign Key Error Fix

## Problem
When students scan QR codes for tutorial classes, they get:
```
Error: Insert or update on table 'attendance_record' violates foreign key constraint
attendance_record_tutorial_enrollment_Id_fkey
```

## Root Cause
The `tutorial_enrollment_id` being used in the attendance_record insert doesn't exist in the `enrollment_tutorial` table. This happens when:

1. **Student not enrolled**: The student scanning the QR code is not enrolled in the specific tutorial
2. **Wrong tutorial ID**: The QR code contains the wrong tutorial ID (possibly using lecture ID instead)
3. **Enrollment lookup issue**: The code looking up the enrollment is using wrong parameters

## Investigation Steps

### 1. Check QR Code Generation
The QR code format is: `${type}|${classId}|${password}|${sessionId}`

For tutorials, verify that:
- `type` = "tutorial" (not "course")
- `classId` = actual tutorial ID from `course_tutorial` table
- The tutorial exists in the database

### 2. Check Student Enrollment
When a student scans the QR, the system should:
```sql
SELECT id FROM enrollment_tutorial 
WHERE student_id = <student_id> 
AND tutorial_id = <classId_from_QR>
```

If this returns no results, the student is NOT enrolled in that tutorial.

### 3. Verify AttendanceSession QR Generation
Check `/src/components/Event/AttendanceSession.jsx` line 218-240:
- Ensure `classData.id` is the correct tutorial ID
- Verify `type` is set to "tutorial" for tutorial classes

## Solutions

### Solution 1: Verify Enrollment Before Allowing Check-in
Add enrollment validation in the QR scanning logic (likely in a database function or API endpoint):

```javascript
// Before inserting attendance_record
const { data: enrollment, error } = await supabase
  .from('enrollment_tutorial')
  .select('id')
  .eq('student_id', studentId)
  .eq('tutorial_id', tutorialId)
  .single();

if (error || !enrollment) {
  throw new Error('Student is not enrolled in this tutorial');
}

// Then use enrollment.id as tutorial_enrollment_id
await supabase
  .from('attendance_record')
  .insert({
    tutorial_enrollment_id: enrollment.id,
    session_id: sessionId,
    status: 'present',
    // ... other fields
  });
```

### Solution 2: Check QR Code Type Detection
In `AttendanceSession.jsx`, verify the type detection logic correctly identifies tutorials:

```javascript
let type = "course"; // default fallback

if (classData?.type) {
  type = classData.type.toLowerCase() === "lecture" ? "course" : "tutorial";
} else if (classData?.id) {
  // Query to determine if it's lecture or tutorial
  const { data: tutorialData, error: tutorialError } = await supabase
    .from("course_tutorial")
    .select("id")
    .eq("id", classData.id)
    .single();
  
  if (tutorialData && !tutorialError) {
    type = "tutorial";
  }
}
```

### Solution 3: Add Better Error Messages
Modify the check-in error handling to provide clearer messages:

```javascript
try {
  // ... attendance record insert
} catch (error) {
  if (error.code === '23503' && error.message.includes('tutorial_enrollment')) {
    throw new Error('You are not enrolled in this tutorial class. Please contact your lecturer.');
  }
  throw error;
}
```

## Debugging Checklist

1. **Check the QR code data**:
   - What values are encoded in the QR?
   - Is the `type` field "tutorial" or "course"?
   - Does the `classId` match the tutorial ID in the database?

2. **Check student enrollment**:
   ```sql
   SELECT * FROM enrollment_tutorial 
   WHERE student_id = '<student_id>';
   ```

3. **Check the tutorial exists**:
   ```sql
   SELECT id FROM course_tutorial 
   WHERE id = '<classId_from_QR>';
   ```

4. **Check attendance session**:
   ```sql
   SELECT * FROM attendance_session 
   WHERE id = '<sessionId_from_QR>';
   ```

## Where to Add the Fix

The QR scanning and check-in logic is likely in:
1. A Supabase Edge Function (check `supabase/functions/`)
2. A database RPC function (check for `rpc` calls in the code)
3. Client-side logic with direct Supabase calls (search for attendance_record inserts)

**Recommended**: Add enrollment validation wherever the attendance_record is being inserted after QR scan.
