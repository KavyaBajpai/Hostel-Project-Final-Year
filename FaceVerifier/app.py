import os
import tempfile
from typing import List, Optional, Tuple
from urllib.parse import urlparse

import cv2
import numpy as np
import onnxruntime as ort
import requests
from antispoof import ensure_antispoof_model, run_antispoof_on_frames
from fastapi import FastAPI, HTTPException
from pydantic import BaseModel, HttpUrl


MATCH_THRESHOLD = float(os.getenv("ARCFACE_MATCH_THRESHOLD", "0.35"))
MAX_FRAMES_TO_CHECK = int(os.getenv("MAX_FRAMES_TO_CHECK", "8"))
ARCFACE_MODEL_URL = os.getenv(
    "ARCFACE_MODEL_URL",
    "https://huggingface.co/maze/faceX/resolve/main/w600k_r50.onnx",
)
ARCFACE_MODEL_PATH = os.getenv(
    "ARCFACE_MODEL_PATH",
    os.path.join(tempfile.gettempdir(), "arcface_r100.onnx"),
)

app = FastAPI(title="Attendance Face Verifier (ONNX)")

session: Optional[ort.InferenceSession] = None
input_name: Optional[str] = None
output_name: Optional[str] = None

haar_path = os.path.join(cv2.data.haarcascades, "haarcascade_frontalface_default.xml")
face_detector = cv2.CascadeClassifier(haar_path)


class VerifyRequest(BaseModel):
    attendanceId: int
    videoUrl: HttpUrl
    referenceImageUrl: HttpUrl


class VerifyResponse(BaseModel):
    attendance_id: int
    matched: bool
    score: Optional[float]
    threshold: float
    frame_index: Optional[int]
    reason: str
    liveness_passed: bool
    liveness_reason: str
    antispoof_passed: bool
    antispoof_score: Optional[float]


def ensure_arcface_model():
    if os.path.exists(ARCFACE_MODEL_PATH):
        print(f"[verifier] model present at {ARCFACE_MODEL_PATH}")
        return
    os.makedirs(os.path.dirname(ARCFACE_MODEL_PATH), exist_ok=True)
    print(f"[verifier] downloading model from {ARCFACE_MODEL_URL}")
    resp = requests.get(ARCFACE_MODEL_URL, timeout=120)
    resp.raise_for_status()
    with open(ARCFACE_MODEL_PATH, "wb") as f:
        f.write(resp.content)
    print(f"[verifier] model saved to {ARCFACE_MODEL_PATH} bytes={os.path.getsize(ARCFACE_MODEL_PATH)}")


def init_onnx():
    global session, input_name, output_name
    if session is not None:
        return
    ensure_arcface_model()
    session = ort.InferenceSession(ARCFACE_MODEL_PATH, providers=["CPUExecutionProvider"])
    input_name = session.get_inputs()[0].name
    output_name = session.get_outputs()[0].name


def download_to_temp(url: str, suffix: str) -> str:
    response = requests.get(url, timeout=45)
    response.raise_for_status()
    fd, path = tempfile.mkstemp(suffix=suffix)
    with os.fdopen(fd, "wb") as temp_file:
        temp_file.write(response.content)
    return path


def cosine_similarity(vec_a: np.ndarray, vec_b: np.ndarray) -> float:
    denom = np.linalg.norm(vec_a) * np.linalg.norm(vec_b)
    if denom == 0:
        return -1.0
    return float(np.dot(vec_a, vec_b) / denom)


def detect_largest_face(image: np.ndarray) -> Optional[np.ndarray]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    faces = face_detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(50, 50))
    if len(faces) == 0:
        return None
    x, y, w, h = max(faces, key=lambda b: b[2] * b[3])
    return image[y : y + h, x : x + w]


def detect_largest_face_bbox(image: np.ndarray) -> Optional[Tuple[int, int, int, int]]:
    gray = cv2.cvtColor(image, cv2.COLOR_BGR2GRAY)
    faces = face_detector.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=4, minSize=(50, 50))
    if len(faces) == 0:
        return None
    x, y, w, h = max(faces, key=lambda b: b[2] * b[3])
    return (x, y, w, h)


def arcface_embedding(face_bgr: np.ndarray) -> np.ndarray:
    init_onnx()
    face_rgb = cv2.cvtColor(face_bgr, cv2.COLOR_BGR2RGB)
    face_rgb = cv2.resize(face_rgb, (112, 112))
    tensor = face_rgb.astype(np.float32)
    tensor = (tensor - 127.5) / 128.0
    tensor = np.transpose(tensor, (2, 0, 1))
    tensor = np.expand_dims(tensor, axis=0)
    emb = session.run([output_name], {input_name: tensor})[0][0]
    emb = emb.astype(np.float32)
    norm = np.linalg.norm(emb)
    if norm > 0:
        emb = emb / norm
    return emb


def build_even_sample_positions(total_frames: int, max_frames: int) -> List[int]:
    if total_frames <= 0:
        return []
    if total_frames <= max_frames:
        return list(range(total_frames))
    spread = np.linspace(0, total_frames - 1, num=max_frames, dtype=int).tolist()
    return sorted(set(spread))


