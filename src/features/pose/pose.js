import { LANDMARK_NAMES, POSE_CONNECTIONS } from '../../data/landmarks.js';

let _pose           = null;
let _ctx            = null;
let _canvas         = null;
let _facingMode     = 'environment';
let _isRecording    = false;
let _recordingStart = 0;
let _frameIndex     = 0;
let _lastFrame      = null;
let _frameCallback  = null;

export async function initPose(ctx, canvas) {
  _ctx    = ctx;
  _canvas = canvas;
  return new Promise((resolve, reject) => {
    try {
      const pose = new Pose({          // eslint-disable-line no-undef
        locateFile: (file) =>
          `https://cdn.jsdelivr.net/npm/@mediapipe/pose@0.5.1675469404/${file}`,
      });
      pose.setOptions({
        modelComplexity        : 1,
        smoothLandmarks        : true,
        enableSegmentation     : false,
        smoothSegmentation     : false,
        minDetectionConfidence : 0.5,
        minTrackingConfidence  : 0.5,
      });
      pose.onResults(_onResults);
      pose.initialize().then(() => { _pose = pose; resolve(); }).catch(reject);
    } catch (e) { reject(e); }
  });
}

export function setFacingMode(mode)  { _facingMode = mode; }
export function sendFrame(image)     { return _pose.send({ image }); }
export function getLastFrame()       { return _lastFrame; }
export function setFrameCallback(cb) { _frameCallback = cb; }

export function setRecordingState(isActive, startTime = 0) {
  _isRecording    = isActive;
  _recordingStart = startTime;
  if (isActive) _frameIndex = 0;
}

// ── Internal ─────────────────────────────────────────────────────────────────

function _mx(x) { return _facingMode === 'user' ? 1 - x : x; }

function _onResults(results) {
  _drawFrame(results);
  if (_isRecording) {
    _lastFrame = _captureFrameMeta(results, _recordingStart, _frameIndex++);
    if (_frameCallback) _frameCallback(_lastFrame);
  }
}

function _drawFrame(results) {
  const w = _canvas.width;
  const h = _canvas.height;
  _ctx.clearRect(0, 0, w, h);

  _ctx.save();
  if (_facingMode === 'user') { _ctx.translate(w, 0); _ctx.scale(-1, 1); }
  if (results.image) _ctx.drawImage(results.image, 0, 0, w, h);
  _ctx.restore();

  if (results.poseLandmarks && results.poseLandmarks.length > 0) {
    _drawSkeleton(results.poseLandmarks, w, h);
    _drawLandmarks(results.poseLandmarks, w, h);
  }
}

function _drawSkeleton(landmarks, w, h) {
  _ctx.save();
  _ctx.lineWidth   = 2.5;
  _ctx.strokeStyle = 'rgba(255, 255, 255, 0.75)';
  _ctx.lineCap     = 'round';
  for (const [a, b] of POSE_CONNECTIONS) {
    const lA = landmarks[a];
    const lB = landmarks[b];
    if (!lA || !lB) continue;
    if ((lA.visibility ?? 1) < 0.3 || (lB.visibility ?? 1) < 0.3) continue;
    _ctx.beginPath();
    _ctx.moveTo(_mx(lA.x) * w, lA.y * h);
    _ctx.lineTo(_mx(lB.x) * w, lB.y * h);
    _ctx.stroke();
  }
  _ctx.restore();
}

function _drawLandmarks(landmarks, w, h) {
  for (let i = 0; i < landmarks.length; i++) {
    const lm  = landmarks[i];
    if (!lm) continue;
    const vis = lm.visibility ?? 1;
    if (vis < 0.3) continue;
    const x = _mx(lm.x) * w;
    const y = lm.y * h;
    const r = i === 0 ? 5 : 4;
    _ctx.beginPath();
    _ctx.arc(x, y, r + 1.5, 0, Math.PI * 2);
    _ctx.fillStyle = 'rgba(0,0,0,0.5)';
    _ctx.fill();
    _ctx.beginPath();
    _ctx.arc(x, y, r, 0, Math.PI * 2);
    _ctx.fillStyle = i <= 10 ? '#00e5ff' : '#ff5252';
    _ctx.fill();
  }
}

function _captureFrameMeta(results, recordingStart, frameIndex) {
  const ts  = performance.now() - recordingStart;
  const lms = (results.poseLandmarks || []).map((lm, i) => ({
    index      : i,
    name       : LANDMARK_NAMES[i] || `landmark_${i}`,
    x          : parseFloat(lm.x.toFixed(6)),
    y          : parseFloat(lm.y.toFixed(6)),
    z          : parseFloat((lm.z || 0).toFixed(6)),
    visibility : parseFloat(((lm.visibility ?? 1)).toFixed(4)),
  }));
  return {
    frame_index  : frameIndex,
    timestamp_ms : parseFloat(ts.toFixed(2)),
    landmarks    : lms,
  };
}
