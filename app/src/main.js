// Vice Cover Studio — wires the page: upload 1-3 photos (file picker or
// drag-drop) or load the bundled samples, pick a layout and a grade, drag a
// panel to position its photo, edit the caption, export a PNG in one of the
// three post sizes. A `?shot=` query sets up a fixed scene for a screenshot
// instead (see ./shots.js). Photos are read on this machine and never sent
// anywhere; the app makes no network request at all.
import { drawCover, renderCover, panelRects, LAYOUTS, GRADES, EXPORT_SIZES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const status = document.getElementById('status');
const zoomSlider = document.getElementById('zoom');
const panelLabel = document.getElementById('panel-label');
const thumbs = document.getElementById('thumbs');

const state = {
  photos: [], // { img, zoom, panX, panY, name }
  layout: 'trio',
  grade: 'sunset',
  title: 'Sunset Heist',
  subtitle: 'Vice Nights',
  selected: 0,
  exportSize: EXPORT_SIZES[0],
};

function redraw() {
  drawCover(canvas, state);
  panelLabel.textContent = state.photos.length
    ? `Panel ${state.selected + 1} of ${panelRects(state.layout, canvas.width, canvas.height).length} — drag the photo to move it`
    : 'Load a photo or a sample to fill the panels';
  const photo = state.photos[state.selected % Math.max(1, state.photos.length)];
  zoomSlider.value = photo ? String(Math.round((photo.zoom || 1) * 100)) : '100';
}

function refreshThumbs() {
  thumbs.innerHTML = '';
  state.photos.forEach((photo, i) => {
    const button = document.createElement('button');
    button.type = 'button';
    button.className = 'thumb' + (i === state.selected ? ' selected' : '');
    button.textContent = `${i + 1} · ${photo.name}`;
    button.addEventListener('click', () => { state.selected = i; redraw(); refreshThumbs(); });
    thumbs.appendChild(button);
  });
  if (!state.photos.length) {
    const empty = document.createElement('p');
    empty.className = 'hint';
    empty.textContent = 'No photos yet — the panels show a drawn sunset scene.';
    thumbs.appendChild(empty);
  }
}

/** Loads an image from a URL, resolving once it can be drawn. */
export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

async function addPhotoFile(file) {
  if (state.photos.length >= 3) {
    status.textContent = 'Three photos at most — remove one first (Replace all).';
    return;
  }
  const img = await loadImage(URL.createObjectURL(file));
  state.photos.push({ img, zoom: 1, panX: 0, panY: 0, name: file.name.replace(/\.[^.]+$/, '').slice(0, 18) || 'Photo' });
  state.selected = state.photos.length - 1;
  refreshThumbs();
  redraw();
  status.textContent = `${state.photos.length} photo${state.photos.length > 1 ? 's' : ''} loaded.`;
}

async function loadSample(name) {
  const img = await loadImage(`samples/${name}.jpg`);
  const label = name === 'pier' ? 'Pier' : 'Boulevard';
  const existing = state.photos.findIndex((p) => p.name === label);
  if (existing >= 0) {
    state.photos[existing].img = img;
  } else if (state.photos.length < 3) {
    state.photos.push({ img, zoom: 1, panX: 0, panY: 0, name: label });
  }
  state.selected = Math.max(0, state.photos.findIndex((p) => p.name === label));
  refreshThumbs();
  redraw();
}

function setLayout(layout) {
  if (!LAYOUTS[layout]) return;
  state.layout = layout;
  document.querySelectorAll('[data-layout]').forEach((b) => b.classList.toggle('active', b.dataset.layout === layout));
  redraw();
}

function setGrade(grade) {
  if (!GRADES[grade]) return;
  state.grade = grade;
  document.querySelectorAll('[data-grade]').forEach((b) => b.classList.toggle('active', b.dataset.grade === grade));
  redraw();
}

function setExportSize(w, h) {
  const found = EXPORT_SIZES.find((s) => s.w === w && s.h === h);
  state.exportSize = found || { label: `${w} x ${h}`, w, h };
  canvas.width = w;
  canvas.height = h;
  const select = document.getElementById('export-size');
  if (select) select.value = `${w}x${h}`;
  redraw();
}

/** Renders the cover at W x H and returns a PNG data URL (same bytes as Export). */
window.__viceExport = async function viceExport(w, h) {
  const out = renderCover(w, h, state);
  return out.toDataURL('image/png');
};

function exportPng() {
  const { w, h } = state.exportSize;
  renderCover(w, h, state).toBlob((blob) => {
    if (!blob) { status.textContent = 'Export failed — try again.'; return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `vice-cover-${w}x${h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = `Saved vice-cover-${w}x${h}.png`;
  }, 'image/png');
}

// --- controls ---------------------------------------------------------------
document.getElementById('photo').addEventListener('change', async (e) => {
  for (const file of e.target.files) await addPhotoFile(file);
  e.target.value = '';
});
document.getElementById('sample-pier').addEventListener('click', () => loadSample('pier'));
document.getElementById('sample-boulevard').addEventListener('click', () => loadSample('boulevard'));
document.getElementById('sample-both').addEventListener('click', async () => { await loadSample('pier'); await loadSample('boulevard'); });
document.getElementById('clear-photos').addEventListener('click', () => {
  state.photos = []; state.selected = 0; refreshThumbs(); redraw(); status.textContent = 'Photos cleared.';
});
document.querySelectorAll('[data-layout]').forEach((b) => b.addEventListener('click', () => setLayout(b.dataset.layout)));
document.querySelectorAll('[data-grade]').forEach((b) => b.addEventListener('click', () => setGrade(b.dataset.grade)));
titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
zoomSlider.addEventListener('input', () => {
  const photo = state.photos[state.selected];
  if (!photo) return;
  photo.zoom = Number(zoomSlider.value) / 100;
  redraw();
});
document.getElementById('export-size').addEventListener('change', (e) => {
  const [w, h] = e.target.value.split('x').map(Number);
  setExportSize(w, h);
});
document.getElementById('export').addEventListener('click', exportPng);

// Drag a panel to pan its photo; clicking a panel selects it.
const dropzone = document.getElementById('dropzone');
let drag = null;
function panelAt(clientX, clientY) {
  const rect = canvas.getBoundingClientRect();
  const x = (clientX - rect.left) / rect.width * canvas.width;
  const y = (clientY - rect.top) / rect.height * canvas.height;
  const rects = panelRects(state.layout, canvas.width, canvas.height);
  return { index: rects.findIndex((r) => x >= r.x && x < r.x + r.w && y >= r.y && y < r.y + r.h), rects, x, y };
}
canvas.addEventListener('pointerdown', (e) => {
  const hit = panelAt(e.clientX, e.clientY);
  if (hit.index < 0) return;
  const photo = state.photos[hit.index % Math.max(1, state.photos.length)];
  if (!photo) return;
  state.selected = hit.index % state.photos.length;
  refreshThumbs();
  drag = { photo, rect: hit.rects[hit.index], startX: e.clientX, startY: e.clientY, panX: photo.panX, panY: photo.panY };
  canvas.setPointerCapture(e.pointerId);
  redraw();
});
canvas.addEventListener('pointermove', (e) => {
  if (!drag) return;
  const rect = canvas.getBoundingClientRect();
  const scaleX = canvas.width / rect.width;
  const scaleY = canvas.height / rect.height;
  const dx = (e.clientX - drag.startX) * scaleX;
  const dy = (e.clientY - drag.startY) * scaleY;
  const photo = drag.photo;
  const iw = photo.img.naturalWidth || photo.img.width;
  const ih = photo.img.naturalHeight || photo.img.height;
  const base = Math.max(drag.rect.w / iw, drag.rect.h / ih) * (photo.zoom || 1);
  const slackX = Math.max(1, (iw * base - drag.rect.w) / 2);
  const slackY = Math.max(1, (ih * base - drag.rect.h) / 2);
  photo.panX = Math.max(-1, Math.min(1, drag.panX + dx / slackX));
  photo.panY = Math.max(-1, Math.min(1, drag.panY + dy / slackY));
  redraw();
});
canvas.addEventListener('pointerup', () => { drag = null; });

// Drag-drop files onto the preview.
['dragenter', 'dragover'].forEach((name) => dropzone.addEventListener(name, (e) => { e.preventDefault(); dropzone.classList.add('over'); }));
['dragleave', 'drop'].forEach((name) => dropzone.addEventListener(name, (e) => { e.preventDefault(); dropzone.classList.remove('over'); }));
dropzone.addEventListener('drop', async (e) => {
  for (const file of e.dataTransfer.files) {
    if (file.type.startsWith('image/')) await addPhotoFile(file);
  }
});

// --- shot scenes / first paint ----------------------------------------------
const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  runShot(shot, params, {
    loadSample,
    setCaption: (title, subtitle) => { state.title = title; state.subtitle = subtitle; titleInput.value = title; subtitleInput.value = subtitle; },
    setLayout,
    setGrade,
    setExportSize,
    redraw,
  });
} else {
  refreshThumbs();
  redraw();
}
