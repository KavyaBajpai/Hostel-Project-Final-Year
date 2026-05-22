import { useEffect, useState } from 'react';
import { getWardenGeofence, listAttendance, saveWardenGeofence, updateAttendance } from '../../services/api';
import { useAuth } from '../../context/AuthContext';

const HOSTEL_OPTIONS = [
  'Sarojini Girls Hostel',
  'Maitriya Girls Hostel',
  'Apala Girls Hostel',
];

function getTodayDate() {
  const now = new Date();
  const year = now.getFullYear();
  const month = String(now.getMonth() + 1).padStart(2, '0');
  const day = String(now.getDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

function getCurrentAcademicSession() {
  const now = new Date();
  const year = now.getFullYear();
  const sessionStart = now.getMonth() + 1 >= 7 ? year : year - 1;
  return `${sessionStart}-${String(sessionStart + 1).slice(-2)}`;
}

export default function Attendance() {
  const { user } = useAuth();
  const isAdmin = user?.role === 'admin';
  const [selectedHostel, setSelectedHostel] = useState(user?.hostelName || HOSTEL_OPTIONS[0]);
  const [date, setDate] = useState(getTodayDate());
  const [session, setSession] = useState(getCurrentAcademicSession());
  const [semester, setSemester] = useState('');
  const [verificationStatus, setVerificationStatus] = useState('');
  const [rows, setRows] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [geofenceMsg, setGeofenceMsg] = useState('');
  const [geofenceSaving, setGeofenceSaving] = useState(false);
  const [geofenceForm, setGeofenceForm] = useState({
    centerLatitude: '',
    centerLongitude: '',
    radiusMeters: '150',
    isActive: true,
  });

  useEffect(() => {
    if (user?.hostelName && !isAdmin) {
      setSelectedHostel(user.hostelName);
    }
  }, [user?.hostelName, isAdmin]);

  useEffect(() => {
    loadGeofence();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selectedHostel]);

  async function loadGeofence() {
    const hostelName = isAdmin ? selectedHostel : user?.hostelName;
    if (!hostelName) return;
    try {
      const data = await getWardenGeofence(hostelName);
      const g = data?.geofence;
      if (g) {
        setGeofenceForm({
          centerLatitude: String(g.centerLatitude ?? ''),
          centerLongitude: String(g.centerLongitude ?? ''),
          radiusMeters: String(g.radiusMeters ?? 150),
          isActive: g.isActive !== false,
        });
      }
    } catch {
      // geofence may not exist yet
    }
  }

  async function saveGeofence(e) {
    e.preventDefault();
    setGeofenceMsg('');
    setGeofenceSaving(true);
    const hostelName = isAdmin ? selectedHostel : user?.hostelName;
    if (!hostelName) {
      setGeofenceMsg('No hostel selected. Log in as warden or choose a hostel (admin).');
      setGeofenceSaving(false);
      return;
    }

    try {
      const data = await saveWardenGeofence({
        hostelName,
        centerLatitude: Number(geofenceForm.centerLatitude),
        centerLongitude: Number(geofenceForm.centerLongitude),
        radiusMeters: Number(geofenceForm.radiusMeters),
        isActive: geofenceForm.isActive,
      });
      setGeofenceMsg(data?.message || 'Geofence saved.');
    } catch (eReq) {
      setGeofenceMsg(eReq?.response?.data?.message || 'Could not save geofence.');
    } finally {
      setGeofenceSaving(false);
    }
  }

  function useMyLocation() {
    if (!navigator.geolocation) {
      setGeofenceMsg('Geolocation not supported in this browser.');
      return;
    }
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        setGeofenceForm((f) => ({
          ...f,
          centerLatitude: String(pos.coords.latitude),
          centerLongitude: String(pos.coords.longitude),
        }));
        setGeofenceMsg('Coordinates filled from your current location.');
      },
      () => setGeofenceMsg('Could not get your location.'),
      { enableHighAccuracy: true, timeout: 15000 }
    );
  }

  async function fetchRows(e) {
    e?.preventDefault();
    setError('');
    setLoading(true);
    try {
      const hostelName = isAdmin ? selectedHostel : undefined;
      const data = await listAttendance({ date, session, semester, verificationStatus, hostelName });
      setRows(data?.attendance || []);
    } catch (eReq) {
      setError(eReq?.response?.data?.message || 'Failed to fetch attendance.');
    } finally {
      setLoading(false);
    }
  }

  async function onAction(id, action) {
    try {
      await updateAttendance(id, { action });
      await fetchRows();
    } catch (eReq) {
      setError(eReq?.response?.data?.message || `Could not ${action} attendance.`);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 py-8">
      <div className="flex items-center justify-between gap-3">
        <h3 className="text-xl font-semibold text-gray-900">Attendance Verification</h3>
        <button
          type="button"
          onClick={() => setSettingsOpen((open) => !open)}
          aria-expanded={settingsOpen}
          aria-label="Toggle hostel boundary settings"
          title="Hostel boundary settings"
          className="inline-flex h-9 w-9 items-center justify-center rounded border bg-white text-gray-700 hover:bg-gray-50"
        >
          <svg viewBox="0 0 24 24" className="h-4 w-4" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <path d="M12 15.5A3.5 3.5 0 1 0 12 8a3.5 3.5 0 0 0 0 7.5Z" />
            <path d="M19.4 15a1.7 1.7 0 0 0 .3 1.9l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.9-.3 1.7 1.7 0 0 0-1 1.6V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1-1.6 1.7 1.7 0 0 0-1.9.3l-.1.1A2 2 0 1 1 4.2 17l.1-.1a1.7 1.7 0 0 0 .3-1.9 1.7 1.7 0 0 0-1.6-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.6-1 1.7 1.7 0 0 0-.3-1.9L4.3 7A2 2 0 1 1 7 4.2l.1.1a1.7 1.7 0 0 0 1.9.3h.1a1.7 1.7 0 0 0 1-1.6V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.6h.1a1.7 1.7 0 0 0 1.9-.3l.1-.1A2 2 0 1 1 19.8 7l-.1.1a1.7 1.7 0 0 0-.3 1.9v.1a1.7 1.7 0 0 0 1.6 1h.1a2 2 0 1 1 0 4H21a1.7 1.7 0 0 0-1.6 1Z" />
          </svg>
        </button>
      </div>

      {settingsOpen && (
      <form onSubmit={saveGeofence} className="mt-4 p-4 border rounded-lg bg-slate-50">
        <p className="text-sm font-semibold text-slate-900">Hostel attendance boundary</p>
        <p className="mt-1 text-xs text-slate-600">
          Set the center (lat/lng) and radius. Residents outside this area are rejected immediately.
          Get coordinates from Google Maps (right-click → coordinates).
        </p>
        {isAdmin ? (
          <div className="mt-3 max-w-md">
            <label className="block text-xs">Hostel</label>
            <select
              value={selectedHostel}
              onChange={(e) => setSelectedHostel(e.target.value)}
              className="mt-1 w-full border rounded px-3 py-2 text-sm"
            >
              {HOSTEL_OPTIONS.map((h) => (
                <option key={h} value={h}>{h}</option>
              ))}
            </select>
          </div>
        ) : (
          <p className="mt-2 text-sm text-slate-700">
            Hostel: <span className="font-medium">{user?.hostelName || '—'}</span>
          </p>
        )}
        <div className="mt-3 flex flex-wrap gap-3 items-end">
          <div>
            <label className="block text-xs">Latitude</label>
            <input
              value={geofenceForm.centerLatitude}
              onChange={(e) => setGeofenceForm((f) => ({ ...f, centerLatitude: e.target.value }))}
              className="border rounded px-3 py-2 text-sm w-36"
              placeholder="28.6139"
              required
            />
          </div>
          <div>
            <label className="block text-xs">Longitude</label>
            <input
              value={geofenceForm.centerLongitude}
              onChange={(e) => setGeofenceForm((f) => ({ ...f, centerLongitude: e.target.value }))}
              className="border rounded px-3 py-2 text-sm w-36"
              placeholder="77.2090"
              required
            />
          </div>
          <div>
            <label className="block text-xs">Radius (m)</label>
            <input
              type="number"
              min={20}
              max={5000}
              value={geofenceForm.radiusMeters}
              onChange={(e) => setGeofenceForm((f) => ({ ...f, radiusMeters: e.target.value }))}
              className="border rounded px-3 py-2 text-sm w-24"
              required
            />
          </div>
          <label className="flex items-center gap-2 text-sm pb-2">
            <input
              type="checkbox"
              checked={geofenceForm.isActive}
              onChange={(e) => setGeofenceForm((f) => ({ ...f, isActive: e.target.checked }))}
            />
            Active
          </label>
          <button type="button" onClick={useMyLocation} className="px-3 py-2 text-sm rounded border bg-white">
            Use my location
          </button>
          <button
            type="submit"
            disabled={geofenceSaving}
            className="px-4 py-2 text-sm rounded bg-gray-900 text-white disabled:opacity-50"
          >
            {geofenceSaving ? 'Saving...' : 'Save boundary'}
          </button>
        </div>
        {geofenceMsg && <p className="mt-2 text-sm text-slate-700">{geofenceMsg}</p>}
      </form>
      )}

      <form onSubmit={fetchRows} className="mt-4 flex flex-wrap gap-2 items-end">
        <div>
          <label className="block text-sm">Date</label>
          <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="border rounded px-3 py-2 text-sm" required />
        </div>
        <div>
          <label className="block text-sm">Session</label>
          <input value={session} onChange={(e) => setSession(e.target.value)} placeholder="2025-26" className="border rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm">Semester</label>
          <input value={semester} onChange={(e) => setSemester(e.target.value)} placeholder="3" className="border rounded px-3 py-2 text-sm" />
        </div>
        <div>
          <label className="block text-sm">Verification</label>
          <select value={verificationStatus} onChange={(e) => setVerificationStatus(e.target.value)} className="border rounded px-3 py-2 text-sm">
            <option value="">Any</option>
            <option value="pending">Pending</option>
            <option value="verified">Verified</option>
            <option value="rejected">Rejected</option>
          </select>
        </div>
        <button className="px-4 py-2 text-sm rounded bg-gray-900 text-white" disabled={loading}>
          {loading ? 'Loading...' : 'Fetch'}
        </button>
      </form>

      {error && <div className="mt-3 p-3 border rounded bg-red-50 text-red-700 text-sm">{error}</div>}

      <div className="mt-6 overflow-x-auto rounded-lg border bg-white">
        <table className="min-w-full table-fixed text-left text-sm">
          <colgroup>
            <col className="w-[13%]" />
            <col className="w-[18%]" />
            <col className="w-[9%]" />
            <col className="w-[14%]" />
            <col className="w-[12%]" />
            <col className="w-[10%]" />
            <col className="w-[16%]" />
            <col className="w-[4%]" />
            <col className="w-[4%]" />
          </colgroup>
          <thead>
            <tr className="border-b bg-gray-50 text-left">
              <th className="px-3 py-2 font-medium text-gray-700">Student</th>
              <th className="px-3 py-2 font-medium text-gray-700">Email</th>
              <th className="px-3 py-2 font-medium text-gray-700">Date</th>
              <th className="px-3 py-2 font-medium text-gray-700">Check-in</th>
              <th className="px-3 py-2 font-medium text-gray-700">Location</th>
              <th className="px-3 py-2 font-medium text-gray-700">Verification</th>
              <th className="px-3 py-2 font-medium text-gray-700">Remark</th>
              <th className="px-3 py-2 font-medium text-gray-700">Proof</th>
              <th className="px-3 py-2 font-medium text-gray-700">Actions</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b align-top last:border-0">
                <td className="px-3 py-2 text-left break-words">{row.studentName}</td>
                <td className="px-3 py-2 text-left break-words">{row.email}</td>
                <td className="px-3 py-2 text-left whitespace-nowrap">{row.attendanceDate}</td>
                <td className="px-3 py-2 text-left">{new Date(row.checkInTime).toLocaleString()}</td>
                <td className="px-3 py-2 text-left text-xs break-words">
                  {row.locationVerified ? (
                    <span className="text-green-700">
                      OK
                      {row.checkInLatitude && row.checkInLongitude
                        ? ` (${Number(row.checkInLatitude).toFixed(5)}, ${Number(row.checkInLongitude).toFixed(5)})`
                        : ''}
                    </span>
                  ) : (
                    <span className="text-gray-500">—</span>
                  )}
                </td>
                <td className="px-3 py-2 text-left capitalize">{row.verificationStatus}</td>
                <td className="px-3 py-2 text-left text-xs text-gray-700 break-words whitespace-normal">
                  {row.verificationRemark || row.locationRemark || '-'}
                </td>
                <td className="px-3 py-2 text-left">
                  <a href={row.proofVideoUrl} target="_blank" rel="noreferrer" className="text-blue-600 underline">Open video</a>
                </td>
                <td className="px-3 py-2 text-left">
                  {row.verificationStatus === 'pending' ? (
                    <div className="flex flex-wrap gap-2">
                      <button type="button" onClick={() => onAction(row.id, 'verify')} className="px-2 py-1 rounded border text-xs hover:bg-gray-700 hover:text-white">Verify</button>
                      <button type="button" onClick={() => onAction(row.id, 'reject')} className="px-2 py-1 rounded border text-xs hover:bg-gray-700 hover:text-white">Reject</button>
                    </div>
                  ) : (
                    <span className="text-gray-500">No actions</span>
                  )}
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr><td className="px-3 py-4 text-left text-gray-500" colSpan="9">No attendance records</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
