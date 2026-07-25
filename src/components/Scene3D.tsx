import { useEffect, useRef, useState } from 'react';
import * as THREE from 'three';
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
import { OutputPass } from 'three/examples/jsm/postprocessing/OutputPass.js';

export type Scene3DType = 'wind' | 'emissions' | 'network' | 'solar' | 'particles';

const MINT = 0x34d399;
const GOLD = 0xf5b942;

type Ctl = {
  update: (t: number) => void;
  cam: { pos: [number, number, number]; look: [number, number, number] };
  /** Per-scene bloom tuning: what counts as "bright" and how strongly it glows. */
  bloom: { strength: number; radius: number; threshold: number };
};

/* ---------- shared helpers ---------- */

function gradientTexture(stops: [number, string][], textures: THREE.Texture[]): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 2; c.height = 512;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 0, 512);
  stops.forEach(([o, col]) => grad.addColorStop(o, col));
  g.fillStyle = grad;
  g.fillRect(0, 0, 2, 512);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  textures.push(t);
  return t;
}

function setSky(scene: THREE.Scene, stops: [number, string][], textures: THREE.Texture[]) {
  scene.background = gradientTexture(stops, textures);
}

function glowTexture(textures: THREE.Texture[]): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.25, 'rgba(255,255,255,0.55)');
  grad.addColorStop(0.55, 'rgba(255,255,255,0.18)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  textures.push(t);
  return t;
}

/** Soft round sprite for particles — default THREE.Points renders hard squares. */
function dotTexture(textures: THREE.Texture[]): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 64;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(32, 32, 0, 32, 32, 32);
  grad.addColorStop(0, 'rgba(255,255,255,1)');
  grad.addColorStop(0.4, 'rgba(255,255,255,0.65)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 64, 64);
  const t = new THREE.CanvasTexture(c);
  textures.push(t);
  return t;
}

/** Photovoltaic cell-grid texture so panels read as PV glass, not painted boards. */
function pvTexture(textures: THREE.Texture[]): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = 128; c.height = 96;
  const g = c.getContext('2d')!;
  const grad = g.createLinearGradient(0, 0, 128, 96);
  grad.addColorStop(0, '#1d4a80');
  grad.addColorStop(0.5, '#153a6b');
  grad.addColorStop(1, '#0f2f5c');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 96);
  g.strokeStyle = 'rgba(160,200,255,0.5)';
  g.lineWidth = 2;
  for (let x = 0; x <= 128; x += 16) { g.beginPath(); g.moveTo(x, 0); g.lineTo(x, 96); g.stroke(); }
  for (let y = 0; y <= 96; y += 16) { g.beginPath(); g.moveTo(0, y); g.lineTo(128, y); g.stroke(); }
  g.strokeStyle = 'rgba(220,235,255,0.85)';
  g.lineWidth = 3;
  g.strokeRect(1, 1, 126, 94);
  const t = new THREE.CanvasTexture(c);
  t.colorSpace = THREE.SRGBColorSpace;
  textures.push(t);
  return t;
}

function makeGlow(color: number, scale: number, textures: THREE.Texture[]): THREE.Sprite {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: glowTexture(textures), color, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  s.scale.setScalar(scale);
  return s;
}

