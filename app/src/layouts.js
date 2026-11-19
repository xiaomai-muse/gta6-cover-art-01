// Multi-panel GTA-style poster layouts with polygon clipping and smart default crops.

function rectPoly(x, y, w, h) {
  return [
    [x, y],
    [x + w, y],
    [x + w, y + h],
    [x, y + h],
  ];
}

function boundsOf(poly) {
  let minX = Infinity;
  let minY = Infinity;
  let maxX = -Infinity;
  let maxY = -Infinity;
  for (const [x, y] of poly) {
    if (x < minX) minX = x;
    if (y < minY) minY = y;
    if (x > maxX) maxX = x;
    if (y > maxY) maxY = y;
  }
  return { x: minX, y: minY, w: maxX - minX, h: maxY - minY };
}

export function buildLayoutPanels(layoutId, width, height) {
  const pad = Math.round(Math.min(width, height) * 0.026);
  const gap = Math.round(Math.min(width, height) * 0.014);
  const ix = pad;
  const iy = pad;
  const iw = width - pad * 2;
  const ih = height - pad * 2;
  const isWide = width > height * 1.15;

  let polys = [];

  if (layoutId === 'triptych') {
    const slant = Math.round(iw * 0.055);
    const x1 = ix + Math.round(iw * 0.42);
    const x2 = ix + Math.round(iw * 0.72);
    const g = gap * 0.7;
    polys = [
      [
        [ix, iy],
        [x1 + slant - g, iy],
        [x1 - slant - g, iy + ih],
        [ix, iy + ih],
      ],
      [
        [x1 + slant + g, iy],
        [x2 + slant - g, iy],
        [x2 - slant - g, iy + ih],
        [x1 - slant + g, iy + ih],
      ],
      [
        [x2 + slant + g, iy],
        [ix + iw, iy],
        [ix + iw, iy + ih],
        [x2 - slant + g, iy + ih],
      ],
    ];
  } else if (layoutId === 'quad') {
    const splitX = ix + Math.round(iw * (isWide ? 0.54 : 0.56));
    const splitY1 = iy + Math.round(ih * 0.44);
    const splitY2 = iy + Math.round(ih * 0.68);
    polys = [
      rectPoly(ix, iy, splitX - ix - gap * 0.5, splitY2 - iy - gap * 0.5),
      rectPoly(splitX + gap * 0.5, iy, ix + iw - splitX - gap * 0.5, splitY1 - iy - gap * 0.5),
      rectPoly(splitX + gap * 0.5, splitY1 + gap * 0.5, ix + iw - splitX - gap * 0.5, ih - (splitY1 - iy) - gap * 0.5),
      rectPoly(ix, splitY2 + gap * 0.5, splitX - ix - gap * 0.5, iy + ih - splitY2 - gap * 0.5),
    ];
  } else if (layoutId === 'duo') {
    const slant = Math.round(iw * 0.07);
    const midX = ix + Math.round(iw * 0.5);
    const g = gap * 0.75;
    polys = [
      [
        [ix, iy],
        [midX + slant - g, iy],
        [midX - slant - g, iy + ih],
        [ix, iy + ih],
      ],
      [
        [midX + slant + g, iy],
        [ix + iw, iy],
        [ix + iw, iy + ih],
        [midX - slant + g, iy + ih],
      ],
    ];
  } else {
    // 'mosaic' (default): Hero panel + 3 angled/staggered secondary panels
    if (isWide) {
      const heroW = Math.round(iw * 0.56);
      const slant = Math.round(iw * 0.022);
      const splitTopX = ix + heroW + slant;
      const splitBotX = ix + heroW - slant;
      const topH = Math.round(ih * 0.52);
      const botY = iy + topH + gap;
      const botH = ih - topH - gap;
      const splitMidX = Math.round(ix + heroW);
      const rightMidX = splitMidX + gap;
      const rightMidW = ix + iw - rightMidX;
      const subW = Math.round((rightMidW - gap) * 0.5);
      polys = [
        [
          [ix, iy],
          [splitTopX, iy],
          [splitBotX, iy + ih],
          [ix, iy + ih],
        ],
        [
          [splitTopX + gap, iy],
          [ix + iw, iy],
          [ix + iw, iy + topH],
          [splitMidX + gap, iy + topH],
        ],
        [
          [splitMidX + gap, botY],
          [rightMidX + subW, botY],
          [rightMidX + subW, iy + ih],
          [splitBotX + gap, iy + ih],
        ],
        rectPoly(rightMidX + subW + gap, botY, rightMidW - subW - gap, botH),
      ];
    } else {
      const heroH = Math.round(ih * 0.6);
      const botY = iy + heroH + gap;
      const botH = ih - heroH - gap;
      const colW = Math.round((iw - gap * 2) / 3);
      polys = [
        rectPoly(ix, iy, iw, heroH),
        rectPoly(ix, botY, colW, botH),
        rectPoly(ix + colW + gap, botY, colW, botH),
        rectPoly(ix + (colW + gap) * 2, botY, iw - (colW + gap) * 2, botH),
      ];
    }
  }

  return polys.map((poly, index) => ({
    index,
    poly,
    bounds: boundsOf(poly),
  }));
}

export function pointInPoly(px, py, poly) {
  let inside = false;
  for (let i = 0, j = poly.length - 1; i < poly.length; j = i++) {
    const [xi, yi] = poly[i];
    const [xj, yj] = poly[j];
    const intersect = yi > py !== yj > py && px < ((xj - xi) * (py - yi)) / (yj - yi + 1e-9) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

export function hitTestPanel(panels, px, py) {
  for (let i = 0; i < panels.length; i += 1) {
    if (pointInPoly(px, py, panels[i].poly)) return i;
  }
  return -1;
}
