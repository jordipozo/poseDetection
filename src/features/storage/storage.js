import { isMobile } from '../../shared/utils.js';

let _dirHandle = null;

export function supportsDirectoryPicker() {
  return typeof window.showDirectoryPicker === 'function';
}

export function getDirHandle() { return _dirHandle; }

export async function pickDirectory() {
  if (!supportsDirectoryPicker()) return null;
  try {
    const handle = await window.showDirectoryPicker({ mode: 'readwrite' });
    _dirHandle   = handle;
    return handle;
  } catch (err) {
    if (err.name !== 'AbortError') throw err;
    return null;
  }
}

export function downloadBlob(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a   = document.createElement('a');
  a.href          = url;
  a.download      = filename;
  a.style.display = 'none';
  document.body.appendChild(a);
  a.click();
  setTimeout(() => { document.body.removeChild(a); URL.revokeObjectURL(url); }, 2000);
}

export async function save(videoBlob, metaJson, baseName, ext, csvBlob = null) {
  const jsonBlob = () => new Blob([JSON.stringify(metaJson, null, 2)], { type: 'application/json' });

  if (_dirHandle) {
    try {
      const perm = await _dirHandle.requestPermission({ mode: 'readwrite' });
      if (perm !== 'granted') throw new Error('Permission denied');

      const videoFile   = await _dirHandle.getFileHandle(`${baseName}.${ext}`, { create: true });
      const videoWriter = await videoFile.createWritable();
      await videoWriter.write(videoBlob);
      await videoWriter.close();

      const jsonFile   = await _dirHandle.getFileHandle(`${baseName}_metadata.json`, { create: true });
      const jsonWriter = await jsonFile.createWritable();
      await jsonWriter.write(JSON.stringify(metaJson, null, 2));
      await jsonWriter.close();

      if (csvBlob) {
        const csvFile   = await _dirHandle.getFileHandle(`${baseName}_landmarks.csv`, { create: true });
        const csvWriter = await csvFile.createWritable();
        await csvWriter.write(csvBlob);
        await csvWriter.close();
      }

      return 'directory';
    } catch (err) {
      console.warn('Directory save failed, falling back to download:', err);
      downloadBlob(videoBlob, `${baseName}.${ext}`);
      downloadBlob(jsonBlob(), `${baseName}_metadata.json`);
      if (csvBlob) downloadBlob(csvBlob, `${baseName}_landmarks.csv`);
      return 'download-fallback';
    }
  }

  if (!isMobile()) {
    downloadBlob(videoBlob, `${baseName}.${ext}`);
    downloadBlob(jsonBlob(), `${baseName}_metadata.json`);
    if (csvBlob) downloadBlob(csvBlob, `${baseName}_landmarks.csv`);
    return 'download';
  }

  return 'none';
}

export async function listRecordings() {
  if (!_dirHandle) return [];
  const perm = await _dirHandle.requestPermission({ mode: 'readwrite' });
  if (perm !== 'granted') return [];

  const results = [];
  for await (const [name, handle] of _dirHandle.entries()) {
    if (!name.endsWith('_metadata.json')) continue;
    try {
      const file = await handle.getFile();
      const data = JSON.parse(await file.text());
      results.push({ fileName: name, data });
    } catch { /* skip malformed files */ }
  }
  return results.sort((a, b) => b.fileName.localeCompare(a.fileName));
}

export async function deleteRecording(baseName, ext) {
  if (!_dirHandle) return;
  const perm = await _dirHandle.requestPermission({ mode: 'readwrite' });
  if (perm !== 'granted') throw new Error('Permission denied');

  for (const name of [`${baseName}.${ext}`, `${baseName}_metadata.json`, `${baseName}_landmarks.csv`]) {
    try { await _dirHandle.removeEntry(name); } catch { /* file may not exist */ }
  }
}
