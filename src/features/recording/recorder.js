import { generateId, isMobile, getSupportedMimeType, fileExtFromMime } from '../../shared/utils.js';
import { POSTURE_NAMES } from '../../data/postures.js';

let _mediaRecorder   = null;
let _recordedChunks  = [];
let _frameData       = [];
let _recordingStart  = 0;
let _timerInterval   = null;
let _autoStopTimeout = null;
let _canvasStream    = null;
let _mimeType        = '';
let _active          = false;
let _onStop          = null;
let _onTick          = null;
let _maxDuration     = 30000;
let _dorsalValue     = '';
let _postureValue    = '';
let _width           = 640;
let _height          = 480;
let _fps             = 30;

export function isActive() { return _active; }

export function addFrame(frame) {
  if (_active && frame) _frameData.push(frame);
}

export function startRecording(canvas, {
  dorsalValue  = '',
  postureValue = '',
  width        = 640,
  height       = 480,
  maxDuration  = 30000,
  fps          = 30,
  onStop,
  onTick,
} = {}) {
  if (_active) return;

  _recordedChunks = [];
  _frameData      = [];
  _recordingStart = performance.now();
  _maxDuration    = maxDuration;
  _dorsalValue    = dorsalValue;
  _postureValue   = postureValue;
  _width          = width;
  _height         = height;
  _fps            = fps;
  _onStop         = onStop;
  _onTick         = onTick;
  _active         = true;

  _canvasStream = canvas.captureStream(fps);
  _mimeType     = getSupportedMimeType();

  try {
    const options  = _mimeType ? { mimeType: _mimeType } : {};
    _mediaRecorder = new MediaRecorder(_canvasStream, options);
    _mimeType      = _mediaRecorder.mimeType || _mimeType;
  } catch {
    _mediaRecorder = new MediaRecorder(_canvasStream);
    _mimeType      = _mediaRecorder.mimeType || 'video/webm';
  }

  _mediaRecorder.ondataavailable = (e) => {
    if (e.data && e.data.size > 0) _recordedChunks.push(e.data);
  };
  _mediaRecorder.onstop = _handleStop;
  _mediaRecorder.start(200);

  _timerInterval = setInterval(() => {
    const elapsed = performance.now() - _recordingStart;
    const pct     = isFinite(_maxDuration) ? Math.min(elapsed / _maxDuration * 100, 100) : 0;
    if (_onTick) _onTick({ elapsed, pct });
  }, 250);

  if (isFinite(maxDuration)) {
    _autoStopTimeout = setTimeout(() => {
      if (_active) stopRecording();
    }, maxDuration);
  }
}

export function stopRecording() {
  if (!_active) return;
  _active = false;
  clearInterval(_timerInterval);
  clearTimeout(_autoStopTimeout);
  if (_mediaRecorder && _mediaRecorder.state !== 'inactive') _mediaRecorder.stop();
  if (_canvasStream) { _canvasStream.getTracks().forEach(t => t.stop()); _canvasStream = null; }
}

// ── Internal ─────────────────────────────────────────────────────────────────

function _handleStop() {
  const durationMs  = performance.now() - _recordingStart;
  const durationS   = parseFloat((durationMs / 1000).toFixed(2));
  const totalFrames = _frameData.length;
  const avgFps      = totalFrames > 0 ? parseFloat((totalFrames / durationS).toFixed(1)) : 0;
  const ext         = fileExtFromMime(_mimeType);
  const videoBlob   = new Blob(_recordedChunks, { type: _mimeType });

  const metaJson = {
    recording: {
      id               : generateId(),
      dorsal           : _dorsalValue  || null,
      posture_code     : _postureValue ? parseInt(_postureValue) : null,
      posture_name     : _postureValue ? POSTURE_NAMES[_postureValue] : null,
      date             : new Date().toISOString(),
      duration_seconds : durationS,
      fps              : avgFps,
      resolution       : { width: _width, height: _height },
      device           : navigator.userAgent,
      platform         : isMobile() ? 'mobile' : 'desktop',
      video_mime       : _mimeType,
    },
    frames: _frameData,
  };

  if (_onStop) _onStop(videoBlob, metaJson, { durationS, totalFrames, avgFps, ext });
}