/* ---------- shared bright "digital landscape" environment ---------- */
function brightEnv(scene: THREE.Scene, textures: THREE.Texture[]): void {
  // Soft blue→mint sky (bright, never dark) so it coheres with the emerald site.
  setSky(scene, [[0, '#a6d4ee'], [0.5, '#cbe6e4'], [1, '#e6f3ee']], textures);
  scene.fog = new THREE.Fog(0xe6f3ed, 34, 82);
  // Matte hemisphere daylight — soft and diffuse, no harsh shadows.
  scene.add(new THREE.HemisphereLight(0xffffff, 0xcfe6de, 1.15));

  // Pale emerald grid floor = the futuristic digital landscape.
  const grid = new THREE.GridHelper(90, 90, 0x3fae8e, 0x8ac2b6);
  const gm = grid.material as THREE.Material;
  gm.transparent = true; gm.opacity = 0.55;
  grid.position.y = -2;
  scene.add(grid);
  const floor = new THREE.Mesh(new THREE.PlaneGeometry(90, 90), new THREE.MeshStandardMaterial({ color: 0xd4e6df, roughness: 1 }));
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.02;
  scene.add(floor);

  // Stylised puffy clouds — clusters of soft, low-contrast sprites (kept below the
  // bloom threshold so they read as clouds, not glowing orbs).
  const cloudTex = glowTexture(textures);
  for (let c = 0; c < 6; c++) {
    const cx = (Math.random() - 0.5) * 34;
    const cy = 4 + Math.random() * 4;
    const cz = -12 - Math.random() * 16;
    for (let p = 0; p < 4; p++) {
      const s = new THREE.Sprite(new THREE.SpriteMaterial({ map: cloudTex, color: 0xeef4f6, transparent: true, opacity: 0.32, depthWrite: false }));
      s.position.set(cx + (Math.random() - 0.5) * 3, cy + (Math.random() - 0.5) * 1, cz);
      s.scale.setScalar(2.6 + Math.random() * 3);
      scene.add(s);
    }
  }
}

/** Simple turbine (tower + nacelle + 3-blade hub) returning its spinnable hub. */
function makeTurbine(s: number, mat: THREE.Material, bladeMat: THREE.Material): { turbine: THREE.Group; hub: THREE.Group } {
  const turbine = new THREE.Group();
  const h = 3.2 * s;
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.05 * s, 0.09 * s, h, 12), mat);
  tower.position.y = h / 2;
  const nacelle = new THREE.Mesh(new THREE.BoxGeometry(0.3 * s, 0.15 * s, 0.15 * s), mat);
  nacelle.position.set(0, h, 0.05);
  const hub = new THREE.Group();
  hub.position.set(0, h, 0.16 * s);
  for (let b = 0; b < 3; b++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.06 * s, 1.35 * s, 0.02), bladeMat);
    blade.position.y = 0.68 * s;
    const hold = new THREE.Group();
    hold.rotation.z = (b * Math.PI * 2) / 3;
    hold.add(blade);
    hub.add(hold);
  }
  turbine.add(tower, nacelle, hub);
  return { turbine, hub };
}

const clamp01 = (v: number) => Math.max(0, Math.min(1, v));

