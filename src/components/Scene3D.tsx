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

/** Core-less, wide-falloff glow for big background halos — reads as ambient light, not a disc. */
function softGlowTexture(textures: THREE.Texture[]): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 256;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(128, 128, 0, 128, 128, 128);
  grad.addColorStop(0, 'rgba(255,255,255,0.40)');
  grad.addColorStop(0.35, 'rgba(255,255,255,0.15)');
  grad.addColorStop(0.7, 'rgba(255,255,255,0.04)');
  grad.addColorStop(1, 'rgba(255,255,255,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 256, 256);
  const t = new THREE.CanvasTexture(c);
  textures.push(t);
  return t;
}

function makeSoftGlow(color: number, scale: number, textures: THREE.Texture[]): THREE.Sprite {
  const s = new THREE.Sprite(new THREE.SpriteMaterial({
    map: softGlowTexture(textures), color, transparent: true,
    blending: THREE.AdditiveBlending, depthWrite: false
  }));
  s.scale.setScalar(scale);
  return s;
}

/* ---------- shared dark "digital night" stage (matches scenes 03–05) ---------- */
function darkStage(
  scene: THREE.Scene,
  textures: THREE.Texture[],
  sky: [number, string][],
  fog: number,
  gridColor: number
): void {
  setSky(scene, sky, textures);
  scene.fog = new THREE.Fog(fog, 24, 62);

  // A faint glowing grid over a near-black floor = the same digital ground the
  // globe/particle scenes float above, so all five heroes share one world.
  const grid = new THREE.GridHelper(140, 70, gridColor, gridColor);
  const gm = grid.material as THREE.Material;
  gm.transparent = true; gm.opacity = 0.14;
  grid.position.y = -2;
  scene.add(grid);
  const floor = new THREE.Mesh(
    new THREE.PlaneGeometry(140, 140),
    new THREE.MeshStandardMaterial({ color: 0x06110d, roughness: 1 })
  );
  floor.rotation.x = -Math.PI / 2;
  floor.position.y = -2.02;
  scene.add(floor);
}

/** Flat tapered blade outline (root at y=0, tip at y=+L) — filled as a glowing ribbon. */
function bladeShape(): THREE.Shape {
  const L = 1.7;
  const s = new THREE.Shape();
  s.moveTo(-0.035, 0);                        // root · leading edge
  s.lineTo(0.115, 0);                         // root · trailing edge (visible chord)
  s.quadraticCurveTo(0.06, L * 0.55, 0.012, L); // trailing edge sweeps to a fine tip
  s.quadraticCurveTo(-0.05, L * 0.55, -0.035, 0); // leading edge back to root
  s.closePath();
  return s;
}

/** Wireframe turbine: wire tower, solid nacelle pod, bright hub node, glowing ribbon blades. */
function wireTurbine(
  s: number, bladeFill: THREE.BufferGeometry, bladeEdge: THREE.BufferGeometry,
  lineMat: THREE.Material, fillMat: THREE.Material, podMat: THREE.Material,
  nodeMat: THREE.Material, textures: THREE.Texture[]
): { turbine: THREE.Group; hub: THREE.Group } {
  const turbine = new THREE.Group();
  const h = 3.4 * s;
  const tower = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.045 * s, 0.11 * s, h, 6)), lineMat);
  tower.position.y = h / 2;
  // Solid little pod (not a wire crate) so the hub reads as a nacelle with mass.
  const pod = new THREE.Mesh(new THREE.BoxGeometry(0.3 * s, 0.16 * s, 0.16 * s), podMat);
  pod.position.set(0, h, -0.03 * s);
  const hub = new THREE.Group();
  hub.position.set(0, h, 0.12 * s);
  const node = new THREE.Mesh(new THREE.SphereGeometry(0.05 * s, 10, 10), nodeMat);
  hub.add(node, makeGlow(MINT, 0.4 * s, textures));
  for (let b = 0; b < 3; b++) {
    const fill = new THREE.Mesh(bladeFill, fillMat); fill.scale.setScalar(s);
    const edge = new THREE.LineSegments(bladeEdge, lineMat); edge.scale.setScalar(s);
    const hold = new THREE.Group();
    hold.rotation.z = (b * Math.PI * 2) / 3;
    hold.add(fill, edge);
    hub.add(hold);
  }
  turbine.add(tower, pod, hub);
  return { turbine, hub };
}

