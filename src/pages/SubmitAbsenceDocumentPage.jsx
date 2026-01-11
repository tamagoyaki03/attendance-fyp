import React, { useEffect, useState } from "react";
import {
  Box,
  Button,
  Card,
  CardContent,
  CardHeader,
  CardActions,
  TextField,
  Typography,
  InputLabel,
  Dialog,
  DialogContent,
} from "@mui/material";
import { DatePicker } from "@mui/x-date-pickers/DatePicker";
import { AdapterDateFns } from "@mui/x-date-pickers/AdapterDateFns";
import { LocalizationProvider } from "@mui/x-date-pickers/LocalizationProvider";
import { toast } from "react-toastify";
import supabase from "../config/supabaseClient";

export default function SubmitAbsenceDocumentPage() {
  const [studentId, setStudentId] = useState("");
  const [studentName, setStudentName] = useState("");
  const [course, setCourse] = useState("");
  const [sessionId, setSessionId] = useState(null);
  const [absenceDate, setAbsenceDate] = useState(null);
  const [reason, setReason] = useState("");
  const [documentFile, setDocumentFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [submissionSuccess, setSubmissionSuccess] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  const inputSx = {
    "& .MuiOutlinedInput-root": {
      backgroundColor: "#ffffff",
      borderRadius: 1,
      "& fieldset": { borderColor: "#e6edf3" },
      "&:hover fieldset": { borderColor: "#cbd5e1" },
      "&.Mui-focused fieldset": { borderColor: "#0f172a" },
    },
    "& .MuiInputLabel-root": { color: "#64748b" },
    "& .MuiInputLabel-root.Mui-focused": { color: "#0f172a" },
    input: { color: "#0f172a" },
  };

  // Auto-fill today's date and student info from Supabase auth if available
  useEffect(() => {
    // Default the absence date to today
    setAbsenceDate(new Date());

    // Prefer explicit URL params first, then fallback to auth
    let hasSid = false;
    let hasSname = false;
    try {
      const params = new URLSearchParams(window.location.search);
      const sid = params.get('studentId') || params.get('student_id');
      const sname = params.get('name') || params.get('student_name');
      const sessId = params.get('sessionId') || params.get('session_id');
      
      if (sid) { setStudentId(sid); hasSid = true; }
      if (sname) { setStudentName(sname); hasSname = true; }
      
      // Fetch course details if sessionId is provided
      if (sessId) {
        setSessionId(sessId);
        (async () => {
          try {
            const { data, error } = await supabase
              .from('attendance_session')
              .select(`
                course_lecture:course_lecture_id (
                  course_code,
                  course_title
                )
              `)
              .eq('id', sessId)
              .single();
            
            if (!error && data?.course_lecture) {
              const courseInfo = `${data.course_lecture.course_code} - ${data.course_lecture.course_title}`;
              setCourse(courseInfo);
            }
          } catch (err) {
            console.warn('Failed to fetch course details:', err);
          }
        })();
      }
    } catch (e) {
      console.warn('Failed to prefill from URL params:', e);
    }

    // Auto-fill from Supabase auth ONLY if user is a student (not lecturer/admin)
    (async () => {
      try {
        const { data, error } = await supabase.auth.getUser();
        if (error || !data?.user) {
          console.warn('Auth getUser error:', error?.message);
          return;
        }
        const user = data.user;
        const meta = user.user_metadata || {};
        const role = meta.role || user.app_metadata?.role;
        
        // Only auto-fill if the logged-in user is explicitly a student
        if (role === 'student') {
          const inferredId = meta.student_id || meta.id || (user.email ? user.email.split('@')[0] : '');
          const inferredName = meta.full_name || meta.name || meta.display_name || meta.student_name || '';
          
          if (!hasSid && inferredId) setStudentId(inferredId);
          if (!hasSname && inferredName) setStudentName(inferredName);
        }
      } catch (e) {
        console.warn('Failed to prefill from auth:', e);
      }
    })();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);

    if (!studentId || !absenceDate || !reason || !documentFile) {
      toast.error("Please fill in all required fields and attach a document.");
      setIsSubmitting(false);
      return;
    }

    try {
      // Ensure the storage bucket exists (helpful diagnostics)
      const { error: bucketError } = await supabase.storage
        .from('absence-documents')
        .list('');

      if (bucketError) {
        console.error("Storage bucket error:", bucketError);
        toast.error(
          bucketError?.message?.includes('does not exist')
            ? "Storage bucket 'absence-documents' not found. Please create it in Supabase Storage and set it to public read."
            : "Unable to access storage bucket. Please check Supabase Storage policies."
        );
        setIsSubmitting(false);
        return;
      }

      // Upload document file to Supabase Storage
      const fileExtension = documentFile.name.split('.').pop();
      const fileName = `${studentId}_${Date.now()}.${fileExtension}`;
      // Path inside the bucket (do not include bucket name here)
      const filePath = `${studentId}/${fileName}`;

      const { error: uploadError } = await supabase.storage
        .from('absence-documents')
        .upload(filePath, documentFile, {
          contentType: documentFile.type || 'application/octet-stream',
          upsert: false, // prevent overwrite if the same name exists
          cacheControl: '3600',
        });

      if (uploadError) {
        console.error("Upload error:", uploadError);
        const msg = uploadError?.message || 'Failed to upload document. Please try again.';
        toast.error(msg);
        setIsSubmitting(false);
        return;
      }

      // Get public URL for the uploaded file
      const { data: { publicUrl } } = supabase.storage
        .from('absence-documents')
        .getPublicUrl(filePath);

      // Insert absence submission record into database
      const { error: insertError } = await supabase
        .from('mc_submissions')
        .insert([
          {
            student_id: studentId,
            session_id: sessionId || null,
            absence_date: absenceDate.toISOString().split('T')[0],
            reason: reason,
            document_url: publicUrl,
            status: 'pending_review',
            submitted_at: new Date().toISOString(),
          }
        ]);

      if (insertError) {
        console.error("Insert error:", insertError);
        toast.error(insertError?.message || "Failed to save absence submission. Please try again.");
        setIsSubmitting(false);
        return;
      }

      toast.success("Your absence document has been submitted successfully!", {
        autoClose: 5000,
        position: "top-center"
      });

      // Store submitted data for confirmation display
      setSubmittedData({
        studentId,
        studentName,
        course,
        absenceDate: absenceDate.toISOString().split('T')[0],
        reason,
        fileName: documentFile.name,
        submittedAt: new Date().toLocaleString()
      });

      // Show success state
      setSubmissionSuccess(true);

      // Reset form
      setStudentId("");
      setStudentName("");
      setAbsenceDate(null);
      setReason("");
      setDocumentFile(null);
    } catch (error) {
      console.error("Error submitting absence document:", error);
      toast.error("An error occurred. Please try again.");
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <Box
      sx={{
        minHeight: "100vh",
        backgroundColor: "#eef2f7",
        display: "flex",
        justifyContent: "center",
        alignItems: "flex-start",
        padding: 4,
      }}
    >
      <Dialog
        open={submissionSuccess && submittedData !== null}
        maxWidth="sm"
        fullWidth
        PaperProps={{
          sx: {
            bgcolor: "#f0fdf4",
            border: "2px solid #22c55e",
            boxShadow: "0 6px 18px rgba(34,197,94,0.15)",
            borderRadius: 2,
          }
        }}
      >
        <DialogContent sx={{ p: 4 }}>
          <Box display="flex" flexDirection="column" alignItems="center" textAlign="center">
            <Box
              sx={{
                width: 64,
                height: 64,
                borderRadius: "50%",
                bgcolor: "#22c55e",
                display: "flex",
                alignItems: "center",
                justifyContent: "center",
                mb: 2,
              }}
            >
              <Typography variant="h3" color="white">✓</Typography>
            </Box>
            <Typography variant="h5" fontWeight="bold" color="#16a34a" gutterBottom>
              Submission Successful!
            </Typography>
            <Typography variant="body2" color="text.secondary" mb={3}>
              Your absence document has been submitted for review
            </Typography>
          </Box>
          
          {submittedData && (
            <Box sx={{ bgcolor: "white", p: 3, borderRadius: 1, border: "1px solid #d1fae5" }}>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Student ID:</strong> {submittedData.studentId}
              </Typography>
              {submittedData.studentName && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Name:</strong> {submittedData.studentName}
                </Typography>
              )}
              {submittedData.course && (
                <Typography variant="body2" color="text.secondary" gutterBottom>
                  <strong>Course:</strong> {submittedData.course}
                </Typography>
              )}
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Absence Date:</strong> {submittedData.absenceDate}
              </Typography>
              <Typography variant="body2" color="text.secondary" gutterBottom>
                <strong>Document:</strong> {submittedData.fileName}
              </Typography>
              <Typography variant="body2" color="text.secondary">
                <strong>Submitted:</strong> {submittedData.submittedAt}
              </Typography>
            </Box>
          )}
        </DialogContent>
      </Dialog>

      <Card
        sx={{
          width: "100%",
          maxWidth: 700,
          bgcolor: "#ffffff",
          color: "#0f172a",
          border: "1px solid #e2e8f0",
          boxShadow: "0 6px 18px rgba(15,23,42,0.04)",
          borderRadius: 2,
        }}
      >
        <CardHeader
          title={<Typography variant="h6" fontWeight="bold">Submit Absence Document</Typography>}
          subheader={<Typography variant="body2" color="text.secondary">Please fill out the form below to submit your absence documentation.</Typography>}
          sx={{ pb: 0, px: 3, pt: 3 }}
        />

        <CardContent>
          <form onSubmit={handleSubmit}>
            <Box display="flex" flexDirection="column" gap={2}>
              {/* Student Name (optional, auto-filled if available) */}
              <TextField
                fullWidth
                label="Student Name"
                value={studentName}
                onChange={(e) => setStudentName(e.target.value)}
                sx={{ ...inputSx }}
                helperText="Your full name (optional)"
              />

                {/* Course (auto-filled from attendance session) */}
                <TextField
                  fullWidth
                  label="Course"
                  value={course}
                  onChange={(e) => setCourse(e.target.value)}
                  sx={{ ...inputSx }}
                  helperText="Course code and title"
                  disabled={!!sessionId}
                />

              {/* Student ID (required, used for database insert) */}
              <TextField
                fullWidth
                label="Student ID"
                value={studentId}
                onChange={(e) => setStudentId(e.target.value)}
                required
                sx={{ ...inputSx }}
                helperText="Enter your student ID"
              />


              <LocalizationProvider dateAdapter={AdapterDateFns}>
                <DatePicker
                  label="Absence Date"
                  value={absenceDate}
                  onChange={(newValue) => setAbsenceDate(newValue)}
                  renderInput={(params) => (
                    <TextField
                      {...params}
                      fullWidth
                      required
                      sx={{ ...inputSx }}
                    />
                  )}
                />
              </LocalizationProvider>

              <TextField
                fullWidth
                label="Reason for Absence"
                value={reason}
                multiline
                rows={4}
                onChange={(e) => setReason(e.target.value)}
                required
                sx={{ ...inputSx }}
                helperText="Describe the reason for your absence"
              />

              <Box>
                <InputLabel sx={{ mb: 1, color: "#64748b" }}>Upload Document (Medical Certificate, Letter, etc.)</InputLabel>
                <input
                  type="file"
                  required
                  onChange={(e) => setDocumentFile(e.target.files?.[0] || null)}
                  accept=".pdf,.doc,.docx,.jpg,.jpeg,.png"
                  style={{
                    color: "#0f172a",
                    background: "#ffffff",
                    border: "1px solid #e6edf3",
                    padding: 8,
                    borderRadius: 6,
                  }}
                />
                {documentFile && (
                  <Typography variant="body2" color="text.secondary" mt={1}>
                    Selected file: {documentFile.name} ({Math.round(documentFile.size / 1024)} KB)
                  </Typography>
                )}
              </Box>
            </Box>

            <CardActions sx={{ mt: 3, px: 0 }}>
              <Button
                type="submit"
                variant="contained"
                fullWidth
                disabled={isSubmitting}
                sx={{
                  backgroundColor: "#0f172a",
                  color: "#fff",
                  textTransform: "none",
                  "&:hover": { backgroundColor: "#0b1320" },
                }}
              >
                {isSubmitting ? "Submitting..." : "Submit Document"}
              </Button>
            </CardActions>
          </form>
        </CardContent>
      </Card>
    </Box>
  );
}