/* ---------- 01 · wind — a turbine self-assembles on a digital plain ---------- */
function buildWind(scene: THREE.Scene, textures: THREE.Texture[]): Ctl {
  brightEnv(scene, textures);

  // Mid-tone grey (not white) so the turbines read clearly against the pale sky.
  const white = new THREE.MeshStandardMaterial({ color: 0xbccac5, roughness: 0.6, metalness: 0.05 });
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xcdd8d3, roughness: 0.55 });

  // Background wind farm, already assembled and turning.
  const bg: { hub: THREE.Group; rate: number }[] = [];
  ([[-6, -15, 1.4], [5, -17, 1.6], [-2, -21, 1.9], [9, -24, 2.0]] as [number, number, number][]).forEach(([x, z, s]) => {
    const { turbine, hub } = makeTurbine(s, white, bladeMat);
    turbine.position.set(x, -2, z);
    turbine.rotation.y = -0.3 + Math.random() * 0.6;
    scene.add(turbine);
    bg.push({ hub, rate: 0.6 + Math.random() * 0.4 });
  });

  // Foreground turbine that assembles piece by piece.
  const S = 1.15;
  const fg = new THREE.Group();
  fg.position.set(-1.1, -2, -3);
  scene.add(fg);
  const foundation = new THREE.Mesh(new THREE.CylinderGeometry(0.55 * S, 0.65 * S, 0.2 * S, 28), new THREE.MeshStandardMaterial({ color: 0xaab8b3, roughness: 0.9 }));
  foundation.position.y = 0.1 * S;
  fg.add(foundation);

  const segH = 1.15 * S, segCount = 3;
  const segs: { mesh: THREE.Mesh; targetY: number; i: number }[] = [];
  for (let i = 0; i < segCount; i++) {
    const rt = (0.13 - 0.02 * i) * S, rb = (0.15 - 0.02 * i) * S;
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(rt, rb, segH, 16), white);
    mesh.visible = false;
    fg.add(mesh);
    segs.push({ mesh, targetY: 0.2 * S + segH * (i + 0.5), i });
  }
  const topY = 0.2 * S + segH * segCount;

  // Nacelle with a translucent "x-ray" shell revealing gears, then solidifying.
  const nacelle = new THREE.Group();
  nacelle.position.set(0, topY, 0.05);
  nacelle.visible = false;
  fg.add(nacelle);
  const shellMat = new THREE.MeshStandardMaterial({ color: 0xbccac5, roughness: 0.6, transparent: true, opacity: 1 });
  const shell = new THREE.Mesh(new THREE.BoxGeometry(0.42 * S, 0.22 * S, 0.24 * S), shellMat);
  const gearMat = new THREE.MeshStandardMaterial({ color: 0x86a0a6, metalness: 0.7, roughness: 0.4 });
  const gear = new THREE.Mesh(new THREE.TorusGeometry(0.07 * S, 0.022 * S, 6, 12), gearMat);
  const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.028 * S, 0.028 * S, 0.24 * S, 8), gearMat);
  shaft.rotation.z = Math.PI / 2;
  nacelle.add(shell, gear, shaft);

  const hub = new THREE.Group();
  hub.position.set(0, topY, 0.22 * S);
  hub.visible = false;
  fg.add(hub);
  hub.add(new THREE.Mesh(new THREE.SphereGeometry(0.06 * S, 10, 10), white));
  for (let b = 0; b < 3; b++) {
    const blade = new THREE.Mesh(new THREE.BoxGeometry(0.07 * S, 1.5 * S, 0.02), bladeMat);
    blade.position.y = 0.75 * S;
    const hold = new THREE.Group();
    hold.rotation.z = (b * Math.PI * 2) / 3;
    hold.add(blade);
    hub.add(hold);
  }

  // Holographic emerald-cyan guide lines around the tower during assembly.
  const guides: THREE.MeshBasicMaterial[] = [];
  for (let k = 0; k < 4; k++) {
    const ang = (k / 4) * Math.PI * 2;
    const mat = new THREE.MeshBasicMaterial({ color: 0x2fd6c0, transparent: true, opacity: 0 });
    const line = new THREE.Mesh(new THREE.CylinderGeometry(0.006, 0.006, topY + 0.5, 6), mat);
    line.position.set(Math.cos(ang) * 0.34 * S, (topY + 0.5) / 2, Math.sin(ang) * 0.34 * S);
    fg.add(line);
    guides.push(mat);
  }

  const DROP = 4.5;
  const seg = (start: number, dur: number, t: number) => clamp01((t - start) / dur);
  // Compressed timeline — assembly completes ~2.7 s, so it finishes in-window
  // even under reduced motion.
  const nacStart = 0.3 + segCount * 0.35 + 0.15;
  const solidStart = nacStart + 0.4;
  const bladeStart = solidStart + 0.4;
  const spinStart = bladeStart + 0.45;

  return {
    cam: { pos: [0, 1.5, 9], look: [-0.5, 1.1, -3] },
    bloom: { strength: 0.2, radius: 0.7, threshold: 0.92 },
    update(t) {
      bg.forEach(o => { o.hub.rotation.z = -t * o.rate; });
      const guideOn = seg(0.15, 0.3, t) * (1 - seg(spinStart, 0.6, t));
      guides.forEach(m => { m.opacity = 0.55 * guideOn; });
      segs.forEach(({ mesh, targetY, i }) => {
        const p = seg(0.3 + i * 0.35, 0.35, t);
        if (p > 0) { mesh.visible = true; mesh.position.y = targetY + (1 - p) * DROP; }
      });
      const np = seg(nacStart, 0.35, t);
      if (np > 0) { nacelle.visible = true; nacelle.position.y = topY + (1 - np) * DROP; }
      const solid = seg(solidStart, 0.35, t);
      shellMat.opacity = 0.3 + 0.7 * solid;
      gear.visible = shaft.visible = solid < 1;
      gear.rotation.z = t * 3; shaft.rotation.x = t * 3;
      const bp = seg(bladeStart, 0.35, t);
      if (bp > 0) { hub.visible = true; hub.position.y = topY + (1 - bp) * DROP * 0.4; hub.position.z = 0.22 * S + (1 - bp) * 0.5; }
      hub.rotation.z = -t * 1.3 * seg(spinStart, 1.2, t);
    }
  };
}

