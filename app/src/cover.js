// Neon Coast Cover Studio — cover renderer.
// Draws GTA-poster-style multi-panel cover art on a 2D canvas from the user's
// own photos. All art is original: gradient skies, a slit retro sun, palm
// silhouettes and halftone dots drawn in code. No Rockstar logo, artwork or font.

export const SIZES = {
  square: { w: 1080, h: 1080, label: '1080 x 1080' },
  portrait: { w: 1080, h: 1350, label: '1080 x 1350' },
  wide: { w: 1920, h: 1080, label: '1920 x 1080' },
};

export const LAYOUTS = {
  hero: { label: 'Hero + 3', panels: 4 },
  grid: { label: 'Four Panel Grid', panels: 4 },
  strip: { label: 'Full Bleed + Strip', panels: 3 },
  tilted: { label: 'Tilted Snapshots', panels: 3 },
};

export const GRADES = {
  sunset: { label: 'Vice Sunset', sky: ['#ff9a3d', '#ff5e7a', '#7b2d8b', '#2b1055'], tint: 'rgba(255,94,122,0.28)', glow: '#ff5e7a' },
  neon: { label: 'Neon Night', sky: ['#0f0524', '#3b0f6e', '#ff2e88', '#00e5ff'], tint: 'rgba(0,229,255,0.16)', glow: '#ff2e88' },
  teal: { label: 'Palm Teal', sky: ['#a8e6cf', '#2ec4b6', '#0b6e6b', '#073b4c'], tint: 'rgba(46,196,182,0.22)', glow: '#2ec4b6' },
  gold: { label: 'Golden Hour', sky: ['#ffe29a', '#ffb347', '#ff7b54', '#5c2e4e'], tint: 'rgba(255,179,71,0.25)', glow: '#ffb347' },
  noir: { label: 'Midnight Noir', sky: ['#e8e8e8', '#9a9a9a', '#3a3a3a', '#0d0d0d'], tint: 'rgba(255,255,255,0.10)', glow: '#ffffff' },
};

export function defaultState() {
  return {
    layout: 'hero',
    grade: 'sunset',
    size: 'wide',
    title: 'NEON COAST',
    subtitle: 'one last ride down the boulevard',
    panels: [
      { photo: 0, zoom: 1.15, x: 0, y: 0 },
      { photo: 0, zoom: 1.7, x: 0.15, y: -0.1 },
      { photo: 1, zoom: 1.2, x: 0, y: 0 },
      { photo: 1, zoom: 1.6, x: -0.1, y: 0.08 },
    ],
  };
}

// Deterministic pseudo-random generator so grain looks the same every render.
export function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function fitText(ctx, text, maxWidth, startSize, font) {
  let size = startSize;
  ctx.font = font(size);
  while (size > 10 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = font(size);
  }
  return size;
}

// Panel rectangles as fractions of the canvas, per layout. The title band
// occupies the bottom ~24% in hero/grid; strip/tilted overlay the title.
export function panelRects(layout, w, h) {
  const gap = Math.round(w * 0.012);
  const band = Math.round(h * 0.26);
  const top = h - band;
  if (layout === 'grid') {
    const cw = (w - gap * 3) / 2, ch = (top - gap * 3) / 2;
    return [
      { x: gap, y: gap, w: cw, h: ch }, { x: gap * 2 + cw, y: gap, w: cw, h: ch },
      { x: gap, y: gap * 2 + ch, w: cw, h: ch }, { x: gap * 2 + cw, y: gap * 2 + ch, w: cw, h: ch },
    ];
  }
  if (layout === 'strip') {
    const stripH = Math.round(h * 0.22);
    return [
      { x: 0, y: 0, w, h: h - stripH },
      { x: gap, y: h - stripH + gap, w: (w - gap * 3) / 2, h: stripH - gap * 2 },
      { x: gap * 2 + (w - gap * 3) / 2, y: h - stripH + gap, w: (w - gap * 3) / 2, h: stripH - gap * 2 },
    ];
  }
  if (layout === 'tilted') {
    const pw = w * 0.42, ph = h * 0.58;
    return [
      { x: w * 0.05, y: h * 0.06, w: pw, h: ph, rot: -0.06 },
      { x: w * 0.5, y: h * 0.03, w: pw, h: ph, rot: 0.05 },
      { x: w * 0.28, y: h * 0.36, w: pw, h: ph, rot: -0.02 },
    ];
  }
  // hero: one big panel left, three stacked right
  const heroW = Math.round(w * 0.62);
  const sideW = w - heroW - gap * 3;
  const sideH = (top - gap * 4) / 3;
  return [
    { x: gap, y: gap, w: heroW, h: top - gap * 2 },
    { x: heroW + gap * 2, y: gap, w: sideW, h: sideH },
    { x: heroW + gap * 2, y: gap * 2 + sideH, w: sideW, h: sideH },
    { x: heroW + gap * 2, y: gap * 3 + sideH * 2, w: sideW, h: sideH },
  ];
}

