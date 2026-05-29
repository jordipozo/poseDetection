/**
 * Validates the metadata JSON produced after each recording.
 * Returns { valid: boolean, errors: string[] }.
 * Only called in development (localhost) — no production overhead.
 */
export function validateMeta(json) {
  const errors = [];

  if (!json || typeof json !== 'object') {
    return { valid: false, errors: ['json is not an object'] };
  }

  // ── recording block ──────────────────────────────────────────────────────
  const rec = json.recording;
  if (!rec || typeof rec !== 'object') {
    errors.push('recording block is missing or not an object');
  } else {
    if (typeof rec.id !== 'string' || rec.id.trim() === '') {
      errors.push('recording.id must be a non-empty string');
    }
    if (typeof rec.duration_seconds !== 'number' || rec.duration_seconds <= 0) {
      errors.push('recording.duration_seconds must be a positive number');
    }
    if (typeof rec.fps !== 'number' || rec.fps <= 0) {
      errors.push('recording.fps must be a positive number');
    }
  }

  // ── frames array ─────────────────────────────────────────────────────────
  if (!Array.isArray(json.frames) || json.frames.length === 0) {
    errors.push('frames must be a non-empty array');
  } else {
    json.frames.forEach((frame, fi) => {
      if (typeof frame.frame_index !== 'number') {
        errors.push(`frames[${fi}].frame_index is missing`);
      }
      if (typeof frame.timestamp_ms !== 'number') {
        errors.push(`frames[${fi}].timestamp_ms is missing`);
      }
      if (!Array.isArray(frame.landmarks)) {
        errors.push(`frames[${fi}].landmarks is not an array`);
      } else if (frame.landmarks.length !== 33) {
        errors.push(`frames[${fi}].landmarks has ${frame.landmarks.length} entries (expected 33)`);
      } else {
        frame.landmarks.forEach((lm, li) => {
          if (typeof lm.x !== 'number' || typeof lm.y !== 'number' || typeof lm.z !== 'number') {
            errors.push(`frames[${fi}].landmarks[${li}]: x/y/z must be numbers`);
          }
          if (typeof lm.visibility !== 'number') {
            errors.push(`frames[${fi}].landmarks[${li}]: visibility must be a number`);
          }
        });
      }
    });
  }

  return { valid: errors.length === 0, errors };
}