/* ---------- 02 · emissions — a coal plant is decommissioned ---------- */
function buildEmissions(scene: THREE.Scene, textures: THREE.Texture[]): Ctl {
  brightEnv(scene, textures);

  // Mid-tone materials so the plant reads clearly against the pale bright sky.
  const concrete = new THREE.MeshStandardMaterial({ color: 0xbcc6c1, roughness: 0.9 });
  const band = new THREE.MeshStandardMaterial({ color: 0xc85f40, roughness: 0.8 });
  const metal = new THREE.MeshStandardMaterial({ color: 0xa7b3b0, roughness: 0.6, metalness: 0.15 });

  const parts: { g: THREE.Group; start: number }[] = [];
  const emitters: [number, number, number][] = []; // world x, top y, z for smoke/steam

  // Cooling towers (hollow hyperbolic-ish shells).
  const coolingTower = (x: number, z: number, s: number, start: number) => {
    const g = new THREE.Group();
    g.position.set(x, -2, z);
    const shell = new THREE.Mesh(new THREE.CylinderGeometry(0.72 * s, 1.05 * s, 2.5 * s, 30, 1, true), concrete);
    (shell.material as THREE.MeshStandardMaterial).side = THREE.DoubleSide;
    shell.position.y = 1.25 * s;
    const rim = new THREE.Mesh(new THREE.TorusGeometry(0.72 * s, 0.04 * s, 8, 30), concrete);
    rim.rotation.x = Math.PI / 2; rim.position.y = 2.5 * s;
    g.add(shell, rim);
    scene.add(g);
    parts.push({ g, start });
    emitters.push([x, -2 + 2.5 * s, z]);
    return g;
  };
  coolingTower(-1.9, -1.5, 1.05, 2.1);
  coolingTower(-3.2, -3.4, 0.85, 2.5);

  // Boiler building.
  const bldg = new THREE.Group();
  bldg.position.set(0.8, -2, -1.4);
  const box = new THREE.Mesh(new THREE.BoxGeometry(1.7, 1.5, 1.3), concrete);
  box.position.y = 0.75;
  const roof = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.12, 1.4), metal);
  roof.position.y = 1.5;
  bldg.add(box, roof);
  scene.add(bldg);
  parts.push({ g: bldg, start: 3.0 });

  // Smokestacks with red bands.
  ([[2.4, -1.4, 1.05], [3.2, -3, 0.9]] as [number, number, number][]).forEach(([x, z, s], i) => {
    const g = new THREE.Group();
    g.position.set(x, -2, z);
    const st = new THREE.Mesh(new THREE.CylinderGeometry(0.12 * s, 0.17 * s, 2.9 * s, 16), metal);
    st.position.y = 1.45 * s;
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.125 * s, 0.125 * s, 0.2 * s, 16), band);
    ring.position.y = 2.6 * s;
    g.add(st, ring);
    scene.add(g);
    parts.push({ g, start: 1.4 + i * 0.35 });
    emitters.push([x, -2 + 2.9 * s, z]);
  });

  // Smoke/steam from every emitter — billows up, then fades as the plant shuts down.
  const per = 70;
  const count = emitters.length * per;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const [sx, sy, sz] = emitters[Math.floor(i / per)];
    pos[i * 3] = sx; pos[i * 3 + 1] = sy + Math.random() * 4; pos[i * 3 + 2] = sz;
    seed[i] = Math.random();
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const smokeMat = new THREE.PointsMaterial({ color: 0x9aa4a2, size: 0.6, map: dotTexture(textures), transparent: true, opacity: 0.4, depthWrite: false });
  scene.add(new THREE.Points(geo, smokeMat));

  return {
    cam: { pos: [0, 1.3, 7.6], look: [0, 0.8, -2] },
    bloom: { strength: 0.18, radius: 0.6, threshold: 0.92 },
    update(t) {
      // Emissions fade over the first ~1.5 s as the plant powers down.
      smokeMat.opacity = 0.4 * (1 - clamp01((t - 0.5) / 1.3));
      const arr = geo.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        const [sx, sy, sz] = emitters[Math.floor(i / per)];
        arr[i * 3 + 1] += 0.014 + seed[i] * 0.012;
        arr[i * 3] += 0.008 + Math.sin(seed[i] * 20 + t * 0.4) * 0.004;
        if (arr[i * 3 + 1] > sy + 4.2) { arr[i * 3] = sx; arr[i * 3 + 1] = sy; arr[i * 3 + 2] = sz; }
      }
      geo.attributes.position.needsUpdate = true;
      // Systematic decommissioning: each part retracts down into the ground.
      parts.forEach(({ g, start }) => {
        const p = clamp01((t - start) / 0.6);
        g.scale.y = 1 - p;
        g.visible = p < 1;
      });
      // Slow, smooth pan across the site.
      scene.rotation.y = Math.sin(t * 0.05) * 0.12;
    }
  };
}

