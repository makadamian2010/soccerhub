import { React, html } from './lib/deps.js';
import * as THREE from 'https://esm.sh/three@0.170.0';

const { useEffect, useRef, useState } = React;
const TAU = Math.PI * 2;
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const lerp = (a, b, amount) => a + (b - a) * amount;

const VIEWS = [
  { id: 'free', label: 'Free orbit', key: '01' },
  { id: 'front', label: 'Bow', key: '02' },
  { id: 'side', label: 'Port profile', key: '03' },
  { id: 'top', label: 'Overhead', key: '04' },
  { id: 'dome', label: 'Observation dome', key: '05' },
  { id: 'engines', label: 'Thruster array', key: '06' }
];

const MODES = [
  { id: 'normal', label: 'Optical', shortcut: '1' },
  { id: 'sonar', label: 'Sonar', shortcut: '2' },
  { id: 'night', label: 'Low light', shortcut: '3' },
  { id: 'ai', label: 'AI vision', shortcut: '4' }
];

const POLLUTION = [
  { type: 'GHOST NET', risk: 'CRITICAL', weight: '84.2 KG', method: 'DRONE CUT + RETRIEVAL' },
  { type: 'POLYMER DEBRIS', risk: 'HIGH', weight: '12.8 KG', method: 'VACUUM SEPARATION' },
  { type: 'DISCARDED TIRE', risk: 'MEDIUM', weight: '21.4 KG', method: 'MANIPULATOR ARM' },
  { type: 'METAL CANISTER', risk: 'HIGH', weight: '34.0 KG', method: 'SEALED CONTAINMENT' },
  { type: 'MICROPLASTIC FIELD', risk: 'HIGH', weight: '7.6 KG', method: 'MEMBRANE FILTRATION' }
];

const SPECIES = {
  whale: { type: 'HUMPBACK WHALE', meta: 'MEGAPTERA NOVAEANGLIAE', detail: 'Adult · 14.8 m · Acoustic contact stable' },
  manta: { type: 'OCEANIC MANTA', meta: 'MOBULA BIROSTRIS', detail: 'Adult · 5.1 m wingspan · Non-threat' },
  fish: { type: 'YELLOWTAIL SCHOOL', meta: 'SERIOLA LALANDI', detail: '76 signatures · Coordinated movement' }
};

function seeded(index, salt = 1) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453123;
  return value - Math.floor(value);
}

function makeMaterial(color, options = {}) {
  return new THREE.MeshStandardMaterial({ color, roughness: .42, metalness: .1, ...options });
}

function addMesh(parent, geometry, material, position, scale, rotation) {
  const mesh = new THREE.Mesh(geometry, material);
  mesh.position.set(...position);
  if (scale) mesh.scale.set(...scale);
  if (rotation) mesh.rotation.set(...rotation);
  mesh.castShadow = true;
  mesh.receiveShadow = true;
  parent.add(mesh);
  return mesh;
}

function createSubmarine(scene, clickable) {
  const sub = new THREE.Group();
  sub.name = 'AUS Nereid';
  sub.position.set(0, 1.2, 0);
  scene.add(sub);

  const pearl = makeMaterial(0xb8c7c9, { metalness: .82, roughness: .2 });
  const titanium = makeMaterial(0x293a3d, { metalness: .94, roughness: .27 });
  const dark = makeMaterial(0x071416, { metalness: .72, roughness: .24 });
  const glass = new THREE.MeshPhysicalMaterial({
    color: 0x082f38, metalness: .12, roughness: .08, transmission: .55,
    transparent: true, opacity: .76, thickness: 1.5, ior: 1.34,
    emissive: 0x052b32, emissiveIntensity: .42
  });
  const cyan = makeMaterial(0x58f6ff, { emissive: 0x1acbd6, emissiveIntensity: 3.6, roughness: .18 });
  const amber = makeMaterial(0xffa94b, { emissive: 0xe06b18, emissiveIntensity: 2.2, roughness: .24 });

  const hull = addMesh(sub, new THREE.CapsuleGeometry(2.25, 7.7, 10, 24), pearl, [0, 0, 0], [1, 1, 1], [0, 0, Math.PI / 2]);
  hull.userData = { kind: 'sub', type: 'NEREID // RESEARCH PLATFORM', meta: 'TITANIUM–CARBON PRESSURE HULL', detail: 'Depth certification 11,200 m · Systems nominal' };
  clickable.push(hull);

  addMesh(sub, new THREE.CapsuleGeometry(1.95, 7.9, 8, 20), dark, [0, -.62, 0], [1, .6, .72], [0, 0, Math.PI / 2]);
  addMesh(sub, new THREE.BoxGeometry(6.6, .24, 4.55), titanium, [.5, -.18, 0], null, [0, 0, 0]);

  // Panoramic observation dome and structural smart-glass ribs.
  const dome = addMesh(sub, new THREE.SphereGeometry(2.15, 32, 20, 0, TAU, 0, Math.PI * .64), glass, [-3.38, .72, 0], [1.28, .9, 1], [0, 0, Math.PI * .55]);
  dome.userData = { kind: 'sub', type: 'PANORAMIC OBSERVATORY', meta: 'PRESSURE-RESISTANT SMART GLASS', detail: 'Select DOME to enter close inspection' };
  clickable.push(dome);
  [-.72, 0, .72].forEach(z => addMesh(sub, new THREE.TorusGeometry(2.18, .055, 8, 42, Math.PI), titanium, [-3.35, .7, z], [1.22, .9, 1], [0, Math.PI / 2, Math.PI / 2]));

  // Upper mission spine, LiDAR, camera and comms equipment.
  addMesh(sub, new THREE.BoxGeometry(5.2, .42, 1.22), titanium, [.95, 2.08, 0], null, [0, 0, 0]);
  addMesh(sub, new THREE.CylinderGeometry(.22, .35, 1.5, 12), pearl, [.2, 2.98, 0], null, [0, 0, 0]);
  addMesh(sub, new THREE.SphereGeometry(.36, 16, 12), dark, [.2, 3.78, 0]);
  const lidar = addMesh(sub, new THREE.CylinderGeometry(.44, .44, .15, 32), cyan, [1.22, 2.52, 0]);
  lidar.userData = { kind: 'sub', type: 'ORBITAL LIDAR ARRAY', meta: '360° BATHYMETRIC MAPPING', detail: 'Range 2.4 km · Resolution 2.8 mm' };
  clickable.push(lidar);
  for (let i = 0; i < 5; i++) addMesh(sub, new THREE.SphereGeometry(.095, 12, 8), cyan, [-1.25 + i * .6, 2.36, -.68]);

  // Side instrument pods and navigation light rails.
  [-1, 1].forEach(side => {
    addMesh(sub, new THREE.CapsuleGeometry(.37, 5.6, 5, 12), titanium, [.7, -.05, side * 2.38], [1, .78, .86], [0, 0, Math.PI / 2]);
    for (let i = 0; i < 7; i++) {
      addMesh(sub, new THREE.SphereGeometry(.07, 8, 6), i === 0 ? amber : cyan, [-2.1 + i * .78, .52, side * 2.43]);
    }
  });

  // Rear pressure collar and four vectored thrusters.
  addMesh(sub, new THREE.CylinderGeometry(2.12, 2.12, .52, 32), titanium, [5.1, 0, 0], null, [0, 0, Math.PI / 2]);
  addMesh(sub, new THREE.TorusGeometry(2.06, .16, 10, 42), dark, [5.36, 0, 0], null, [0, Math.PI / 2, 0]);
  const thrusters = new THREE.Group();
  sub.add(thrusters);
  [[0, 1.24], [0, -1.24], [1.25, 0], [-1.25, 0]].forEach(([y, z], index) => {
    addMesh(thrusters, new THREE.CylinderGeometry(.61, .78, 1.48, 20), titanium, [5.86, y, z], null, [0, 0, Math.PI / 2]);
    addMesh(thrusters, new THREE.CylinderGeometry(.4, .4, .1, 18), cyan, [6.64, y, z], null, [0, 0, Math.PI / 2]);
    const ring = addMesh(thrusters, new THREE.TorusGeometry(.69, .08, 8, 28), index % 2 ? amber : cyan, [6.53, y, z], null, [0, Math.PI / 2, 0]);
    ring.userData.spin = index % 2 ? -1 : 1;
  });

  // Scientific manipulator arms.
  const arms = new THREE.Group();
  sub.add(arms);
  [-1, 1].forEach(side => {
    const anchor = new THREE.Group();
    anchor.position.set(-1.5, -1.78, side * 1.45);
    arms.add(anchor);
    addMesh(anchor, new THREE.SphereGeometry(.35, 14, 10), titanium, [0, 0, 0]);
    addMesh(anchor, new THREE.CylinderGeometry(.13, .18, 2.5, 10), pearl, [-.8, -.65, side * .1], null, [0, 0, -.93]);
    addMesh(anchor, new THREE.SphereGeometry(.24, 12, 8), amber, [-1.56, -1.34, side * .2]);
    addMesh(anchor, new THREE.CylinderGeometry(.1, .13, 1.7, 10), titanium, [-2.15, -1.73, side * .32], null, [0, 0, -1.02]);
  });

  // Fins and drone bay.
  const finGeo = new THREE.BufferGeometry();
  finGeo.setAttribute('position', new THREE.Float32BufferAttribute([0, 0, 0, 2.6, 0, 0, 1.45, 2.05, 0], 3));
  finGeo.computeVertexNormals();
  addMesh(sub, finGeo, titanium, [2.7, 1.48, 0], null, [0, 0, 0]);
  addMesh(sub, finGeo, titanium, [2.7, -1.45, 0], null, [Math.PI, 0, 0]);
  addMesh(sub, new THREE.BoxGeometry(2.7, .16, 1.3), dark, [1.25, 2.29, 0]);
  addMesh(sub, new THREE.PlaneGeometry(2.1, .7), cyan, [1.1, 2.39, -.01], null, [-Math.PI / 2, 0, 0]);

  sub.userData = { thrusters, arms, dome, cyan, amber };
  return sub;
}

