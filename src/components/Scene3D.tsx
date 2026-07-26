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
  cam: { pos: [number, number, number]; look: [number, number, number]; fov?: number };
  /** Per-scene bloom tuning: what counts as "bright" and how strongly it glows. */
  bloom: { strength: number; radius: number; threshold: number };
  /** Optional cinematic camera move (orbit radians / dolly units / vertical rise / time scale). */
  motion?: { orbit?: number; dolly?: number; rise?: number; speed?: number };
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

/** Soft radial dark blob for fake ground-contact shadows under objects. */
function shadowBlobTexture(textures: THREE.Texture[]): THREE.CanvasTexture {
  const c = document.createElement('canvas');
  c.width = c.height = 128;
  const g = c.getContext('2d')!;
  const grad = g.createRadialGradient(64, 64, 0, 64, 64, 64);
  grad.addColorStop(0, 'rgba(0,0,0,0.55)');
  grad.addColorStop(0.5, 'rgba(0,0,0,0.22)');
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  g.fillStyle = grad;
  g.fillRect(0, 0, 128, 128);
  const t = new THREE.CanvasTexture(c);
  textures.push(t);
  return t;
}

/** Distant faint starfield across the upper-back volume — atmospheric depth for the ground scenes. */
function starField(scene: THREE.Scene, textures: THREE.Texture[], count: number, color: number): void {
  const g = new THREE.BufferGeometry();
  const p = new Float32Array(count * 3);
  for (let i = 0; i < count; i++) {
    p[i * 3] = (Math.random() - 0.5) * 46;
    p[i * 3 + 1] = Math.random() * 16 - 0.5;
    p[i * 3 + 2] = -8 - Math.random() * 24;
  }
  g.setAttribute('position', new THREE.BufferAttribute(p, 3));
  scene.add(new THREE.Points(g, new THREE.PointsMaterial({
    color, size: 0.08, map: dotTexture(textures), transparent: true, opacity: 0.55, depthWrite: false
  })));
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

/** Chunky tapered airfoil blade with real thickness (root at y=0, tip at y=+L). */
function sleekBladeGeo(): THREE.ExtrudeGeometry {
  const L = 1.85;
  const s = new THREE.Shape();
  s.moveTo(-0.045, 0);                          // root · leading edge
  s.lineTo(0.135, 0);                           // root · trailing edge (wider chord)
  s.quadraticCurveTo(0.05, L * 0.5, 0.012, L);  // trailing edge sweeps to a rounded tip
  s.quadraticCurveTo(-0.075, L * 0.5, -0.045, 0); // fuller leading edge back to root
  s.closePath();
  const g = new THREE.ExtrudeGeometry(s, {
    depth: 0.042, bevelEnabled: true, bevelThickness: 0.014, bevelSize: 0.012, bevelSegments: 1, steps: 1
  });
  g.translate(0, 0, -0.021);
  return g;
}

/** Sleek realistic white turbine: tapered tower, capsule nacelle, coned nose, airfoil blades. */
function wireTurbine(
  s: number, bladeGeo: THREE.BufferGeometry,
  towerMat: THREE.Material, bladeMat: THREE.Material, nodeMat: THREE.Material,
  textures: THREE.Texture[]
): { turbine: THREE.Group; hub: THREE.Group } {
  const turbine = new THREE.Group();
  const h = 3.4 * s;
  const tower = new THREE.Mesh(new THREE.CylinderGeometry(0.065 * s, 0.13 * s, h, 18), towerMat);
  tower.position.y = h / 2;
  const nacelle = new THREE.Mesh(new THREE.CapsuleGeometry(0.11 * s, 0.3 * s, 5, 14), towerMat);
  nacelle.rotation.x = Math.PI / 2;               // lay the pod along the wind axis (Z)
  nacelle.position.set(0, h, -0.06 * s);
  const hub = new THREE.Group();
  hub.position.set(0, h, 0.16 * s);
  const nose = new THREE.Mesh(new THREE.ConeGeometry(0.1 * s, 0.2 * s, 16), towerMat);
  nose.rotation.x = Math.PI / 2; nose.position.z = 0.08 * s;
  const node = new THREE.Mesh(new THREE.SphereGeometry(0.07 * s, 10, 10), nodeMat);
  hub.add(nose, node, makeGlow(0xdff2ea, 0.55 * s, textures));   // bright glowing hub
  for (let b = 0; b < 3; b++) {
    const blade = new THREE.Mesh(bladeGeo, bladeMat);
    blade.scale.setScalar(s);
    blade.rotation.y = 0.2;                        // aerodynamic pitch/twist
    const hold = new THREE.Group();
    hold.rotation.z = (b * Math.PI * 2) / 3;
    hold.add(blade);
    hub.add(hold);
  }
  turbine.add(tower, nacelle, hub);
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
  scene.fog = new THREE.Fog(0x083626, 13, 42);   // closer fog so the far turbines fade into a deep field

  // Soft, off-centre mint halo — ambient bloom the structures read against, not a disc.
  const halo = makeSoftGlow(MINT, 12, textures);
  halo.position.set(3.2, 1.5, -6);
  scene.add(halo);
  // Wide, low horizon glow band = atmospheric depth behind the farm.
  const horizon = makeSoftGlow(0x2fd6a8, 1, textures);
  horizon.scale.set(30, 6, 1);
  horizon.position.set(0, -1.7, -9);
  scene.add(horizon);
  starField(scene, textures, 220, 0xbfeadd);

  // Sculpting light: lower the flat ambient and add a cool rim from behind + a soft key,
  // so the white turbines get real form and edge separation (premium render, not clay).
  scene.traverse(o => { if (o instanceof THREE.AmbientLight) o.intensity = 0.5; });
  const rim = new THREE.DirectionalLight(0xd6f0ff, 2.4); rim.position.set(-3, 7, -12); scene.add(rim);
  const key = new THREE.DirectionalLight(0xfff4e6, 0.9); key.position.set(7, 6, 6); scene.add(key);
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowBlobTexture(textures), transparent: true, opacity: 0.55, depthWrite: false });

  // White / silver realistic turbines. Low metalness (no environment map in the scene)
  // keeps them bright white; a faint emissive gives a hint of glow without blowing out.
  const towerMat = new THREE.MeshStandardMaterial({ color: 0xe6edee, roughness: 0.5, metalness: 0.12 });
  const bladeMat = new THREE.MeshStandardMaterial({ color: 0xf0f4f4, roughness: 0.4, metalness: 0.08, emissive: 0x6f9498, emissiveIntensity: 0.05 });
  const nodeMat = new THREE.MeshBasicMaterial({ color: 0xeaf6f2 });
  const bladeGeo = sleekBladeGeo();

  const hubs: { hub: THREE.Group; rate: number }[] = [];
  const hubPos: THREE.Vector3[] = [];
  // Hero turbine up front on the RIGHT (clear of the caption column), the rest spread out
  // and receding — every turbine sits fully in frame (no orphaned blades sweeping a corner).
  const layout: [number, number, number][] = [
    [1.9, -0.9, 1.55], [-3.4, -2.6, 0.82], [4.8, -3.4, 0.72],
    [-1.2, -5.2, 0.6], [-5.6, -5.8, 0.54], [3.0, -7.0, 0.5],
    [-3.2, -8.6, 0.46], [0.6, -9.8, 0.42]
  ];
  // A real farm all yaws into the same wind — rotors face the viewer with only a slight
  // per-turbine variation for depth, so none reads as facing the wrong way.
  const yaws = [0.12, -0.14, 0.1, -0.12, 0.15, -0.1, 0.13, -0.11];
  layout.forEach(([x, z, sc], i) => {
    const { turbine, hub } = wireTurbine(sc, bladeGeo, towerMat, bladeMat, nodeMat, textures);
    turbine.position.set(x, -2, z);
    turbine.rotation.y = yaws[i % yaws.length];
    scene.add(turbine);
    // Soft ground-contact shadow so the turbine reads as planted, not floating.
    const shadow = new THREE.Mesh(new THREE.PlaneGeometry(1.7 * sc, 1.7 * sc), shadowMat);
    shadow.rotation.x = -Math.PI / 2;
    shadow.position.set(x, -1.99, z);
    scene.add(shadow);
    hubs.push({ hub, rate: 0.5 + (i % 3) * 0.2 });
    const c = Math.cos(turbine.rotation.y), sn = Math.sin(turbine.rotation.y);
    hubPos.push(new THREE.Vector3(x + sn * 0.16 * sc, -2 + 3.4 * sc, z + c * 0.16 * sc));
  });

  // Energy-flow: gold motes stream off each hub downwind (+x) → "generation", tying
  // the particulate to the turbines instead of drifting independently.
  const streamPer = 24;
  const sCount = hubPos.length * streamPer;
  const sGeo = new THREE.BufferGeometry();
  const sPos = new Float32Array(sCount * 3);
  const sSeed = new Float32Array(sCount);
  const RUN = 6.5;
  hubPos.forEach((hp, hi) => {
    for (let j = 0; j < streamPer; j++) {
      const idx = hi * streamPer + j, i3 = idx * 3;
      sPos[i3] = hp.x + Math.random() * RUN;
      sPos[i3 + 1] = hp.y + (Math.random() - 0.5) * 0.4;
      sPos[i3 + 2] = hp.z + (Math.random() - 0.5) * 0.4;
      sSeed[idx] = Math.random();
    }
  });
  sGeo.setAttribute('position', new THREE.BufferAttribute(sPos, 3));
  const streamMat = new THREE.PointsMaterial({
    color: 0xbfeef0, size: 0.08, map: dotTexture(textures), transparent: true,   // cool wind-current colour
    opacity: 0.8, blending: THREE.AdditiveBlending, depthWrite: false
  });
  scene.add(new THREE.Points(sGeo, streamMat));

  // Drifting air motes in cool mint / pale white — reads as moving air on a wind scene,
  // and thinned so they feel atmospheric rather than like scattered noise.
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
      color, size, map: dotTexture(textures), transparent: true, opacity: 0.6,
      blending: THREE.AdditiveBlending, depthWrite: false
    })));
    return { geo, seed, n, speed };
  };
  const fields = [mote(160, MINT, 0.07, 0.03), mote(70, 0xd6efe8, 0.055, 0.045)];

  return {
    cam: { pos: [0.4, 2.1, 11.5], look: [0.6, 1.4, -5], fov: 52 },
    bloom: { strength: 0.5, radius: 0.7, threshold: 0.52 },
    motion: { orbit: 0.11, dolly: 0.9, rise: 0.14 },
    update(t) {
      // Power-up: blades spool from rest to full speed over ~1.3 s (analytic integral
      // of a linear ramp, so the angle is continuous and always completes).
      const T = 1.3;
      const ramp = t < T ? (t * t) / (2 * T) : (T / 2 + (t - T));
      hubs.forEach(o => { o.hub.rotation.z = -o.rate * ramp; });
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
      // Energy streams flow downwind off each hub, shimmering as they go.
      const arr = sGeo.attributes.position.array as Float32Array;
      hubPos.forEach((hp, hi) => {
        for (let j = 0; j < streamPer; j++) {
          const idx = hi * streamPer + j, i3 = idx * 3;
          arr[i3] += 0.05 + sSeed[idx] * 0.045;
          arr[i3 + 1] += Math.sin(t * 2 + sSeed[idx] * 9) * 0.004;
          if (arr[i3] > hp.x + RUN) {
            arr[i3] = hp.x;
            arr[i3 + 1] = hp.y + (Math.random() - 0.5) * 0.4;
            arr[i3 + 2] = hp.z + (Math.random() - 0.5) * 0.4;
          }
        }
      });
      sGeo.attributes.position.needsUpdate = true;
    }
  };
}

