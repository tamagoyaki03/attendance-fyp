import supabase from "../config/supabaseClient";

/**
 * Automatically archives lectures and tutorials whose end_date has passed.
 * Intended to run daily (admin dashboard / cron / background task).
 */
export async function autoArchiveEndedClasses() {
  const todayStr = new Date().toISOString().slice(0, 10);

  // Archive lectures
  const { data: archivedLectures, error: lecErr } = await supabase
    .from("course_lecture")
    .update({ status: "archived" })
    .lt("end_date", todayStr)
    .neq("status", "archived")
    .select();

  if (lecErr) {
    console.error("Failed to archive lectures:", lecErr);
  } else {
    console.log(`Archived ${archivedLectures.length} lectures`);
  }

  // Archive tutorials
  const { data: archivedTutorials, error: tutErr } = await supabase
    .from("course_tutorial")
    .update({ status: "archived" })
    .lt("end_date", todayStr)
    .neq("status", "archived")
    .select();

  if (tutErr) {
    console.error("Failed to archive tutorials:", tutErr);
  } else {
    console.log(`Archived ${archivedTutorials.length} tutorials`);
  }
}