function createWhale(scene, clickable) {
  const whale = new THREE.Group();
  const skin = makeMaterial(0x263f4b, { roughness: .72, metalness: 0 });
  const belly = makeMaterial(0x6f8585, { roughness: .8, metalness: 0 });
  const body = addMesh(whale, new THREE.SphereGeometry(1, 28, 18), skin, [0, 0, 0], [5.4, 1.24, 1.38]);
  body.userData = { kind: 'species', species: 'whale', ...SPECIES.whale };
  clickable.push(body);
  addMesh(whale, new THREE.SphereGeometry(1, 20, 12), belly, [-1.2, -.62, 0], [3.2, .42, .83]);
  addMesh(whale, new THREE.ConeGeometry(1, 3.8, 18), skin, [5.6, 0, 0], [1, .72, .72], [0, 0, -Math.PI / 2]);
  [-1, 1].forEach(side => addMesh(whale, new THREE.ConeGeometry(.85, 4.4, 3), skin, [.25, -.2, side * 1.05], [1, 1, 1], [Math.PI / 2, 0, side * .82]));
  const tail = new THREE.Group();
  tail.position.set(7.2, 0, 0);
  whale.add(tail);
  [-1, 1].forEach(side => addMesh(tail, new THREE.ConeGeometry(.9, 3.2, 3), skin, [0, side * 1.28, 0], [1, 1, 1], [0, 0, side * .98]));
  whale.scale.set(.58, .58, .58);
  whale.position.set(-24, 12, -11);
  whale.rotation.y = .08;
  scene.add(whale);
  whale.userData.tail = tail;
  return whale;
}

function createManta(scene, clickable) {
  const manta = new THREE.Group();
  const material = makeMaterial(0x183c49, { roughness: .55 });
  const shape = new THREE.BufferGeometry();
  shape.setAttribute('position', new THREE.Float32BufferAttribute([
    -2.8, 0, 0, 0, .38, -3.4, 2.8, 0, 0,
    -2.8, 0, 0, 2.8, 0, 0, 0, .38, 3.4
  ], 3));
  shape.computeVertexNormals();
  const body = addMesh(manta, shape, material, [0, 0, 0]);
  body.userData = { kind: 'species', species: 'manta', ...SPECIES.manta };
  clickable.push(body);
  addMesh(manta, new THREE.SphereGeometry(.72, 18, 10), material, [0, .25, 0], [2.3, .5, .62]);
  addMesh(manta, new THREE.CylinderGeometry(.08, .02, 4.2, 8), material, [3.7, -.02, 0], null, [0, 0, Math.PI / 2]);
  manta.position.set(10, 3.6, -14);
  manta.scale.set(.72, .72, .72);
  scene.add(manta);
  return manta;
}