/** Hyperboloid cooling-tower profile (wide base → pinched waist → flared rim). */
function coolingTowerGeo(s: number): THREE.LatheGeometry {
  const pts: THREE.Vector2[] = [];
  const H = 2.7 * s, N = 16, waistAt = 0.66;
  const rBase = 1.0 * s, rWaist = 0.58 * s, rTop = 0.72 * s;
  for (let i = 0; i <= N; i++) {
    const u = i / N;
    let r: number;
    if (u < waistAt) { const k = u / waistAt; r = rBase + (rWaist - rBase) * Math.sin((k * Math.PI) / 2); }
    else { const k = (u - waistAt) / (1 - waistAt); r = rWaist + (rTop - rWaist) * k * k; }
    pts.push(new THREE.Vector2(Math.max(0.01, r), u * H));
  }
  return new THREE.LatheGeometry(pts, 48);
}

/* ---------- 01 · wind — a wireframe wind farm in a stream of light ---------- */
function buildWind(scene: THREE.Scene, textures: THREE.Texture[]): Ctl {
  darkStage(scene, textures, [[0, '#02140e'], [0.6, '#083626'], [1, '#0c4433']], 0x083626, 0x2f9e82);

  // Soft, off-centre mint halo — ambient bloom the structures read against, not a disc.
  const halo = makeSoftGlow(MINT, 12, textures);
  halo.position.set(3.2, 1.5, -6);
  scene.add(halo);

  const lineMat = new THREE.LineBasicMaterial({ color: MINT, transparent: true, opacity: 0.72 });
  const fillMat = new THREE.MeshBasicMaterial({ color: MINT, transparent: true, opacity: 0.18, side: THREE.DoubleSide, depthWrite: false });
  const podMat = new THREE.MeshBasicMaterial({ color: 0x0a3728 });
  const nodeMat = new THREE.MeshBasicMaterial({ color: 0xbdf5dc });
  const bladeFill = new THREE.ShapeGeometry(bladeShape());
  const bladeEdge = new THREE.EdgesGeometry(bladeFill);

  const hubs: { hub: THREE.Group; rate: number }[] = [];
  // A clearer near→far farm: two near turbines, then receding pairs — no hard edge-crop.
  const layout: [number, number, number][] = [
    [-2.6, 0.4, 1.12], [2.7, -0.6, 0.95], [-5.4, -2.9, 0.72],
    [5.6, -3.2, 0.66], [0.5, -5.0, 0.55], [-1.9, -7.0, 0.45]
  ];
  layout.forEach(([x, z, sc], i) => {
    const { turbine, hub } = wireTurbine(sc, bladeFill, bladeEdge, lineMat, fillMat, podMat, nodeMat, textures);
    turbine.position.set(x, -2, z);
    turbine.rotation.y = -0.22 + (i % 3) * 0.2;
    scene.add(turbine);
    hubs.push({ hub, rate: 0.5 + (i % 3) * 0.2 });
  });

  // Drifting "wind" motes (mint + gold) streaming left-to-right — the particle/traveler motif.
  const mote = (n: number, color: number, size: number, speed: number) => {
    const geo = new THREE.BufferGeometry();
    const pos = new Float32Array(n * 3);
    const seed = new Float32Array(n);
    for (let i = 0; i < n; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 18;
      pos[i * 3 + 1] = -1.8 + Math.random() * 5.2;
      pos[i * 3 + 2] = -1 + (Math.random() - 0.5) * 7;
      seed[i] = Math.random();
    }
    geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    scene.add(new THREE.Points(geo, new THREE.PointsMaterial({
      color, size, map: dotTexture(textures), transparent: true, opacity: 0.75,
      blending: THREE.AdditiveBlending, depthWrite: false
    })));
    return { geo, seed, n, speed };
  };
  const fields = [mote(150, MINT, 0.075, 0.03), mote(60, GOLD, 0.06, 0.045)];

  return {
    cam: { pos: [0, 1.1, 9], look: [0, 1.3, -3] },
    bloom: { strength: 0.8, radius: 0.8, threshold: 0.35 },
    update(t) {
      hubs.forEach(o => { o.hub.rotation.z = -t * o.rate; });
      halo.scale.setScalar(12 + Math.sin(t * 0.6) * 0.5);
      fields.forEach(f => {
        const arr = f.geo.attributes.position.array as Float32Array;
        for (let i = 0; i < f.n; i++) {
          arr[i * 3] += f.speed + f.seed[i] * 0.02;
          arr[i * 3 + 1] += Math.sin(t * 0.5 + f.seed[i] * 9) * 0.002;
          if (arr[i * 3] > 9) arr[i * 3] = -9;
        }
        f.geo.attributes.position.needsUpdate = true;
      });
    }
  };
}

