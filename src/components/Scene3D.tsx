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

/** Low-poly displaced ground plane. */
function makeGround(color: number, y = -1.6): THREE.Mesh {
  const geo = new THREE.PlaneGeometry(46, 26, 64, 36);
  const p = geo.attributes.position as THREE.BufferAttribute;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i), yy = p.getY(i);
    p.setZ(i, Math.sin(x * 0.35) * Math.cos(yy * 0.3) * 0.5 + Math.sin(x * 0.11 + yy * 0.17) * 0.35);
  }
  geo.computeVertexNormals();
  const mesh = new THREE.Mesh(geo, new THREE.MeshStandardMaterial({ color, roughness: 1, flatShading: true }));
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = y;
  return mesh;
}

/* ---------- 01 · wind — dawn over emerald hills ---------- */
function buildWind(scene: THREE.Scene, textures: THREE.Texture[]): Ctl {
  setSky(scene, [[0, '#032019'], [0.52, '#0c4a38'], [0.8, '#3f8a63'], [1, '#e9c063']], textures);
  scene.fog = new THREE.Fog(0x0c4a38, 14, 34);
  scene.add(makeGround(0x0b3f2e));
  // Sun sits low on the right horizon, matching the scene's key-light direction.
  const sun = makeGlow(0xffd98a, 9, textures);
  sun.position.set(5.8, 0.15, -12);
  scene.add(sun);

  const towerMat = new THREE.MeshStandardMaterial({ color: 0xeef4ef, roughness: 0.45 });
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xf7faf7, roughness: 0.4 });
  const hubs: { hub: THREE.Group; rate: number }[] = [];
  const layout: [number, number, number][] = [[-4.6, -3.4, 0.86], [-1.7, -1.6, 1.18], [1.3, -2.6, 1.0], [3.9, -4.2, 0.78], [5.6, -1.9, 0.62]];
  layout.forEach(([x, z, s], i) => {
    const turbine = new THREE.Group();
    const h = 3.4 * s;
    const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.055 * s, 0.11 * s, h, 10), towerMat);
    tower.position.y = h / 2;
    const nacelle = new THREE.Mesh(new THREE.BoxGeometry(0.34 * s, 0.17 * s, 0.17 * s), towerMat);
    nacelle.position.set(0, h, 0.04);
    const hub = new THREE.Group();
    hub.position.set(0, h, 0.16 * s);
    for (let b = 0; b < 3; b++) {
      const blade = new THREE.Mesh(new THREE.BoxGeometry(0.075 * s, 1.55 * s, 0.022), bladeMat);
      blade.position.y = 0.78 * s;
      const hold = new THREE.Group();
      hold.rotation.z = (b * Math.PI * 2) / 3;
      hold.add(blade);
      hub.add(hold);
    }
    turbine.add(tower, nacelle, hub);
    turbine.position.set(x, -1.55, z);
    turbine.rotation.y = 0.14;
    scene.add(turbine);
    hubs.push({ hub, rate: 0.9 + (i % 3) * 0.24 });
  });

  return {
    cam: { pos: [0, 0.7, 8.4], look: [0, 0.9, 0] },
    bloom: { strength: 0.35, radius: 0.7, threshold: 0.72 },
    update(t) { hubs.forEach(({ hub, rate }) => { hub.rotation.z = -t * rate; }); }
  };
}