function createWorld(scene, clickable) {
  const floorMaterial = makeMaterial(0x082b2d, { roughness: .95, metalness: 0 });
  const floorGeo = new THREE.PlaneGeometry(130, 110, 70, 56);
  const p = floorGeo.attributes.position;
  for (let i = 0; i < p.count; i++) {
    const x = p.getX(i);
    const y = p.getY(i);
    p.setZ(i, Math.sin(x * .13) * .55 + Math.cos(y * .19) * .32 + seeded(i, 21) * .4);
  }
  floorGeo.computeVertexNormals();
  addMesh(scene, floorGeo, floorMaterial, [0, -7.6, 0], null, [-Math.PI / 2, 0, 0]);

  const rocks = new THREE.Group();
  scene.add(rocks);
  const rockMaterials = [makeMaterial(0x123b3b, { roughness: .97 }), makeMaterial(0x0b282c, { roughness: .99 }), makeMaterial(0x1d3e39, { roughness: .93 })];
  for (let i = 0; i < 54; i++) {
    const angle = seeded(i, 4) * TAU;
    const radius = 13 + seeded(i, 5) * 43;
    const scale = .5 + seeded(i, 7) * 4.8;
    addMesh(rocks, new THREE.DodecahedronGeometry(1, seeded(i, 6) > .85 ? 1 : 0), rockMaterials[i % 3],
      [Math.cos(angle) * radius, -7 + scale * .22, Math.sin(angle) * radius],
      [scale * (1 + seeded(i, 12)), scale * (.5 + seeded(i, 13)), scale],
      [seeded(i, 8) * 2, seeded(i, 9) * 2, seeded(i, 10) * 2]);
  }

  const coral = new THREE.Group();
  scene.add(coral);
  const coralMaterials = [
    makeMaterial(0x236f65, { roughness: .82 }), makeMaterial(0x6d506e, { roughness: .8 }),
    makeMaterial(0x8e5c3d, { roughness: .86 }), makeMaterial(0x254f58, { roughness: .85 })
  ];
  for (let i = 0; i < 46; i++) {
    const angle = seeded(i, 31) * TAU;
    const radius = 14 + seeded(i, 32) * 38;
    const cluster = new THREE.Group();
    cluster.position.set(Math.cos(angle) * radius, -7.1, Math.sin(angle) * radius);
    coral.add(cluster);
    const branches = 2 + Math.floor(seeded(i, 33) * 5);
    for (let b = 0; b < branches; b++) {
      const height = .6 + seeded(i * 9 + b, 34) * 2.8;
      addMesh(cluster, new THREE.CylinderGeometry(.035, .13 + height * .035, height, 7), coralMaterials[i % coralMaterials.length],
        [(b - branches / 2) * .24, height / 2, (seeded(b, i) - .5) * .7], null,
        [(seeded(b, i + 3) - .5) * .35, 0, (seeded(b, i + 5) - .5) * .35]);
    }
  }

  const grass = new THREE.Group();
  scene.add(grass);
  const grassMaterial = makeMaterial(0x155e58, { roughness: .9, side: THREE.DoubleSide });
  for (let i = 0; i < 180; i++) {
    const radius = 11 + seeded(i, 41) * 45;
    const angle = seeded(i, 42) * TAU;
    const blade = addMesh(grass, new THREE.PlaneGeometry(.07 + seeded(i, 43) * .13, .8 + seeded(i, 44) * 2.4, 1, 4), grassMaterial,
      [Math.cos(angle) * radius, -6.7, Math.sin(angle) * radius], null,
      [0, seeded(i, 45) * TAU, (seeded(i, 46) - .5) * .16]);
    blade.userData.phase = seeded(i, 47) * TAU;
  }

  // Ancient ruin: a broken scientific-looking stone arch in the distance.
  const ruin = new THREE.Group();
  ruin.position.set(-20, -6.5, -27);
  scene.add(ruin);
  const ruinMat = makeMaterial(0x284947, { roughness: 1 });
  addMesh(ruin, new THREE.BoxGeometry(2.5, 10, 2.3), ruinMat, [-5, 4.2, 0], null, [0, 0, -.08]);
  addMesh(ruin, new THREE.BoxGeometry(2.5, 8.3, 2.3), ruinMat, [5, 3.35, 0], null, [0, 0, .1]);
  addMesh(ruin, new THREE.BoxGeometry(10.5, 2.2, 2.3), ruinMat, [0, 8.1, 0], null, [0, 0, .04]);
  for (let i = 0; i < 5; i++) addMesh(ruin, new THREE.BoxGeometry(1.2, 1.5, 1.4), ruinMat, [-4 + i * 2.1, 9.45, 0], null, [seeded(i) * .2, 0, seeded(i, 2) * .2]);

  // Bioluminescent vent forest.
  const ventMat = makeMaterial(0x162729, { roughness: .88 });
  const bioMat = makeMaterial(0x56f4ce, { emissive: 0x18c4a0, emissiveIntensity: 2.1, roughness: .25 });
  for (let i = 0; i < 18; i++) {
    const x = 18 + seeded(i, 51) * 17;
    const z = -25 + seeded(i, 52) * 18;
    const h = 2 + seeded(i, 53) * 7;
    addMesh(scene, new THREE.ConeGeometry(.25 + h * .09, h, 8), ventMat, [x, -7 + h / 2, z]);
    addMesh(scene, new THREE.SphereGeometry(.1 + h * .025, 10, 8), bioMat, [x, -6.8 + h, z]);
  }

  return { grass, coralMaterials, bioMat };
}

function createFish(scene, clickable) {
  const group = new THREE.Group();
  scene.add(group);
  const count = 86;
  const bodyGeo = new THREE.SphereGeometry(1, 8, 6);
  const tailGeo = new THREE.ConeGeometry(.48, 1.2, 3);
  const bodyMat = makeMaterial(0x5fb2aa, { roughness: .55, metalness: .12 });
  const tailMat = makeMaterial(0x1d7777, { roughness: .62 });
  const bodies = new THREE.InstancedMesh(bodyGeo, bodyMat, count);
  const tails = new THREE.InstancedMesh(tailGeo, tailMat, count);
  bodies.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  tails.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
  bodies.userData = { kind: 'species', species: 'fish', ...SPECIES.fish };
  clickable.push(bodies);
  group.add(bodies, tails);
  return { group, bodies, tails, count };
}

function createParticles(scene) {
  const count = 1500;
  const positions = new Float32Array(count * 3);
  const speeds = new Float32Array(count);
  for (let i = 0; i < count; i++) {
    positions[i * 3] = (seeded(i, 62) - .5) * 100;
    positions[i * 3 + 1] = -8 + seeded(i, 63) * 31;
    positions[i * 3 + 2] = (seeded(i, 64) - .5) * 92;
    speeds[i] = .05 + seeded(i, 65) * .18;
  }
  const geo = new THREE.BufferGeometry();
  geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
  const material = new THREE.PointsMaterial({ color: 0xb0f2e8, size: .035, transparent: true, opacity: .45, depthWrite: false });
  const points = new THREE.Points(geo, material);
  scene.add(points);

  const bubbleCount = 130;
  const bubblePositions = new Float32Array(bubbleCount * 3);
  for (let i = 0; i < bubbleCount; i++) {
    bubblePositions[i * 3] = (seeded(i, 71) - .5) * 65;
    bubblePositions[i * 3 + 1] = -7 + seeded(i, 72) * 26;
    bubblePositions[i * 3 + 2] = (seeded(i, 73) - .5) * 65;
  }
  const bubbleGeo = new THREE.BufferGeometry();
  bubbleGeo.setAttribute('position', new THREE.BufferAttribute(bubblePositions, 3));
  const bubbles = new THREE.Points(bubbleGeo, new THREE.PointsMaterial({ color: 0xc7ffff, size: .11, transparent: true, opacity: .34, depthWrite: false }));
  scene.add(bubbles);
  return { points, speeds, bubbles };
}

