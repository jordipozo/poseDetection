import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  formatTime,
  generateId,
  generateFileName,
  isMobile,
  getSupportedMimeType,
  fileExtFromMime,
} from '../../src/shared/utils.js';

afterEach(() => vi.unstubAllGlobals());

// ── formatTime ────────────────────────────────────────────────────────────────

describe('formatTime', () => {
  it('formats 0 ms as 0:00',    () => expect(formatTime(0)).toBe('0:00'));
  it('formats 30 s as 0:30',    () => expect(formatTime(30000)).toBe('0:30'));
  it('formats 90 s as 1:30',    () => expect(formatTime(90000)).toBe('1:30'));
  it('pads seconds under 10',   () => expect(formatTime(65000)).toBe('1:05'));
});

// ── generateId ────────────────────────────────────────────────────────────────

describe('generateId', () => {
  it('starts with rec_',         () => expect(generateId()).toMatch(/^rec_/));
  it('has length greater than 10', () => expect(generateId().length).toBeGreaterThan(10));
  it('produces unique values',   () => expect(generateId()).not.toBe(generateId()));
});

// ── generateFileName ──────────────────────────────────────────────────────────

describe('generateFileName', () => {
  it('returns dorsal_YYYYMMDDHHmmss_posture when both provided', () => {
    expect(generateFileName('07', '3')).toMatch(/^07_\d{14}_3$/);
  });
  it('falls back to rec_ id when dorsal is empty', () => {
    expect(generateFileName('', '3')).toMatch(/^rec_/);
  });
  it('falls back to rec_ id when posture is empty', () => {
    expect(generateFileName('07', '')).toMatch(/^rec_/);
  });
  it('falls back to rec_ id when both are empty', () => {
    expect(generateFileName('', '')).toMatch(/^rec_/);
  });
});

// ── isMobile ──────────────────────────────────────────────────────────────────

describe('isMobile', () => {
  it('returns true for iPhone UA', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 15_0 like Mac OS X)' });
    expect(isMobile()).toBe(true);
  });
  it('returns true for Android UA', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Linux; Android 11; Pixel 5)' });
    expect(isMobile()).toBe(true);
  });
  it('returns false for desktop UA', () => {
    vi.stubGlobal('navigator', { userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) Chrome/120.0' });
    expect(isMobile()).toBe(false);
  });
});

// ── getSupportedMimeType ──────────────────────────────────────────────────────

describe('getSupportedMimeType', () => {
  it('returns the first supported mime type', () => {
    vi.stubGlobal('MediaRecorder', {
      isTypeSupported: (type) => type === 'video/webm;codecs=vp9',
    });
    expect(getSupportedMimeType()).toBe('video/webm;codecs=vp9');
  });
  it('returns empty string when no type is supported', () => {
    vi.stubGlobal('MediaRecorder', { isTypeSupported: () => false });
    expect(getSupportedMimeType()).toBe('');
  });
  it('returns empty string when MediaRecorder is unavailable', () => {
    vi.stubGlobal('MediaRecorder', undefined);
    expect(getSupportedMimeType()).toBe('');
  });
});

// ── fileExtFromMime ───────────────────────────────────────────────────────────

describe('fileExtFromMime', () => {
  it('returns mp4 for video/mp4;codecs=avc1', () => expect(fileExtFromMime('video/mp4;codecs=avc1')).toBe('mp4'));
  it('returns mp4 for video/mp4',             () => expect(fileExtFromMime('video/mp4')).toBe('mp4'));
  it('returns webm for video/webm',           () => expect(fileExtFromMime('video/webm')).toBe('webm'));
  it('returns webm for video/webm;codecs=vp9',() => expect(fileExtFromMime('video/webm;codecs=vp9')).toBe('webm'));
  it('falls back to mp4 for unknown types',   () => expect(fileExtFromMime('video/ogg')).toBe('mp4'));
});
