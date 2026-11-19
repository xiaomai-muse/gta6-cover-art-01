// Application entry point: state, file loading, interactive panel pan/zoom, and PNG export.

import { buildLayoutPanels, hitTestPanel } from './layouts.js';
import { renderCover } from './renderer.js';
import { applyShotParams } from './shots.js';

const canvas = document.getElementById('cover');
const statusEl = document.getElementById('status');
const photoInput = document.getElementById('photo-input');
const browseBtn = document.getElementById('browse-btn');
const dropZone = document.getElementById('drop-zone');
const photoTray = document.getElementById('photo-tray');
const fillAllBtn = document.getElementById('fill-all-btn');
const distributeBtn = document.getElementById('distribute-btn');
const layoutPicker = document.getElementById('layout-picker');
const panelTabs = document.getElementById('panel-tabs');
const zoomRange = document.getElementById('panel-zoom');
const zoomVal = document.getElementById('zoom-val');
const zoomInBtn = document.getElementById('zoom-in-btn');
const zoomOutBtn = document.getElementById('zoom-out-btn');
const resetCropBtn = document.getElementById('reset-crop-btn');
const gradePicker = document.getElementById('grade-picker');
const gradeIntensity = document.getElementById('grade-intensity');
const intensityVal = document.getElementById('intensity-val');
const captionInput = document.getElementById('caption-input');
const subcaptionInput = document.getElementById('subcaption-input');
const captionSize = document.getElementById('caption-size');
const sizeVal = document.getElementById('size-val');
const captionPos = document.getElementById('caption-pos');
const captionColorPicker = document.getElementById('caption-color-picker');
const sizePicker = document.getElementById('size-picker');
const exportBtn = document.getElementById('export-btn');

const state = {
  width: 1080,
  height: 1080,
  layout: 'mosaic',
  grade: 'sunset',
  gradeIntensity: 85,
  caption: 'SUNSET HEIST',
  subcaption: 'VICE COAST EDITION',
  captionSize: 100,
  captionPos: 'bottom',
  captionColor: 'sunset',
  activePanel: 0,
  selectedPhotoIdx: 0,
  hideSelection: false,
  photos: [],
  panels: [
    { photoIdx: 0, zoom: 1.08, panX: 0.15, panY: 0.15 },
    { photoIdx: 1, zoom: 1.15, panX: 0.35, panY: 0.45 },
    { photoIdx: 0, zoom: 1.32, panX: 0.2, panY: 0.25 },
    { photoIdx: 1, zoom: 1.28, panX: -0.1, panY: -0.4 },
  ],
};

let currentPanels = [];
let renderScheduled = false;

function setStatus(msg) {
  statusEl.textContent = msg;
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error(`Failed to load ${src}`));
    img.src = src;
  });
}

function scheduleRender(forExport = false) {
  if (renderScheduled) return;
  renderScheduled = true;
  requestAnimationFrame(() => {
    renderScheduled = false;
    currentPanels = renderCover(canvas, state, { forExport });
  });
}

function syncPanelTabs() {
  const count = buildLayoutPanels(state.layout, state.width, state.height).length;
  if (state.activePanel >= count) state.activePanel = 0;
  panelTabs.innerHTML = '';
  for (let i = 0; i < count; i += 1) {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `panel-tab${i === state.activePanel ? ' active' : ''}`;
    btn.textContent = `P${i + 1}`;
    btn.addEventListener('click', () => {
      state.activePanel = i;
      syncPanelTabs();
      syncCropInputs();
      scheduleRender();
    });
    panelTabs.appendChild(btn);
  }
}

function syncCropInputs() {
  const slot = state.panels[state.activePanel] || { zoom: 1 };
  zoomRange.value = String(slot.zoom);
  zoomVal.textContent = `${Number(slot.zoom).toFixed(2)}x`;
}

function syncPhotoTray() {
  photoTray.innerHTML = '';
  state.photos.forEach((item, idx) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = `photo-thumb${idx === state.selectedPhotoIdx ? ' active' : ''}`;
    btn.title = item.name;
    const thumb = document.createElement('img');
    thumb.src = item.src;
    thumb.alt = item.name;
    btn.appendChild(thumb);
    btn.addEventListener('click', () => {
      state.selectedPhotoIdx = idx;
      state.panels[state.activePanel].photoIdx = idx;
      syncPhotoTray();
      scheduleRender();
      setStatus(`Assigned "${item.name}" to Panel ${state.activePanel + 1}`);
    });
    photoTray.appendChild(btn);
  });
}

function setActiveChip(container, attr, value) {
  for (const el of container.querySelectorAll('[data-' + attr + ']')) {
    el.classList.toggle('active', el.dataset[attr] === value);
  }
}