function createPollution(scene, clickable) {
  const group = new THREE.Group();
  scene.add(group);
  const waste = [];
  const warning = makeMaterial(0xff834f, { emissive: 0x9b2b12, emissiveIntensity: .7, roughness: .6 });
  const dark = makeMaterial(0x1e2525, { roughness: .8, metalness: .35 });
  const positions = [[-10, -5.8, 10], [13, -6.5, 7], [18, -6.25, -7], [-15, -6.4, -15], [5, -6.8, 17]];
  positions.forEach((position, i) => {
    let mesh;
    if (i === 0) mesh = addMesh(group, new THREE.TorusKnotGeometry(.9, .045, 80, 7), warning, position, [1.8, 1.1, 1.4], [1, .2, .3]);
    if (i === 1) mesh = addMesh(group, new THREE.CapsuleGeometry(.23, 1.2, 4, 8), warning, position, null, [0, .4, 1.2]);
    if (i === 2) mesh = addMesh(group, new THREE.TorusGeometry(.78, .26, 10, 24), dark, position, null, [1.2, 0, .3]);
    if (i === 3) mesh = addMesh(group, new THREE.CylinderGeometry(.48, .48, 1.7, 12), warning, position, null, [.2, .2, -.6]);
    if (i === 4) mesh = addMesh(group, new THREE.IcosahedronGeometry(.8, 1), warning, position, [2.7, .28, 1.8]);
    mesh.userData = { kind: 'pollution', index: i, ...POLLUTION[i] };
    clickable.push(mesh);
    waste.push(mesh);
  });

  const drones = [];
  for (let i = 0; i < 3; i++) {
    const drone = new THREE.Group();
    addMesh(drone, new THREE.SphereGeometry(.18, 12, 8), makeMaterial(0xb8d7d3, { metalness: .75 }), [0, 0, 0], [2, .6, 1]);
    addMesh(drone, new THREE.SphereGeometry(.08, 8, 6), makeMaterial(0x63f6ff, { emissive: 0x27cbd8, emissiveIntensity: 3 }), [-.3, 0, 0]);
    drone.visible = false;
    scene.add(drone);
    drones.push(drone);
  }
  return { group, waste, drones };
}

function createSonar(scene) {
  const group = new THREE.Group();
  scene.add(group);
  const material = new THREE.MeshBasicMaterial({ color: 0x55f4ff, transparent: true, opacity: .3, side: THREE.DoubleSide, depthWrite: false, blending: THREE.AdditiveBlending });
  for (let i = 0; i < 3; i++) {
    const ring = new THREE.Mesh(new THREE.TorusGeometry(1, .025, 6, 64), material.clone());
    ring.rotation.x = Math.PI / 2;
    ring.userData.offset = i / 3;
    group.add(ring);
  }
  return group;
}

function createAudio() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return () => {};
  const context = new AudioContext();
  const master = context.createGain();
  master.gain.value = .055;
  master.connect(context.destination);
  const low = context.createOscillator();
  const lowGain = context.createGain();
  low.type = 'sine'; low.frequency.value = 44; lowGain.gain.value = .45;
  low.connect(lowGain).connect(master); low.start();
  const current = context.createOscillator();
  const filter = context.createBiquadFilter();
  const currentGain = context.createGain();
  current.type = 'sine'; current.frequency.value = 112; filter.type = 'lowpass'; filter.frequency.value = 180; currentGain.gain.value = .08;
  current.connect(filter).connect(currentGain).connect(master); current.start();
  const ping = () => {
    const osc = context.createOscillator();
    const gain = context.createGain();
    osc.frequency.setValueAtTime(860, context.currentTime);
    osc.frequency.exponentialRampToValueAtTime(420, context.currentTime + 1.2);
    gain.gain.setValueAtTime(.0001, context.currentTime);
    gain.gain.exponentialRampToValueAtTime(.19, context.currentTime + .015);
    gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + 1.25);
    osc.connect(gain).connect(master); osc.start(); osc.stop(context.currentTime + 1.3);
  };
  ping();
  const interval = window.setInterval(ping, 7400);
  return () => { window.clearInterval(interval); low.stop(); current.stop(); context.close(); };
}