function drawPhotoInto(ctx, photo, rect, panel) {
  if (!photo) return;
  const iw = photo.naturalWidth || photo.width;
  const ih = photo.naturalHeight || photo.height;
  const base = Math.max(rect.w / iw, rect.h / ih) * (panel.zoom || 1);
  const pw = iw * base, ph = ih * base;
  const cx = rect.x + rect.w / 2 + (panel.x || 0) * rect.w * 0.4;
  const cy = rect.y + rect.h / 2 + (panel.y || 0) * rect.h * 0.4;
  ctx.drawImage(photo, cx - pw / 2, cy - ph / 2, pw, ph);
}

function drawSun(ctx, cx, cy, r, grade) {
  ctx.save();
  const sun = ctx.createLinearGradient(0, cy - r, 0, cy + r);
  sun.addColorStop(0, '#ffe259');
  sun.addColorStop(0.55, '#ffa751');
  sun.addColorStop(1, grade.glow);
  ctx.fillStyle = sun;
  ctx.beginPath();
  ctx.arc(cx, cy, r, 0, Math.PI * 2);
  ctx.fill();
  // Retro slits across the lower half of the sun.
  ctx.fillStyle = 'rgba(20,8,40,0.85)';
  for (let i = 0; i < 5; i++) {
    const y = cy + r * (0.05 + i * 0.17);
    const half = Math.sqrt(Math.max(0, r * r - (y - cy) * (y - cy)));
    ctx.fillRect(cx - half, y, half * 2, r * 0.045 + i * r * 0.012);
  }
  ctx.restore();
}

function halftoneDots(ctx, x, y, w, h, color) {
  ctx.save();
  ctx.fillStyle = color;
  const step = 14;
  for (let yy = y + step / 2; yy < y + h; yy += step) {
    for (let xx = x + step / 2; xx < x + w; xx += step) {
      const r = 1 + ((xx + yy) % 28) / 28 * 2.2;
      ctx.beginPath();
      ctx.arc(xx, yy, r, 0, Math.PI * 2);
      ctx.fill();
    }
  }
  ctx.restore();
}

function applyGrade(ctx, w, h, grade) {
  ctx.save();
  ctx.globalCompositeOperation = 'overlay';
  const g = ctx.createLinearGradient(0, 0, 0, h);
  g.addColorStop(0, grade.sky[0]);
  g.addColorStop(0.5, grade.sky[1]);
  g.addColorStop(1, grade.sky[2]);
  ctx.globalAlpha = 0.35;
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, w, h);
  ctx.globalCompositeOperation = 'source-over';
  ctx.globalAlpha = 1;
  ctx.fillStyle = grade.tint;
  ctx.fillRect(0, 0, w, h);
  // Vignette.
  const v = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  v.addColorStop(0, 'rgba(0,0,0,0)');
  v.addColorStop(1, 'rgba(10,4,24,0.55)');
  ctx.fillStyle = v;
  ctx.fillRect(0, 0, w, h);
  ctx.restore();
}

function addGrain(ctx, w, h) {
  const rand = mulberry32(20261120);
  ctx.save();
  ctx.globalAlpha = 0.07;
  for (let i = 0; i < Math.round(w * h / 900); i++) {
    ctx.fillStyle = rand() > 0.5 ? '#ffffff' : '#000000';
    ctx.fillRect(rand() * w, rand() * h, 1.6, 1.6);
  }
  ctx.restore();
}