/* ---------- 02 · emissions — smoggy industrial dusk ---------- */
function buildEmissions(scene: THREE.Scene, textures: THREE.Texture[]): Ctl {
  setSky(scene, [[0, '#10151c'], [0.5, '#2b323c'], [0.82, '#7c4a2c'], [1, '#c9762f']], textures);
  scene.fog = new THREE.Fog(0x2b323c, 12, 32);
  scene.add(makeGround(0x12171d, -1.7));
  const haze = makeGlow(0xc9762f, 11, textures);
  haze.position.set(2, -1, -10);
  scene.add(haze);

  const stackMat = new THREE.MeshStandardMaterial({ color: 0x39424d, roughness: 0.8 });
  const capMat = new THREE.MeshStandardMaterial({ color: 0x232a33, roughness: 0.9 });
  const stacks: [number, number, number][] = [[-2.7, -0.6, 3.7], [-0.9, 0.4, 4.6], [1.0, -0.2, 4.0], [2.8, 0.6, 3.0]];
  const tops: [number, number, number][] = [];
  // Each beacon gets its own material and phase so the pulses are staggered.
  const beacons: { mat: THREE.MeshBasicMaterial; phase: number }[] = [];
  stacks.forEach(([x, z, h], i) => {
    const stack = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.38, h, 12), stackMat);
    stack.position.set(x, h / 2 - 1.7, z);
    const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.16, 12), capMat);
    cap.position.set(x, h - 1.7, z);
    const beaconMat = new THREE.MeshBasicMaterial({ color: 0xff6a55, transparent: true });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.05, 8, 8), beaconMat);
    beacon.position.set(x + 0.24, h - 1.66, z);
    scene.add(stack, cap, beacon);
    tops.push([x, h - 1.7, z]);
    beacons.push({ mat: beaconMat, phase: i * 1.7 });
  });

  // smoke
  const count = 320;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    const [sx, sy, sz] = tops[i % tops.length];
    pos[i * 3] = sx + (Math.random() - 0.5) * 0.3;
    pos[i * 3 + 1] = sy + Math.random() * 4;
    pos[i * 3 + 2] = sz + (Math.random() - 0.5) * 0.3;
    seed[i] = Math.random();
  }
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  const smoke = new THREE.Points(geo, new THREE.PointsMaterial({ color: 0xaab0b6, size: 0.34, map: dotTexture(textures), transparent: true, opacity: 0.34, depthWrite: false }));
  scene.add(smoke);

  return {
    cam: { pos: [0, 1.1, 8.6], look: [0, 1.3, 0] },
    bloom: { strength: 0.55, radius: 0.65, threshold: 0.55 },
    update(t) {
      beacons.forEach(({ mat, phase }) => { mat.opacity = 0.3 + 0.7 * Math.abs(Math.sin(t * 2.2 + phase)); });
      const arr = geo.attributes.position.array as Float32Array;
      for (let i = 0; i < count; i++) {
        arr[i * 3 + 1] += 0.011 + seed[i] * 0.011;
        arr[i * 3] += 0.004 + Math.sin(arr[i * 3 + 1] * 1.8 + seed[i] * 9) * 0.002;
        const [sx, sy, sz] = tops[i % tops.length];
        if (arr[i * 3 + 1] > sy + 4.4) {
          arr[i * 3] = sx + (Math.random() - 0.5) * 0.3;
          arr[i * 3 + 1] = sy;
          arr[i * 3 + 2] = sz + (Math.random() - 0.5) * 0.3;
        }
      }
      geo.attributes.position.needsUpdate = true;
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

/* ---------- 04 · solar — golden hour array ---------- */
function buildSolar(scene: THREE.Scene, textures: THREE.Texture[], dir: THREE.DirectionalLight): Ctl {
  setSky(scene, [[0, '#0d3b31'], [0.5, '#2f6b4f'], [0.82, '#e8a844'], [1, '#f6c95f']], textures);
  scene.fog = new THREE.Fog(0x2f6b4f, 14, 36);
  scene.add(makeGround(0x3f4c2a, -1.7));

  const sunMat = new THREE.MeshBasicMaterial({ color: 0xffd166 });
  const sunCore = new THREE.Mesh(new THREE.SphereGeometry(0.42, 16, 16), sunMat);
  sunCore.position.set(5.6, -0.9, -11);
  const sunGlow = makeGlow(0xffc65c, 5.5, textures);
  sunGlow.position.copy(sunCore.position);
  scene.add(sunCore, sunGlow);
  const glowMat = sunGlow.material as THREE.SpriteMaterial;
  const horizonColor = new THREE.Color(0xff9a4d);
  const noonColor = new THREE.Color(0xffe08a);
  const sunColor = new THREE.Color();

  const group = new THREE.Group();
  const panelMat = new THREE.MeshStandardMaterial({ map: pvTexture(textures), roughness: 0.35, metalness: 0.15, emissive: 0x1e3a6b, emissiveIntensity: 0.5 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0xaeb6bd, roughness: 0.45, metalness: 0.5 });
  const postMat = new THREE.MeshStandardMaterial({ color: 0x2e3330, roughness: 0.85 });
  const rows = 3, cols = 5;
  // Tops tilted back toward the sun (which sits behind the array); the raised
  // camera looks down on the faces so the PV glass stays visible.
  const tilt = -0.42;
  // Panel + frame pivot together so the array can visibly track the sun.
  const trackers: { pivot: THREE.Group; phase: number }[] = [];
  for (let r = 0; r < rows; r++) {
    for (let c = 0; c < cols; c++) {
      const x = (c - (cols - 1) / 2) * 1.55;
      const z = (r - (rows - 1) / 2) * 1.4;
      const y = -1.05;
      const pivot = new THREE.Group();
      pivot.position.set(x, y + 0.55, z);
      pivot.rotation.x = tilt;
      const frame = new THREE.Mesh(new THREE.BoxGeometry(1.3, 0.045, 0.9), frameMat);
      const panel = new THREE.Mesh(new THREE.BoxGeometry(1.22, 0.055, 0.82), panelMat);
      panel.position.y = 0.035;
      pivot.add(frame, panel);
      const post = new THREE.Mesh(new THREE.CylinderGeometry(0.045, 0.045, 0.6, 8), postMat);
      post.position.set(x, y + 0.2, z);
      group.add(pivot, post);
      trackers.push({ pivot, phase: c * 0.12 });
    }
  }
  group.rotation.y = -0.16;
  scene.add(group);

  return {
    cam: { pos: [0, 3.3, 8.8], look: [0, -0.5, 0] },
    bloom: { strength: 0.45, radius: 0.7, threshold: 0.7 },
    update(t) {
      // Fast one-way sunrise (~2.5 s), then hold at full height for the rest
      // of the scene's display time. The scene remounts on every visit, so the
      // rise replays each time it is shown.
      const u = Math.min(1, t * 0.4);
      const h = Math.sin((Math.PI / 2) * u); // eased 0 → 1 elevation
      const sx = 5.6 - 3.4 * u;
      const sy = -0.9 + h * 3.8;
      sunCore.position.set(sx, sy, -11);
      sunGlow.position.copy(sunCore.position);
      // Deep amber at the horizon, pale gold at its peak.
      sunColor.copy(horizonColor).lerp(noonColor, Math.min(1, h * 1.4));
      sunMat.color.copy(sunColor);
      glowMat.color.copy(sunColor);
      sunGlow.scale.setScalar(4.6 + h * 1.5 + Math.sin(t * 0.8) * 0.3);
      // Scene light follows the sun and brightens toward midday.
      dir.position.set(sx, Math.max(0.5, sy + 1.5), -6);
      dir.intensity = 0.9 + h * 1.3;
      panelMat.emissiveIntensity = 0.3 + 0.35 * h + 0.12 * Math.sin(t * 0.9);
      group.rotation.y = -0.16 + Math.sin(t * 0.08) * 0.03;
      // Trackers face the sun: steep back-tilt while it is low on the horizon,
      // flattening toward horizontal as it climbs, with a slight column stagger.
      trackers.forEach(({ pivot, phase }) => { pivot.rotation.x = -(0.42 - h * 0.27) + Math.sin(t * 0.35 + phase) * 0.03; });
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
    // Reduced motion still gets ambient movement, just slow and without
    // camera sway — a full freeze reads as a broken/static page.
    const speed = reduced ? 0.16 : 1;
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
