import axios from 'axios';

// Base Axios instance for backend API
const api = axios.create({
  baseURL: 'http://localhost:5000/api',
});

// Helper to set auth token header
export function setAuthToken(token) {
  if (token) {
    api.defaults.headers.common['Authorization'] = `Bearer ${token}`;
  } else {
    delete api.defaults.headers.common['Authorization'];
  }
}

export async function login(email, password) {
  const res = await api.post('/auth/login', { email, password });
  return res.data;
}

export async function register(payload) {
  const res = await api.post('/auth/register', payload);
  return res.data;
}

// Resident endpoints
export async function applyLeave(body) {
  const res = await api.post('/resident/leave', body);
  return res.data;
}
export async function getMyLeaves({ semester, status }) {
  const res = await api.get('/resident/leaves', { params: { semester, status } });
  return res.data;
}
export async function getFines(semester) {
  const res = await api.post('/resident/fines', { semester });
  return res.data;
}
export async function getBills(semester) {
  const res = await api.post('/resident/bill', { semester });
  return res.data;
}
export async function fileComplaint(payload) {
  const res = await api.post('/resident/filecomplaint', payload);
  return res.data;
}
export async function uploadResidentDoc({ docType, semester, file }) {
  const form = new FormData();
  form.append('docType', docType);
  form.append('semester', semester);
  form.append('docFile', file);
  const res = await api.post('/resident/docs', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
}
export async function getResidentDocuments(semester) {
  const res = await api.get('/resident/viewDocs', { params: { semester } });
  return res.data;
}
export async function registerOptOut(payload) {
  const res = await api.post('/resident/aoptouts', payload);
  return res.data;
}
export async function getResidentProfile() {
  const res = await api.get('/resident/profile');
  return res.data;
}
export async function upsertResidentProfile(payload) {
  const res = await api.post('/resident/profile', payload);
  return res.data;
}
export async function uploadReferenceFaceImage(file) {
  const form = new FormData();
  form.append('referenceFaceImage', file);
  const res = await api.post('/resident/profile/reference-face', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
}
export async function getMyComplaints({ semester, status }) {
  // backend exposes both POST and GET; we use GET with query per route, but
  // resident router currently has both variants — we will call GET to read
  const res = await api.get('/resident/viewcomplaint', { params: { semester, status } });
  return res.data;
}
export async function getOptOuts(semester) {
  const res = await api.get('/resident/voptouts', { params: { semester } });
  return res.data;
}
export async function listNotices(semester) {
   const res = await api.get('/resident/viewNotices', {
     params: semester ? { semester } : undefined
   });
   return res.data;
}
export async function getMessMenu(semester) {
   
}

export async function submitAttendanceVideo({
  semester,
  videoBlob,
  challengeType,
  challengeText,
  latitude,
  longitude,
  locationAccuracy,
  locationCapturedAt,
}) {
  const form = new FormData();
  form.append('semester', semester);
  if (challengeType) form.append('challengeType', challengeType);
  if (challengeText) form.append('challengeText', challengeText);
  form.append('latitude', String(latitude));
  form.append('longitude', String(longitude));
  if (locationAccuracy != null) form.append('locationAccuracy', String(locationAccuracy));
  if (locationCapturedAt) form.append('locationCapturedAt', locationCapturedAt);
  form.append('attendanceVideo', videoBlob, `attendance-${Date.now()}.webm`);
  const res = await api.post('/resident/attendance', form, {
    headers: { 'Content-Type': 'multipart/form-data' }
  });
  return res.data;
}

export async function getAttendanceGeofenceStatus() {
  const res = await api.get('/resident/attendance/geofence-status');
  return res.data;
}

export async function checkAttendanceLocation(payload) {
  const res = await api.post('/resident/attendance/check-location', payload);
  return res.data;
}

export async function getWardenGeofence(hostelName) {
  const res = await api.get('/warden/geofence', {
    params: hostelName ? { hostelName } : undefined,
  });
  return res.data;
}

export async function saveWardenGeofence(payload) {
  const res = await api.put('/warden/geofence', payload);
  return res.data;
}

export async function getMyAttendance(semester) {
  const res = await api.get('/resident/attendance', { params: { semester } });
  return res.data;
}

// Warden endpoints
export async function listLeaves(params) {
  const res = await api.get('/warden/leaves', { params });
  return res.data;
}
export async function listComplaints(params) {
  const res = await api.get('/warden/complaints', { params });
  return res.data;
}

export async function approveLeave(id) {
  const res = await api.patch(`/warden/approve/${id}`);
  return res.data;
}

export async function rejectLeave(id) {
  const res = await api.patch(`/warden/reject/${id}`);
  return res.data;
}

export async function listResidents(params) {
  const res = await api.get('/warden/residents', { params });
  return res.data;
}

export async function issueNotice({ title, body, session, semester, file }) {
  const form = new FormData();
  form.append('title', title);
  form.append('body', body);
  form.append('session', session);
  form.append('semester', semester);
  if (file) form.append('noticeFile', file);
  const res = await api.post('/warden/notice', form, { headers: { 'Content-Type': 'multipart/form-data' } });
  return res.data;
}

export async function listMessExpenses(params) {
  const res = await api.get('/warden/mess-expenses', { params });
  return res.data;
}

export async function createMessExpense({ month, totalExpense, hostelName }) {
  const res = await api.post('/warden/mess-expenses', { month, totalExpense, hostelName });
  return res.data;
}

export async function updateMessExpense(id, { month, totalExpense }) {
  const res = await api.patch(`/warden/mess-expenses/${id}`, { month, totalExpense });
  return res.data;
}

export async function deleteMessExpense(id) {
  const res = await api.delete(`/warden/mess-expenses/${id}`);
  return res.data;
}

export async function getMessRefunds({ session, semester }) {
  const res = await api.get('/warden/mess-refunds', { params: { session, semester } });
  return res.data;
}

export async function listAttendance(params) {
  const cleanParams = Object.fromEntries(
    Object.entries(params || {}).filter(([, value]) => value !== '' && value != null)
  );
  const res = await api.get('/warden/attendance', { params: cleanParams });
  return res.data;
}

export async function updateAttendance(id, payload) {
  const res = await api.patch(`/warden/attendance/${id}`, payload);
  return res.data;
}

export async function getPushVapidPublicKey() {
  const res = await api.get('/warden/push/vapid-public-key');
  return res.data;
}

export async function subscribePush(subscription) {
  const res = await api.post('/warden/push/subscribe', subscription);
  return res.data;
}

export async function unsubscribePush({ endpoint }) {
  const res = await api.delete('/warden/push/unsubscribe', { data: { endpoint } });
  return res.data;
}

export default api;
