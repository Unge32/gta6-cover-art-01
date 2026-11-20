// Neon Coast Cover Studio — page wiring: photos, controls, live preview, PNG export.
// A `?shot=` query sets up a fixed scene for a screenshot instead (./shots.js).
import { drawCover, defaultState, SIZES, LAYOUTS, GRADES } from './cover.js';
import { runShot } from './shots.js';

const canvas = document.getElementById('cover');
const titleInput = document.getElementById('title');
const subtitleInput = document.getElementById('subtitle');
const status = document.getElementById('status');
const panelSelect = document.getElementById('panel');
const zoomInput = document.getElementById('zoom');
const panXInput = document.getElementById('panx');
const panYInput = document.getElementById('pany');
const panelPhoto = document.getElementById('panel-photo');

const state = defaultState();
const photos = [null, null, null];
const photoNames = ['Empty', 'Empty', 'Empty'];

function currentSize() {
  return SIZES[state.size] || SIZES.wide;
}

function redraw() {
  const size = currentSize();
  if (canvas.width !== size.w || canvas.height !== size.h) {
    canvas.width = size.w;
    canvas.height = size.h;
  }
  drawCover(canvas, photos, state);
}

export function loadImage(url) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = reject;
    img.src = url;
  });
}

function refreshPanelControls() {
  const panel = state.panels[Number(panelSelect.value)] || state.panels[0];
  zoomInput.value = panel.zoom;
  panXInput.value = panel.x;
  panYInput.value = panel.y;
  panelPhoto.value = String(panel.photo);
  document.getElementById('zoom-val').textContent = `${Math.round(panel.zoom * 100)}%`;
  document.getElementById('panx-val').textContent = panel.x.toFixed(2);
  document.getElementById('pany-val').textContent = panel.y.toFixed(2);
}

function refreshPhotoLabels() {
  document.querySelectorAll('[data-slot]').forEach((el) => {
    el.textContent = photoNames[Number(el.dataset.slot)];
  });
  panelPhoto.querySelectorAll('option').forEach((opt) => {
    opt.textContent = `Photo ${Number(opt.value) + 1} — ${photoNames[Number(opt.value)]}`;
  });
}

function buildButtons(containerId, entries, current, onPick) {
  const box = document.getElementById(containerId);
  box.innerHTML = '';
  Object.entries(entries).forEach(([key, value]) => {
    const b = document.createElement('button');
    b.type = 'button';
    b.className = 'chip' + (key === current ? ' active' : '');
    b.textContent = value.label;
    b.addEventListener('click', () => {
      onPick(key);
      buildButtons(containerId, entries, key, onPick);
      redraw();
    });
    box.appendChild(b);
  });
}

function buildAllChips() {
  buildButtons('layouts', LAYOUTS, state.layout, (k) => { state.layout = k; });
  buildButtons('grades', GRADES, state.grade, (k) => { state.grade = k; });
  buildButtons('sizes', SIZES, state.size, (k) => { state.size = k; });
}

async function loadSample(slot, file, name) {
  photos[slot] = await loadImage(`samples/${file}`);
  photoNames[slot] = name;
  refreshPhotoLabels();
  redraw();
}

document.getElementById('photos').addEventListener('change', async (e) => {
  const files = [...e.target.files].slice(0, 3);
  for (let i = 0; i < files.length; i++) {
    photos[i] = await loadImage(URL.createObjectURL(files[i]));
    photoNames[i] = files[i].name;
  }
  refreshPhotoLabels();
  redraw();
  status.textContent = `${files.length} photo${files.length === 1 ? '' : 's'} loaded — pick a layout and export.`;
});

document.getElementById('use-samples').addEventListener('click', async () => {
  await loadSample(0, 'boulevard.jpg', 'Boulevard (sample)');
  await loadSample(1, 'pier.jpg', 'Pier (sample)');
  status.textContent = 'Sample photos loaded. Your own photos never leave this machine.';
});

titleInput.addEventListener('input', () => { state.title = titleInput.value; redraw(); });
subtitleInput.addEventListener('input', () => { state.subtitle = subtitleInput.value; redraw(); });
panelSelect.addEventListener('change', refreshPanelControls);
panelPhoto.addEventListener('change', () => {
  state.panels[Number(panelSelect.value)].photo = Number(panelPhoto.value);
  redraw();
});
zoomInput.addEventListener('input', () => {
  state.panels[Number(panelSelect.value)].zoom = Number(zoomInput.value);
  refreshPanelControls(); redraw();
});
panXInput.addEventListener('input', () => {
  state.panels[Number(panelSelect.value)].x = Number(panXInput.value);
  refreshPanelControls(); redraw();
});
panYInput.addEventListener('input', () => {
  state.panels[Number(panelSelect.value)].y = Number(panYInput.value);
  refreshPanelControls(); redraw();
});

document.getElementById('export').addEventListener('click', () => {
  const size = currentSize();
  canvas.toBlob((blob) => {
    if (!blob) { status.textContent = 'Export failed — try again.'; return; }
    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = `neon-coast-cover-${size.w}x${size.h}.png`;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 5000);
    status.textContent = `Saved neon-coast-cover-${size.w}x${size.h}.png`;
  }, 'image/png');
});

document.getElementById('reset').addEventListener('click', () => {
  Object.assign(state, defaultState());
  titleInput.value = state.title;
  subtitleInput.value = state.subtitle;
  panelSelect.value = '0';
  buildAllChips();
  refreshPanelControls();
  redraw();
  status.textContent = 'Reset to the Neon Coast defaults.';
});

// Exposed for the screenshot scenes and for in-browser testing.
window.__coverStudio = { state, photos, redraw, loadSample, loadImage, drawCover };

buildAllChips();
refreshPanelControls();
refreshPhotoLabels();

const params = new URLSearchParams(location.search);
const shot = params.get('shot');
if (shot) {
  runShot(shot, params, async (sample, text, opts) => {
    await loadSample(0, `${sample}.jpg`, `${sample} (sample)`);
    await loadSample(1, sample === 'pier' ? 'boulevard.jpg' : 'pier.jpg', 'second sample');
    if (opts.layout) state.layout = opts.layout;
    if (opts.grade) state.grade = opts.grade;
    if (opts.size) state.size = opts.size;
    if (opts.title) { state.title = opts.title; titleInput.value = opts.title; }
    if (text) { state.subtitle = text; subtitleInput.value = text; }
    buildAllChips();
    redraw();
  });
} else {
  redraw();
}