/* ---------- 03 · network — night globe of cooperation ---------- */
function buildNetwork(scene: THREE.Scene, textures: THREE.Texture[]): Ctl {
  setSky(scene, [[0, '#020d0a'], [0.7, '#07281f'], [1, '#0b3a2c']], textures);

  // starfield
  const starCount = 380;
  const starGeo = new THREE.BufferGeometry();
  const starPos = new Float32Array(starCount * 3);
  for (let i = 0; i < starCount; i++) {
    const v = new THREE.Vector3().randomDirection().multiplyScalar(11 + Math.random() * 7);
    starPos[i * 3] = v.x; starPos[i * 3 + 1] = v.y; starPos[i * 3 + 2] = v.z;
  }
  starGeo.setAttribute('position', new THREE.BufferAttribute(starPos, 3));
  scene.add(new THREE.Points(starGeo, new THREE.PointsMaterial({ color: 0xd9efe3, size: 0.09, map: dotTexture(textures), transparent: true, opacity: 0.75, depthWrite: false })));

  const root = new THREE.Group();
  scene.add(root);
  const halo = makeGlow(MINT, 8.5, textures);
  halo.position.set(0, 0, -3);
  scene.add(halo);

  const inner = new THREE.Mesh(new THREE.SphereGeometry(2.16, 32, 32), new THREE.MeshBasicMaterial({ color: 0x04231b, transparent: true, opacity: 0.82 }));
  const wire = new THREE.Mesh(new THREE.IcosahedronGeometry(2.24, 2), new THREE.MeshBasicMaterial({ color: MINT, wireframe: true, transparent: true, opacity: 0.3 }));
  root.add(inner, wire);

  const nodeCount = 10;
  const nodePositions: THREE.Vector3[] = [];
  for (let i = 0; i < nodeCount; i++) {
    const phi = Math.acos(1 - (2 * (i + 0.5)) / nodeCount);
    const theta = Math.PI * (1 + Math.sqrt(5)) * i;
    nodePositions.push(new THREE.Vector3(Math.sin(phi) * Math.cos(theta), Math.sin(phi) * Math.sin(theta), Math.cos(phi)).multiplyScalar(2.24));
  }
  const nodeMat = new THREE.MeshBasicMaterial({ color: 0xbdf5dc });
  nodePositions.forEach(p => {
    const node = new THREE.Mesh(new THREE.SphereGeometry(0.055, 8, 8), nodeMat);
    node.position.copy(p);
    const g = makeGlow(MINT, 0.5, textures);
    g.position.copy(p);
    root.add(node, g);
  });

  const links: [number, number][] = [[0, 2], [1, 3], [2, 4], [3, 5], [4, 6], [5, 7], [6, 8], [7, 9], [8, 0], [9, 1], [0, 5], [2, 7]];
  const travelers: { curve: THREE.QuadraticBezierCurve3; mesh: THREE.Mesh; glow: THREE.Sprite; speed: number; offset: number }[] = [];
  const lineMat = new THREE.LineBasicMaterial({ color: MINT, transparent: true, opacity: 0.55 });
  const travelerMat = new THREE.MeshBasicMaterial({ color: GOLD });
  links.forEach(([a, b], i) => {
    const pa = nodePositions[a], pb = nodePositions[b];
    const mid = pa.clone().add(pb).multiplyScalar(0.5).normalize().multiplyScalar(2.9);
    const curve = new THREE.QuadraticBezierCurve3(pa, mid, pb);
    root.add(new THREE.Line(new THREE.BufferGeometry().setFromPoints(curve.getPoints(28)), lineMat));
    const mesh = new THREE.Mesh(new THREE.SphereGeometry(0.06, 8, 8), travelerMat);
    const glow = makeGlow(GOLD, 0.55, textures);
    root.add(mesh, glow);
    travelers.push({ curve, mesh, glow, speed: 0.16 + (i % 4) * 0.045, offset: i / links.length });
  });

  return {
    cam: { pos: [0, 0.25, 6.9], look: [0, 0, 0] },
    bloom: { strength: 0.75, radius: 0.75, threshold: 0.42 },
    update(t) {
      root.rotation.y = t * 0.1;
      root.rotation.x = Math.sin(t * 0.07) * 0.12;
      travelers.forEach(tr => {
        const u = (t * tr.speed + tr.offset) % 1;
        tr.mesh.position.copy(tr.curve.getPointAt(u));
        tr.glow.position.copy(tr.mesh.position);
      });
    }
  };
}

