import { useEffect, useMemo, useRef, useState } from 'react';
import Webcam from 'react-webcam';
import { FaceMesh } from '@mediapipe/face_mesh';
import {
  checkAttendanceLocation,
  getAttendanceGeofenceStatus,
  getMyAttendance,
  submitAttendanceVideo,
} from '../../services/api';
import { getCurrentPosition } from '../../utils/geolocation';

const STEPS = ['location', 'challenge', 'recording'];

const CHALLENGES = [
  { type: 'turn_left', text: 'Turn your head slowly to the LEFT and back.' },
  { type: 'turn_right', text: 'Turn your head slowly to the RIGHT and back.' },
  { type: 'blink_twice', text: 'Blink your eyes TWICE clearly.' },
  { type: 'look_up_down', text: 'Look UP, then DOWN slowly.' },
];

function getSupportedMimeType() {
  if (typeof MediaRecorder === 'undefined') return '';
  const candidates = [
    'video/webm;codecs=vp9',
    'video/webm;codecs=vp8',
    'video/webm',
    'video/mp4',
  ];
  return candidates.find((type) => MediaRecorder.isTypeSupported(type)) || '';
}

export default function RecordAttendance() {
  const webcamRef = useRef(null);
  const mediaRecorderRef = useRef(null);
  const chunksRef = useRef([]);
  const faceMeshRef = useRef(null);
  const rafRef = useRef(null);
  const processingRef = useRef(false);
  const challengeTypeRef = useRef(CHALLENGES[0].type);
  const challengeDoneRef = useRef(false);
  const baselineRef = useRef(null);
  const blinkCountRef = useRef(0);
  const blinkClosedRef = useRef(false);
  const lookStageRef = useRef(0);

  const [step, setStep] = useState('location');
  const [semester, setSemester] = useState('');
  const [recording, setRecording] = useState(false);
  const [previewUrl, setPreviewUrl] = useState('');
  const [videoBlob, setVideoBlob] = useState(null);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');
  const [error, setError] = useState('');
  const [rows, setRows] = useState([]);
  const [challenge, setChallenge] = useState(CHALLENGES[0]);
  const [challengeDone, setChallengeDone] = useState(false);
  const [challengeStatus, setChallengeStatus] = useState('Waiting for camera...');
  const [locationCoords, setLocationCoords] = useState(null);
  const [locationStatus, setLocationStatus] = useState('Checking location...');
  const [locationInside, setLocationInside] = useState(false);
  const [locationLoading, setLocationLoading] = useState(false);
  const [geofenceConfigured, setGeofenceConfigured] = useState(null);

  const mimeType = useMemo(getSupportedMimeType, []);
  const stepIndex = STEPS.indexOf(step);

  useEffect(() => {
    refreshLocation();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    if (step !== 'challenge') return;

    setChallenge(CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)]);
    resetChallengeProgress();
    setChallengeStatus('Initializing camera...');
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  useEffect(() => {
    challengeTypeRef.current = challenge?.type;
    if (step === 'challenge') resetChallengeProgress();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [challenge?.type]);

  useEffect(() => {
    challengeDoneRef.current = challengeDone;
  }, [challengeDone]);

  useEffect(() => {
    return () => {
      if (previewUrl) URL.revokeObjectURL(previewUrl);
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [previewUrl]);

  useEffect(() => {
    if (step !== 'challenge') return undefined;

    let mounted = true;

    async function setupFaceMesh() {
      const mesh = new FaceMesh({
        locateFile: (file) => `https://cdn.jsdelivr.net/npm/@mediapipe/face_mesh/${file}`,
      });
      mesh.setOptions({
        maxNumFaces: 1,
        refineLandmarks: true,
        minDetectionConfidence: 0.5,
        minTrackingConfidence: 0.5,
      });
      mesh.onResults((results) => {
        if (!mounted) return;
        const landmarks = results?.multiFaceLandmarks?.[0];
        if (!landmarks) {
          setChallengeStatus('Face not detected. Keep your full face in frame.');
          return;
        }
        evaluateChallenge(landmarks);
      });
      faceMeshRef.current = mesh;
      runFrameLoop();
    }

    setupFaceMesh();

    return () => {
      mounted = false;
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
      faceMeshRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [step]);

  async function refreshLocation() {
    setLocationLoading(true);
    setLocationStatus('Getting GPS location...');
    try {
      const status = await getAttendanceGeofenceStatus();
      setGeofenceConfigured(status?.configured ?? false);

      const coords = await getCurrentPosition();
      setLocationCoords(coords);

      if (!status?.geofenceEnabled) {
        setLocationInside(true);
        setLocationStatus('Location checks disabled on server.');
        return;
      }

      if (!status?.configured) {
        setLocationInside(false);
        setLocationStatus('Hostel boundary not configured yet. Ask your warden.');
        return;
      }

      const check = await checkAttendanceLocation({
        latitude: coords.latitude,
        longitude: coords.longitude,
        accuracy: coords.accuracy,
        locationCapturedAt: coords.capturedAt,
      });

      setLocationInside(Boolean(check?.ok));
      if (check?.ok) {
        setLocationStatus(
          `Inside hostel area (${check.distanceMeters ?? '?'}m from center, limit ${check.allowedRadiusMeters ?? '?'}m).`
        );
      } else if (check?.code === 'GEOFENCE_OUTSIDE' && check.distanceMeters != null) {
        setLocationStatus(
          `${check.message} (${check.distanceMeters}m from center, limit ${check.allowedRadiusMeters}m).`
        );
      } else {
        setLocationStatus(check?.message || 'Outside allowed hostel area.');
      }
    } catch (err) {
      const data = err?.response?.data;
      setLocationInside(false);
      if (data?.code === 'GEOFENCE_OUTSIDE' && data.distanceMeters != null) {
        setLocationStatus(
          `${data.message || 'Outside hostel area.'} (${data.distanceMeters}m from center, limit ${data.allowedRadiusMeters ?? '?'}m).`
        );
      } else {
        setLocationStatus(data?.message || err?.message || 'Could not verify location.');
      }
    } finally {
      setLocationLoading(false);
    }
  }

  function resetChallengeProgress() {
    baselineRef.current = null;
    blinkCountRef.current = 0;
    blinkClosedRef.current = false;
    lookStageRef.current = 0;
    challengeDoneRef.current = false;
    setChallengeDone(false);
    setChallengeStatus('Perform the challenge in front of the camera.');
  }

  function distance(a, b) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    return Math.sqrt(dx * dx + dy * dy);
  }

  function eyeAspectRatio(landmarks, i1, i2, i3, i4, i5, i6) {
    const p1 = landmarks[i1];
    const p2 = landmarks[i2];
    const p3 = landmarks[i3];
    const p4 = landmarks[i4];
    const p5 = landmarks[i5];
    const p6 = landmarks[i6];
    return (distance(p2, p6) + distance(p3, p5)) / (2 * distance(p1, p4));
  }

  function evaluateChallenge(landmarks) {
    if (challengeDoneRef.current) return;
    const activeChallengeType = challengeTypeRef.current;
    const nose = landmarks[1];
    if (!nose) return;

    if (!baselineRef.current) {
      baselineRef.current = { x: nose.x, y: nose.y };
      setChallengeStatus('Baseline captured. Start challenge movement.');
      return;
    }

    const dx = nose.x - baselineRef.current.x;
    const dy = nose.y - baselineRef.current.y;

    if (activeChallengeType === 'turn_left') {
      setChallengeStatus(`Turn left... progress ${(Math.max(0, (-dx / 0.05)) * 100).toFixed(0)}%`);
      if (dx < -0.05) {
        challengeDoneRef.current = true;
        setChallengeDone(true);
        setChallengeStatus('Challenge completed.');
      }
      return;
    }

    if (activeChallengeType === 'turn_right') {
      setChallengeStatus(`Turn right... progress ${(Math.max(0, (dx / 0.05)) * 100).toFixed(0)}%`);
      if (dx > 0.05) {
        challengeDoneRef.current = true;
        setChallengeDone(true);
        setChallengeStatus('Challenge completed.');
      }
      return;
    }

    if (activeChallengeType === 'look_up_down') {
      if (lookStageRef.current === 0) {
        setChallengeStatus('Step 1: look UP');
        if (dy < -0.03) lookStageRef.current = 1;
      } else if (lookStageRef.current === 1) {
        setChallengeStatus('Step 2: now look DOWN');
        if (dy > 0.025) {
          challengeDoneRef.current = true;
          setChallengeDone(true);
          setChallengeStatus('Challenge completed.');
        }
      }
      return;
    }

    if (activeChallengeType === 'blink_twice') {
      const leftEAR = eyeAspectRatio(landmarks, 33, 160, 158, 133, 153, 144);
      const rightEAR = eyeAspectRatio(landmarks, 263, 387, 385, 362, 380, 373);
      const ear = (leftEAR + rightEAR) / 2;

      if (ear < 0.19) {
        blinkClosedRef.current = true;
      } else if (ear > 0.23 && blinkClosedRef.current) {
        blinkClosedRef.current = false;
        blinkCountRef.current += 1;
      }

      setChallengeStatus(`Blink count: ${blinkCountRef.current}/2`);
      if (blinkCountRef.current >= 2) {
        challengeDoneRef.current = true;
        setChallengeDone(true);
        setChallengeStatus('Challenge completed.');
      }
    }
  }

  async function runFrameLoop() {
    const tick = async () => {
      rafRef.current = requestAnimationFrame(tick);
      if (!faceMeshRef.current || processingRef.current) return;
      const video = webcamRef.current?.video;
      if (!video || video.readyState < 2) return;
      processingRef.current = true;
      try {
        await faceMeshRef.current.send({ image: video });
      } catch {
        // ignore transient frame errors
      } finally {
        processingRef.current = false;
      }
    };
    rafRef.current = requestAnimationFrame(tick);
  }

  function goToChallengeStep() {
    setError('');
    if (!locationInside) {
      setError('Verify your location before continuing.');
      return;
    }
    setStep('challenge');
  }

  function goToRecordingStep() {
    setError('');
    if (!challengeDone) {
      setError('Complete the live challenge before recording.');
      return;
    }
    resetCapture();
    setStep('recording');
  }

  async function fetchAttendance(semValue) {
    if (!semValue) return;
    try {
      const data = await getMyAttendance(semValue);
      setRows(data?.attendance || []);
    } catch {
      setRows([]);
    }
  }

  function resetCapture() {
    setVideoBlob(null);
    if (previewUrl) URL.revokeObjectURL(previewUrl);
    setPreviewUrl('');
    setRecording(false);
  }

  function startRecording() {
    setError('');
    setMessage('');
    if (!challengeDone) {
      setError('Please complete the live challenge before recording.');
      return;
    }
    const stream = webcamRef.current?.stream;
    if (!stream) {
      setError('Camera stream not available. Please allow camera permission.');
      return;
    }
    if (!mimeType) {
      setError('This browser does not support video recording.');
      return;
    }

    resetCapture();
    chunksRef.current = [];
    const recorder = new MediaRecorder(stream, { mimeType });
    mediaRecorderRef.current = recorder;

    recorder.ondataavailable = (event) => {
      if (event.data && event.data.size > 0) chunksRef.current.push(event.data);
    };

    recorder.onstop = () => {
      const blob = new Blob(chunksRef.current, { type: mimeType });
      const objectUrl = URL.createObjectURL(blob);
      setVideoBlob(blob);
      setPreviewUrl(objectUrl);
    };

    recorder.start();
    setRecording(true);
    setTimeout(() => {
      if (mediaRecorderRef.current?.state === 'recording') stopRecording();
    }, 5000);
  }

  function stopRecording() {
    if (mediaRecorderRef.current?.state === 'recording') {
      mediaRecorderRef.current.stop();
    }
    setRecording(false);
  }

  async function onSubmit(e) {
    e.preventDefault();
    setError('');
    setMessage('');

    if (!semester) return setError('Semester is required.');
    if (!videoBlob) return setError('Please record your attendance video first.');
    if (!challengeDone) return setError('Please complete challenge validation first.');
    if (!locationInside) return setError('Location verification is required.');

    let coords = locationCoords;
    try {
      coords = await getCurrentPosition();
      setLocationCoords(coords);

      const status = await getAttendanceGeofenceStatus();
      const configured = status?.configured ?? false;
      setGeofenceConfigured(configured);

      if (status?.geofenceEnabled && configured) {
        const check = await checkAttendanceLocation({
          latitude: coords.latitude,
          longitude: coords.longitude,
          accuracy: coords.accuracy,
          locationCapturedAt: coords.capturedAt,
        });
        if (!check?.ok) {
          setLocationInside(false);
          setLocationStatus(check?.message || 'Outside allowed hostel area.');
          setStep('location');
          return setError(check?.message || 'You must be inside the hostel area to mark attendance.');
        }
        setLocationInside(true);
        setLocationStatus(check?.message || 'Inside hostel area.');
      }
    } catch (locErr) {
      setStep('location');
      return setError(locErr?.message || 'Location is required to mark attendance.');
    }

    setLoading(true);
    try {
      const data = await submitAttendanceVideo({
        semester,
        videoBlob,
        challengeType: challenge?.type,
        challengeText: challenge?.text,
        latitude: coords.latitude,
        longitude: coords.longitude,
        locationAccuracy: coords.accuracy,
        locationCapturedAt: coords.capturedAt,
      });
      setMessage(data?.message || 'Attendance marked successfully.');
      const createdId = data?.attendance?.id ?? null;
      await fetchAttendance(semester);

      let tries = 0;
      const maxTries = 10;
      const interval = setInterval(async () => {
        tries += 1;
        try {
          const fresh = await getMyAttendance(semester);
          const freshRows = fresh?.attendance || [];
          setRows(freshRows);

          if (createdId) {
            const mine = freshRows.find((r) => r.id === createdId);
            if (mine && mine.verificationStatus && mine.verificationStatus !== 'pending') {
              clearInterval(interval);
              return;
            }
          } else {
            const latest = freshRows[0];
            if (latest && latest.verificationStatus && latest.verificationStatus !== 'pending') {
              clearInterval(interval);
              return;
            }
          }
        } catch {
          // ignore transient poll errors
        }
        if (tries >= maxTries) clearInterval(interval);
      }, 3000);
    } catch (eReq) {
      const data = eReq?.response?.data;
      setError(data?.message || 'Could not mark attendance.');
      if (data?.code === 'GEOFENCE_OUTSIDE' || data?.code === 'GEOFENCE_NOT_CONFIGURED') {
        setLocationInside(false);
        setLocationStatus(data.message);
        setStep('location');
      }
    } finally {
      setLoading(false);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 py-8 text-left">
      <h3 className="text-xl font-semibold text-gray-900">Mark Attendance</h3>
      <p className="mt-1 text-sm text-gray-600">
        Complete each step in order: verify location, pass the live challenge, then record your video.
      </p>

      <ol className="mt-4 flex flex-wrap gap-2 text-sm">
        {['Location', 'Live challenge', 'Record video'].map((label, i) => (
          <li
            key={label}
            className={`px-3 py-1.5 rounded-full border ${
              i === stepIndex
                ? 'bg-gray-900 text-white border-gray-900'
                : i < stepIndex
                  ? 'bg-green-50 text-green-800 border-green-200'
                  : 'bg-white text-gray-500 border-gray-200'
            }`}
          >
            {i + 1}. {label}
          </li>
        ))}
      </ol>

      <form onSubmit={onSubmit} className="mt-4 p-4 bg-white border rounded-lg">
        <div className="max-w-xs">
          <label className="block text-sm">Semester</label>
          <input
            value={semester}
            onChange={(e) => setSemester(e.target.value)}
            className="w-full border rounded px-3 py-2 text-sm"
            placeholder="3"
            required
          />
        </div>

        {step === 'location' && (
          <div className="mt-4 border rounded-lg p-4 bg-slate-50">
            <p className="text-sm font-semibold text-slate-900">Step 1: Location check</p>
            <p className={`mt-2 text-sm ${locationInside ? 'text-green-700' : 'text-amber-800'}`}>
              {locationStatus}
            </p>
            {geofenceConfigured === false && (
              <p className="mt-1 text-xs text-amber-700">
                Your warden must configure the hostel boundary before attendance can be marked.
              </p>
            )}
            <div className="mt-3 flex flex-wrap gap-2">
              <button
                type="button"
                onClick={refreshLocation}
                disabled={locationLoading}
                className="px-3 py-1.5 rounded border text-sm bg-white hover:bg-gray-50 disabled:opacity-50"
              >
                {locationLoading ? 'Checking...' : 'Refresh location'}
              </button>
              <button
                type="button"
                onClick={goToChallengeStep}
                disabled={locationLoading || !locationInside}
                className="px-3 py-1.5 rounded bg-gray-900 text-white text-sm disabled:opacity-50"
              >
                Continue to challenge
              </button>
            </div>
          </div>
        )}

        {(step === 'challenge' || step === 'recording') && (
          <div className="mt-4">
            {step === 'challenge' && (
              <div className="border rounded-lg p-4 bg-amber-50 mb-4">
                <p className="text-sm font-semibold text-amber-900">Step 2: Liveness challenge</p>
                <p className="mt-1 text-sm text-amber-800">{challenge?.text}</p>
                <div className="mt-3 flex flex-wrap gap-2 items-center">
                  <span className={`text-sm font-medium ${challengeDone ? 'text-green-700' : 'text-amber-800'}`}>
                    {challengeStatus}
                  </span>
                  <button
                    type="button"
                    className="px-3 py-1 rounded border text-sm bg-white"
                    onClick={() => {
                      setChallenge(CHALLENGES[Math.floor(Math.random() * CHALLENGES.length)]);
                      resetChallengeProgress();
                    }}
                  >
                    New challenge
                  </button>
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => setStep('location')}
                    className="px-3 py-1.5 rounded border text-sm bg-white"
                  >
                    Back
                  </button>
                  <button
                    type="button"
                    onClick={goToRecordingStep}
                    disabled={!challengeDone}
                    className="px-3 py-1.5 rounded bg-gray-900 text-white text-sm disabled:opacity-50"
                  >
                    Continue to recording
                  </button>
                </div>
              </div>
            )}

            {step === 'recording' && (
              <div className="mb-3">
                <p className="text-sm font-semibold text-gray-900">Step 3: Record attendance video</p>
                <p className="mt-1 text-sm text-green-700">Challenge completed. Record a short selfie clip.</p>
              </div>
            )}

            <div className={step === 'recording' ? 'grid md:grid-cols-2 gap-4' : 'max-w-md'}>
              <div className="border rounded-lg p-3">
                <Webcam
                  ref={webcamRef}
                  audio={step === 'recording'}
                  muted
                  playsInline
                  className="w-full rounded-md bg-black"
                  videoConstraints={{ facingMode: { ideal: 'user' } }}
                />
                {step === 'recording' && (
                  <div className="mt-3 flex gap-2">
                    {!recording ? (
                      <button
                        type="button"
                        onClick={startRecording}
                        className="px-3 py-2 rounded bg-gray-900 text-white text-sm"
                      >
                        Start 5s recording
                      </button>
                    ) : (
                      <button
                        type="button"
                        onClick={stopRecording}
                        className="px-3 py-2 rounded bg-red-600 text-white text-sm"
                      >
                        Stop
                      </button>
                    )}
                    <button type="button" onClick={resetCapture} className="px-3 py-2 rounded border text-sm">
                      Reset
                    </button>
                  </div>
                )}
              </div>

              {step === 'recording' && (
                <div className="border rounded-lg p-3">
                  <p className="text-sm font-medium">Preview</p>
                  {previewUrl ? (
                    <video src={previewUrl} controls playsInline className="mt-2 w-full rounded-md" />
                  ) : (
                    <p className="mt-2 text-sm text-gray-500">No clip recorded yet.</p>
                  )}
                </div>
              )}
            </div>

            {step === 'recording' && (
              <button
                type="button"
                onClick={() => {
                  resetCapture();
                  setStep('challenge');
                }}
                className="mt-3 px-3 py-1.5 rounded border text-sm bg-white"
              >
                Back to challenge
              </button>
            )}
          </div>
        )}

        {step === 'recording' && (
          <div className="mt-4 flex items-center gap-2">
            <button
              type="submit"
              className="px-4 py-2 rounded bg-green-700 text-white text-sm"
              disabled={loading || !videoBlob}
            >
              {loading ? 'Submitting...' : 'Submit attendance'}
            </button>
            <button
              type="button"
              className="px-4 py-2 rounded border text-sm"
              onClick={() => fetchAttendance(semester)}
              disabled={!semester}
            >
              Refresh my attendance
            </button>
          </div>
        )}

        {message && <div className="mt-3 p-3 border rounded bg-green-50 text-green-700 text-sm">{message}</div>}
        {error && <div className="mt-3 p-3 border rounded bg-red-50 text-red-700 text-sm">{error}</div>}
      </form>

      <div className="mt-6 overflow-x-auto rounded-lg border bg-white">
        <table className="w-full table-fixed border-collapse text-sm text-left">
          <thead>
            <tr className="border-b bg-gray-50">
              <th className="px-3 py-2 font-medium text-gray-700">Date</th>
              <th className="px-3 py-2 font-medium text-gray-700">Check-in</th>
              <th className="px-3 py-2 font-medium text-gray-700">Status</th>
              <th className="px-3 py-2 font-medium text-gray-700">Verification</th>
              <th className="px-3 py-2 font-medium text-gray-700">Remark</th>
              <th className="px-3 py-2 font-medium text-gray-700">Video</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((row) => (
              <tr key={row.id} className="border-b">
                <td className="px-3 py-2">{row.attendanceDate}</td>
                <td className="px-3 py-2">{new Date(row.checkInTime).toLocaleString()}</td>
                <td className="px-3 py-2">{row.status}</td>
                <td className="px-3 py-2">{row.verificationStatus}</td>
                <td className="px-3 py-2 text-xs text-gray-700 line-clamp-2">{row.verificationRemark || '—'}</td>
                <td className="px-3 py-2">
                  <a className="text-blue-600 underline" href={row.proofVideoUrl} target="_blank" rel="noreferrer">
                    Open
                  </a>
                </td>
              </tr>
            ))}
            {rows.length === 0 && (
              <tr>
                <td colSpan="6" className="px-3 py-4 text-gray-500">
                  No attendance records yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