function applySize(sizeStr) {
  const [w, h] = sizeStr.split('x').map(Number);
  if (!w || !h) return;
  state.width = w;
  state.height = h;
  setActiveChip(sizePicker, 'size', sizeStr);
  exportBtn.textContent = `Export PNG (${w} × ${h})`;
  scheduleRender();
}

function applyLayout(layoutId) {
  state.layout = layoutId;
  setActiveChip(layoutPicker, 'layout', layoutId);
  syncPanelTabs();
  syncCropInputs();
  scheduleRender();
}

function applyGrade(gradeId) {
  state.grade = gradeId;
  setActiveChip(gradePicker, 'grade', gradeId);
  scheduleRender();
}

async function addUserFiles(fileList) {
  const files = [...fileList].filter((f) => f.type.startsWith('image/'));
  if (!files.length) {
    setStatus('No valid image files found.');
    return;
  }
  const startIdx = state.photos.length;
  let skipped = 0;

  for (const file of files) {
    try {
      const dataUrl = await new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = () => resolve(reader.result);
        reader.onerror = () => reject(new Error('File read failed'));
        reader.readAsDataURL(file);
      });
      const img = await loadImage(dataUrl);
      state.photos.push({ name: file.name, src: dataUrl, img });
    } catch {
      skipped += 1;
    }
  }

  const newCount = state.photos.length - startIdx;
  if (newCount === 0) {
    setStatus('Could not decode selected image file.');
    return;
  }
  if (newCount === 1) {
    state.panels.forEach((p, idx) => {
      p.photoIdx = startIdx;
      p.panX = idx === 0 ? 0 : (idx % 2 === 0 ? 0.2 : -0.2);
      p.panY = 0;
    });
  } else {
    state.panels.forEach((p, idx) => {
      p.photoIdx = startIdx + (idx % newCount);
      p.panX = 0;
      p.panY = 0;
    });
  }

  state.selectedPhotoIdx = startIdx;
  syncPhotoTray();
  scheduleRender();
  const note = skipped ? ` (${skipped} skipped)` : '';
  setStatus(`Loaded ${newCount} photo${newCount > 1 ? 's' : ''}${note}`);
}

// Sidebar bindings
browseBtn.addEventListener('click', () => photoInput.click());
photoInput.addEventListener('change', (e) => addUserFiles(e.target.files));

dropZone.addEventListener('dragover', (e) => {
  e.preventDefault();
  dropZone.classList.add('drag-over');
});
dropZone.addEventListener('dragleave', () => dropZone.classList.remove('drag-over'));
dropZone.addEventListener('drop', (e) => {
  e.preventDefault();
  dropZone.classList.remove('drag-over');
  addUserFiles(e.dataTransfer.files);
});

fillAllBtn.addEventListener('click', () => {
  state.panels.forEach((p) => {
    p.photoIdx = state.selectedPhotoIdx;
  });
  scheduleRender();
  setStatus('Applied selected photo to all panels');
});

distributeBtn.addEventListener('click', () => {
  if (!state.photos.length) return;
  state.panels.forEach((p, i) => {
    p.photoIdx = i % state.photos.length;
  });
  scheduleRender();
  setStatus('Distributed loaded photos across panels');
});

layoutPicker.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-layout]');
  if (btn) applyLayout(btn.dataset.layout);
});

gradePicker.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-grade]');
  if (btn) applyGrade(btn.dataset.grade);
});

gradeIntensity.addEventListener('input', () => {
  state.gradeIntensity = Number(gradeIntensity.value);
  intensityVal.textContent = `${state.gradeIntensity}%`;
  scheduleRender();
});

zoomRange.addEventListener('input', () => {
  const slot = state.panels[state.activePanel];
  slot.zoom = Number(zoomRange.value);
  zoomVal.textContent = `${slot.zoom.toFixed(2)}x`;
  scheduleRender();
});

zoomInBtn.addEventListener('click', () => {
  const slot = state.panels[state.activePanel];
  slot.zoom = Math.min(3, +(slot.zoom + 0.15).toFixed(2));
  syncCropInputs();
  scheduleRender();
});

zoomOutBtn.addEventListener('click', () => {
  const slot = state.panels[state.activePanel];
  slot.zoom = Math.max(1, +(slot.zoom - 0.15).toFixed(2));
  syncCropInputs();
  scheduleRender();
});

resetCropBtn.addEventListener('click', () => {
  const slot = state.panels[state.activePanel];
  slot.zoom = 1;
  slot.panX = 0;
  slot.panY = 0;
  syncCropInputs();
  scheduleRender();
});

captionInput.addEventListener('input', () => {
  state.caption = captionInput.value;
  scheduleRender();
});

subcaptionInput.addEventListener('input', () => {
  state.subcaption = subcaptionInput.value;
  scheduleRender();
});

captionSize.addEventListener('input', () => {
  state.captionSize = Number(captionSize.value);
  sizeVal.textContent = `${state.captionSize}%`;
  scheduleRender();
});