/* ---------- 04 · solar — panels drifting through 3D space ---------- */
function buildSolar(scene: THREE.Scene, textures: THREE.Texture[], dir: THREE.DirectionalLight): Ctl {
  // Airy warm sky so the dispersed array reads as a bright, weightless field.
  setSky(scene, [[0, '#123a2c'], [0.5, '#3f7a55'], [0.82, '#d99a4a'], [1, '#f2c86a']], textures);
  scene.fog = new THREE.Fog(0x3f7a55, 20, 46);

  // Central sun + soft glow, with a faint wireframe sphere the panels orbit.
  const sunCore = new THREE.Mesh(new THREE.SphereGeometry(0.7, 20, 20), new THREE.MeshBasicMaterial({ color: 0xffd07a }));
  sunCore.position.set(-1.4, 0.3, -3.5);
  const sunGlow = makeGlow(0xffc45c, 8.5, textures);
  sunGlow.position.copy(sunCore.position);
  scene.add(sunCore, sunGlow);
  const wire = new THREE.Mesh(
    new THREE.IcosahedronGeometry(3.1, 2),
    new THREE.MeshBasicMaterial({ color: 0xe8b96a, wireframe: true, transparent: true, opacity: 0.16 })
  );
  wire.position.copy(sunCore.position);
  scene.add(wire);

  dir.position.set(-2, 3, 4);
  dir.intensity = 2.1;

  // Shared panel materials: bright PV glass on the top face, aluminium elsewhere.
  const pvMat = new THREE.MeshStandardMaterial({ map: pvTexture(textures), roughness: 0.3, metalness: 0.2, emissive: 0x14345c, emissiveIntensity: 0.35 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xc2cad1, roughness: 0.5, metalness: 0.55 });
  const backMat = new THREE.MeshStandardMaterial({ color: 0x8f979e, roughness: 0.7, metalness: 0.3 });
  const faceMats = [frameMat, frameMat, pvMat, backMat, frameMat, frameMat]; // BoxGeometry +x,-x,+y,-y,+z,-z
  const panelGeo = new THREE.BoxGeometry(1.15, 0.05, 0.78);

  const field = new THREE.Group();
  scene.add(field);
  const panels: { mesh: THREE.Mesh; spinX: number; spinY: number; bobAmp: number; bobSpeed: number; phase: number; baseY: number }[] = [];
  const COUNT = 16;
  for (let i = 0; i < COUNT; i++) {
    const mesh = new THREE.Mesh(panelGeo, faceMats);
    // Scatter through a wide volume; keep a clear-ish core around the sun.
    const angle = Math.random() * Math.PI * 2;
    const radius = 2.4 + Math.random() * 4.6;
    const x = Math.cos(angle) * radius;
    const y = (Math.random() - 0.5) * 5;
    const z = -4.5 + Math.random() * 6.5;
    const s = 0.55 + Math.random() * 0.9;           // varied size = depth cue
    mesh.scale.setScalar(s);
    mesh.position.set(x, y, z);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    field.add(mesh);
    panels.push({
      mesh,
      spinX: (Math.random() - 0.5) * 0.28,
      spinY: (Math.random() - 0.5) * 0.34,
      bobAmp: 0.15 + Math.random() * 0.3,
      bobSpeed: 0.3 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2,
      baseY: y
    });
  }

  return {
    cam: { pos: [0, 0.4, 9], look: [-0.4, 0, -1] },
    bloom: { strength: 0.55, radius: 0.75, threshold: 0.62 },
    update(t) {
      // Each panel tumbles slowly on its own axes and bobs vertically; the whole
      // field drifts for parallax so the cloud feels alive and three-dimensional.
      panels.forEach(p => {
        p.mesh.rotation.x += p.spinX * 0.016;
        p.mesh.rotation.y += p.spinY * 0.016;
        p.mesh.position.y = p.baseY + Math.sin(t * p.bobSpeed + p.phase) * p.bobAmp;
      });
      field.rotation.y = Math.sin(t * 0.05) * 0.22;
      field.rotation.x = Math.sin(t * 0.04) * 0.06;
      pvMat.emissiveIntensity = 0.3 + 0.15 * (0.5 + 0.5 * Math.sin(t * 0.9));
      wire.rotation.y = t * 0.06;
      sunGlow.scale.setScalar(8.5 + Math.sin(t * 0.7) * 0.5);
    }
  };
}