/* ---------- 02 · emissions — a solid coal plant venting steam & carbon ---------- */
function buildEmissions(scene: THREE.Scene, textures: THREE.Texture[]): Ctl {
  darkStage(scene, textures, [[0, '#0a0b0e'], [0.55, '#1d130e'], [1, '#331d10']], 0x1d130e, 0x5a3f28);
  scene.fog = new THREE.Fog(0x1d130e, 18, 62);

  // Warm furnace glow + horizon haze behind the plant.
  const halo = makeSoftGlow(0xd0721f, 15, textures);
  halo.position.set(1.4, -0.2, -9);
  scene.add(halo);
  const horizon = makeSoftGlow(0xba5f22, 1, textures);
  horizon.scale.set(32, 6, 1);
  horizon.position.set(0, -1.7, -10);
  scene.add(horizon);
  starField(scene, textures, 150, 0xe8c99a);

  // Sculpting light: low ambient + a warm furnace key and a cool rim for edge separation.
  scene.traverse(o => { if (o instanceof THREE.AmbientLight) o.intensity = 0.5; });
  const key = new THREE.DirectionalLight(0xffd39a, 1.5); key.position.set(5, 7, 6); scene.add(key);
  const rim = new THREE.DirectionalLight(0xbfe0ff, 1.4); rim.position.set(-4, 6, -11); scene.add(rim);

  // Solid industrial materials (low metalness — no env map — so they read as lit concrete/steel).
  const concrete = new THREE.MeshStandardMaterial({ color: 0xb6b0a3, roughness: 0.92, metalness: 0.04, side: THREE.DoubleSide });
  const steel = new THREE.MeshStandardMaterial({ color: 0x9aa0a3, roughness: 0.5, metalness: 0.28 });
  const stackMat = new THREE.MeshStandardMaterial({ color: 0xc3bcad, roughness: 0.85, metalness: 0.05 });
  const bandLight = new THREE.MeshStandardMaterial({ color: 0xeae5d8, roughness: 0.8, metalness: 0.03 });
  const padMat = new THREE.MeshStandardMaterial({ color: 0x2a2420, roughness: 1 });
  const shadowMat = new THREE.MeshBasicMaterial({ map: shadowBlobTexture(textures), transparent: true, opacity: 0.5, depthWrite: false });

  const contactShadow = (x: number, z: number, r: number) => {
    const sh = new THREE.Mesh(new THREE.PlaneGeometry(r * 2, r * 2), shadowMat);
    sh.rotation.x = -Math.PI / 2; sh.position.set(x, -1.99, z);
    scene.add(sh);
  };
  const pipe = (a: THREE.Vector3, b: THREE.Vector3, r: number) => {
    const d = b.clone().sub(a); const len = d.length();
    const m = new THREE.Mesh(new THREE.CylinderGeometry(r, r, len, 10), steel);
    m.position.copy(a).add(b).multiplyScalar(0.5);
    m.quaternion.setFromUnitVectors(new THREE.Vector3(0, 1, 0), d.normalize());
    scene.add(m);
  };

  // Shared concrete foundation pad ties the whole facility to one site.
  const pad = new THREE.Mesh(new THREE.BoxGeometry(16, 0.3, 5.8), padMat);
  pad.position.set(0.4, -2.13, -2.8);
  scene.add(pad);

  type Emitter = { pos: [number, number, number]; r: number; rate: number; steam: boolean };
  const emitters: Emitter[] = [];
  const beacons: { mat: THREE.MeshBasicMaterial; glow: THREE.Sprite; phase: number }[] = [];

  // A row of solid hyperboloid cooling towers venting white steam (the classic silhouette).
  const coolTower = (x: number, z: number, s: number) => {
    const m = new THREE.Mesh(coolingTowerGeo(s), concrete);
    m.position.set(x, -2, z);
    scene.add(m);
    contactShadow(x, z, 1.15 * s);
    emitters.push({ pos: [x, -2 + 2.6 * s, z], r: 0.34 * s, rate: 0.011, steam: true });
  };
  coolTower(-5.7, -3.5, 1.12);
  coolTower(-4.3, -3.1, 1.22);
  coolTower(-2.9, -2.9, 1.16);
  coolTower(-1.5, -3.1, 1.06);

  // Tall banded chimneys (light bands, like the reference) with blinking beacons + carbon smoke.
  const bandedStack = (x: number, z: number, s: number, H: number, bi: number) => {
    const rTop = 0.14 * s, rBase = 0.19 * s;
    const st = new THREE.Mesh(new THREE.CylinderGeometry(rTop, rBase, H, 18), stackMat);
    st.position.set(x, -2 + H / 2, z);
    scene.add(st);
    contactShadow(x, z, 0.34 * s);
    [0.5, 0.63, 0.76, 0.89].forEach(f => {
      const rr = rBase + (rTop - rBase) * f + 0.006;
      const ring = new THREE.Mesh(new THREE.CylinderGeometry(rr, rr, 0.13 * s, 18), bandLight);
      ring.position.set(x, -2 + H * f, z);
      scene.add(ring);
    });
    const topY = -2 + H;
    const bMat = new THREE.MeshBasicMaterial({ color: 0xff5a44, transparent: true });
    const beacon = new THREE.Mesh(new THREE.SphereGeometry(0.05 * s, 10, 10), bMat);
    beacon.position.set(x, topY + 0.05, z);
    const bGlow = makeGlow(0xff5a44, 0.45, textures);
    bGlow.position.set(x, topY + 0.05, z);
    scene.add(beacon, bGlow);
    beacons.push({ mat: bMat, glow: bGlow, phase: bi * 1.7 });
    emitters.push({ pos: [x, topY, z], r: 0.1 * s, rate: 0.018, steam: false });
  };
  bandedStack(0.2, -2.7, 1.0, 4.7, 0);
  bandedStack(1.1, -3.0, 0.95, 5.1, 1);
  bandedStack(2.0, -2.7, 0.9, 4.3, 2);
  bandedStack(2.9, -3.0, 0.85, 4.0, 3);

  // Detailed multi-block boiler house complex on the right.
  const bldg = new THREE.Group();
  bldg.position.set(5.6, -2, -2.6);
  const box = (w: number, h: number, d: number, x: number, yc: number, zc = 0) => {
    const mesh = new THREE.Mesh(new THREE.BoxGeometry(w, h, d), concrete);
    mesh.position.set(x, yc, zc); bldg.add(mesh);
  };
  const silo = (r: number, h: number, x: number, zc = 0) => {
    const mesh = new THREE.Mesh(new THREE.CylinderGeometry(r, r, h, 14), steel);
    mesh.position.set(x, h / 2, zc); bldg.add(mesh);
  };
  box(2.4, 1.7, 2.0, 0, 0.85);          // main hall
  box(1.3, 2.7, 1.3, -0.7, 1.35);       // tall boiler block
  box(1.1, 2.1, 1.1, 0.7, 1.05);        // secondary block
  box(1.8, 1.2, 1.4, 0.2, 0.6, 1.0);    // front annex
  silo(0.34, 2.3, -1.5, -0.2);          // silo
  silo(0.28, 1.7, 1.5, 0.4);            // silo
  const chimney = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.15, 1.5, 14), steel);
  chimney.position.set(0.2, 2.5, 0.2); bldg.add(chimney);
  scene.add(bldg);
  contactShadow(5.6, -2.4, 2.3);
  emitters.push({ pos: [5.8, -2 + 3.2, -2.4], r: 0.14, rate: 0.014, steam: false });

  // Steel plumbing linking the clusters into one facility.
  pipe(new THREE.Vector3(-1.1, -1.5, -2.9), new THREE.Vector3(0.0, -1.5, -2.7), 0.09);  // towers → stacks
  pipe(new THREE.Vector3(3.2, -1.5, -2.8), new THREE.Vector3(4.4, -1.5, -2.6), 0.1);    // stacks → boiler

  // Rising plumes — white steam from the cooling towers, warm carbon smoke from the stacks/boiler.
  const per = 150;
  const count = emitters.length * per;
  const RISE = 4.3;
  const geo = new THREE.BufferGeometry();
  const pos = new Float32Array(count * 3);
  const col = new Float32Array(count * 3);
  const seed = new Float32Array(count);
  const steamC = [0.82, 0.87, 0.9], smokeC = [0.66, 0.42, 0.22], ember = [0.96, 0.62, 0.26];
  emitters.forEach((e, ei) => {
    for (let j = 0; j < per; j++) {
      const idx = ei * per + j, i3 = idx * 3;
      const h0 = Math.random() * RISE;
      const spread = e.r * (1 + h0 * 0.55);
      pos[i3] = e.pos[0] + (Math.random() - 0.5) * spread;
      pos[i3 + 1] = e.pos[1] + h0;
      pos[i3 + 2] = e.pos[2] + (Math.random() - 0.5) * spread;
      const c = e.steam ? steamC : (j % 4 === 0 ? ember : smokeC);
      col[i3] = c[0]; col[i3 + 1] = c[1]; col[i3 + 2] = c[2];
      seed[idx] = Math.random();
    }
  });
  geo.setAttribute('position', new THREE.BufferAttribute(pos, 3));
  geo.setAttribute('color', new THREE.BufferAttribute(col, 3));
  const moteMat = new THREE.PointsMaterial({
    size: 0.1, map: dotTexture(textures), vertexColors: true, transparent: true,
    opacity: 0.6, blending: THREE.AdditiveBlending, depthWrite: false
  });
  scene.add(new THREE.Points(geo, moteMat));

  return {
    cam: { pos: [0.4, 2.5, 14], look: [0.4, 1.7, -3], fov: 56 },
    bloom: { strength: 0.5, radius: 0.7, threshold: 0.5 },
    motion: { orbit: 0.1, dolly: 0.9, rise: 0.14 },
    update(t) {
      halo.scale.setScalar(15 + Math.sin(t * 0.5) * 0.5);
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
          arr[i3 + 1] += e.rate + seed[idx] * 0.008;
          arr[i3] += Math.sin(seed[idx] * 20 + t * 0.4) * 0.0022;
          if (arr[i3 + 1] > top) {
            arr[i3] = e.pos[0] + (Math.random() - 0.5) * e.r;
            arr[i3 + 1] = e.pos[1];
            arr[i3 + 2] = e.pos[2] + (Math.random() - 0.5) * e.r;
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
    motion: { orbit: 0.3, dolly: 0.4, rise: 0.12 },
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

  // Parent the field to the sun so any rotation keeps every panel at a constant
  // distance from it — panels orbit the sun rigidly and never pass through it.
  const field = new THREE.Group();
  field.position.copy(sunCore.position);
  scene.add(field);
  const panels: { mesh: THREE.Mesh; dir: THREE.Vector3; radius: number; spinX: number; spinY: number; bobAmp: number; bobSpeed: number; phase: number }[] = [];
  const COUNT = 15;
  const golden = Math.PI * (3 - Math.sqrt(5));
  for (let i = 0; i < COUNT; i++) {
    const mesh = new THREE.Mesh(panelGeo, faceMats);
    // Even (Fibonacci-sphere) directions → roughly equal angular spacing, so no
    // two panels overlap; radius stays well clear of the sun + panel half-size.
    const yy = 1 - ((i + 0.5) / COUNT) * 2;
    const ring = Math.sqrt(Math.max(0, 1 - yy * yy));
    const phi = i * golden;
    const dir = new THREE.Vector3(Math.cos(phi) * ring, yy, Math.sin(phi) * ring).normalize();
    const radius = 2.7 + Math.random() * 1.2;       // shell 2.7–3.9 around the sun
    const s = 0.5 + Math.random() * 0.5;            // varied size = depth cue (capped so neighbours can't touch)
    mesh.scale.setScalar(s);
    mesh.position.copy(dir).multiplyScalar(radius);
    mesh.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI);
    field.add(mesh);
    panels.push({
      mesh, dir, radius,
      spinX: (Math.random() - 0.5) * 0.28,
      spinY: (Math.random() - 0.5) * 0.34,
      bobAmp: 0.1 + Math.random() * 0.25,          // small radial drift only
      bobSpeed: 0.3 + Math.random() * 0.5,
      phase: Math.random() * Math.PI * 2
    });
  }

  return {
    cam: { pos: [0, 0.4, 9], look: [-0.4, 0, -1] },
    bloom: { strength: 0.55, radius: 0.75, threshold: 0.62 },
    motion: { orbit: 0.18, dolly: 0.6, rise: 0.16 },
    update(t) {
      // Each panel tumbles on its own axes and drifts only radially (out/in along
      // its own spoke), so it never crosses a neighbour or the sun.
      panels.forEach(p => {
        p.mesh.rotation.x += p.spinX * 0.016;
        p.mesh.rotation.y += p.spinY * 0.016;
        const rr = p.radius + Math.sin(t * p.bobSpeed + p.phase) * p.bobAmp;
        p.mesh.position.copy(p.dir).multiplyScalar(rr);
      });
      field.rotation.y = t * 0.05;                  // slow rigid orbit around the sun
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
    motion: { orbit: 0.24, dolly: 0.5, rise: 0.14 },
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
    camera.fov = controller.cam.fov ?? 48;   // wider fov = more immersive per scene
    camera.updateProjectionMatrix();
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

    // Cinematic camera: a slow orbit + dolly + rise around the look target gives
    // real parallax and depth (near objects sweep past far ones). Reduced motion
    // holds the camera still. Tuned per scene via controller.motion.
    const rel = new THREE.Vector3(cx, cy, cz).sub(look);
    const baseAzim = Math.atan2(rel.x, rel.z);
    const baseHoriz = Math.hypot(rel.x, rel.z);
    const m = controller.motion ?? {};
    const orbit = reduced ? 0 : (m.orbit ?? 0.16);
    const dolly = reduced ? 0 : (m.dolly ?? 0.5);
    const rise = reduced ? 0 : (m.rise ?? 0.18);
    const mSpeed = m.speed ?? 1;
    const renderOnce = (t: number) => {
      controller.update(t * speed);
      const tt = t * mSpeed;
      const azim = baseAzim + Math.sin(tt * 0.05) * orbit;
      const radius = baseHoriz + Math.sin(tt * 0.08) * dolly;
      camera.position.set(
        look.x + Math.sin(azim) * radius,
        cy + Math.sin(tt * 0.045) * rise,
        look.z + Math.cos(azim) * radius
      );
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