captionPos.addEventListener('change', () => {
  state.captionPos = captionPos.value;
  scheduleRender();
});

captionColorPicker.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-color]');
  if (!btn) return;
  state.captionColor = btn.dataset.color;
  setActiveChip(captionColorPicker, 'color', state.captionColor);
  scheduleRender();
});

sizePicker.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-size]');
  if (btn) applySize(btn.dataset.size);
});

exportBtn.addEventListener('click', () => {
  const exportCanvas = document.createElement('canvas');
  renderCover(exportCanvas, state, { forExport: true });
  exportCanvas.toBlob((blob) => {
    if (!blob) return;
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url;
    link.download = `vice-frame-${state.width}x${state.height}.png`;
    link.click();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    setStatus(`Exported ${state.width} × ${state.height} PNG (${Math.round(blob.size / 1024)} KiB)`);
  }, 'image/png');
});

// Direct canvas pointer pan & wheel zoom per panel
let dragState = null;

function canvasCoords(e) {
  const rect = canvas.getBoundingClientRect();
  return [
    ((e.clientX - rect.left) / rect.width) * canvas.width,
    ((e.clientY - rect.top) / rect.height) * canvas.height,
  ];
}

canvas.addEventListener('pointerdown', (e) => {
  const [px, py] = canvasCoords(e);
  const hit = hitTestPanel(currentPanels, px, py);
  if (hit >= 0) {
    state.activePanel = hit;
    syncPanelTabs();
    syncCropInputs();
    scheduleRender();
    dragState = {
      panelIdx: hit,
      startX: px,
      startY: py,
      origPanX: state.panels[hit].panX,
      origPanY: state.panels[hit].panY,
    };
    canvas.setPointerCapture(e.pointerId);
  }
});

canvas.addEventListener('pointermove', (e) => {
  if (!dragState) return;
  const [px, py] = canvasCoords(e);
  const panel = currentPanels[dragState.panelIdx];
  if (!panel) return;
  const dx = (px - dragState.startX) / Math.max(120, panel.bounds.w * 0.5);
  const dy = (py - dragState.startY) / Math.max(120, panel.bounds.h * 0.5);
  const slot = state.panels[dragState.panelIdx];
  slot.panX = Math.max(-1, Math.min(1, dragState.origPanX + dx));
  slot.panY = Math.max(-1, Math.min(1, dragState.origPanY + dy));
  scheduleRender();
});

canvas.addEventListener('pointerup', () => {
  dragState = null;
});

canvas.addEventListener('wheel', (e) => {
  e.preventDefault();
  const [px, py] = canvasCoords(e);
  const hit = hitTestPanel(currentPanels, px, py);
  if (hit >= 0) state.activePanel = hit;
  const slot = state.panels[state.activePanel];
  const delta = e.deltaY < 0 ? 0.1 : -0.1;
  slot.zoom = Math.max(1, Math.min(3, +(slot.zoom + delta).toFixed(2)));
  syncPanelTabs();
  syncCropInputs();
  scheduleRender();
}, { passive: false });

async function loadSamplePair(primary = 'pier', secondary = 'boulevard') {
  const [img1, img2] = await Promise.all([
    loadImage(`./samples/${primary}.jpg`),
    loadImage(`./samples/${secondary}.jpg`),
  ]);
  state.photos = [
    { name: `${primary}.jpg`, src: `./samples/${primary}.jpg`, img: img1 },
    { name: `${secondary}.jpg`, src: `./samples/${secondary}.jpg`, img: img2 },
  ];
  state.selectedPhotoIdx = 0;
  syncPhotoTray();
}

async function init() {
  syncPanelTabs();
  syncCropInputs();
  const query = new URLSearchParams(window.location.search);
  const shot = query.get('shot');

  if (shot) {
    state.hideSelection = shot === 'cover';
    await applyShotParams(shot, query, {
      setSize: applySize,
      setLayout: applyLayout,
      setGrade: applyGrade,
      setCaption: (v) => {
        state.caption = v;
        captionInput.value = v;
      },
      setSubcaption: (v) => {
        state.subcaption = v;
        subcaptionInput.value = v;
      },
      setCaptionPos: (v) => {
        state.captionPos = v;
        captionPos.value = v;
      },
      setCaptionColor: (v) => {
        state.captionColor = v;
        setActiveChip(captionColorPicker, 'color', v);
      },
      loadSamplePair,
      render: (forExport) => {
        currentPanels = renderCover(canvas, state, { forExport });
      },
    });
    return;
  }

  await loadSamplePair('pier', 'boulevard');
  if (document.fonts && document.fonts.ready) {
    await document.fonts.ready;
  }
  currentPanels = renderCover(canvas, state, { forExport: false });
  setStatus('Ready — drop your photos or export PNG');
}

init().catch((err) => {
  console.error(err);
  setStatus(err.message);
});
