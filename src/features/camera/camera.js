let _videoEl      = null;
let _animFrameId  = null;
let _facingMode   = 'environment';
let _width        = 640;
let _height       = 480;
let _frameRate    = 30;

export async function initCamera(videoEl, { facingMode = 'environment', width = 640, height = 480, frameRate = 30 } = {}) {
  _videoEl    = videoEl;
  _facingMode = facingMode;
  _width      = width;
  _height     = height;
  _frameRate  = frameRate;
  return _startStream();
}

export function startLoop(sendFrame) {
  let processing = false;
  function processFrame() {
    _animFrameId = requestAnimationFrame(processFrame);
    if (!processing && _videoEl.readyState >= HTMLMediaElement.HAVE_CURRENT_DATA) {
      processing = true;
      sendFrame(_videoEl).finally(() => { processing = false; });
    }
  }
  _animFrameId = requestAnimationFrame(processFrame);
}

export function stopLoop() {
  if (_animFrameId !== null) {
    cancelAnimationFrame(_animFrameId);
    _animFrameId = null;
  }
}

export function stopStream() {
  if (_videoEl && _videoEl.srcObject) {
    _videoEl.srcObject.getTracks().forEach(t => t.stop());
    _videoEl.srcObject = null;
  }
}

export async function switchCameraFacing(sendFrame) {
  stopLoop();
  stopStream();
  _facingMode = _facingMode === 'user' ? 'environment' : 'user';
  try {
    await _startStream();
    startLoop(sendFrame);
  } catch (err) {
    // Revert to previous camera and restart
    _facingMode = _facingMode === 'user' ? 'environment' : 'user';
    await _startStream();
    startLoop(sendFrame);
    throw err;
  }
}

export async function restartCamera(sendFrame) {
  stopLoop();
  stopStream();
  await _startStream();
  startLoop(sendFrame);
}

export function getCurrentFacingMode() { return _facingMode; }

async function _startStream() {
  const stream = await navigator.mediaDevices.getUserMedia({
    video: {
      facingMode : _facingMode,
      width      : { ideal: _width },
      height     : { ideal: _height },
      frameRate  : { ideal: _frameRate },
    },
    audio: false,
  });
  _videoEl.srcObject = stream;
  await _videoEl.play();
  return stream;
}