function AbyssScene({ mode, cleanupActive, onStats, onTarget, onReady }) {
  const mountRef = useRef(null);
  const propsRef = useRef({ mode, cleanupActive, onStats, onTarget, onReady });
  const apiRef = useRef(null);
  propsRef.current = { mode, cleanupActive, onStats, onTarget, onReady };

  useEffect(() => {
    const mount = mountRef.current;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x031b22);
    scene.fog = new THREE.FogExp2(0x052a31, .024);

    const camera = new THREE.PerspectiveCamera(52, mount.clientWidth / mount.clientHeight, .08, 180);
    const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    renderer.domElement.setAttribute('aria-label', 'Interactive 3D underwater world. Drag to orbit and use the mouse wheel to zoom.');
    mount.appendChild(renderer.domElement);

    const clickable = [];
    const hemi = new THREE.HemisphereLight(0x8ef5ed, 0x001317, 1.38);
    scene.add(hemi);
    const sun = new THREE.DirectionalLight(0xa2fff5, 4.7);
    sun.position.set(-24, 34, 11);
    sun.castShadow = true;
    sun.shadow.mapSize.set(1024, 1024);
    sun.shadow.camera.near = .5; sun.shadow.camera.far = 90;
    sun.shadow.camera.left = -35; sun.shadow.camera.right = 35; sun.shadow.camera.top = 35; sun.shadow.camera.bottom = -35;
    scene.add(sun);
    const fill = new THREE.PointLight(0x2cf2ff, 9, 34, 1.8);
    fill.position.set(-4, 6, 5);
    scene.add(fill);
    const warm = new THREE.PointLight(0xff914d, 5.2, 22, 2);
    warm.position.set(8, 1, -3);
    scene.add(warm);

    // Broad shafts of light become volumetric silhouettes in the water column.
    const rayMaterial = new THREE.MeshBasicMaterial({ color: 0x8bfce9, transparent: true, opacity: .035, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    for (let i = 0; i < 7; i++) {
      addMesh(scene, new THREE.ConeGeometry(3.5 + seeded(i) * 4, 42, 16, 1, true), rayMaterial, [-30 + i * 10 + seeded(i, 2) * 4, 13, -24 + seeded(i, 3) * 22], null, [0, 0, (seeded(i, 4) - .5) * .16]);
    }

    const sub = createSubmarine(scene, clickable);
    const world = createWorld(scene, clickable);
    const whale = createWhale(scene, clickable);
    const manta = createManta(scene, clickable);
    const fish = createFish(scene, clickable);
    const particles = createParticles(scene);
    const pollution = createPollution(scene, clickable);
    const sonar = createSonar(scene);

    const pointer = new THREE.Vector2(2, 2);
    const raycaster = new THREE.Raycaster();
    const target = new THREE.Vector3(0, .8, 0);
    const cameraState = { yaw: .7, pitch: .17, radius: 25, targetYaw: .7, targetPitch: .17, targetRadius: 25, targetPoint: target.clone(), dragging: false, moved: false, x: 0, y: 0, pinch: 0 };
    let cleanupStarted = null;
    let previousCleanup = false;
    let lastStatsUpdate = 0;
    let hovered = null;

    const setView = view => {
      const presets = {
        free: [.7, .17, 25, 0, .8, 0],
        front: [-Math.PI / 2, .03, 20, -1.1, .8, 0],
        side: [0, .04, 23, .3, .8, 0],
        top: [.15, 1.24, 24, .2, .2, 0],
        dome: [-1.72, .08, 7.2, -3.25, 1.55, 0],
        engines: [1.38, .02, 8, 5.45, 1.1, 0]
      };
      const values = presets[view] || presets.free;
      cameraState.targetYaw = values[0]; cameraState.targetPitch = values[1]; cameraState.targetRadius = values[2];
      cameraState.targetPoint.set(values[3], values[4], values[5]);
    };
    apiRef.current = { setView };
    propsRef.current.onReady?.({ setView });

    const projectPointer = event => {
      const rect = renderer.domElement.getBoundingClientRect();
      pointer.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
      pointer.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
    };
    const pick = event => {
      projectPointer(event);
      raycaster.setFromCamera(pointer, camera);
      const hits = raycaster.intersectObjects(clickable, false);
      return hits[0]?.object || null;
    };
    const onPointerDown = event => {
      cameraState.dragging = true; cameraState.moved = false; cameraState.x = event.clientX; cameraState.y = event.clientY;
      renderer.domElement.setPointerCapture?.(event.pointerId);
    };
    const onPointerMove = event => {
      if (cameraState.dragging) {
        const dx = event.clientX - cameraState.x;
        const dy = event.clientY - cameraState.y;
        if (Math.abs(dx) + Math.abs(dy) > 3) cameraState.moved = true;
        cameraState.targetYaw -= dx * .0052;
        cameraState.targetPitch = clamp(cameraState.targetPitch + dy * .004, -.75, 1.34);
        cameraState.x = event.clientX; cameraState.y = event.clientY;
      } else {
        const hit = pick(event);
        if (hit !== hovered) {
          hovered = hit;
          renderer.domElement.classList.toggle('is-targeting', Boolean(hit));
        }
      }
    };
    const onPointerUp = event => {
      cameraState.dragging = false;
      if (!cameraState.moved) {
        const hit = pick(event);
        if (hit?.userData.kind === 'pollution') propsRef.current.onTarget?.({ category: 'pollution', ...hit.userData });
        if (hit?.userData.kind === 'species') propsRef.current.onTarget?.({ category: 'species', ...hit.userData });
        if (hit?.userData.kind === 'sub') propsRef.current.onTarget?.({ category: 'sub', ...hit.userData });
      }
    };
    const onWheel = event => {
      event.preventDefault();
      cameraState.targetRadius = clamp(cameraState.targetRadius + event.deltaY * .012, 4.6, 47);
    };
    const onTouchStart = event => {
      if (event.touches.length === 2) cameraState.pinch = Math.hypot(event.touches[0].clientX - event.touches[1].clientX, event.touches[0].clientY - event.touches[1].clientY);
    };
    const onTouchMove = event => {
      if (event.touches.length === 2) {
        const distance = Math.hypot(event.touches[0].clientX - event.touches[1].clientX, event.touches[0].clientY - event.touches[1].clientY);
        cameraState.targetRadius = clamp(cameraState.targetRadius - (distance - cameraState.pinch) * .025, 4.6, 47);
        cameraState.pinch = distance;
      }
    };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: true });

    const dummy = new THREE.Object3D();
    const clock = new THREE.Clock();
    let frame;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      const t = clock.getElapsedTime();
      const delta = Math.min(clock.getDelta?.() || .016, .04);
      const currentMode = propsRef.current.mode;
      const isCleanup = propsRef.current.cleanupActive;

      cameraState.yaw = lerp(cameraState.yaw, cameraState.targetYaw, .045);
      cameraState.pitch = lerp(cameraState.pitch, cameraState.targetPitch, .045);
      cameraState.radius = lerp(cameraState.radius, cameraState.targetRadius, .055);
      target.lerp(cameraState.targetPoint, .05);
      const cp = Math.cos(cameraState.pitch);
      camera.position.set(
        target.x + Math.sin(cameraState.yaw) * cp * cameraState.radius,
        target.y + Math.sin(cameraState.pitch) * cameraState.radius,
        target.z + Math.cos(cameraState.yaw) * cp * cameraState.radius
      );
      camera.lookAt(target);

      sub.position.y = 1.2 + Math.sin(t * .42) * .09;
      sub.rotation.z = Math.sin(t * .3) * .009;
      sub.rotation.y = Math.sin(t * .2) * .012;
      sub.userData.thrusters.children.forEach(child => { if (child.userData.spin) child.rotation.x += child.userData.spin * .055; });
      sub.userData.arms.rotation.z = Math.sin(t * .35) * .025;

      // Whale crossing loops well beyond the viewer, with a slow, non-repetitive body roll.
      whale.position.x = -30 + (t * 1.25) % 67;
      whale.position.z = -14 + Math.sin(t * .11) * 4;
      whale.position.y = 11.5 + Math.sin(t * .18) * 1.3;
      whale.rotation.z = Math.sin(t * .23) * .035;
      whale.userData.tail.rotation.x = Math.sin(t * 1.35) * .23;
      manta.position.x = 16 - (t * .72) % 38;
      manta.position.z = -12 + Math.sin(t * .21) * 6;
      manta.position.y = 3.3 + Math.sin(t * .58) * .8;
      manta.rotation.y = Math.PI + Math.sin(t * .18) * .15;
      manta.rotation.z = Math.sin(t * .9) * .08;

      for (let i = 0; i < fish.count; i++) {
        const speed = .42 + seeded(i, 82) * .58;
        const loop = ((t * speed + seeded(i, 83) * 65) % 54) - 27;
        const school = i % 3;
        const x = school === 0 ? loop : school === 1 ? -loop * .8 : loop * .66;
        const z = (school - 1) * 11 + Math.sin(t * .22 + i * .7) * (4 + seeded(i, 84) * 5);
        const y = -1 + seeded(i, 85) * 10 + Math.sin(t * .8 + i) * .45;
        const direction = school === 1 ? -1 : 1;
        dummy.position.set(x, y, z);
        dummy.scale.set(.34 + seeded(i, 86) * .55, .13 + seeded(i, 87) * .17, .14 + seeded(i, 88) * .2);
        dummy.rotation.set(0, direction > 0 ? -Math.PI / 2 : Math.PI / 2, Math.sin(t + i) * .03);
        dummy.updateMatrix(); fish.bodies.setMatrixAt(i, dummy.matrix);
        dummy.position.x -= direction * (.42 + seeded(i, 89) * .25);
        dummy.scale.set(.25, .2, .22);
        dummy.rotation.set(0, direction > 0 ? Math.PI / 2 : -Math.PI / 2, Math.sin(t * 3 + i) * .28);
        dummy.updateMatrix(); fish.tails.setMatrixAt(i, dummy.matrix);
      }
      fish.bodies.instanceMatrix.needsUpdate = true;
      fish.tails.instanceMatrix.needsUpdate = true;

      world.grass.children.forEach(blade => { blade.rotation.z = Math.sin(t * .7 + blade.userData.phase) * .11; });
      world.bioMat.emissiveIntensity = 1.6 + Math.sin(t * 1.4) * .7;
      const sediment = particles.points.geometry.attributes.position;
      for (let i = 0; i < sediment.count; i++) {
        let x = sediment.getX(i) + particles.speeds[i] * .014;
        if (x > 50) x = -50;
        sediment.setX(i, x);
      }
      sediment.needsUpdate = true;
      const bubbles = particles.bubbles.geometry.attributes.position;
      for (let i = 0; i < bubbles.count; i++) {
        let y = bubbles.getY(i) + .018 + seeded(i, 92) * .016;
        if (y > 22) y = -7;
        bubbles.setY(i, y);
      }
      bubbles.needsUpdate = true;

      const scanOn = currentMode === 'sonar' || currentMode === 'ai' || isCleanup;
      sonar.visible = scanOn;
      sonar.children.forEach(ring => {
        const life = (t * .22 + ring.userData.offset) % 1;
        ring.scale.setScalar(1 + life * 28);
        ring.material.opacity = (1 - life) * .28;
      });
      pollution.waste.forEach((mesh, i) => {
        const highlight = scanOn;
        if (mesh.material.emissive) mesh.material.emissiveIntensity = highlight ? 2.6 + Math.sin(t * 3 + i) * .7 : .32;
      });

      if (isCleanup && !previousCleanup) cleanupStarted = t;
      if (!isCleanup) cleanupStarted = null;
      previousCleanup = isCleanup;
      const progress = cleanupStarted === null ? 0 : clamp((t - cleanupStarted) / 17);
      pollution.waste.forEach((mesh, i) => {
        const threshold = (i + 1) / pollution.waste.length;
        const local = clamp(progress * pollution.waste.length - i);
        mesh.scale.setScalar(Math.max(.001, 1 - local * 1.2));
        mesh.visible = local < .98;
      });
      pollution.drones.forEach((drone, i) => {
        drone.visible = isCleanup && progress < 1;
        if (!drone.visible) return;
        const targetIndex = Math.min(pollution.waste.length - 1, Math.floor(progress * pollution.waste.length));
        const destination = pollution.waste[targetIndex].position;
        const phase = (progress * pollution.waste.length) % 1;
        const trip = Math.sin(phase * Math.PI);
        drone.position.set(
          lerp(1 + i * .3, destination.x, trip) + Math.sin(t * 2 + i) * .45,
          lerp(2.5, destination.y + 1, trip) + Math.cos(t * 2.4 + i) * .2,
          lerp(-1 + i, destination.z, trip) + Math.sin(t * 1.4 + i) * .35
        );
        drone.lookAt(destination);
      });

      if (t - lastStatsUpdate > .12) {
        lastStatsUpdate = t;
        propsRef.current.onStats?.({
          progress: Math.round(progress * 100),
          health: Math.round(62 + progress * 35),
          removed: (progress * 160).toFixed(1),
          protected: 12 + Math.floor(progress * 32),
          clarity: Math.round(71 + progress * 26)
        });
      }

      const targetBg = currentMode === 'night' ? 0x01070c : currentMode === 'sonar' ? 0x001821 : currentMode === 'ai' ? 0x031524 : 0x031b22;
      const targetFog = currentMode === 'night' ? 0x021015 : currentMode === 'sonar' ? 0x00222b : currentMode === 'ai' ? 0x07182a : 0x052a31;
      scene.background.lerp(new THREE.Color(targetBg), .03);
      scene.fog.color.lerp(new THREE.Color(targetFog), .03);
      scene.fog.density = lerp(scene.fog.density, .024 - progress * .008 + (currentMode === 'night' ? .016 : 0), .025);
      renderer.toneMappingExposure = lerp(renderer.toneMappingExposure, currentMode === 'night' ? .62 : currentMode === 'sonar' ? .78 : 1.12 + progress * .16, .03);
      hemi.intensity = lerp(hemi.intensity, currentMode === 'night' ? .38 : 1.38, .03);

      renderer.render(scene, camera);
    };
    animate();

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      camera.aspect = width / height; camera.updateProjectionMatrix();
      renderer.setSize(width, height); renderer.setPixelRatio(Math.min(window.devicePixelRatio, width < 700 ? 1.25 : 1.75));
    };
    window.addEventListener('resize', resize);

    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener('resize', resize);
      renderer.domElement.removeEventListener('pointerdown', onPointerDown);
      renderer.domElement.removeEventListener('pointermove', onPointerMove);
      renderer.domElement.removeEventListener('pointerup', onPointerUp);
      renderer.domElement.removeEventListener('wheel', onWheel);
      renderer.domElement.removeEventListener('touchstart', onTouchStart);
      renderer.domElement.removeEventListener('touchmove', onTouchMove);
      scene.traverse(object => {
        object.geometry?.dispose?.();
        if (Array.isArray(object.material)) object.material.forEach(material => material.dispose?.());
        else object.material?.dispose?.();
      });
      renderer.dispose();
      mount.removeChild(renderer.domElement);
    };
  }, []);

  return html`<div className="abyss-scene" ref=${mountRef}></div>`;
}

