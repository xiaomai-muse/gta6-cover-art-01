// Main GTA-style poster renderer: multi-panel photo framing, colour grade, comic borders, and bold typography.

import { buildLayoutPanels } from './layouts.js';
import { applyGradeToCanvas, GRADES } from './grade.js';

const CAPTION_PALETTES = {
  sunset: ['#fff4b8', '#ffae38', '#ff3b8d'],
  neon: ['#ffffff', '#ff74d4', '#ff1b78'],
  cyan: ['#ffffff', '#7df9ff', '#169cff'],
  white: ['#ffffff', '#f0eef8', '#d2cce6'],
};

function tracePoly(ctx, poly) {
  ctx.beginPath();
  ctx.moveTo(poly[0][0], poly[0][1]);
  for (let i = 1; i < poly.length; i += 1) {
    ctx.lineTo(poly[i][0], poly[i][1]);
  }
  ctx.closePath();
}

function drawPhotoInBounds(ctx, img, bounds, crop) {
  const { x, y, w, h } = bounds;
  const imgAspect = img.naturalWidth / img.naturalHeight;
  const boxAspect = w / h;

  let baseW;
  let baseH;
  if (imgAspect > boxAspect) {
    baseH = h;
    baseW = h * imgAspect;
  } else {
    baseW = w;
    baseH = w / imgAspect;
  }

  const zoom = Math.max(1, crop.zoom || 1);
  const drawW = baseW * zoom;
  const drawH = baseH * zoom;
  const maxShiftX = Math.max(0, (drawW - w) * 0.5);
  const maxShiftY = Math.max(0, (drawH - h) * 0.5);
  const shiftX = Math.max(-maxShiftX, Math.min(maxShiftX, (crop.panX || 0) * maxShiftX));
  const shiftY = Math.max(-maxShiftY, Math.min(maxShiftY, (crop.panY || 0) * maxShiftY));

  const dx = x + (w - drawW) * 0.5 + shiftX;
  const dy = y + (h - drawH) * 0.5 + shiftY;
  ctx.drawImage(img, dx, dy, drawW, drawH);
}

function wrapTitleLines(ctx, text, maxWidth) {
  const words = text.trim().split(/\s+/).filter(Boolean);
  if (words.length <= 1) return [text.trim()];
  const lines = [];
  let current = words[0];
  for (let i = 1; i < words.length; i += 1) {
    const candidate = `${current} ${words[i]}`;
    if (ctx.measureText(candidate).width <= maxWidth) {
      current = candidate;
    } else {
      lines.push(current);
      current = words[i];
    }
  }
  lines.push(current);
  return lines.slice(0, 3);
}

function drawCaptionBlock(ctx, width, height, state) {
  const titleText = (state.caption || '').trim().toUpperCase();
  const subText = (state.subcaption || '').trim().toUpperCase();
  if (!titleText && !subText) return;

  const minDim = Math.min(width, height);
  const scale = (state.captionSize || 100) / 100;
  let fontSize = Math.round(minDim * 0.095 * scale);
  const maxTextWidth = width * 0.84;

  ctx.save();
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';

  ctx.font = `400 ${fontSize}px "Archivo Black", Impact, "Arial Black", sans-serif`;
  let lines = titleText ? wrapTitleLines(ctx, titleText, maxTextWidth) : [];
  while (lines.some((l) => ctx.measureText(l).width > maxTextWidth) && fontSize > 28) {
    fontSize -= 4;
    ctx.font = `400 ${fontSize}px "Archivo Black", Impact, "Arial Black", sans-serif`;
    lines = wrapTitleLines(ctx, titleText, maxTextWidth);
  }

  const lineH = fontSize * 1.02;
  const subSize = Math.round(minDim * 0.036 * Math.max(0.85, scale * 0.92));
  const subBarH = subText ? Math.round(subSize * 1.45) : 0;
  const totalH = lines.length * lineH + (subText ? subBarH + minDim * 0.018 : 0);

  let startY;
  if (state.captionPos === 'top') {
    startY = height * 0.09 + lineH * 0.5;
  } else if (state.captionPos === 'center') {
    startY = height * 0.5 - totalH * 0.5 + lineH * 0.5;
  } else {
    startY = height * 0.91 - totalH + lineH * 0.5;
  }

  // Soft readability scrim behind text
  const scrimTop = startY - lineH * 0.9;
  const scrimBot = startY + totalH + lineH * 0.4;
  const scrim = ctx.createLinearGradient(0, scrimTop, 0, scrimBot);
  scrim.addColorStop(0, 'rgba(8, 4, 16, 0)');
  scrim.addColorStop(0.5, 'rgba(8, 4, 16, 0.55)');
  scrim.addColorStop(1, 'rgba(8, 4, 16, 0)');
  ctx.fillStyle = scrim;
  ctx.fillRect(0, scrimTop, width, scrimBot - scrimTop);

  const cx = width * 0.5;
  const palette = CAPTION_PALETTES[state.captionColor] || CAPTION_PALETTES.sunset;
  const outlineW = Math.max(6, Math.round(fontSize * 0.14));
  const shadowOff = Math.max(4, Math.round(fontSize * 0.075));

  for (let i = 0; i < lines.length; i += 1) {
    const ly = startY + i * lineH;
    const line = lines[i];

    ctx.lineJoin = 'round';
    ctx.miterLimit = 2;

    // Hard offset drop shadow
    ctx.fillStyle = '#07030e';
    ctx.strokeStyle = '#07030e';
    ctx.lineWidth = outlineW;
    ctx.strokeText(line, cx + shadowOff, ly + shadowOff);
    ctx.fillText(line, cx + shadowOff, ly + shadowOff);

    // Thick ink outline
    ctx.strokeStyle = '#120820';
    ctx.lineWidth = outlineW;
    ctx.strokeText(line, cx, ly);

    // Gradient lettering fill
    const grad = ctx.createLinearGradient(0, ly - fontSize * 0.5, 0, ly + fontSize * 0.5);
    grad.addColorStop(0, palette[0]);
    grad.addColorStop(0.52, palette[1]);
    grad.addColorStop(1, palette[2]);
    ctx.fillStyle = grad;
    ctx.fillText(line, cx, ly);
  }

  if (subText) {
    const subY = startY + lines.length * lineH + subBarH * 0.35;
    ctx.font = `400 ${subSize}px "Bebas Neue", "Arial Narrow", sans-serif`;
    const subW = ctx.measureText(subText).width + subSize * 1.4;
    const pillX = cx - subW * 0.5;
    const pillY = subY - subBarH * 0.5;

    ctx.save();
    ctx.translate(cx, subY);
    ctx.transform(1, 0, -0.16, 1, 0, 0);
    ctx.fillStyle = '#0e071a';
    ctx.fillRect(-subW * 0.5, -subBarH * 0.5, subW, subBarH);
    ctx.strokeStyle = palette[1];
    ctx.lineWidth = Math.max(2, Math.round(minDim * 0.003));
    ctx.strokeRect(-subW * 0.5, -subBarH * 0.5, subW, subBarH);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(subText, 0, 1);
    ctx.restore();
    void pillX;
    void pillY;
  }

  ctx.restore();
}

