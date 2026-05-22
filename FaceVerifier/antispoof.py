"""
Silent-Face-Anti-Spoofing (MiniFASNetV2) inference for attendance videos.
"""
import os
import tempfile
from typing import List, Optional, Tuple

import cv2
import numpy as np
import requests
import torch
import torch.nn.functional as F

from minifasnet import MiniFASNetV2

ANTI_SPOOF_MODEL_URL = os.getenv(
    "ANTI_SPOOF_MODEL_URL",
    "https://github.com/minivision-ai/Silent-Face-Anti-Spoofing/raw/master/resources/anti_spoof_models/2.7_80x80_MiniFASNetV2.pth",
)
ANTI_SPOOF_MODEL_PATH = os.getenv(
    "ANTI_SPOOF_MODEL_PATH",
    os.path.join(tempfile.gettempdir(), "2.7_80x80_MiniFASNetV2.pth"),
)
ANTI_SPOOF_ENABLED = os.getenv("ANTI_SPOOF_ENABLED", "true").lower() in ("1", "true", "yes")
ANTI_SPOOF_THRESHOLD = float(os.getenv("ANTI_SPOOF_THRESHOLD", "0.5"))
ANTI_SPOOF_MIN_REAL_FRAMES = int(os.getenv("ANTI_SPOOF_MIN_REAL_FRAMES", "2"))
ANTI_SPOOF_REAL_CLASS_INDEX = int(os.getenv("ANTI_SPOOF_REAL_CLASS_INDEX", "1"))

_model: Optional[torch.nn.Module] = None
_model_meta: Optional[dict] = None


def _get_kernel(height: int, width: int) -> Tuple[int, int]:
    return (height + 15) // 16, (width + 15) // 16


def _parse_model_name(model_name: str) -> Tuple[int, int, float]:
    base = os.path.basename(model_name).replace(".pth", "")
    parts = base.split("_")
    h_input, w_input = parts[-2].split("x")
    scale = float(parts[0])
    return int(h_input), int(w_input), scale


def _crop_face_patch(org_img: np.ndarray, bbox: Tuple[int, int, int, int], scale: float, out_w: int, out_h: int) -> np.ndarray:
    x, y, w, h = bbox
    src_h, src_w = org_img.shape[:2]
    box_scale = min((src_h - 1) / max(h, 1), min((src_w - 1) / max(w, 1), scale))
    new_width = w * box_scale
    new_height = h * box_scale
    center_x, center_y = w / 2 + x, h / 2 + y
    left_top_x = center_x - new_width / 2
    left_top_y = center_y - new_height / 2
    right_bottom_x = center_x + new_width / 2
    right_bottom_y = center_y + new_height / 2

    if left_top_x < 0:
        right_bottom_x -= left_top_x
        left_top_x = 0
    if left_top_y < 0:
        right_bottom_y -= left_top_y
        left_top_y = 0
    if right_bottom_x > src_w - 1:
        left_top_x -= right_bottom_x - src_w + 1
        right_bottom_x = src_w - 1
    if right_bottom_y > src_h - 1:
        left_top_y -= right_bottom_y - src_h + 1
        right_bottom_y = src_h - 1

    patch = org_img[int(left_top_y) : int(right_bottom_y) + 1, int(left_top_x) : int(right_bottom_x) + 1]
    return cv2.resize(patch, (out_w, out_h))


def ensure_antispoof_model() -> None:
    global _model, _model_meta
    if _model is not None:
        return

    if not os.path.exists(ANTI_SPOOF_MODEL_PATH):
        os.makedirs(os.path.dirname(ANTI_SPOOF_MODEL_PATH), exist_ok=True)
        print(f"[antispoof] downloading model from {ANTI_SPOOF_MODEL_URL}")
        resp = requests.get(ANTI_SPOOF_MODEL_URL, timeout=120)
        resp.raise_for_status()
        with open(ANTI_SPOOF_MODEL_PATH, "wb") as f:
            f.write(resp.content)
        print(f"[antispoof] model saved to {ANTI_SPOOF_MODEL_PATH}")

    out_h, out_w, scale = _parse_model_name(ANTI_SPOOF_MODEL_PATH)
    kernel_size = _get_kernel(out_h, out_w)
    device = torch.device("cpu")
    model = MiniFASNetV2(conv6_kernel=kernel_size).to(device)
    state_dict = torch.load(ANTI_SPOOF_MODEL_PATH, map_location=device)
    if any(k.startswith("module.") for k in state_dict):
        state_dict = {k.replace("module.", "", 1): v for k, v in state_dict.items()}
    model.load_state_dict(state_dict)
    model.eval()

    _model = model
    _model_meta = {"out_h": out_h, "out_w": out_w, "scale": scale, "device": device}
    print(f"[antispoof] model ready path={ANTI_SPOOF_MODEL_PATH} size={out_w}x{out_h} scale={scale}")