function ModeGlyph({ mode }) {
  return html`<span className=${`mode-glyph mode-glyph--${mode}`} aria-hidden="true"><i></i><b></b></span>`;
}

function TargetCard({ target, onClose }) {
  if (!target) return null;
  return html`
    <aside className=${`target-card target-card--${target.category}`}>
      <div className="target-card__line"><span>${target.category === 'pollution' ? 'AI OBJECT LOCK' : target.category === 'species' ? 'BIOLOGICAL CONTACT' : 'SYSTEM INSPECTION'}</span><button onClick=${onClose} aria-label="Close target details">×</button></div>
      <h2>${target.type}</h2>
      <p className="target-card__meta">${target.meta || target.method}</p>
      <p>${target.detail || `${target.risk} RISK · ${target.weight}`}</p>
      ${target.category === 'pollution' && html`<div className="risk-line"><span>RISK ${target.risk}</span><b>${target.weight}</b></div>`}
    </aside>
  `;
}

function CursorBeacon() {
  const cursorRef = useRef(null);

  useEffect(() => {
    const root = cursorRef.current;
    const finePointer = window.matchMedia('(pointer: fine)');
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)');
    if (!finePointer.matches) return undefined;

    const core = root.querySelector('.cursor-beacon__core');
    const halo = root.querySelector('.cursor-beacon__halo');
    const wake = root.querySelector('.cursor-beacon__wake');
    const state = {
      x: window.innerWidth / 2,
      y: window.innerHeight / 2,
      coreX: window.innerWidth / 2,
      coreY: window.innerHeight / 2,
      haloX: window.innerWidth / 2,
      haloY: window.innerHeight / 2,
      wakeX: window.innerWidth / 2,
      wakeY: window.innerHeight / 2,
      visible: false,
      down: false,
      magnetic: null,
      frame: 0
    };

    document.documentElement.classList.add('custom-cursor-enabled');

    const updateSurface = (x, y) => {
      const element = document.elementFromPoint(x, y);
      const control = element?.closest?.('button, a, [role="button"], [data-hotspot]');
      const canvas = element?.closest?.('.abyss-scene canvas');
      const hotspot = Boolean(canvas?.classList.contains('is-targeting'));
      const darkInterface = Boolean(element?.closest?.('.mission-header, .mode-dock, .mission-panel, .target-card, .view-rail, .status-footer'));
      const darkMode = Boolean(element?.closest?.('.mode-night, .mode-sonar'));

      state.magnetic = control || null;
      root.dataset.interactive = control || hotspot ? 'true' : 'false';
      root.dataset.surface = control ? 'control' : hotspot ? 'hotspot' : canvas ? 'ocean' : 'interface';
      root.dataset.zone = darkInterface || darkMode || y > window.innerHeight * .36 ? 'dark' : 'light';
    };

    const show = event => {
      if (event.pointerType === 'touch') {
        state.visible = false;
        root.dataset.visible = 'false';
        return;
      }
      state.visible = true;
      state.x = event.clientX;
      state.y = event.clientY;
      root.dataset.visible = 'true';
      updateSurface(event.clientX, event.clientY);
    };

    const createPulse = (x, y, interactive) => {
      const pulse = document.createElement('span');
      pulse.className = interactive ? 'cursor-sonar-pulse is-interactive' : 'cursor-sonar-pulse';
      pulse.style.left = `${x}px`;
      pulse.style.top = `${y}px`;
      root.appendChild(pulse);
      pulse.addEventListener('animationend', () => pulse.remove(), { once: true });
    };

    const onPointerDown = event => {
      if (event.pointerType === 'touch') return;
      show(event);
      state.down = true;
      root.dataset.down = 'true';
      createPulse(event.clientX, event.clientY, root.dataset.interactive === 'true');
    };

    const onPointerUp = event => {
      if (event.pointerType === 'touch') return;
      state.down = false;
      root.dataset.down = 'false';
      show(event);
    };

    const onPointerLeave = event => {
      if (event.relatedTarget) return;
      state.visible = false;
      root.dataset.visible = 'false';
      state.magnetic = null;
    };

    const animate = () => {
      let targetX = state.x;
      let targetY = state.y;
      if (state.magnetic?.isConnected) {
        const rect = state.magnetic.getBoundingClientRect();
        const centerX = rect.left + rect.width / 2;
        const centerY = rect.top + rect.height / 2;
        targetX = state.x * .87 + centerX * .13;
        targetY = state.y * .87 + centerY * .13;
      }

      const immediate = reducedMotion.matches;
      state.coreX += (targetX - state.coreX) * (immediate ? 1 : .64);
      state.coreY += (targetY - state.coreY) * (immediate ? 1 : .64);
      state.haloX += (targetX - state.haloX) * (immediate ? 1 : .26);
      state.haloY += (targetY - state.haloY) * (immediate ? 1 : .26);
      state.wakeX += (targetX - state.wakeX) * (immediate ? 1 : .13);
      state.wakeY += (targetY - state.wakeY) * (immediate ? 1 : .13);

      const dx = targetX - state.wakeX;
      const dy = targetY - state.wakeY;
      const velocity = clamp(Math.hypot(dx, dy) / 28);
      const angle = Math.atan2(dy, dx) * 180 / Math.PI;
      root.style.setProperty('--cursor-velocity', velocity.toFixed(3));
      core.style.transform = `translate3d(${state.coreX}px, ${state.coreY}px, 0) translate(-50%, -50%)`;
      halo.style.transform = `translate3d(${state.haloX}px, ${state.haloY}px, 0) translate(-50%, -50%)`;
      wake.style.transform = `translate3d(${state.wakeX}px, ${state.wakeY}px, 0) translate(-50%, -50%) rotate(${angle}deg)`;
      state.frame = requestAnimationFrame(animate);
    };

    window.addEventListener('pointermove', show, { passive: true, capture: true });
    window.addEventListener('pointerdown', onPointerDown, { passive: true, capture: true });
    window.addEventListener('pointerup', onPointerUp, { passive: true, capture: true });
    window.addEventListener('pointercancel', onPointerUp, { passive: true, capture: true });
    window.addEventListener('pointerout', onPointerLeave, { passive: true, capture: true });
    state.frame = requestAnimationFrame(animate);

    return () => {
      cancelAnimationFrame(state.frame);
      window.removeEventListener('pointermove', show, true);
      window.removeEventListener('pointerdown', onPointerDown, true);
      window.removeEventListener('pointerup', onPointerUp, true);
      window.removeEventListener('pointercancel', onPointerUp, true);
      window.removeEventListener('pointerout', onPointerLeave, true);
      document.documentElement.classList.remove('custom-cursor-enabled');
    };
  }, []);

  return html`
    <div className="cursor-beacon" data-visible="false" data-interactive="false" data-down="false" data-zone="dark" aria-hidden="true" ref=${cursorRef}>
      <span className="cursor-beacon__wake"><i></i></span>
      <span className="cursor-beacon__halo"><i></i><b></b></span>
      <span className="cursor-beacon__core"><i></i></span>
    </div>
  `;
}

