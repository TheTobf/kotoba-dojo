// Prozedurale Texturen (keine fremden Bilder): Papierkorn, Knete-Fingerabdrücke, Schilder mit Text.
import * as THREE from 'three';

export function zufall(seed: number) {
  let s = seed >>> 0;
  return () => ((s = (s * 1664525 + 1013904223) >>> 0) / 4294967296);
}

export function rauschTextur(art: 'papier' | 'knete' | 'korn', seed = 1): THREE.CanvasTexture {
  const n = 256, c = document.createElement('canvas');
  c.width = c.height = n;
  const g = c.getContext('2d')!, r = zufall(seed);
  g.fillStyle = '#808080'; g.fillRect(0, 0, n, n);
  if (art === 'korn') { // helles Papierkorn als Farbtextur (multipliziert kaum)
    const img = g.getImageData(0, 0, n, n);
    for (let i = 0; i < img.data.length; i += 4) { const v = 236 + r() * 19; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; }
    g.putImageData(img, 0, 0);
    g.globalAlpha = 0.25;
    for (let i = 0; i < 90; i++) { g.strokeStyle = '#d8d2c4'; g.beginPath(); const x = r() * n, y = r() * n; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 40, y + (r() - 0.5) * 40); g.stroke(); }
    const t = new THREE.CanvasTexture(c); t.colorSpace = THREE.SRGBColorSpace; t.wrapS = t.wrapT = THREE.RepeatWrapping; return t;
  }
  if (art === 'papier') {
    const img = g.getImageData(0, 0, n, n);
    for (let i = 0; i < img.data.length; i += 4) { const v = 118 + r() * 22; img.data[i] = img.data[i + 1] = img.data[i + 2] = v; }
    g.putImageData(img, 0, 0);
    g.globalAlpha = 0.12;
    for (let i = 0; i < 140; i++) { g.strokeStyle = r() > 0.5 ? '#fff' : '#000'; g.beginPath(); const x = r() * n, y = r() * n; g.moveTo(x, y); g.lineTo(x + (r() - 0.5) * 30, y + (r() - 0.5) * 30); g.stroke(); }
  } else {
    g.globalAlpha = 0.18;
    for (let i = 0; i < 60; i++) {
      const x = r() * n, y = r() * n, rad = 14 + r() * 14;
      for (let k = 0; k < 5; k++) { g.strokeStyle = k % 2 ? '#fff' : '#000'; g.lineWidth = 1.2; g.beginPath(); g.arc(x, y, rad - k * 2.5, r() * 6, r() * 6 + 2.5); g.stroke(); }
    }
  }
  const t = new THREE.CanvasTexture(c);
  t.wrapS = t.wrapT = THREE.RepeatWrapping;
  return t;
}

export function schildTextur(text: string, opt: { bg: string; fg: string; font: string; w?: number; h?: number; size?: number }): THREE.CanvasTexture {
  const w = opt.w ?? 1024, h = opt.h ?? 256, c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = opt.bg; g.fillRect(0, 0, w, h);
  g.fillStyle = opt.fg; g.font = `900 ${opt.size ?? h * 0.55}px "${opt.font}"`;
  g.textAlign = 'center'; g.textBaseline = 'middle';
  g.fillText(text, w / 2, h / 2 + h * 0.03);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 8;
  return t;
}

// Automaten-Front: bunte Flaschenreihen (eigene Formen, keine Marken)
export function automatTextur(farben: string[], bg: string): THREE.CanvasTexture {
  const w = 256, h = 512, c = document.createElement('canvas');
  c.width = w; c.height = h;
  const g = c.getContext('2d')!;
  g.fillStyle = bg; g.fillRect(0, 0, w, h);
  g.fillStyle = '#f8fbff'; g.fillRect(16, 20, w - 32, 300);
  for (let row = 0; row < 3; row++) for (let i = 0; i < 6; i++) {
    const x = 26 + i * 36, y = 36 + row * 96;
    g.fillStyle = farben[(row * 6 + i) % farben.length];
    g.beginPath(); g.roundRect(x, y + 14, 24, 56, 6); g.fill();
    g.fillRect(x + 8, y, 8, 16);
    g.fillStyle = row === 1 ? '#e04a3a' : '#2b8a57'; g.fillRect(x + 4, y + 76, 16, 6);
  }
  g.fillStyle = '#2b2b2b'; g.fillRect(40, 400, w - 80, 60);
  g.fillStyle = '#ddd'; g.fillRect(190, 340, 30, 40);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  return t;
}
