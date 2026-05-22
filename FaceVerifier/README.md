# FaceVerifier Service (ArcFace + Silent-Face Anti-Spoof)

This service verifies attendance videos against a resident reference face image:

1. **Silent-Face Anti-Spoofing** (MiniFASNetV2, PyTorch) on sampled video frames
2. **ArcFace** (ONNX Runtime) identity match vs reference face

The browser still runs MediaPipe challenge heuristics first; only after that does the client upload video. Server-side anti-spoof runs before ArcFace.

## 1) Setup

```bash
cd FaceVerifier
python -m venv .venv
# Windows:
.venv\Scripts\activate
# Linux/macOS:
# source .venv/bin/activate

pip install -r requirements.txt
```

## 2) Run

```bash
uvicorn app:app --host 0.0.0.0 --port 8001 --reload
```

Health check:

```bash
GET http://127.0.0.1:8001/health
```

## 3) Backend integration

Set in `Backend/.env`:

```env
PYTHON_VERIFY_URL=http://127.0.0.1:8001/verify-attendance
ARCFACE_MATCH_THRESHOLD=0.45
MAX_FRAMES_TO_CHECK=8
ANTI_SPOOF_ENABLED=true
ANTI_SPOOF_THRESHOLD=0.5
ANTI_SPOOF_MIN_REAL_FRAMES=2
```

Optional model overrides:

```env
ARCFACE_MODEL_URL=https://github.com/deepinsight/insightface/releases/download/v0.7/glint360k_r100FC_1.0.onnx
ARCFACE_MODEL_PATH=C:\temp\arcface_r100.onnx
```

Recommended default model URL:

```env
ARCFACE_MODEL_URL=https://huggingface.co/maze/faceX/resolve/main/w600k_r50.onnx
```

## 4) Verify API

`POST /verify-attendance`

```json
{
  "attendanceId": 123,
  "videoUrl": "https://...",
  "referenceImageUrl": "https://..."
}
```

Response:

```json
{
  "attendance_id": 123,
  "matched": true,
  "score": 0.61,
  "threshold": 0.45,
  "frame_index": 87,
  "reason": "ArcFace match passed threshold.",
  "liveness_passed": true,
  "liveness_reason": "antispoof_ok(real_frames=5,best=0.91)",
  "antispoof_passed": true,
  "antispoof_score": 0.91
}
```

Anti-spoof model weights download automatically on first run from the [Silent-Face-Anti-Spoofing](https://github.com/minivision-ai/Silent-Face-Anti-Spoofing) repo (`2.7_80x80_MiniFASNetV2.pth`).

## Windows note

Because this variant avoids compiling `insightface`, you should not need MSVC build tools for normal installation.