/* ---------- 05 · particles — net zero ascent ---------- */
function buildParticles(scene: THREE.Scene, textures: THREE.Texture[]): Ctl {
  setSky(scene, [[0, '#02140e'], [0.65, '#093a2b'], [1, '#0d4634']], textures);
  const heart = makeGlow(MINT, 7, textures);
  heart.position.set(0, 0.2, -2.5);
  scene.add(heart);

  const makeField = (count: number, color: number, size: number) => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(count * 3);
    const seed = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 8;
      pos[i * 3 + 1] = -2.6 + Math.random() * 5.2;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 4;
      seed[i] = Math.random();
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    const points = new THREE.Points(geo, new THREE.PointsMaterial({ color, size, map: dotTexture(textures), transparent: true, opacity: 0.9, blending: THREE.AdditiveBlending, depthWrite: false }));
    scene.add(points);
    return { geo, seed, count };
  };
  const mint = makeField(400, MINT, 0.1);
  const gold = makeField(170, GOLD, 0.08);

  const rings: { mesh: THREE.Mesh; mat: THREE.MeshBasicMaterial; offset: number }[] = [];
  for (let i = 0; i < 3; i++) {
    const mat = new THREE.MeshBasicMaterial({ color: MINT, transparent: true, opacity: 0.4, side: THREE.DoubleSide });
    const mesh = new THREE.Mesh(new THREE.TorusGeometry(1, 0.014, 8, 72), mat);
    mesh.position.set(0, 0.2, -1.5);
    scene.add(mesh);
    rings.push({ mesh, mat, offset: i / 3 });
  }

  const rise = (f: { geo: THREE.BufferGeometry; seed: Float32Array; count: number }, base: number) => {
    const arr = f.geo.attributes.position.array as Float32Array;
    for (let i = 0; i < f.count; i++) {
      arr[i * 3 + 1] += base + f.seed[i] * 0.008;
      arr[i * 3] += Math.sin(arr[i * 3 + 1] * 1.4 + f.seed[i] * 9) * 0.0016;
      if (arr[i * 3 + 1] > 2.6) {
        arr[i * 3] = (Math.random() - 0.5) * 8;
        arr[i * 3 + 1] = -2.6;
        arr[i * 3 + 2] = (Math.random() - 0.5) * 4;
      }
    }
    f.geo.attributes.position.needsUpdate = true;
  };

  return {
    cam: { pos: [0, 0, 7.4], look: [0, 0.1, 0] },
    bloom: { strength: 0.85, radius: 0.85, threshold: 0.3 },
    update(t) {
      rise(mint, 0.006);
      rise(gold, 0.004);
      rings.forEach(({ mesh, mat, offset }) => {
        const u = (t * 0.22 + offset) % 1;
        mesh.scale.setScalar(0.6 + u * 2.6);
        mat.opacity = 0.5 * (1 - u);
      });
    }
  };
}

