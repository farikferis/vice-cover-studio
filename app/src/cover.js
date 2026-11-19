// Vice Cover Studio — cover engine.
//
// Draws a multi-panel GTA-poster-style cover onto a canvas: the person's
// photos fill 3 or 4 panels (Trio / Hero + strip / Quad), a Vice City sunset,
// neon or noir grade washes over them, and a bold condensed caption sits
// across the foot in outlined white capitals. Everything here is original
// vector work and system fonts — no Rockstar logo, artwork or font file.
//
// A photo is { img, zoom, panX, panY }: zoom 1..3 magnifies the cover-fit
// image, panX/panY (-1..1) slide it inside its panel. Panels with no photo
// get an original drawn sunset scene (gradient sky, sun, skyline) so the
// cover still looks finished with zero uploads.

export const LAYOUTS = {
  trio: { label: 'Trio', panels: 3 },
  hero: { label: 'Hero + strip', panels: 3 },
  quad: { label: 'Quad', panels: 4 },
};

export const GRADES = {
  sunset: { label: 'Sunset', accent: '#ff2e88' },
  neon: { label: 'Neon', accent: '#00e5ff' },
  noir: { label: 'Noir', accent: '#f5f0e6' },
};

export const EXPORT_SIZES = [
  { label: 'Square 1080 x 1080', w: 1080, h: 1080 },
  { label: 'Portrait 1080 x 1350', w: 1080, h: 1350 },
  { label: 'Wide 1920 x 1080', w: 1920, h: 1080 },
];

/** Panel rectangles for a layout inside a W x H cover, with gutters. */
export function panelRects(layout, w, h) {
  const g = Math.max(6, Math.round(w * 0.008));
  if (layout === 'hero') {
    const leftW = Math.round(w * 0.62) - g;
    const rightX = g + leftW + g;
    const rightW = w - g - rightX;
    const smallH = Math.round((h - 3 * g) / 2);
    return [
      { x: g, y: g, w: leftW, h: h - 2 * g },
      { x: rightX, y: g, w: rightW, h: smallH },
      { x: rightX, y: g + smallH + g, w: rightW, h: smallH },
    ];
  }
  if (layout === 'quad') {
    const cw = Math.round((w - 3 * g) / 2);
    const ch = Math.round((h - 3 * g) / 2);
    return [
      { x: g, y: g, w: cw, h: ch },
      { x: g + cw + g, y: g, w: cw, h: ch },
      { x: g, y: g + ch + g, w: cw, h: ch },
      { x: g + cw + g, y: g + ch + g, w: cw, h: ch },
    ];
  }
  // trio: three vertical panels
  const cw = Math.round((w - 4 * g) / 3);
  return [0, 1, 2].map((i) => ({ x: g + i * (cw + g), y: g, w: cw, h: h - 2 * g }));
}