def _predict_antispoof(face_bgr: np.ndarray) -> Optional[Tuple[int, np.ndarray]]:
    """
    Silent-Face ToTensor uses float pixel values in 0-255 range (no /255) and
    keeps OpenCV BGR channel order from the cropped patch.
    """
    ensure_antispoof_model()
    assert _model is not None and _model_meta is not None

    if face_bgr.ndim == 2:
        face_bgr = face_bgr.reshape(face_bgr.shape[0], face_bgr.shape[1], 1)

    tensor = torch.from_numpy(face_bgr.transpose(2, 0, 1)).float()
    tensor = tensor.unsqueeze(0).to(_model_meta["device"])

    with torch.no_grad():
        logits = _model(tensor)
        probs = F.softmax(logits, dim=1).cpu().numpy()[0]

    if probs.shape[0] == 0:
        return None
    label = int(np.argmax(probs))
    return label, probs


def score_frame_antispoof(
    frame: np.ndarray,
    detect_bbox_fn,
) -> Tuple[Optional[float], Optional[int], Optional[np.ndarray]]:
    bbox = detect_bbox_fn(frame)
    if bbox is None:
        return None, None, None

    assert _model_meta is not None
    patch = _crop_face_patch(frame, bbox, _model_meta["scale"], _model_meta["out_w"], _model_meta["out_h"])
    prediction = _predict_antispoof(patch)
    if prediction is None:
        return None, None, None
    label, probs = prediction
    real_score = float(probs[ANTI_SPOOF_REAL_CLASS_INDEX]) if probs.shape[0] > ANTI_SPOOF_REAL_CLASS_INDEX else 0.0
    return real_score, label, probs


def run_antispoof_on_frames(
    sampled_frames: List[Tuple[int, np.ndarray]],
    detect_bbox_fn,
) -> Tuple[bool, str, float]:
    """
    Returns (passed, reason, best_real_score).
    Class index 1 in MiniFASNetV2 is the live-face label in Silent-Face-Anti-Spoofing.
    """
    if not ANTI_SPOOF_ENABLED:
        return True, "antispoof_disabled", 1.0

    ensure_antispoof_model()
    real_scores: List[float] = []
    evaluated = 0

    live_labels = 0
    for frame_idx, frame in sampled_frames:
        score, label, probs = score_frame_antispoof(frame, detect_bbox_fn)
        if score is None or label is None:
            print(f"[antispoof] frame_index={frame_idx} skipped (no_face_or_predict_failed)")
            continue
        evaluated += 1
        real_scores.append(score)
        if label == ANTI_SPOOF_REAL_CLASS_INDEX:
            live_labels += 1
        probs_str = ",".join(f"{p:.4f}" for p in probs.tolist()) if probs is not None else "n/a"
        print(
            f"[antispoof] frame_index={frame_idx} label={label} probs=[{probs_str}] "
            f"real_score={score:.4f}"
        )

    if evaluated == 0:
        return False, "no_face_for_antispoof", 0.0

    best_score = float(max(real_scores))
    min_required = min(ANTI_SPOOF_MIN_REAL_FRAMES, evaluated)
    # Silent-Face demo: argmax label 1 = real face.
    if live_labels < min_required:
        return (
            False,
            f"antispoof_failed(live_labels={live_labels}<{min_required},best={best_score:.4f},thr={ANTI_SPOOF_THRESHOLD})",
            best_score,
        )

    return True, f"antispoof_ok(live_labels={live_labels},best={best_score:.4f})", best_score