/* ---------- component ---------- */
export default function Scene3D({ type, active }: { type: Scene3DType; active: boolean }) {
  const mountRef = useRef<HTMLDivElement | null>(null);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;
    const reduced = window.matchMedia('(prefers-reduced-motion: reduce)').matches;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'low-power', failIfMajorPerformanceCaveat: false });
    } catch (err) {
      // eslint-disable-next-line no-console
      console.error('Scene3D: WebGL is unavailable in this browser, falling back to a static gradient.', err);
      setFailed(true);
      return;
    }

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(48, 1, 0.1, 100);
    const textures: THREE.Texture[] = [];

    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const ambient = new THREE.AmbientLight(0xffffff, 0.95);
    const dir = new THREE.DirectionalLight(0xfff4de, 1.8);
    dir.position.set(4, 6, 3);
    const fill = new THREE.DirectionalLight(0xa9e8c9, 0.45);
    fill.position.set(-4, 2, -3);
    scene.add(ambient, dir, fill);

    let controller: Ctl;
    if (type === 'wind') controller = buildWind(scene, textures);
    else if (type === 'emissions') controller = buildEmissions(scene, textures);
    else if (type === 'network') controller = buildNetwork(scene, textures);
    else if (type === 'solar') controller = buildSolar(scene, textures, dir);
    else controller = buildParticles(scene, textures);

    const [cx, cy, cz] = controller.cam.pos;
    const look = new THREE.Vector3(...controller.cam.look);
    camera.position.set(cx, cy, cz);
    camera.lookAt(look);

    // Post-processing: render → bloom (bright glows only, tuned per scene) → sRGB output.
    const composer = new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene, camera));
    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(1, 1),
      controller.bloom.strength,
      controller.bloom.radius,
      controller.bloom.threshold
    );
    composer.addPass(bloomPass);
    composer.addPass(new OutputPass());

    const resize = () => {
      const w = mount.clientWidth || mount.parentElement?.clientWidth || window.innerWidth || 800;
      const h = mount.clientHeight || mount.parentElement?.clientHeight || window.innerHeight || 450;
      renderer.setSize(w, h);
      const pr = Math.min(window.devicePixelRatio, 2);
      composer.setPixelRatio(pr);
      composer.setSize(w, h);
      bloomPass.setSize(w * pr, h * pr);
      camera.aspect = w / h;
      camera.updateProjectionMatrix();
    };
    resize();
    // Layout may not be finalized on the very first paint (e.g. inside a
    // Suspense boundary that just resolved); re-measure one frame later so
    // the canvas doesn't get stuck at a stale/zero size.
    requestAnimationFrame(resize);
    const ro = new ResizeObserver(resize);
    ro.observe(mount);

    let raf = 0;
    const start = performance.now();
    // Reduced motion runs slower and without camera sway, but not so slow that
    // the timed assembly/decommission sequences can't finish in the display
    // window (0.16 left them permanently half-built).
    const speed = reduced ? 0.55 : 1;
    const renderOnce = (t: number) => {
      controller.update(t * speed);
      if (!reduced) camera.position.x = cx + Math.sin(t * 0.06) * 0.35;
      camera.lookAt(look);
      composer.render();
    };
    const loop = () => {
      renderOnce((performance.now() - start) / 1000);
      raf = requestAnimationFrame(loop);
    };
    renderOnce(0);
    raf = requestAnimationFrame(loop);

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      scene.traverse(obj => {
        const mesh = obj as THREE.Mesh;
        if (mesh.geometry) mesh.geometry.dispose();
        const mat = mesh.material as THREE.Material | THREE.Material[] | undefined;
        if (Array.isArray(mat)) mat.forEach(m => m.dispose()); else mat?.dispose();
      });
      textures.forEach(t => t.dispose());
      bloomPass.dispose();
      composer.dispose();
      renderer.dispose();
      renderer.forceContextLoss();
      if (renderer.domElement.parentNode === mount) mount.removeChild(renderer.domElement);
    };
  }, [type]);

  if (failed) return <div className={`scene3d scene3d-fallback ${active ? 'is-active' : ''}`} aria-hidden="true" />;
  return <div ref={mountRef} className={`scene3d absolute inset-0 [&>canvas]:h-full [&>canvas]:w-full ${active ? 'is-active' : ''}`} aria-hidden="true" />;
}