export function renderCover(canvas, state, options = {}) {
  const { forExport = false } = options;
  const width = state.width;
  const height = state.height;

  if (canvas.width !== width || canvas.height !== height) {
    canvas.width = width;
    canvas.height = height;
  }

  const ctx = canvas.getContext('2d');
  const panels = buildLayoutPanels(state.layout, width, height);
  const preset = GRADES[state.grade] || GRADES.sunset;

  // Offscreen buffer for panel photos + colour grade so borders & lettering stay razor-sharp
  const buffer = document.createElement('canvas');
  buffer.width = width;
  buffer.height = height;
  const bctx = buffer.getContext('2d');

  bctx.fillStyle = '#090610';
  bctx.fillRect(0, 0, width, height);

  for (let i = 0; i < panels.length; i += 1) {
    const panel = panels[i];
    const slot = state.panels[i] || { photoIdx: 0, zoom: 1, panX: 0, panY: 0 };
    const photo = state.photos[slot.photoIdx] || state.photos[0] || null;

    bctx.save();
    tracePoly(bctx, panel.poly);
    bctx.clip();

    if (photo && photo.img && photo.img.complete && photo.img.naturalWidth > 0) {
      drawPhotoInBounds(bctx, photo.img, panel.bounds, slot);
    } else {
      const g = bctx.createLinearGradient(0, panel.bounds.y, 0, panel.bounds.y + panel.bounds.h);
      g.addColorStop(0, '#ff6d4d');
      g.addColorStop(0.5, '#c2297e');
      g.addColorStop(1, '#1d1038');
      bctx.fillStyle = g;
      bctx.fillRect(panel.bounds.x, panel.bounds.y, panel.bounds.w, panel.bounds.h);
    }
    bctx.restore();
  }

  applyGradeToCanvas(bctx, width, height, state.grade, state.gradeIntensity);

  // Copy graded panels onto main canvas
  ctx.clearRect(0, 0, width, height);
  ctx.drawImage(buffer, 0, 0);

  // Subtle edge vignette
  const vig = ctx.createRadialGradient(
    width * 0.5,
    height * 0.45,
    Math.min(width, height) * 0.3,
    width * 0.5,
    height * 0.5,
    Math.max(width, height) * 0.78,
  );
  vig.addColorStop(0, 'rgba(0,0,0,0)');
  vig.addColorStop(1, 'rgba(6,2,14,0.45)');
  ctx.fillStyle = vig;
  ctx.fillRect(0, 0, width, height);

  // Comic-poster panel borders
  const borderW = Math.max(4, Math.round(Math.min(width, height) * 0.0075));
  for (let i = 0; i < panels.length; i += 1) {
    const panel = panels[i];
    ctx.save();
    tracePoly(ctx, panel.poly);
    ctx.lineWidth = borderW;
    ctx.strokeStyle = '#08050f';
    ctx.stroke();

    ctx.lineWidth = Math.max(1.5, borderW * 0.28);
    ctx.strokeStyle = preset.borderTint;
    ctx.globalAlpha = 0.55;
    ctx.stroke();
    ctx.restore();
  }

  // Bold GTA-style caption lettering
  drawCaptionBlock(ctx, width, height, state);

  // Editor-only active panel outline
  if (!forExport && !state.hideSelection && state.activePanel >= 0 && state.activePanel < panels.length) {
    const active = panels[state.activePanel];
    ctx.save();
    tracePoly(ctx, active.poly);
    ctx.setLineDash([12, 8]);
    ctx.lineWidth = Math.max(3, Math.round(Math.min(width, height) * 0.005));
    ctx.strokeStyle = '#2cf6ff';
    ctx.stroke();
    ctx.restore();
  }

  return panels;
}