function drawTitleBlock(ctx, w, h, state, grade) {
  const bandH = Math.round(h * 0.26);
  const bandY = h - bandH;
  const title = (state.title || 'NEON COAST').trim().toUpperCase();
  const sub = (state.subtitle || '').trim();
  // Sunset band with halftone edge.
  const band = ctx.createLinearGradient(0, bandY, 0, h);
  band.addColorStop(0, grade.sky[1]);
  band.addColorStop(0.55, grade.sky[2]);
  band.addColorStop(1, '#160a2e');
  ctx.fillStyle = band;
  ctx.fillRect(0, bandY, w, bandH);
  halftoneDots(ctx, 0, bandY, w, Math.round(bandH * 0.16), 'rgba(255,255,255,0.35)');
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, bandY, w, Math.max(3, h * 0.004));
  // Retro sun peeking behind the title on the right.
  drawSun(ctx, w * 0.9, bandY + bandH * 0.42, bandH * 0.34, grade);
  // Title: huge condensed capitals, white with dark outline + neon glow.
  const maxW = w * 0.76;
  const size = fitText(ctx, title, maxW, bandH * 0.52, (s) => `900 ${s}px "Arial Black", "Archivo Black", sans-serif`);
  ctx.textAlign = 'left';
  ctx.textBaseline = 'middle';
  ctx.shadowColor = grade.glow;
  ctx.shadowBlur = size * 0.22;
  ctx.lineWidth = Math.max(3, size * 0.09);
  ctx.strokeStyle = '#160a2e';
  ctx.strokeText(title, w * 0.045, bandY + bandH * 0.42);
  ctx.fillStyle = '#ffffff';
  ctx.fillText(title, w * 0.045, bandY + bandH * 0.42);
  ctx.shadowBlur = 0;
  if (sub) {
    const subSize = fitText(ctx, sub, maxW, bandH * 0.17, (s) => `italic 700 ${s}px Georgia, "Times New Roman", serif`);
    ctx.font = `italic 700 ${subSize}px Georgia, "Times New Roman", serif`;
    ctx.fillStyle = '#ffe9a8';
    ctx.fillText(sub, w * 0.05, bandY + bandH * 0.82);
  }
  // Badge ribbon, top-left of the band.
  const badge = 'ORIGINAL ART  •  MADE OFFLINE';
  ctx.font = `700 ${Math.max(11, bandH * 0.09)}px system-ui, sans-serif`;
  const bw = ctx.measureText(badge).width + bandH * 0.22;
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(w * 0.045, bandY + bandH * 0.06, bw, bandH * 0.13);
  ctx.fillStyle = '#160a2e';
  ctx.textBaseline = 'middle';
  ctx.fillText(badge, w * 0.045 + bandH * 0.11, bandY + bandH * 0.125);
}

/** Draws the full cover onto `canvas` at its own pixel size. */
export function drawCover(canvas, photos, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width, h = canvas.height;
  const grade = GRADES[state.grade] || GRADES.sunset;
  // Sky background.
  const sky = ctx.createLinearGradient(0, 0, w, h);
  sky.addColorStop(0, grade.sky[0]);
  sky.addColorStop(0.45, grade.sky[1]);
  sky.addColorStop(0.8, grade.sky[2]);
  sky.addColorStop(1, grade.sky[3]);
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);
  // Outer poster frame.
  ctx.fillStyle = '#ffffff';
  ctx.fillRect(0, 0, w, Math.max(4, h * 0.008));
  ctx.fillRect(0, h - Math.max(4, h * 0.008), w, Math.max(4, h * 0.008));

  const rects = panelRects(state.layout, w, h);
  const frame = Math.max(4, Math.round(w * 0.006));
  rects.forEach((rect, i) => {
    const panel = state.panels[i] || { photo: 0, zoom: 1, x: 0, y: 0 };
    const photo = photos[panel.photo] || photos[0] || null;
    ctx.save();
    if (rect.rot) {
      ctx.translate(rect.x + rect.w / 2, rect.y + rect.h / 2);
      ctx.rotate(rect.rot);
      ctx.translate(-rect.w / 2, -rect.h / 2);
    } else {
      ctx.translate(rect.x, rect.y);
    }
    // White poster border around the panel.
    ctx.fillStyle = '#ffffff';
    ctx.fillRect(-frame, -frame, rect.w + frame * 2, rect.h + frame * 2);
    ctx.beginPath();
    ctx.rect(0, 0, rect.w, rect.h);
    ctx.clip();
    if (photo) {
      drawPhotoInto(ctx, photo, { x: 0, y: 0, w: rect.w, h: rect.h }, panel);
    } else {
      const ph = ctx.createLinearGradient(0, 0, rect.w, rect.h);
      ph.addColorStop(0, grade.sky[1]);
      ph.addColorStop(1, grade.sky[3]);
      ctx.fillStyle = ph;
      ctx.fillRect(0, 0, rect.w, rect.h);
      ctx.fillStyle = 'rgba(255,255,255,0.85)';
      ctx.font = `700 ${Math.round(rect.h * 0.09)}px system-ui, sans-serif`;
      ctx.textAlign = 'center';
      ctx.fillText('ADD A PHOTO', rect.w / 2, rect.h / 2);
    }
    // Per-panel sunset wash.
    const wash = ctx.createLinearGradient(0, rect.h * 0.4, 0, rect.h);
    wash.addColorStop(0, 'rgba(255,94,122,0)');
    wash.addColorStop(1, grade.tint);
    ctx.fillStyle = wash;
    ctx.fillRect(0, 0, rect.w, rect.h);
    ctx.restore();
  });

  if (state.layout === 'tilted') {
    // Title sits over the bottom of the tilted stack.
    ctx.save();
    ctx.fillStyle = 'rgba(22,10,46,0.55)';
    ctx.fillRect(0, h * 0.74, w, h * 0.26);
    ctx.restore();
  }
  drawTitleBlock(ctx, w, h, state, grade);
  applyGrade(ctx, w, h, grade);
  addGrain(ctx, w, h);
  return canvas;
}