/* ---------- 02 · emissions — a wireframe plant venting rising carbon ---------- */
function buildEmissions(scene: THREE.Scene, textures: THREE.Texture[]): Ctl {
  darkStage(scene, textures, [[0, '#0a0b0e'], [0.55, '#20140f'], [1, '#38210f']], 0x20140f, 0x6f4a2a);

  // Soft warm carbon halo — diffuse ambient bloom filling the mid-ground, not a hard dome.
  const halo = makeSoftGlow(0xdb7a2e, 14, textures);
  halo.position.set(0.4, 0.1, -8);
  scene.add(halo);

  // Structures share the wireframe language of the globe, in a cool mint-teal line.
  const structMat = new THREE.LineBasicMaterial({ color: 0x2fbf9a, transparent: true, opacity: 0.55 });
  // Dark filled mass so buildings read as solid volumes rather than empty crates.
  const massMat = new THREE.MeshBasicMaterial({ color: 0x08251c, transparent: true, opacity: 0.6, side: THREE.DoubleSide, depthWrite: false });

  type Emitter = { pos: [number, number, number]; r: number; rate: number };
  const emitters: Emitter[] = [];

  // Wireframe hyperboloid cooling towers.
  const coolTower = (x: number, z: number, s: number) => {
    const m = new THREE.LineSegments(new THREE.EdgesGeometry(coolingTowerGeo(s)), structMat);
    m.position.set(x, -2, z);
    scene.add(m);
    emitters.push({ pos: [x, -2 + 2.65 * s, z], r: 0.42 * s, rate: 0.012 });
  };
  coolTower(-2.2, -1.7, 1.05);
  coolTower(-3.7, -3.6, 0.82);

  // Boiler house: solid dark mass + bright edges + a few structural ribs on the front face.
  const bldg = new THREE.Group();
  bldg.position.set(0.7, -2, -1.3);
  const baseGeo = new THREE.BoxGeometry(1.9, 1.6, 1.4);
  const base = new THREE.Mesh(baseGeo, massMat); base.position.y = 0.8;
  const baseEdge = new THREE.LineSegments(new THREE.EdgesGeometry(baseGeo), structMat); baseEdge.position.y = 0.8;
  const upGeo = new THREE.BoxGeometry(1.15, 0.85, 1.0);
  const upper = new THREE.Mesh(upGeo, massMat); upper.position.set(-0.25, 1.85, 0);
  const upEdge = new THREE.LineSegments(new THREE.EdgesGeometry(upGeo), structMat); upEdge.position.set(-0.25, 1.85, 0);
  bldg.add(base, baseEdge, upper, upEdge);
  const ribGeo = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(0, -0.75, 0), new THREE.Vector3(0, 0.75, 0)]);
  for (let r = -1; r <= 1; r++) {
    const rib = new THREE.Line(ribGeo, structMat);
    rib.position.set(r * 0.5, 0.8, 0.7);
    bldg.add(rib);
  }
  scene.add(bldg);

  // Wireframe smokestacks topped with small blinking red hazard nodes.
  const beacons: { mat: THREE.MeshBasicMaterial; glow: THREE.Sprite; phase: number }[] = [];
  ([[2.5, -1.6, 1.05], [3.4, -3.3, 0.9]] as [number, number, number][]).forEach(([x, z, s], i) => {
    const st = new THREE.LineSegments(new THREE.EdgesGeometry(new THREE.CylinderGeometry(0.14 * s, 0.2 * s, 3.2 * s, 8)), structMat);
    st.position.set(x, -2 + 1.6 * s, z);
    scene.add(st);
    const topY = -2 + 3.2 * s;
    const bMat = new THREE.MeshBasicMaterial({ color: 0xff5a44, transparent: true });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.055 * s, 10, 10), bMat);
    beacon.position.set(x, topY, z);
    const bGlow = makeGlow(0xff5a44, 0.5, textures);
    bGlow.position.set(x, topY, z);
    scene.add(beacon, bGlow);
    beacons.push({ mat: bMat, glow: bGlow, phase: i * 2.1 });
    emitters.push({ pos: [x, topY, z], r: 0.12 * s, rate: 0.016 });
  });

  // Rising carbon motes (warm amber → gold) — the emissions themselves, as luminous particles.
  const per = 90;
  const count = emitters.length * per;
  const RISE = 3.6;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const amber = [0.88, 0.55, 0.2], gold = [0.96, 0.73, 0.26];
  emitters.forEach((e, ei) => {
    for (let j = 0; j < per; j++) {
      const idx = ei * per + j, i3 = idx * 3;
      pos[i3] = e.pos[0] + (Math.random() - 0.5) * e.r * 2;
      pos[i3 + 1] = e.pos[1] + Math.random() * RISE;
      pos[i3 + 2] = e.pos[2] + (Math.random() - 0.5) * e.r * 2;
      const c = j % 3 === 0 ? gold : amber;
      col[i3] = c[0]; col[i3 + 1] = c[1]; col[i3 + 2] = c[2];
      seed[idx] = Math.random();
    }
  });
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const moteMat = new THREE.PointsMaterial({
    size: 0.12, map: dotTexture(textures), vertexColors: true, transparent: true,
    opacity: 0.85, blending: THREE.AdditiveBlending, depthWrite: false
  });
  scene.add(new THREE.Points(geo, moteMat));

  return {
    cam: { pos: [0, 1.5, 9.4], look: [0, 1.0, -2] },
    bloom: { strength: 0.75, radius: 0.78, threshold: 0.34 },
    update(t) {
      halo.scale.setScalar(14 + Math.sin(t * 0.5) * 0.5);
      beacons.forEach(o => {
        const v = 0.28 + 0.72 * Math.pow(Math.abs(Math.sin(t * 1.6 + o.phase)), 4);
        o.mat.opacity = v;
        (o.glow.material as THREE.SpriteMaterial).opacity = v;
      });
      const arr = geo.attributes.position.array as Float32Array;
      for (let ei = 0; ei < emitters.length; ei++) {
        const e = emitters[ei];
        const top = e.pos[1] + RISE;
        for (let j = 0; j < per; j++) {
          const idx = ei * per + j, i3 = idx * 3;
          arr[i3 + 1] += e.rate + seed[idx] * 0.01;
          arr[i3] += Math.sin(seed[idx] * 20 + t * 0.4) * 0.003;
          if (arr[i3 + 1] > top) {
            arr[i3] = e.pos[0] + (Math.random() - 0.5) * e.r * 2;
            arr[i3 + 1] = e.pos[1];
            arr[i3 + 2] = e.pos[2] + (Math.random() - 0.5) * e.r * 2;
          }
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

  // Shared panel materials: PV glass on BOTH broad faces so a panel reads as a
  // panel however it tumbles; a slim dark frame on the four thin edges.
  const pvMat = new THREE.MeshStandardMaterial({ map: pvTexture(textures), roughness: 0.3, metalness: 0.2, emissive: 0x14345c, emissiveIntensity: 0.35 });
  const frameMat = new THREE.MeshStandardMaterial({ color: 0x6a7683, roughness: 0.5, metalness: 0.55 });
  const faceMats = [frameMat, frameMat, pvMat, pvMat, frameMat, frameMat]; // BoxGeometry +x,-x,+y,-y,+z,-z
  const panelGeo = new THREE.BoxGeometry(1.15, 0.04, 0.78);

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
    // A touch livelier to match the brisker 5 s scene cadence; reduced motion
    // stays calmer but scaled up proportionally so it never feels stalled.
    const speed = reduced ? 0.7 : 1.25;
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
