// Vice City colour grading presets: split-tone pixel grading + atmospheric poster overlays.

export const GRADES = {
  sunset: {
    label: 'Sunset',
    shadow: [42, 8, 76],
    mid: [242, 68, 128],
    highlight: [255, 206, 84],
    contrast: 1.28,
    saturation: 1.32,
    glowTop: 'rgba(255, 148, 52, 0.48)',
    glowBottom: 'rgba(138, 16, 118, 0.52)',
    borderTint: '#ffd37a',
  },
  neon: {
    label: 'Neon',
    shadow: [6, 24, 78],
    mid: [232, 28, 162],
    highlight: [72, 250, 255],
    contrast: 1.34,
    saturation: 1.4,
    glowTop: 'rgba(44, 246, 255, 0.38)',
    glowBottom: 'rgba(255, 28, 144, 0.46)',
    borderTint: '#5cf5ff',
  },
  vicenight: {
    label: 'Vice Night',
    shadow: [6, 16, 48],
    mid: [82, 48, 168],
    highlight: [255, 114, 174],
    contrast: 1.3,
    saturation: 1.26,
    glowTop: 'rgba(34, 198, 228, 0.34)',
    glowBottom: 'rgba(14, 6, 42, 0.58)',
    borderTint: '#ff7ec4',
  },
  retrogold: {
    label: 'Retro Gold',
    shadow: [16, 46, 58],
    mid: [236, 128, 54],
    highlight: [255, 236, 138],
    contrast: 1.24,
    saturation: 1.28,
    glowTop: 'rgba(255, 214, 92, 0.42)',
    glowBottom: 'rgba(14, 58, 72, 0.48)',
    borderTint: '#ffe38f',
  },
};

function clampByte(v) {
  return v < 0 ? 0 : v > 255 ? 255 : v;
}

function lerp(a, b, t) {
  return a + (b - a) * t;
}

export function applyGradeToCanvas(ctx, width, height, gradeId, intensityPct) {
  const preset = GRADES[gradeId] || GRADES.sunset;
  const amount = Math.max(0, Math.min(1, intensityPct / 100));
  if (amount <= 0.01) return;

  const imgData = ctx.getImageData(0, 0, width, height);
  const data = imgData.data;
  const [sr, sg, sb] = preset.shadow;
  const [mr, mg, mb] = preset.mid;
  const [hr, hg, hb] = preset.highlight;
  const contrast = 1 + (preset.contrast - 1) * amount;
  const sat = 1 + (preset.saturation - 1) * amount;

  for (let i = 0; i < data.length; i += 4) {
    let r = data[i];
    let g = data[i + 1];
    let b = data[i + 2];

    // Contrast around midpoint
    r = (r - 128) * contrast + 128;
    g = (g - 128) * contrast + 128;
    b = (b - 128) * contrast + 128;

    const lum = clampByte(0.299 * r + 0.587 * g + 0.114 * b);
    const t = lum / 255;

    // Saturation boost
    r = lum + (r - lum) * sat;
    g = lum + (g - lum) * sat;
    b = lum + (b - lum) * sat;

    // 3-stop split-tone target colour
    let tr;
    let tg;
    let tb;
    if (t < 0.5) {
      const k = t * 2;
      tr = lerp(sr, mr, k);
      tg = lerp(sg, mg, k);
      tb = lerp(sb, mb, k);
    } else {
      const k = (t - 0.5) * 2;
      tr = lerp(mr, hr, k);
      tg = lerp(mg, hg, k);
      tb = lerp(mb, hb, k);
    }

    // Soft-light / colour blend preserving luminance detail
    const blend = amount * 0.58;
    const lumFactor = 0.42 + 0.78 * t;
    data[i] = clampByte(lerp(r, tr * lumFactor, blend));
    data[i + 1] = clampByte(lerp(g, tg * lumFactor, blend));
    data[i + 2] = clampByte(lerp(b, tb * lumFactor, blend));
  }

  ctx.putImageData(imgData, 0, 0);

  // Atmospheric gradient wash
  ctx.save();
  ctx.globalCompositeOperation = 'screen';
  ctx.globalAlpha = amount * 0.65;
  const topGrad = ctx.createLinearGradient(0, 0, width * 0.4, height * 0.65);
  topGrad.addColorStop(0, preset.glowTop);
  topGrad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = topGrad;
  ctx.fillRect(0, 0, width, height);

  ctx.globalCompositeOperation = 'multiply';
  ctx.globalAlpha = amount * 0.55;
  const botGrad = ctx.createLinearGradient(0, height * 0.45, 0, height);
  botGrad.addColorStop(0, 'rgba(255,255,255,1)');
  botGrad.addColorStop(1, preset.glowBottom);
  ctx.fillStyle = botGrad;
  ctx.fillRect(0, 0, width, height);
  ctx.restore();
}