/** Small deterministic PRNG so placeholder skylines are stable per panel. */
function mulberry32(seed) {
  let a = seed >>> 0;
  return () => {
    a |= 0; a = (a + 0x6d2b79f5) | 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

/** An original drawn sunset scene for a panel with no photo in it. */
function drawPlaceholderScene(ctx, r, grade, seed) {
  const rnd = mulberry32(seed * 7919 + 13);
  const sky = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
  if (grade === 'neon') {
    sky.addColorStop(0, '#12002e'); sky.addColorStop(0.55, '#7a0e6e'); sky.addColorStop(1, '#ff2e88');
  } else if (grade === 'noir') {
    sky.addColorStop(0, '#0c0c10'); sky.addColorStop(0.6, '#3a3a44'); sky.addColorStop(1, '#8a8a92');
  } else {
    sky.addColorStop(0, '#2a1052'); sky.addColorStop(0.5, '#c93a6e'); sky.addColorStop(0.78, '#ff7a3d'); sky.addColorStop(1, '#ffd166');
  }
  ctx.fillStyle = sky;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  // Low sun with a soft glow.
  const sunX = r.x + r.w * (0.3 + rnd() * 0.4);
  const sunY = r.y + r.h * (0.55 + rnd() * 0.1);
  const sunR = Math.min(r.w, r.h) * 0.16;
  const glow = ctx.createRadialGradient(sunX, sunY, sunR * 0.2, sunX, sunY, sunR * 3);
  glow.addColorStop(0, 'rgba(255, 220, 140, 0.85)');
  glow.addColorStop(1, 'rgba(255, 220, 140, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(r.x, r.y, r.w, r.h);
  ctx.fillStyle = grade === 'noir' ? '#e8e4da' : '#ffe9a8';
  ctx.beginPath(); ctx.arc(sunX, sunY, sunR, 0, Math.PI * 2); ctx.fill();
  // Skyline silhouette with a few lit windows.
  const base = r.y + r.h * 0.72;
  ctx.fillStyle = grade === 'noir' ? '#101014' : '#1c0b33';
  let bx = r.x;
  while (bx < r.x + r.w) {
    const bw = r.w * (0.1 + rnd() * 0.16);
    const bh = r.h * (0.1 + rnd() * 0.28);
    ctx.fillRect(bx, base - bh, bw, bh + r.h);
    if (grade !== 'noir') {
      ctx.fillStyle = 'rgba(255, 214, 120, 0.9)';
      for (let k = 0; k < 4; k++) {
        if (rnd() < 0.5) ctx.fillRect(bx + bw * (0.2 + rnd() * 0.6), base - bh + r.h * rnd() * 0.2, 3, 4);
      }
      ctx.fillStyle = '#1c0b33';
    }
    bx += bw + 2;
  }
  // Diagonal light streak for a poster feel.
  ctx.fillStyle = 'rgba(255, 255, 255, 0.10)';
  ctx.beginPath();
  ctx.moveTo(r.x, r.y + r.h * 0.2); ctx.lineTo(r.x + r.w * 0.5, r.y);
  ctx.lineTo(r.x + r.w * 0.68, r.y); ctx.lineTo(r.x + r.w * 0.18, r.y + r.h * 0.2);
  ctx.closePath(); ctx.fill();
}

/** Draws one photo (cover-fit, zoomed, panned) or a placeholder scene. */
function drawPanel(ctx, r, photo, grade, index) {
  ctx.save();
  ctx.beginPath(); ctx.rect(r.x, r.y, r.w, r.h); ctx.clip();
  if (!photo || !photo.img) {
    drawPlaceholderScene(ctx, r, grade, index + 1);
  } else {
    const iw = photo.img.naturalWidth || photo.img.width;
    const ih = photo.img.naturalHeight || photo.img.height;
    const zoom = photo.zoom || 1;
    const base = Math.max(r.w / iw, r.h / ih) * zoom;
    const dw = iw * base;
    const dh = ih * base;
    const slackX = Math.max(0, (dw - r.w) / 2);
    const slackY = Math.max(0, (dh - r.h) / 2);
    const dx = r.x + (r.w - dw) / 2 + (photo.panX || 0) * slackX;
    const dy = r.y + (r.h - dh) / 2 + (photo.panY || 0) * slackY;
    if (grade === 'noir') ctx.filter = 'grayscale(1) contrast(1.18) brightness(0.96)';
    ctx.drawImage(photo.img, dx, dy, dw, dh);
    ctx.filter = 'none';
  }
  // Grade wash inside the panel.
  if (grade === 'sunset') {
    const wash = ctx.createLinearGradient(0, r.y, 0, r.y + r.h);
    wash.addColorStop(0, 'rgba(255, 140, 60, 0.05)');
    wash.addColorStop(1, 'rgba(255, 46, 136, 0.22)');
    ctx.fillStyle = wash; ctx.fillRect(r.x, r.y, r.w, r.h);
  } else if (grade === 'neon') {
    const wash = ctx.createLinearGradient(r.x, r.y, r.x + r.w, r.y + r.h);
    wash.addColorStop(0, 'rgba(255, 0, 140, 0.16)');
    wash.addColorStop(1, 'rgba(0, 229, 255, 0.16)');
    ctx.fillStyle = wash; ctx.fillRect(r.x, r.y, r.w, r.h);
  }
  // Keyline around the panel.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.9)';
  ctx.lineWidth = Math.max(2, r.w * 0.006);
  ctx.strokeRect(r.x, r.y, r.w, r.h);
  ctx.restore();
}

/** Shrinks a bold condensed font until `text` fits `maxWidth`. */
function fitFont(ctx, text, startSize, maxWidth) {
  let size = startSize;
  const stack = `'Arial Black', Impact, 'Helvetica Neue', sans-serif`;
  ctx.font = `900 ${size}px ${stack}`;
  while (size > 12 && ctx.measureText(text).width > maxWidth) {
    size -= 2;
    ctx.font = `900 ${size}px ${stack}`;
  }
  return size;
}

/** Bold outlined caption lettering across the foot of the cover. */
function drawLettering(ctx, w, h, title, subtitle, grade) {
  const accent = (GRADES[grade] || GRADES.sunset).accent;
  // Dark band so the letters read over any photo.
  const band = ctx.createLinearGradient(0, h * 0.68, 0, h);
  band.addColorStop(0, 'rgba(10, 4, 18, 0)');
  band.addColorStop(0.45, 'rgba(10, 4, 18, 0.55)');
  band.addColorStop(1, 'rgba(10, 4, 18, 0.82)');
  ctx.fillStyle = band;
  ctx.fillRect(0, h * 0.68, w, h * 0.32);

  const text = (title || '').trim().toUpperCase();
  if (text) {
    const size = fitFont(ctx, text, h * 0.115, w * 0.92);
    ctx.save();
    ctx.translate(w / 2, h * 0.9);
    ctx.rotate(-0.018);
    ctx.textAlign = 'center';
    ctx.textBaseline = 'alphabetic';
    ctx.lineJoin = 'round';
    ctx.strokeStyle = '#14060f';
    ctx.lineWidth = Math.max(3, size * 0.16);
    ctx.shadowColor = grade === 'neon' ? 'rgba(0, 229, 255, 0.9)' : 'rgba(255, 46, 136, 0.75)';
    ctx.shadowBlur = size * 0.22;
    ctx.shadowOffsetY = size * 0.05;
    ctx.strokeText(text, 0, 0);
    ctx.fillStyle = '#ffffff';
    ctx.fillText(text, 0, 0);
    ctx.restore();
  }

  const sub = (subtitle || '').trim().toUpperCase();
  if (sub) {
    const size = fitFont(ctx, sub, h * 0.032, w * 0.8);
    try { ctx.letterSpacing = `${Math.round(size * 0.18)}px`; } catch { /* older canvas */ }
    const tw = ctx.measureText(sub).width;
    const padX = size * 0.9;
    const barH = size * 2.1;
    const barY = h * 0.925;
    ctx.fillStyle = accent;
    ctx.fillRect((w - tw) / 2 - padX, barY, tw + padX * 2, barH);
    ctx.fillStyle = '#14060f';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = 'transparent'; ctx.shadowBlur = 0; ctx.shadowOffsetY = 0;
    ctx.fillText(sub, w / 2, barY + barH / 2 + size * 0.04);
    try { ctx.letterSpacing = '0px'; } catch { /* older canvas */ }
  }
}

/**
 * Draws the whole cover onto `canvas` (at the canvas's own size).
 * state: { photos, layout, grade, title, subtitle }.
 */
export function drawCover(canvas, state) {
  const ctx = canvas.getContext('2d');
  const w = canvas.width;
  const h = canvas.height;
  const grade = state.grade || 'sunset';
  // Deep poster background behind the gutters.
  const bg = ctx.createLinearGradient(0, 0, 0, h);
  bg.addColorStop(0, '#160a2e'); bg.addColorStop(1, '#0a0412');
  ctx.fillStyle = bg;
  ctx.fillRect(0, 0, w, h);

  const rects = panelRects(state.layout || 'trio', w, h);
  const photos = state.photos || [];
  rects.forEach((r, i) => {
    const photo = photos.length ? photos[i % photos.length] : null;
    drawPanel(ctx, r, photo, grade, i);
  });

  // Whole-cover grade wash + vignette.
  if (grade === 'sunset') {
    const wash = ctx.createLinearGradient(0, 0, 0, h);
    wash.addColorStop(0, 'rgba(255, 180, 80, 0.06)');
    wash.addColorStop(1, 'rgba(255, 46, 136, 0.10)');
    ctx.fillStyle = wash; ctx.fillRect(0, 0, w, h);
  } else if (grade === 'neon') {
    ctx.fillStyle = 'rgba(0, 229, 255, 0.05)';
    ctx.fillRect(0, 0, w, h);
  }
  const vig = ctx.createRadialGradient(w / 2, h / 2, Math.min(w, h) * 0.35, w / 2, h / 2, Math.max(w, h) * 0.75);
  vig.addColorStop(0, 'rgba(0, 0, 0, 0)');
  vig.addColorStop(1, 'rgba(0, 0, 0, 0.35)');
  ctx.fillStyle = vig; ctx.fillRect(0, 0, w, h);

  drawLettering(ctx, w, h, state.title, state.subtitle, grade);

  // Outer poster frame.
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.95)';
  ctx.lineWidth = Math.max(3, w * 0.005);
  ctx.strokeRect(ctx.lineWidth / 2, ctx.lineWidth / 2, w - ctx.lineWidth, h - ctx.lineWidth);
}

/** Renders the cover at W x H onto a fresh canvas and returns it. */
export function renderCover(w, h, state) {
  const canvas = document.createElement('canvas');
  canvas.width = w;
  canvas.height = h;
  drawCover(canvas, state);
  return canvas;
}
