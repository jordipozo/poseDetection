import { describe, it, expect } from 'vitest';
import { validateMeta } from '../../src/shared/validateMeta.js';

function makeLandmark(overrides = {}) {
  return { index: 0, name: 'nose', x: 0.5, y: 0.5, z: -0.1, visibility: 0.99, ...overrides };
}

function makeFrame(frameIndex = 0, landmarkCount = 33) {
  return {
    frame_index  : frameIndex,
    timestamp_ms : frameIndex * 33.3,
    landmarks    : Array.from({ length: landmarkCount }, (_, i) => makeLandmark({ index: i })),
  };
}

function validMeta(frameCount = 5) {
  return {
    recording: {
      id               : 'rec_20260529_191544_abc',
      duration_seconds : 5.0,
      fps              : 30,
    },
    frames: Array.from({ length: frameCount }, (_, i) => makeFrame(i)),
  };
}

// ── Valid input ───────────────────────────────────────────────────────────────

describe('validateMeta — valid input', () => {
  it('accepts a complete valid metadata object', () => {
    const { valid, errors } = validateMeta(validMeta());
    expect(valid).toBe(true);
    expect(errors).toHaveLength(0);
  });
});

// ── Top-level structure ───────────────────────────────────────────────────────

describe('validateMeta — top-level structure', () => {
  it('rejects null',      () => expect(validateMeta(null).valid).toBe(false));
  it('rejects a string',  () => expect(validateMeta('bad').valid).toBe(false));
});

// ── recording block ───────────────────────────────────────────────────────────

describe('validateMeta — recording block', () => {
  it('rejects missing recording block', () => {
    const { valid, errors } = validateMeta({ frames: validMeta().frames });
    expect(valid).toBe(false);
    expect(errors.some(e => e.includes('recording'))).toBe(true);
  });
  it('rejects empty recording.id', () => {
    const meta = validMeta();
    meta.recording.id = '';
    expect(validateMeta(meta).valid).toBe(false);
  });
  it('rejects non-string recording.id', () => {
    const meta = validMeta();
    meta.recording.id = 42;
    expect(validateMeta(meta).valid).toBe(false);
  });
  it('rejects zero duration_seconds', () => {
    const meta = validMeta();
    meta.recording.duration_seconds = 0;
    expect(validateMeta(meta).valid).toBe(false);
  });
  it('rejects negative duration_seconds', () => {
    const meta = validMeta();
    meta.recording.duration_seconds = -1;
    expect(validateMeta(meta).valid).toBe(false);
  });
  it('rejects zero fps', () => {
    const meta = validMeta();
    meta.recording.fps = 0;
    expect(validateMeta(meta).valid).toBe(false);
  });
});

// ── frames array ─────────────────────────────────────────────────────────────

describe('validateMeta — frames array', () => {
  it('rejects missing frames field', () => {
    const meta = validMeta();
    delete meta.frames;
    const { valid, errors } = validateMeta(meta);
    expect(valid).toBe(false);
    expect(errors.some(e => e.includes('frames'))).toBe(true);
  });
  it('rejects empty frames array', () => {
    const meta = validMeta();
    meta.frames = [];
    expect(validateMeta(meta).valid).toBe(false);
  });
  it('rejects frame with missing frame_index', () => {
    const meta = validMeta(1);
    delete meta.frames[0].frame_index;
    expect(validateMeta(meta).valid).toBe(false);
  });
  it('rejects frame with missing timestamp_ms', () => {
    const meta = validMeta(1);
    delete meta.frames[0].timestamp_ms;
    expect(validateMeta(meta).valid).toBe(false);
  });
  it('rejects frame with 32 landmarks instead of 33', () => {
    const meta = validMeta(1);
    meta.frames[0].landmarks.pop();
    const { valid, errors } = validateMeta(meta);
    expect(valid).toBe(false);
    expect(errors.some(e => e.includes('33'))).toBe(true);
  });
  it('rejects frame with non-array landmarks', () => {
    const meta = validMeta(1);
    meta.frames[0].landmarks = 'bad';
    expect(validateMeta(meta).valid).toBe(false);
  });
});

// ── landmark fields ───────────────────────────────────────────────────────────

describe('validateMeta — landmark fields', () => {
  it('rejects landmark with non-numeric x', () => {
    const meta = validMeta(1);
    meta.frames[0].landmarks[0].x = 'bad';
    expect(validateMeta(meta).valid).toBe(false);
  });
  it('rejects landmark with non-numeric visibility', () => {
    const meta = validMeta(1);
    meta.frames[0].landmarks[0].visibility = null;
    expect(validateMeta(meta).valid).toBe(false);
  });
});
