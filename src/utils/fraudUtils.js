import supabase from "../config/supabaseClient";

// Haversine distance in kilometers
function haversineKm(lat1, lon1, lat2, lon2) {
  const toRad = (v) => (v * Math.PI) / 180;
  const R = 6371; // km
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  const c = 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
  return R * c;
}

async function getSessionContext(sessionId) {
  const { data: session, error: sessionError } = await supabase
    .from("attendance_session")
    .select("id, course_lecture_id, course_tutorial_id, date, start_time, end_time")
    .eq("id", sessionId)
    .single();
  if (sessionError || !session) throw sessionError || new Error("Session not found");

  let classInfo = null;
  let classType = null;
  let courseCode = null;
  if (session.course_lecture_id) {
    classType = "lecture";
    const { data, error } = await supabase
      .from("course_lecture")
      .select("id, course_code, latitude, longitude, lecture_location")
      .eq("id", session.course_lecture_id)
      .single();
    if (error) throw error;
    classInfo = { lat: data?.latitude, lng: data?.longitude, location: data?.lecture_location };
    courseCode = data?.course_code || null;
  } else if (session.course_tutorial_id) {
    classType = "tutorial";
    const { data, error } = await supabase
      .from("course_tutorial")
      .select("id, course_code, latitude, longitude, tutorial_location")
      .eq("id", session.course_tutorial_id)
      .single();
    if (error) throw error;
    classInfo = { lat: data?.latitude, lng: data?.longitude, location: data?.tutorial_location };
    courseCode = data?.course_code || null;
  }

  // Build enrollment map for resolving user_id
  const enrollmentField = classType === "tutorial" ? "tutorial_enrollment_id" : "lecture_enrollment_id";

  const { data: records, error: recErr } = await supabase
    .from("attendance_record")
    .select(`${enrollmentField}`)
    .eq("session_id", sessionId);
  if (recErr) throw recErr;
  const enrollmentIds = Array.from(
    new Set((records || []).map((r) => r[enrollmentField]).filter(Boolean))
  );

  let enrollmentMap = {};
  if (enrollmentIds.length) {
    if (classType === "tutorial") {
      const { data: enrolls } = await supabase
        .from("enrollment_tutorial")
        .select("id, student_id")
        .in("id", enrollmentIds);
      (enrolls || []).forEach((e) => (enrollmentMap[e.id] = e.student_id));
    } else {
      const { data: enrolls } = await supabase
        .from("enrollment_lecture")
        .select("id, student_id")
        .in("id", enrollmentIds);
      (enrolls || []).forEach((e) => (enrollmentMap[e.id] = e.student_id));
    }
  }

  // Build session window
  const startIso = session.date && session.start_time ? `${session.date}T${session.start_time}` : null;
  const endIso = session.date && session.end_time ? `${session.date}T${session.end_time}` : null;
  const start = startIso ? new Date(startIso) : null;
  let end = endIso ? new Date(endIso) : null;
  if (start && !end) {
    // Fallback to 2-hour window if end_time missing
    end = new Date(start.getTime() + 2 * 60 * 60 * 1000);
  }

  return { classInfo, classType, courseCode, enrollmentMap, start, end };
}

async function upsertIssue({
  userId,
  sessionId,
  courseCode,
  type,
  description,
  latitude,
  longitude,
  expectedLatitude,
  expectedLongitude,
  distanceKm,
  expectedTime,
  actualTime,
  severity = "medium",
}) {
  // Prevent duplicates per user-session-type
  const { data: existing } = await supabase
    .from("fraud_detection_alerts")
    .select("id, status")
    .eq("user_id", userId)
    .eq("session_id", sessionId)
    .eq("alert_type", type)
    .eq("status", "open")
    .limit(1)
    .maybeSingle();

  if (existing) {
    // Keep as open if previously resolved
    return existing.id;
  }

  const { data, error } = await supabase
    .from("fraud_detection_alerts")
    .insert({
      user_id: userId,
      session_id: sessionId,
      course_code: courseCode,
      alert_type: type,
      description,
      latitude,
      longitude,
      expected_latitude: expectedLatitude,
      expected_longitude: expectedLongitude,
      distance_km: distanceKm,
      expected_time: expectedTime,
      actual_time: actualTime,
      severity,
      status: "open",
    })
    .select("id")
    .single();

  if (error) {
    console.error("Failed to insert fraud detection alert:", error);
    return null;
  }
  return data?.id || null;
}