def read_sampled_frames(
    video_path: str,
    sample_count: int,
) -> List[Tuple[int, np.ndarray]]:
    """
    Decode video sequentially and return evenly spaced (index, frame) pairs.

    Browser WebM often reports bogus CAP_PROP_FRAME_COUNT / FPS; seeking by frame
    index then fails or returns duplicates. Sequential decode is reliable.
    """
    max_decode = int(os.getenv("MAX_FRAMES_TO_DECODE", "600"))
    cap = cv2.VideoCapture(video_path)
    if not cap.isOpened():
        return []

    reported_count = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    reported_fps = float(cap.get(cv2.CAP_PROP_FPS))
    print(
        f"[verifier] video metadata frame_count={reported_count} fps={reported_fps} "
        "(may be unreliable for webm)"
    )

    decoded: List[Tuple[int, np.ndarray]] = []
    frame_idx = 0
    while frame_idx < max_decode:
        ok, frame = cap.read()
        if not ok or frame is None:
            break
        decoded.append((frame_idx, frame))
        frame_idx += 1
    cap.release()

    print(f"[verifier] decoded_frames={len(decoded)}")
    if not decoded:
        return []

    positions = build_even_sample_positions(len(decoded), sample_count)
    sampled = [decoded[pos] for pos in positions]
    print(f"[verifier] sample_positions={positions} sampled_count={len(sampled)}")
    return sampled


def embedding_from_frame(frame: np.ndarray) -> Optional[np.ndarray]:
    face = detect_largest_face(frame)
    if face is None or face.size == 0:
        return None
    return arcface_embedding(face)


def verify_face(
    reference_image_path: str,
    video_path: str,
) -> Tuple[bool, Optional[float], Optional[int], str, bool, str, bool, Optional[float]]:
    reference_img = cv2.imread(reference_image_path)
    if reference_img is None:
        return False, None, None, "Unable to read reference image.", False, "reference_image_unreadable", False, None

    ref_face = detect_largest_face(reference_img)
    if ref_face is None or ref_face.size == 0:
        return False, None, None, "No face detected in reference image.", False, "reference_face_missing", False, None
    reference_embedding = arcface_embedding(ref_face)

    sampled_frames = read_sampled_frames(video_path, MAX_FRAMES_TO_CHECK)
    if not sampled_frames:
        return False, None, None, "No frames found in video.", False, "no_frames", False, None

    antispoof_passed, antispoof_reason, antispoof_score = run_antispoof_on_frames(
        sampled_frames,
        detect_largest_face_bbox,
    )
    print(
        f"[verifier] antispoof_passed={antispoof_passed} antispoof_score={antispoof_score} reason={antispoof_reason}"
    )

    if not antispoof_passed:
        return (
            False,
            None,
            None,
            "Rejected due to failed anti-spoof (liveness) check.",
            False,
            antispoof_reason,
            False,
            round(antispoof_score, 4) if antispoof_score is not None else None,
        )

    best_score = -1.0
    best_frame = None
    evaluated = 0

    for frame_idx, frame in sampled_frames:
        emb = embedding_from_frame(frame)
        if emb is None:
            continue
        evaluated += 1
        score = cosine_similarity(reference_embedding, emb)
        if score > best_score:
            best_score = score
            best_frame = frame_idx

    if evaluated == 0:
        return False, None, None, "No detectable face found in sampled video frames.", False, "no_face_in_video", True, round(antispoof_score, 4)

    matched = best_score >= MATCH_THRESHOLD
    reason = "ArcFace match passed threshold." if matched else "ArcFace match below threshold."
    return (
        matched,
        round(best_score, 4),
        best_frame,
        reason,
        True,
        antispoof_reason,
        True,
        round(antispoof_score, 4),
    )


@app.get("/health")
def health():
    return {"status": "ok"}


@app.on_event("startup")
def startup_event():
    init_onnx()
    try:
        ensure_antispoof_model()
    except Exception as err:
        print(f"[antispoof] startup preload failed (will retry on first request): {err}")


@app.post("/verify-attendance", response_model=VerifyResponse)
def verify_attendance(payload: VerifyRequest):
    reference_path = None
    video_path = None
    try:
        print(
            f"[verifier] request attendanceId={payload.attendanceId} videoUrl={payload.videoUrl} referenceImageUrl={payload.referenceImageUrl}"
        )
        parsed_video = urlparse(str(payload.videoUrl))
        video_ext = os.path.splitext(parsed_video.path)[1] or ".mp4"
        reference_path = download_to_temp(str(payload.referenceImageUrl), ".jpg")
        video_path = download_to_temp(str(payload.videoUrl), video_ext)
        print(f"[verifier] downloaded ref={reference_path} video={video_path}")

        matched, score, frame_index, reason, liveness_passed, liveness_reason, antispoof_passed, antispoof_score = verify_face(
            reference_path, video_path
        )
        print(
            f"[verifier] result matched={matched} score={score} frame_index={frame_index} "
            f"threshold={MATCH_THRESHOLD} liveness_passed={liveness_passed} antispoof_passed={antispoof_passed}"
        )
        return VerifyResponse(
            attendance_id=payload.attendanceId,
            matched=matched,
            score=score,
            threshold=MATCH_THRESHOLD,
            frame_index=frame_index,
            reason=reason,
            liveness_passed=liveness_passed,
            liveness_reason=liveness_reason,
            antispoof_passed=antispoof_passed,
            antispoof_score=antispoof_score,
        )
    except requests.RequestException as req_err:
        raise HTTPException(status_code=400, detail=f"Failed to download media: {req_err}") from req_err
    except Exception as err:
        raise HTTPException(status_code=500, detail=f"Verification failed: {err}") from err
    finally:
        if reference_path and os.path.exists(reference_path):
            os.remove(reference_path)
        if video_path and os.path.exists(video_path):
            os.remove(video_path)