function App() {
  const [mode, setMode] = useState('normal');
  const [view, setView] = useState('free');
  const [audio, setAudio] = useState(false);
  const [cleanupActive, setCleanupActive] = useState(false);
  const [target, setTarget] = useState(null);
  const [intro, setIntro] = useState(true);
  const [stats, setStats] = useState({ progress: 0, health: 62, removed: '0.0', protected: 12, clarity: 71 });
  const sceneApi = useRef(null);

  useEffect(() => {
    const timeout = window.setTimeout(() => setIntro(false), 6200);
    return () => window.clearTimeout(timeout);
  }, []);

  useEffect(() => {
    if (!audio) return undefined;
    return createAudio();
  }, [audio]);

  useEffect(() => {
    const onKey = event => {
      if (event.key >= '1' && event.key <= '4') setMode(MODES[Number(event.key) - 1].id);
      if (event.key.toLowerCase() === 'c') setCleanupActive(value => !value);
      if (event.key.toLowerCase() === 'm') setAudio(value => !value);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const selectView = id => {
    setView(id);
    sceneApi.current?.setView(id);
    if (id === 'dome') setTarget({ category: 'sub', type: 'PANORAMIC OBSERVATORY', meta: 'PRESSURE-RESISTANT SMART GLASS', detail: 'External pressure 78.4 MPa · Optical clarity 99.7%' });
  };

  const toggleCleanup = () => {
    setCleanupActive(active => !active);
    setMode('ai');
    setTarget(null);
  };

  return html`
    <main className=${`experience mode-${mode} ${cleanupActive ? 'cleanup-active' : ''}`}>
      <${AbyssScene}
        mode=${mode}
        cleanupActive=${cleanupActive}
        onStats=${setStats}
        onTarget=${setTarget}
        onReady=${api => { sceneApi.current = api; }}
      />

      <div className="water-volume" aria-hidden="true"><i></i><b></b></div>
      <div className="vignette" aria-hidden="true"></div>
      <div className="film-grain" aria-hidden="true"></div>
      <div className="sonar-wash" aria-hidden="true"></div>
      <div className="reticle" aria-hidden="true"><i></i><b></b><span></span></div>
      <${CursorBeacon}/>

      <header className="mission-header">
        <button className="brand" onClick=${() => selectView('free')} aria-label="Return to free orbit">
          <span className="brand-mark"><i></i><b></b></span>
          <span className="brand-copy"><strong>ABYSS</strong><small>HADAL RESEARCH DIVISION</small></span>
        </button>
        <div className="mission-id"><span>EXPEDITION</span><b>NER–07</b><i></i><em>LIVE</em></div>
        <div className="header-actions">
          <button className=${audio ? 'audio is-on' : 'audio'} onClick=${() => setAudio(value => !value)} aria-label=${audio ? 'Mute spatial audio' : 'Enable spatial audio'}>
            <span><i></i><i></i><i></i><i></i></span>${audio ? 'AUDIO ON' : 'AUDIO OFF'}
          </button>
          <span className="header-rule"></span>
          <span className="depth-mini"><i>DEPTH</i><b>7,842</b><em>M</em></span>
        </div>
      </header>

      <section className="telemetry" aria-label="Mission telemetry">
        <div className="telemetry__eyebrow"><i></i>LIVE BATHYMETRY</div>
        <div className="depth-readout"><span>−</span><strong>7,842</strong><em>M</em></div>
        <div className="coordinate">11° 21' 4.2" N<br/>142° 11' 38.1" E</div>
        <div className="pressure">
          <span><i>PRESSURE</i><b>78.4 MPa</b></span>
          <span><i>EXT. TEMP</i><b>1.7 °C</b></span>
        </div>
        <div className="ocean-state"><i style=${{ '--health': `${stats.health}%` }}></i><span>OCEAN INTEGRITY</span><b>${stats.health}%</b></div>
      </section>

      <nav className="view-rail" aria-label="Cinematic camera views">
        <span className="rail-label">CAMERA</span>
        ${VIEWS.map(item => html`
          <button key=${item.id} className=${view === item.id ? 'active' : ''} onClick=${() => selectView(item.id)} aria-pressed=${view === item.id}>
            <span>${item.key}</span><i></i><b>${item.label}</b>
          </button>
        `)}
      </nav>

      <section className="mode-dock" aria-label="Imaging systems">
        <span className="dock-label">IMAGING SYSTEM</span>
        <div className="mode-options">
          ${MODES.map(item => html`
            <button key=${item.id} className=${mode === item.id ? 'active' : ''} onClick=${() => setMode(item.id)} aria-pressed=${mode === item.id}>
              <${ModeGlyph} mode=${item.id}/><span>${item.label}</span><kbd>${item.shortcut}</kbd>
            </button>
          `)}
        </div>
      </section>

      <section className="mission-panel" aria-label="Ocean restoration mission">
        <div className="mission-panel__top"><span><i></i>RESTORATION PROTOCOL</span><b>${cleanupActive ? 'ACTIVE' : 'STANDBY'}</b></div>
        <div className="mission-panel__body">
          <div className="mission-progress">
            <span>MISSION ${String(stats.progress).padStart(2, '0')}%</span>
            <i><b style=${{ width: `${stats.progress}%` }}></b></i>
          </div>
          <dl>
            <div><dt>PLASTIC RECOVERED</dt><dd>${stats.removed}<small>KG</small></dd></div>
            <div><dt>SPECIES PROTECTED</dt><dd>${stats.protected}<small>LIVE</small></dd></div>
            <div><dt>WATER CLARITY</dt><dd>${stats.clarity}<small>%</small></dd></div>
          </dl>
          <button className=${cleanupActive ? 'cleanup-button active' : 'cleanup-button'} onClick=${toggleCleanup}>
            <span className="cleanup-icon"><i></i><b></b></span>
            <span><strong>${cleanupActive ? stats.progress === 100 ? 'RESTORATION COMPLETE' : 'DRONES DEPLOYED' : 'INITIATE CLEANUP'}</strong><small>${cleanupActive ? 'AUTONOMOUS COLLECTION IN PROGRESS' : 'C  ·  AI GUIDED RESTORATION'}</small></span>
            <i className="cleanup-arrow">↗</i>
          </button>
        </div>
      </section>

      <${TargetCard} target=${target} onClose=${() => setTarget(null)}/>

      <div className="interaction-hint" data-visible=${intro ? 'true' : 'false'}>
        <span className="mouse"><i></i><b></b></span>
        <p><strong>DRAG TO ORBIT</strong><small>SCROLL TO INSPECT · SELECT ANY CONTACT</small></p>
      </div>

      <footer className="status-footer">
        <span><i className="status-dot"></i>ALL SYSTEMS NOMINAL</span>
        <span className="footer-center">AUS NEREID <i></i> AUTONOMOUS SUBMERSIBLE</span>
        <span>LOCAL TIME <b>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</b></span>
      </footer>
    </main>
  `;
}

export { App };