async function analyzeRecord(sessionId, record, ctx, opts) {
  const issues = [];
  const { classInfo, courseCode, enrollmentMap, start, end } = ctx;
  const { maxKm = 1.0, timeBufferMinutes = 5 } = opts || {};

  const userId = record.lecture_enrollment_id
    ? enrollmentMap[record.lecture_enrollment_id]
    : enrollmentMap[record.tutorial_enrollment_id];

  if (!userId) return issues;

  // Location anomaly
  if (
    classInfo?.lat != null &&
    classInfo?.lng != null &&
    record?.latitude != null &&
    record?.longitude != null
  ) {
    const distance = haversineKm(
      Number(classInfo.lat),
      Number(classInfo.lng),
      Number(record.latitude),
      Number(record.longitude)
    );
    if (distance > maxKm) {
      const severity = distance > 5 ? "high" : distance > 2 ? "medium" : "low";
      await upsertIssue({
        userId,
        sessionId,
        courseCode,
        type: "Location Anomaly",
        description: `Check-in ${distance.toFixed(2)} km away from class location (max ${maxKm} km).`,
        latitude: Number(record.latitude),
        longitude: Number(record.longitude),
        expectedLatitude: Number(classInfo.lat),
        expectedLongitude: Number(classInfo.lng),
        distanceKm: distance,
        actualTime: record.created_at,
        severity,
      });
      issues.push({
        type: "Location Anomaly",
        description: `Check-in ${distance.toFixed(2)} km away from class location (>${maxKm} km).`,
      });
    }
  }

  // Time anomaly
  if (start && end && record?.created_at) {
    const created = new Date(record.created_at);
    const early = new Date(start.getTime() - timeBufferMinutes * 60 * 1000);
    const late = new Date(end.getTime() + timeBufferMinutes * 60 * 1000);
    if (created < early || created > late) {
      const isEarly = created < early;
      const severity = isEarly && created < start ? "high" : "medium";
      await upsertIssue({
        userId,
        sessionId,
        courseCode,
        type: "Time Anomaly",
        description: `Check-in at ${created.toISOString()} outside session window (${start.toISOString()} - ${end.toISOString()}).`,
        expectedTime: start,
        actualTime: record.created_at,
        severity,
      });
      issues.push({
        type: "Time Anomaly",
        description: `Check-in at ${created.toISOString()} outside session window (${start.toISOString()} - ${end.toISOString()}).`,
      });
    }
  }

  return issues;
}

// Start realtime monitoring for a session: analyze new attendance_record inserts
export async function startFraudMonitoring(sessionId, options = {}) {
  try {
    const ctx = await getSessionContext(sessionId);

    // Analyze existing records once (in case some inserted before monitor starts)
    const { data: existing } = await supabase
      .from("attendance_record")
      .select("id, session_id, created_at, latitude, longitude, status, lecture_enrollment_id, tutorial_enrollment_id")
      .eq("session_id", sessionId);
    for (const rec of existing || []) {
      await analyzeRecord(sessionId, rec, ctx, options);
    }

    const channel = supabase
      .channel(`fraud-monitor-${sessionId}`)
      .on(
        'postgres_changes',
        { event: 'INSERT', schema: 'public', table: 'attendance_record', filter: `session_id=eq.${sessionId}` },
        async (payload) => {
          const rec = payload.new;
          await analyzeRecord(sessionId, rec, ctx, options);
        }
      )
      .subscribe();

    return channel;
  } catch (e) {
    console.error("Failed to start fraud monitoring:", e);
    return null;
  }
}

export async function stopFraudMonitoring(channel) {
  if (!channel) return;
  try {
    await supabase.removeChannel(channel);
  } catch (e) {
    console.warn("Error stopping fraud monitoring:", e);
  }
}
