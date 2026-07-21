import { React, html } from './lib/deps.js';
import * as THREE from 'https://esm.sh/three@0.170.0';

const { useCallback, useEffect, useRef, useState } = React;
const TAU = Math.PI * 2;
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const lerp = (a, b, amount) => a + (b - a) * amount;
const WORLD_RADIUS = 59;

const REGIONS = [
  { id: 'open', label: 'Open Ocean', code: 'PELAGIC-01', center: [0, 0], bg: 0x031b22, fog: 0x052a31, density: .023, accent: 0x7cefe6, ambience: 'Wide currents · Migrating cetaceans', pollution: ['PLASTIC BOTTLE', 'PLASTIC BAG'] },
  { id: 'reef', label: 'Coral Reef', code: 'REEF-02', center: [-23, 16], bg: 0x06272c, fog: 0x0a3c3b, density: .021, accent: 0xff8f73, ambience: 'Warm reef · Dense biodiversity', pollution: ['GLASS BOTTLE', 'BROKEN CRATE'] },
  { id: 'kelp', label: 'Kelp Forest', code: 'KELP-03', center: [-29, -22], bg: 0x071f20, fog: 0x12382c, density: .031, accent: 0x6fdb83, ambience: 'Canopy current · Low visibility', pollution: ['GHOST NET', 'RUBBER TIRE'] },
  { id: 'trench', label: 'Deep Trench', code: 'HADAL-04', center: [8, -38], bg: 0x010b14, fog: 0x071323, density: .036, accent: 0x5b8cff, ambience: 'Hadal pressure · Sparse light', pollution: ['METAL DEBRIS', 'MICROPLASTIC CLUSTER'] },
  { id: 'shipwreck', label: 'Ship Graveyard', code: 'WRECK-05', center: [33, 12], bg: 0x07191d, fog: 0x192c2c, density: .029, accent: 0xd88d55, ambience: 'Iron hulls · Enclosed habitat', pollution: ['OIL BARREL', 'LOST CONTAINER'] },
  { id: 'volcanic', label: 'Volcanic Area', code: 'VENT-06', center: [27, 35], bg: 0x100e12, fog: 0x251b20, density: .032, accent: 0xff7651, ambience: 'Thermal vents · Mineral plumes', pollution: ['METAL CANISTER', 'RUBBER TIRE'] },
  { id: 'crystal', label: 'Crystal Caverns', code: 'CAVE-07', center: [-8, 39], bg: 0x071026, fog: 0x111b3e, density: .028, accent: 0xb79bff, ambience: 'Resonant cavern · Mineral light', pollution: ['GLASS BOTTLE', 'BROKEN CRATE'] },
  { id: 'bio', label: 'Bioluminescent Zone', code: 'LUMEN-08', center: [-43, 2], bg: 0x020d18, fog: 0x062332, density: .034, accent: 0x55ffd5, ambience: 'Living light · Nocturnal fauna', pollution: ['MICROPLASTIC CLUSTER', 'PLASTIC BOTTLE'] }
];

const VIEWS = [
  { id: 'free', label: 'Free orbit', key: '01' },
  { id: 'front', label: 'Bow', key: '02' },
  { id: 'side', label: 'Port profile', key: '03' },
  { id: 'top', label: 'Overhead', key: '04' },
  { id: 'dome', label: 'Observation dome', key: '05' },
  { id: 'cockpit', label: 'Cockpit', key: '06' },
  { id: 'engines', label: 'Thruster array', key: '07' }
];

const CAMERA_POSES = {
  free: [.7, .17, 25, 0, .8, 0],
  front: [-Math.PI / 2, .03, 19, -1.1, .8, 0],
  side: [0, .04, 21, .3, .8, 0],
  top: [.15, 1.18, 21, .2, .2, 0],
  dome: [-1.72, .08, 7.2, -3.25, 1.55, 0],
  sonar: [-.38, .55, 11.5, .75, 2.15, 0],
  arms: [-1.02, -.28, 10.4, -1.65, -.65, .2],
  cockpit: [-1.7, .025, 4.75, -3.32, 1.45, 0],
  engines: [1.38, .02, 8.3, 5.45, 1.1, 0]
};

const STORY_CHAPTERS = [
  {
    id: 'arrival', number: '01', pose: 'free', view: 'free', align: 'left',
    kicker: 'THE HADAL EXPEDITION', title: 'Meet the AUS Nereid.',
    body: 'A next-generation autonomous research platform engineered to explore Earth’s least understood frontier—and repair what it finds.',
    facts: [['RATED DEPTH', '11,200 M'], ['MISSION ENDURANCE', '42 DAYS'], ['CREW', '0 + AI']]
  },
  {
    id: 'observatory', number: '02', pose: 'dome', view: 'dome', align: 'right',
    kicker: 'PRESSURE GLASS', title: 'A window into the impossible.',
    body: 'A layered aluminosilicate observation dome distributes nearly eighty megapascals of pressure while preserving optical clarity.',
    facts: [['GLASS LAYERS', '09'], ['OPTICAL CLARITY', '99.7%'], ['LIVE PRESSURE', '78.4 MPA']]
  },
  {
    id: 'hull', number: '03', pose: 'side', view: 'side', align: 'left',
    kicker: 'TITANIUM–CARBON HULL', title: 'Strength without excess.',
    body: 'A ribbed titanium pressure vessel, carbon-fiber fairings, ceramic panels, and isolated scientific pods create a hull built for silence.',
    facts: [['HULL THICKNESS', '168 MM'], ['STRUCTURAL LOAD', 'NOMINAL'], ['ACOUSTIC PROFILE', '−42 DB']]
  },
  {
    id: 'sonar', number: '04', pose: 'sonar', view: 'top', align: 'right',
    kicker: 'MULTIMODAL PERCEPTION', title: 'It maps what light cannot reach.',
    body: 'LiDAR, multibeam sonar, low-light optics, and AI classification combine into a live three-dimensional model of the trench.',
    facts: [['SONAR RANGE', '2.4 KM'], ['MAP RESOLUTION', '2.8 MM'], ['CONTACTS', '96 LIVE']]
  },
  {
    id: 'robotics', number: '05', pose: 'arms', view: 'front', align: 'left',
    kicker: 'SCIENTIFIC ROBOTICS', title: 'Precision hands at crushing depth.',
    body: 'Force-sensing manipulators collect fragile samples, cut ghost nets, and recover debris without touching coral or wildlife.',
    facts: [['ARM ACCURACY', '0.4 MM'], ['FORCE LIMIT', 'ADAPTIVE'], ['TOOLS AVAILABLE', '18']]
  },
  {
    id: 'propulsion', number: '06', pose: 'engines', view: 'engines', align: 'right',
    kicker: 'VECTORED PROPULSION', title: 'Quiet power in every direction.',
    body: 'Four independent rim-driven thrusters provide centimeter-level station keeping with almost no disturbance to the ecosystem.',
    facts: [['THRUSTERS', '04'], ['CRUISE SPEED', '6.8 KN'], ['STATION ERROR', '< 2 CM']]
  },
  {
    id: 'cockpit', number: '07', pose: 'cockpit', view: 'cockpit', align: 'left',
    kicker: 'MISSION CONTROL', title: 'Every system, one command surface.',
    body: 'The cockpit brings navigation, life support, mapping, cleanup drones, and ocean telemetry into one pressure-safe control environment.',
    facts: [['AI CORE', 'ONLINE'], ['POWER RESERVE', '94%'], ['SYSTEMS', '27 / 27']]
  },
  {
    id: 'open-world', number: '08', pose: 'free', view: 'free', align: 'center', freeFlight: true,
    kicker: 'COMMAND TRANSFER', title: 'The ocean is yours.',
    body: 'Guided expedition complete. Take command of the Nereid, chart your own route, and continue the restoration mission.',
    facts: [['W / S', 'THRUST'], ['A / D', 'STEER'], ['SPACE / SHIFT', 'DEPTH']]
  }
];

const MODES = [
  { id: 'normal', label: 'Optical', shortcut: '1' },
  { id: 'sonar', label: 'Sonar', shortcut: '2' },
  { id: 'night', label: 'Low light', shortcut: '3' },
  { id: 'ai', label: 'AI vision', shortcut: '4' }
];

const POLLUTION = REGIONS.flatMap((region, regionIndex) => region.pollution.map((type, itemIndex) => {
  const plastic = /PLASTIC|NET|TIRE/.test(type);
  const weight = Number((4.8 + seeded(regionIndex * 3 + itemIndex, 105) * (type === 'LOST CONTAINER' ? 110 : 44)).toFixed(1));
  return {
    type,
    label: type.replace(/\b\w/g, letter => letter.toUpperCase()),
    risk: /NET|OIL|CONTAINER/.test(type) ? 'CRITICAL' : /MICRO|METAL/.test(type) ? 'HIGH' : 'MEDIUM',
    weight,
    plastic: plastic ? Number((weight * (/TIRE/.test(type) ? .72 : .94)).toFixed(1)) : 0,
    method: /NET/.test(type) ? 'ARM CUT + RETRIEVAL' : /MICRO/.test(type) ? 'MEMBRANE FILTRATION' : 'MANIPULATOR RECOVERY',
    region: region.id,
    regionIndex,
    itemIndex
  };
}));

const SPECIES = {
  whale: { type: 'HUMPBACK WHALE', meta: 'MEGAPTERA NOVAEANGLIAE', detail: 'Adult · 14.8 m · Acoustic contact stable' },
  manta: { type: 'OCEANIC MANTA', meta: 'MOBULA BIROSTRIS', detail: 'Adult · 5.1 m wingspan · Non-threat' },
  fish: { type: 'YELLOWTAIL SCHOOL', meta: 'SERIOLA LALANDI', detail: '76 signatures · Coordinated movement' },
  shark: { type: 'GREAT WHITE SHARK', meta: 'CARCHARODON CARCHARIAS', detail: 'Adult · 5.4 m · Respectful observation distance' },
  hammerhead: { type: 'HAMMERHEAD SHARK', meta: 'SPHYRNA MOKARRAN', detail: 'Adult · Electroreception active' },
  turtle: { type: 'GREEN SEA TURTLE', meta: 'CHELONIA MYDAS', detail: 'Resting near reef shelf · Protected' },
  dolphin: { type: 'COMMON DOLPHIN POD', meta: 'DELPHINUS DELPHIS', detail: 'Six signatures · Social escort behavior' },
  orca: { type: 'ORCA', meta: 'ORCINUS ORCA', detail: 'Transient adult · Acoustic contact stable' },
  squid: { type: 'GIANT SQUID', meta: 'ARCHITEUTHIS DUX', detail: 'Deep-trench contact · Low-light observation' },
  octopus: { type: 'GIANT PACIFIC OCTOPUS', meta: 'ENTEROCTOPUS DOFLEINI', detail: 'Sheltering inside wreckage' }
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

function addInstances(parent, geometry, material, transforms) {
  const mesh = new THREE.InstancedMesh(geometry, material, transforms.length);
  const dummy = new THREE.Object3D();
  transforms.forEach((transform, index) => {
    dummy.position.set(...transform.position);
    dummy.scale.set(...(transform.scale || [1, 1, 1]));
    dummy.rotation.set(...(transform.rotation || [0, 0, 0]));
    dummy.updateMatrix();
    mesh.setMatrixAt(index, dummy.matrix);
  });
  mesh.instanceMatrix.setUsage(THREE.StaticDrawUsage);
  mesh.castShadow = false;
  mesh.receiveShadow = true;
  mesh.frustumCulled = true;
  mesh.computeBoundingSphere();
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
  const bayDoor = addMesh(sub, new THREE.PlaneGeometry(2.1, .7), cyan, [1.1, 2.39, -.01], null, [-Math.PI / 2, 0, 0]);

  sub.userData = { thrusters, arms, dome, cyan, amber, bayDoor };
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

function createMarineLife(scene, clickable, quality = 1) {
  const creatures = [];
  const profiles = [
    ['GREAT WHITE SHARK', 'CARCHARODON CARCHARIAS', 'shark', 'open', 2.6, 1.02, 0],
    ['HAMMERHEAD SHARK', 'SPHYRNA MOKARRAN', 'hammerhead', 'shipwreck', 2.35, .86, 1],
    ['TIGER SHARK', 'GALEOCERDO CUVIER', 'shark', 'shipwreck', 2.2, .92, 2],
    ['WHALE SHARK', 'RHINCODON TYPUS', 'shark', 'reef', 3.7, .46, 3],
    ['BLUE WHALE', 'BALAENOPTERA MUSCULUS', 'whale', 'open', 5.1, .22, 4],
    ['ORCA', 'ORCINUS ORCA', 'whale', 'crystal', 2.75, .58, 5],
    ['DOLPHIN POD', 'DELPHINUS DELPHIS', 'dolphin', 'open', 1.35, 1.34, 6],
    ['GREEN SEA TURTLE', 'CHELONIA MYDAS', 'turtle', 'reef', 1.15, .34, 7],
    ['SEA LION', 'ZALOPHUS CALIFORNIANUS', 'seal', 'kelp', 1.35, .72, 8],
    ['HARBOR SEAL', 'PHOCA VITULINA', 'seal', 'kelp', 1.08, .64, 9],
    ['STINGRAY', 'DASYATIS PASTINACA', 'ray', 'reef', 1.45, .48, 10],
    ['GIANT PACIFIC OCTOPUS', 'ENTEROCTOPUS DOFLEINI', 'octopus', 'shipwreck', 1.25, .16, 11],
    ['GIANT SQUID', 'ARCHITEUTHIS DUX', 'squid', 'trench', 2.25, .24, 12]
  ];
  if (quality < .75) profiles.splice(8, 2);
  const palette = [0x284954, 0x415e64, 0x193f48, 0x426b68, 0x254354, 0x121f25, 0x587a7b, 0x4f665d, 0x3a4d4e, 0x23383b, 0x315e65, 0x5a3b34, 0x563d55];

  profiles.forEach(([type, meta, variant, regionId, scale, speed, index]) => {
    const region = REGIONS.find(item => item.id === regionId);
    const creature = new THREE.Group();
    const skin = makeMaterial(palette[index % palette.length], { roughness: .72, metalness: 0 });
    const pale = makeMaterial(0x78908b, { roughness: .8, metalness: 0 });
    let body;

    if (variant === 'ray') {
      const rayShape = new THREE.BufferGeometry();
      rayShape.setAttribute('position', new THREE.Float32BufferAttribute([-2.8, 0, 0, 0, .28, -3.2, 2.8, 0, 0, -2.8, 0, 0, 2.8, 0, 0, 0, .28, 3.2], 3));
      rayShape.computeVertexNormals();
      body = addMesh(creature, rayShape, skin, [0, 0, 0]);
      addMesh(creature, new THREE.CylinderGeometry(.035, .08, 3.8, 6), skin, [3.4, 0, 0], null, [0, 0, Math.PI / 2]);
    } else if (variant === 'turtle') {
      body = addMesh(creature, new THREE.SphereGeometry(1, 14, 10), skin, [0, 0, 0], [1.35, .42, 1]);
      addMesh(creature, new THREE.SphereGeometry(.4, 10, 8), pale, [-1.45, -.02, 0], [1, .7, .72]);
      [-1, 1].forEach(side => {
        addMesh(creature, new THREE.ConeGeometry(.32, 1.7, 3), skin, [-.1, -.08, side * 1.05], null, [Math.PI / 2, 0, side * .85]);
      });
    } else if (variant === 'octopus' || variant === 'squid') {
      body = addMesh(creature, new THREE.SphereGeometry(1, 14, 10), skin, [0, .3, 0], [variant === 'squid' ? 1.8 : 1.05, 1.15, 1]);
      for (let arm = 0; arm < 8; arm++) {
        const angle = arm / 8 * TAU;
        const tentacle = addMesh(creature, new THREE.CylinderGeometry(.035, .1, variant === 'squid' ? 3.4 : 2.1, 6), skin,
          [1.25 + Math.cos(angle) * .34, -.75, Math.sin(angle) * .5], null,
          [Math.sin(angle) * .35, 0, -1.1 + Math.cos(angle) * .2]);
        tentacle.userData.phase = arm / 8 * TAU;
      }
    } else {
      body = addMesh(creature, new THREE.SphereGeometry(1, 16, 10), skin, [0, 0, 0], [2.35, .55, .64]);
      addMesh(creature, new THREE.ConeGeometry(.58, 1.8, 3), skin, [2.75, 0, 0], null, [0, 0, -Math.PI / 2]);
      addMesh(creature, new THREE.ConeGeometry(.42, 1.1, 3), skin, [.15, .65, 0], null, [0, 0, -.12]);
      if (variant === 'hammerhead') addMesh(creature, new THREE.CapsuleGeometry(.18, 1.55, 4, 8), skin, [-2.32, 0, 0], null, [Math.PI / 2, 0, 0]);
      if (variant === 'dolphin') addMesh(creature, new THREE.CylinderGeometry(.08, .16, 1.2, 8), pale, [-2.35, 0, 0], null, [0, 0, Math.PI / 2]);
      if (variant === 'whale') addMesh(creature, new THREE.SphereGeometry(.9, 12, 8), pale, [-.45, -.42, 0], [1.8, .25, .62]);
    }

    body.userData = { kind: 'species', type, meta, detail: `${region.label} resident · Natural movement model`, species: variant };
    clickable.push(body);
    creature.scale.setScalar(scale);
    creature.position.set(region.center[0] + (seeded(index, 111) - .5) * 10, -1 + seeded(index, 112) * 10, region.center[1] + (seeded(index, 113) - .5) * 10);
    creature.userData = {
      type, variant, region, speed, phase: seeded(index, 114) * TAU,
      baseY: creature.position.y, radius: 5 + seeded(index, 115) * 7,
      tail: creature.children[1] || null
    };
    scene.add(creature);
    creatures.push(creature);

    if (variant === 'dolphin') {
      for (let pod = 1; pod < 5; pod++) {
        const member = creature.clone();
        member.scale.multiplyScalar(.72 + seeded(pod, 116) * .18);
        member.userData = { ...creature.userData, phase: creature.userData.phase + pod * .8, radius: creature.userData.radius + pod * 1.4, podOffset: pod };
        scene.add(member); creatures.push(member);
      }
    }
    if (variant === 'turtle') {
      for (let colony = 1; colony < 3; colony++) {
        const member = creature.clone();
        member.scale.multiplyScalar(.72 + colony * .1);
        member.userData = { ...creature.userData, phase: creature.userData.phase + colony * 2.1, radius: creature.userData.radius + colony * 2 };
        scene.add(member); creatures.push(member);
      }
    }
  });

  return { creatures };
}

function createWorld(scene, clickable, quality = 1) {
  const floorMaterial = makeMaterial(0x082b2d, { roughness: .95, metalness: 0 });
  const floorGeo = new THREE.PlaneGeometry(150, 150, quality < .75 ? 42 : 70, quality < .75 ? 42 : 70);
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
  const rockTransforms = rockMaterials.map(() => []);
  for (let i = 0; i < Math.round(54 * quality); i++) {
    const angle = seeded(i, 4) * TAU;
    const radius = 13 + seeded(i, 5) * 43;
    const scale = .5 + seeded(i, 7) * 4.8;
    rockTransforms[i % 3].push({
      position: [Math.cos(angle) * radius, -7 + scale * .22, Math.sin(angle) * radius],
      scale: [scale * (1 + seeded(i, 12)), scale * (.5 + seeded(i, 13)), scale],
      rotation: [seeded(i, 8) * 2, seeded(i, 9) * 2, seeded(i, 10) * 2]
    });
  }
  const rockGeometry = new THREE.DodecahedronGeometry(1, 0);
  rockTransforms.forEach((transforms, index) => addInstances(rocks, rockGeometry, rockMaterials[index], transforms));

  const coral = new THREE.Group();
  scene.add(coral);
  const coralMaterials = [
    makeMaterial(0x236f65, { roughness: .82 }), makeMaterial(0x6d506e, { roughness: .8 }),
    makeMaterial(0x8e5c3d, { roughness: .86 }), makeMaterial(0x254f58, { roughness: .85 })
  ];
  const coralTransforms = coralMaterials.map(() => []);
  for (let i = 0; i < Math.round(56 * quality); i++) {
    const angle = seeded(i, 31) * TAU;
    const radius = 14 + seeded(i, 32) * 38;
    const clusterX = Math.cos(angle) * radius;
    const clusterZ = Math.sin(angle) * radius;
    const branches = 2 + Math.floor(seeded(i, 33) * 5);
    for (let b = 0; b < branches; b++) {
      const height = .6 + seeded(i * 9 + b, 34) * 2.8;
      coralTransforms[i % coralMaterials.length].push({
        position: [clusterX + (b - branches / 2) * .24, -7.1 + height / 2, clusterZ + (seeded(b, i) - .5) * .7],
        scale: [.75 + height * .12, height, .75 + height * .12],
        rotation: [(seeded(b, i + 3) - .5) * .35, 0, (seeded(b, i + 5) - .5) * .35]
      });
    }
  }
  const coralGeometry = new THREE.CylinderGeometry(.06, .16, 1, 7);
  coralTransforms.forEach((transforms, index) => addInstances(coral, coralGeometry, coralMaterials[index], transforms));

  const grass = new THREE.Group();
  scene.add(grass);
  const grassMaterial = makeMaterial(0x155e58, { roughness: .9, side: THREE.DoubleSide });
  const grassTransforms = [];
  for (let i = 0; i < Math.round(180 * quality); i++) {
    const radius = 11 + seeded(i, 41) * 45;
    const angle = seeded(i, 42) * TAU;
    const height = .8 + seeded(i, 44) * 2.4;
    grassTransforms.push({
      position: [Math.cos(angle) * radius, -7 + height / 2, Math.sin(angle) * radius],
      scale: [.7 + seeded(i, 43) * 1.2, height, 1],
      rotation: [0, seeded(i, 45) * TAU, (seeded(i, 46) - .5) * .16]
    });
  }
  addInstances(grass, new THREE.PlaneGeometry(.12, 1, 1, 2), grassMaterial, grassTransforms);

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
  const ventTransforms = [];
  const ventLightTransforms = [];
  for (let i = 0; i < 18; i++) {
    const x = 18 + seeded(i, 51) * 17;
    const z = -25 + seeded(i, 52) * 18;
    const h = 2 + seeded(i, 53) * 7;
    ventTransforms.push({ position: [x, -7 + h / 2, z], scale: [.8 + h * .17, h, .8 + h * .17] });
    ventLightTransforms.push({ position: [x, -6.8 + h, z], scale: [.75 + h * .08, .75 + h * .08, .75 + h * .08] });
  }
  addInstances(scene, new THREE.ConeGeometry(.28, 1, 8), ventMat, ventTransforms);
  addInstances(scene, new THREE.SphereGeometry(.12, 8, 6), bioMat, ventLightTransforms);

  // Natural perimeter: cliffs, trenches, boulder fields and kelp hide the play-space boundary.
  const boundary = new THREE.Group();
  scene.add(boundary);
  const boundaryTransforms = rockMaterials.map(() => []);
  for (let i = 0; i < Math.round(34 * quality); i++) {
    const angle = i / Math.round(34 * quality) * TAU + seeded(i, 121) * .09;
    const radius = WORLD_RADIUS + 3 + seeded(i, 122) * 6;
    const height = 9 + seeded(i, 123) * 20;
    const width = 4 + seeded(i, 124) * 7;
    boundaryTransforms[i % rockMaterials.length].push({
      position: [Math.cos(angle) * radius, -7 + height * .42, Math.sin(angle) * radius],
      scale: [width, height, 5 + seeded(i, 125) * 6],
      rotation: [seeded(i, 126) * .45, -angle, seeded(i, 127) * .22]
    });
  }
  boundaryTransforms.forEach((transforms, index) => addInstances(boundary, rockGeometry, rockMaterials[index], transforms));
  const trenchMat = makeMaterial(0x020c12, { roughness: 1, metalness: 0 });
  for (let i = 0; i < 8; i++) {
    const angle = i / 8 * TAU + .25;
    addMesh(boundary, new THREE.TorusGeometry(WORLD_RADIUS - 1.5 - i * .45, .22 + i * .06, 5, 90), trenchMat,
      [0, -7.48 - i * .13, 0], null, [Math.PI / 2, 0, 0]);
  }

  // Kelp belts form a soft visual wall and a dense ecosystem around the western shelf.
  const kelp = new THREE.Group();
  scene.add(kelp);
  const kelpMaterial = makeMaterial(0x176240, { roughness: .88, side: THREE.DoubleSide });
  const kelpTransforms = [];
  for (let i = 0; i < Math.round(92 * quality); i++) {
    const angle = Math.PI * .68 + seeded(i, 131) * 1.05;
    const radius = 41 + seeded(i, 132) * 19;
    const height = 3 + seeded(i, 133) * 8;
    kelpTransforms.push({
      position: [Math.cos(angle) * radius, -7 + height / 2, Math.sin(angle) * radius],
      scale: [.7 + seeded(i, 134) * .9, height, 1],
      rotation: [0, angle + seeded(i, 135), (seeded(i, 136) - .5) * .16]
    });
  }
  addInstances(kelp, new THREE.PlaneGeometry(.5, 1, 1, 3), kelpMaterial, kelpTransforms);

  // Sand ripples and small seabed life are instanced to keep mobile draw calls low.
  const rippleMat = makeMaterial(0x17413d, { roughness: .96, metalness: 0 });
  const rippleTransforms = [];
  REGIONS.forEach((region, regionIndex) => {
    for (let ripple = 0; ripple < 5; ripple++) {
      const radius = 2.2 + ripple * .9;
      rippleTransforms.push({ position: [region.center[0] + 2, -7.24 + ripple * .012, region.center[1] - 1], scale: [radius * 1.5, radius, radius * .72], rotation: [Math.PI / 2, 0, regionIndex * .43] });
    }
  });
  addInstances(scene, new THREE.TorusGeometry(1, .009, 4, 40, Math.PI * 1.35), rippleMat, rippleTransforms);

  const scatter = (geometry, material, count, salt, scaleMin, scaleMax) => {
    const mesh = new THREE.InstancedMesh(geometry, material, Math.round(count * quality));
    const dummy = new THREE.Object3D();
    for (let i = 0; i < mesh.count; i++) {
      const angle = seeded(i, salt) * TAU;
      const radius = 8 + seeded(i, salt + 1) * 49;
      const scale = scaleMin + seeded(i, salt + 2) * (scaleMax - scaleMin);
      dummy.position.set(Math.cos(angle) * radius, -7 + scale * .18, Math.sin(angle) * radius);
      dummy.rotation.set(seeded(i, salt + 3) * TAU, seeded(i, salt + 4) * TAU, seeded(i, salt + 5) * TAU);
      dummy.scale.setScalar(scale); dummy.updateMatrix(); mesh.setMatrixAt(i, dummy.matrix);
    }
    mesh.castShadow = false; mesh.receiveShadow = true; mesh.frustumCulled = true; mesh.computeBoundingSphere(); scene.add(mesh); return mesh;
  };
  const shells = scatter(new THREE.TorusGeometry(.22, .055, 5, 10, Math.PI * 1.65), makeMaterial(0x9c8871, { roughness: .86 }), 44, 141, .35, 1.15);
  const urchins = scatter(new THREE.IcosahedronGeometry(.24, 1), makeMaterial(0x372d43, { roughness: .9 }), 36, 151, .45, 1.25);
  const anemones = scatter(new THREE.ConeGeometry(.16, .55, 7), makeMaterial(0x9b5270, { roughness: .78 }), 56, 161, .45, 1.35);
  const starfish = scatter(new THREE.TorusKnotGeometry(.15, .035, 22, 5, 2, 5), makeMaterial(0xd8784b, { roughness: .82 }), 28, 171, .45, 1.15);
  const crabs = scatter(new THREE.SphereGeometry(.2, 7, 5), makeMaterial(0x9f4f38, { roughness: .88 }), 24, 176, .5, 1.1);
  [shells, urchins, anemones, starfish, crabs].forEach((mesh, index) => { mesh.userData.decor = ['shells', 'urchins', 'anemones', 'starfish', 'crabs'][index]; });

  // Colorful reef shelves with crevices for small fish and resting turtles.
  const reefRegion = REGIONS.find(region => region.id === 'reef');
  const reefPalette = [0xf08a66, 0xa76fc4, 0xe1b55f, 0x35a891, 0x547ac1].map(color => makeMaterial(color, { roughness: .78 }));
  const reefTransforms = reefPalette.map(() => []);
  for (let i = 0; i < Math.round(38 * quality); i++) {
    const x = reefRegion.center[0] + (seeded(i, 181) - .5) * 18;
    const z = reefRegion.center[1] + (seeded(i, 182) - .5) * 17;
    const h = .5 + seeded(i, 183) * 3.2;
    reefTransforms[i % reefPalette.length].push({ position: [x, -7 + h / 2, z], scale: [.7 + h * .2, h, .7 + h * .2], rotation: [(seeded(i, 184) - .5) * .4, 0, (seeded(i, 185) - .5) * .4] });
  }
  const reefGeometry = new THREE.CylinderGeometry(.1, .3, 1, 7);
  reefTransforms.forEach((transforms, index) => addInstances(scene, reefGeometry, reefPalette[index], transforms));

  // Major landmark: a broken, rusted research ship colonized by coral and fish.
  const wreckRegion = REGIONS.find(region => region.id === 'shipwreck');
  const shipwreck = new THREE.Group();
  shipwreck.position.set(wreckRegion.center[0], -5.5, wreckRegion.center[1]);
  shipwreck.rotation.set(.08, -.48, -.12);
  scene.add(shipwreck);
  const rust = makeMaterial(0x57372d, { roughness: .92, metalness: .4 });
  const wreckDark = makeMaterial(0x080d0e, { roughness: 1, metalness: .25 });
  addMesh(shipwreck, new THREE.CylinderGeometry(2.5, 3.5, 16, 10, 1, true), rust, [0, 0, 0], [1, .72, 1], [0, 0, Math.PI / 2]);
  addMesh(shipwreck, new THREE.BoxGeometry(8, 2.2, 5), wreckDark, [1, .35, 0], null, [0, 0, 0]);
  addInstances(shipwreck, new THREE.TorusGeometry(2.7, .12, 7, 15, Math.PI), rust,
    Array.from({ length: 7 }, (_, rib) => ({ position: [-5 + rib * 1.7, .2, 0], rotation: [0, Math.PI / 2, Math.PI / 2] })));
  addMesh(shipwreck, new THREE.BoxGeometry(.28, 10, .28), rust, [-1.8, 5.1, 0], null, [0, 0, .12]);
  addMesh(shipwreck, new THREE.BoxGeometry(7, .18, .18), rust, [1.1, 7.4, 0], null, [0, 0, -.14]);
  addMesh(shipwreck, new THREE.BoxGeometry(4.2, .32, 2.2), rust, [7.4, -.4, 0], null, [.2, .5, .4]);
  const shipLOD = new THREE.LOD();
  shipLOD.position.copy(shipwreck.position); shipLOD.rotation.copy(shipwreck.rotation);
  shipwreck.position.set(0, 0, 0); shipwreck.rotation.set(0, 0, 0);
  const shipProxy = new THREE.Group();
  addMesh(shipProxy, new THREE.BoxGeometry(17, 3.6, 5.5), rust, [0, 0, 0]);
  shipLOD.addLevel(shipwreck, 0); shipLOD.addLevel(shipProxy, 38); scene.add(shipLOD);

  // Second landmark: a crashed aircraft half-buried in sand and reef growth.
  const planeRegion = REGIONS.find(region => region.id === 'crystal');
  const aircraft = new THREE.Group();
  aircraft.position.set(planeRegion.center[0] - 2, -6.25, planeRegion.center[1] - 2);
  aircraft.rotation.set(.08, .65, -.18);
  scene.add(aircraft);
  const agedMetal = makeMaterial(0x53605d, { roughness: .77, metalness: .68 });
  const windowMat = makeMaterial(0x06171c, { roughness: .2, metalness: .1, emissive: 0x08262b, emissiveIntensity: .45 });
  addMesh(aircraft, new THREE.CapsuleGeometry(1.05, 9.5, 7, 16), agedMetal, [0, 0, 0], null, [0, 0, Math.PI / 2]);
  addMesh(aircraft, new THREE.BoxGeometry(4.8, .18, 14), agedMetal, [0, -.15, 0], null, [0, .08, 0]);
  addMesh(aircraft, new THREE.BoxGeometry(2.3, 3.1, .22), agedMetal, [4.5, 1.15, 0], null, [0, 0, -.12]);
  addInstances(aircraft, new THREE.SphereGeometry(.2, 8, 6), windowMat,
    Array.from({ length: 8 }, (_, window) => ({ position: [-3.4 + window * .85, .5, -1.02] })));
  addMesh(aircraft, new THREE.BoxGeometry(2.3, 1.7, 2.2), agedMetal, [-5.7, -.22, .5], null, [.4, .3, .5]);
  const aircraftLOD = new THREE.LOD();
  aircraftLOD.position.copy(aircraft.position); aircraftLOD.rotation.copy(aircraft.rotation);
  aircraft.position.set(0, 0, 0); aircraft.rotation.set(0, 0, 0);
  const aircraftProxy = new THREE.Group();
  addMesh(aircraftProxy, new THREE.BoxGeometry(12, 2.2, 12), agedMetal, [0, 0, 0], [1, .35, 1]);
  aircraftLOD.addLevel(aircraft, 0); aircraftLOD.addLevel(aircraftProxy, 38); scene.add(aircraftLOD);

  // Crystal and bioluminescent zones pulse independently of the vehicle lights.
  const crystalMat = makeMaterial(0x8d7fe6, { emissive: 0x4d3eb9, emissiveIntensity: 1.65, roughness: .26, metalness: .2 });
  const crystalTransforms = [[], []];
  for (let i = 0; i < Math.round(26 * quality); i++) {
    const region = i % 2 ? planeRegion : REGIONS.find(item => item.id === 'bio');
    const h = .8 + seeded(i, 191) * 4.6;
    crystalTransforms[i % 2].push({
      position: [region.center[0] + (seeded(i, 192) - .5) * 15, -7 + h / 2, region.center[1] + (seeded(i, 193) - .5) * 15],
      scale: [.8 + h * .18, h, .8 + h * .18],
      rotation: [(seeded(i, 194) - .5) * .32, seeded(i, 195) * TAU, (seeded(i, 196) - .5) * .32]
    });
  }
  addInstances(scene, new THREE.ConeGeometry(.2, 1, 5), bioMat, crystalTransforms[0]);
  addInstances(scene, new THREE.ConeGeometry(.2, 1, 5), crystalMat, crystalTransforms[1]);

  return { grass, kelp, coralMaterials, bioMat, crystalMat, shipwreck, aircraft };
}

function createFish(scene, clickable, quality = 1) {
  const group = new THREE.Group();
  scene.add(group);
  const count = Math.round(86 * quality);
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

function createParticles(scene, quality = 1) {
  const count = Math.round(1500 * quality);
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

  const bubbleCount = Math.round(130 * quality);
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
  const glass = makeMaterial(0x4e7370, { transparent: true, opacity: .58, roughness: .18, metalness: .08 });
  POLLUTION.forEach((item, i) => {
    const region = REGIONS[item.regionIndex];
    const angle = item.itemIndex * Math.PI + seeded(i, 201) * .8;
    const radius = 5 + seeded(i, 202) * 7;
    const position = [region.center[0] + Math.cos(angle) * radius, -6.35 + seeded(i, 203) * .65, region.center[1] + Math.sin(angle) * radius];
    let mesh;
    if (/NET/.test(item.type)) mesh = addMesh(group, new THREE.TorusKnotGeometry(.9, .045, 80, 7), warning, position, [1.8, 1.1, 1.4], [1, .2, .3]);
    else if (/BOTTLE/.test(item.type)) mesh = addMesh(group, new THREE.CapsuleGeometry(.22, 1.15, 4, 8), /GLASS/.test(item.type) ? glass : warning, position, null, [0, .4, 1.2]);
    else if (/TIRE/.test(item.type)) mesh = addMesh(group, new THREE.TorusGeometry(.78, .26, 10, 24), dark, position, null, [1.2, 0, .3]);
    else if (/BARREL|CANISTER/.test(item.type)) mesh = addMesh(group, new THREE.CylinderGeometry(.48, .48, 1.7, 12), warning, position, null, [.2, .2, -.6]);
    else if (/CONTAINER|CRATE/.test(item.type)) mesh = addMesh(group, new THREE.BoxGeometry(/CONTAINER/.test(item.type) ? 3.2 : 1.25, /CONTAINER/.test(item.type) ? 1.4 : 1.15, /CONTAINER/.test(item.type) ? 1.5 : 1.2), dark, position, null, [seeded(i, 204), seeded(i, 205), seeded(i, 206)]);
    else if (/BAG/.test(item.type)) mesh = addMesh(group, new THREE.PlaneGeometry(1.5, 1.7, 3, 3), warning, position, null, [1.1, .3, .5]);
    else mesh = addMesh(group, new THREE.IcosahedronGeometry(.8, 1), warning, position, [2.7, .28, 1.8]);
    mesh.userData = { kind: 'pollution', index: i, collected: false, collecting: false, ...item };
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
  const collectionParticles = [];
  for (let i = 0; i < 18; i++) {
    const mote = addMesh(group, new THREE.SphereGeometry(.025 + seeded(i, 211) * .045, 5, 4), warning, [0, -20, 0]);
    mote.visible = false;
    mote.userData.velocity = new THREE.Vector3();
    collectionParticles.push(mote);
  }
  return { group, waste, drones, collectionParticles };
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

function playCollectionSound() {
  const AudioContext = window.AudioContext || window.webkitAudioContext;
  if (!AudioContext) return;
  const context = new AudioContext();
  const gain = context.createGain();
  const tone = context.createOscillator();
  const chime = context.createOscillator();
  tone.type = 'sine'; chime.type = 'triangle';
  tone.frequency.setValueAtTime(180, context.currentTime);
  tone.frequency.exponentialRampToValueAtTime(640, context.currentTime + .38);
  chime.frequency.setValueAtTime(920, context.currentTime + .22);
  chime.frequency.exponentialRampToValueAtTime(1320, context.currentTime + .72);
  gain.gain.setValueAtTime(.0001, context.currentTime);
  gain.gain.exponentialRampToValueAtTime(.12, context.currentTime + .03);
  gain.gain.exponentialRampToValueAtTime(.0001, context.currentTime + .82);
  tone.connect(gain); chime.connect(gain); gain.connect(context.destination);
  tone.start(); chime.start(context.currentTime + .2); tone.stop(context.currentTime + .5); chime.stop(context.currentTime + .84);
  window.setTimeout(() => context.close(), 1000);
}

function AbyssScene({ mode, cleanupActive, freeFlight, onStats, onNavigation, onTarget, onRegion, onNotification, onReady }) {
  const mountRef = useRef(null);
  const propsRef = useRef({ mode, cleanupActive, freeFlight, onStats, onNavigation, onTarget, onRegion, onNotification, onReady });
  const apiRef = useRef(null);
  propsRef.current = { mode, cleanupActive, freeFlight, onStats, onNavigation, onTarget, onRegion, onNotification, onReady };

  useEffect(() => {
    const mount = mountRef.current;
    const coarsePointer = window.matchMedia('(pointer: coarse)').matches;
    const reducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const lowPower = coarsePointer || (navigator.hardwareConcurrency || 8) <= 4 || reducedMotion;
    const quality = lowPower ? .62 : .98;
    const maxPixelRatio = lowPower ? 1 : 1.65;
    let adaptivePixelRatio = Math.min(window.devicePixelRatio, maxPixelRatio);
    let qualitySampleStarted = 0;
    let qualitySampleFrames = 0;
    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x031b22);
    scene.fog = new THREE.FogExp2(0x052a31, .024);

    const camera = new THREE.PerspectiveCamera(52, mount.clientWidth / mount.clientHeight, .08, 180);
    const renderer = new THREE.WebGLRenderer({ antialias: !lowPower, alpha: false, powerPreference: 'high-performance' });
    renderer.setPixelRatio(adaptivePixelRatio);
    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    renderer.toneMapping = THREE.ACESFilmicToneMapping;
    renderer.toneMappingExposure = 1.12;
    renderer.shadowMap.enabled = !lowPower;
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
    const regionBackgroundColors = REGIONS.map(region => new THREE.Color(region.bg));
    const regionFogColors = REGIONS.map(region => new THREE.Color(region.fog));
    const regionAccentColors = REGIONS.map(region => new THREE.Color(region.accent));
    const modeBackgroundColors = { night: new THREE.Color(0x01070c), sonar: new THREE.Color(0x001821), ai: new THREE.Color(0x031524) };
    const modeFogColors = { night: new THREE.Color(0x021015), sonar: new THREE.Color(0x00222b), ai: new THREE.Color(0x07182a) };

    // Broad shafts of light become volumetric silhouettes in the water column.
    const rayMaterial = new THREE.MeshBasicMaterial({ color: 0x8bfce9, transparent: true, opacity: .035, depthWrite: false, blending: THREE.AdditiveBlending, side: THREE.DoubleSide });
    addInstances(scene, new THREE.ConeGeometry(1, 1, 12, 1, true), rayMaterial,
      Array.from({ length: lowPower ? 4 : 7 }, (_, i) => ({
        position: [-30 + i * 10 + seeded(i, 2) * 4, 13, -24 + seeded(i, 3) * 22],
        scale: [3.5 + seeded(i) * 4, 42, 3.5 + seeded(i) * 4],
        rotation: [0, 0, (seeded(i, 4) - .5) * .16]
      })));

    const sub = createSubmarine(scene, clickable);
    const world = createWorld(scene, clickable, quality);
    const whale = createWhale(scene, clickable);
    const manta = createManta(scene, clickable);
    const fauna = createMarineLife(scene, clickable, quality);
    const fish = createFish(scene, clickable, quality);
    const particles = createParticles(scene, quality);
    const pollution = createPollution(scene, clickable);
    const sonar = createSonar(scene);

    const pointer = new THREE.Vector2(2, 2);
    const raycaster = new THREE.Raycaster();
    const target = new THREE.Vector3(0, .8, 0);
    const cameraState = { yaw: .7, pitch: .17, radius: 25, targetYaw: .7, targetPitch: .17, targetRadius: 25, targetPoint: target.clone(), dragging: false, moved: false, x: 0, y: 0, pinch: 0 };
    let lastStatsUpdate = 0;
    let lastNavigationUpdate = 0;
    let hovered = null;
    let activeRegionIndex = 0;
    let collection = null;
    let collectionBurst = 0;
    const collected = new Set();
    const pressedKeys = new Set();
    const navigation = { x: 0, y: 0, z: 0, yaw: 0, velocity: 0, verticalVelocity: 0 };
    const clock = new THREE.Clock();

    const getRegionIndex = (x, z) => {
      let nearest = 0;
      let bestDistance = Infinity;
      REGIONS.forEach((region, index) => {
        const distance = Math.hypot(x - region.center[0], z - region.center[1]);
        if (distance < bestDistance) { bestDistance = distance; nearest = index; }
      });
      return nearest;
    };

    const nearestPollution = (range = 12) => pollution.waste
      .filter(mesh => mesh.visible && !mesh.userData.collected && !mesh.userData.collecting && mesh.userData.region === REGIONS[activeRegionIndex].id)
      .map(mesh => ({ mesh, distance: mesh.position.distanceTo(sub.position) }))
      .filter(item => item.distance <= range)
      .sort((a, b) => a.distance - b.distance)[0]?.mesh || null;

    const startCollection = mesh => {
      if (!mesh || collection || mesh.userData.collected || mesh.userData.collecting) return false;
      mesh.userData.collecting = true;
      collectionBurst = 0;
      collection = { mesh, started: clock.elapsedTime, from: mesh.position.clone(), scale: mesh.scale.clone() };
      propsRef.current.onTarget?.({ category: 'pollution', collecting: true, ...mesh.userData });
      playCollectionSound();
      return true;
    };

    const setControl = (key, pressed) => {
      if (pressed) pressedKeys.add(key);
      else pressedKeys.delete(key);
    };

    const setView = view => {
      const values = CAMERA_POSES[view] || CAMERA_POSES.free;
      cameraState.targetYaw = values[0]; cameraState.targetPitch = values[1]; cameraState.targetRadius = values[2];
      cameraState.targetPoint.set(values[3], values[4], values[5]);
    };
    const setStoryProgress = progress => {
      if (propsRef.current.freeFlight) return;
      const bounded = clamp(progress, 0, STORY_CHAPTERS.length - 1);
      const index = Math.floor(bounded);
      const nextIndex = Math.min(STORY_CHAPTERS.length - 1, index + 1);
      const amount = bounded - index;
      const smooth = amount * amount * (3 - 2 * amount);
      const from = CAMERA_POSES[STORY_CHAPTERS[index].pose];
      const to = CAMERA_POSES[STORY_CHAPTERS[nextIndex].pose];
      cameraState.targetYaw = lerp(from[0], to[0], smooth);
      cameraState.targetPitch = lerp(from[1], to[1], smooth);
      cameraState.targetRadius = lerp(from[2], to[2], smooth);
      cameraState.targetPoint.set(lerp(from[3], to[3], smooth), lerp(from[4], to[4], smooth), lerp(from[5], to[5], smooth));
    };
    apiRef.current = { setView, setStoryProgress, setControl, collectNearest: () => startCollection(nearestPollution()) };
    propsRef.current.onReady?.(apiRef.current);
    propsRef.current.onRegion?.(REGIONS[0]);

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
        if (hit?.userData.kind === 'pollution') startCollection(hit);
        if (hit?.userData.kind === 'species') propsRef.current.onTarget?.({ category: 'species', ...hit.userData });
        if (hit?.userData.kind === 'sub') propsRef.current.onTarget?.({ category: 'sub', ...hit.userData });
      }
    };
    const onWheel = event => {
      if (propsRef.current.freeFlight && (event.altKey || event.ctrlKey || event.metaKey)) {
        event.preventDefault();
        cameraState.targetRadius = clamp(cameraState.targetRadius + event.deltaY * .012, 4.6, 47);
      }
    };
    const onTouchStart = event => {
      if (event.touches.length === 2) {
        cameraState.dragging = false;
        cameraState.pinch = Math.hypot(event.touches[0].clientX - event.touches[1].clientX, event.touches[0].clientY - event.touches[1].clientY);
      }
    };
    const onTouchMove = event => {
      if (event.touches.length === 2) {
        if (propsRef.current.freeFlight) event.preventDefault();
        const distance = Math.hypot(event.touches[0].clientX - event.touches[1].clientX, event.touches[0].clientY - event.touches[1].clientY);
        cameraState.targetRadius = clamp(cameraState.targetRadius - (distance - cameraState.pinch) * .025, 4.6, 47);
        cameraState.pinch = distance;
      }
    };
    const onTouchEnd = () => { cameraState.pinch = 0; };
    renderer.domElement.addEventListener('pointerdown', onPointerDown);
    renderer.domElement.addEventListener('pointermove', onPointerMove);
    renderer.domElement.addEventListener('pointerup', onPointerUp);
    renderer.domElement.addEventListener('wheel', onWheel, { passive: false });
    renderer.domElement.addEventListener('touchstart', onTouchStart, { passive: true });
    renderer.domElement.addEventListener('touchmove', onTouchMove, { passive: false });
    renderer.domElement.addEventListener('touchend', onTouchEnd, { passive: true });

    const onKeyDown = event => {
      const key = event.key.toLowerCase();
      if (!propsRef.current.freeFlight) return;
      if (key === 'e') {
        event.preventDefault();
        startCollection(nearestPollution());
        return;
      }
      if (!['w', 'a', 's', 'd', ' ', 'shift'].includes(key)) return;
      event.preventDefault();
      pressedKeys.add(key);
    };
    const onKeyUp = event => pressedKeys.delete(event.key.toLowerCase());
    const clearKeys = () => pressedKeys.clear();
    window.addEventListener('keydown', onKeyDown);
    window.addEventListener('keyup', onKeyUp);
    window.addEventListener('blur', clearKeys);

    const dummy = new THREE.Object3D();
    let frame;
    let frameCount = 0;
    const animate = () => {
      frame = requestAnimationFrame(animate);
      frameCount += 1;
      const delta = Math.min(clock.getDelta(), .04);
      const t = clock.elapsedTime;
      qualitySampleFrames += 1;
      if (!qualitySampleStarted) qualitySampleStarted = t;
      if (t - qualitySampleStarted > 3.2) {
        const measuredFps = qualitySampleFrames / (t - qualitySampleStarted);
        const previousRatio = adaptivePixelRatio;
        if (measuredFps < 42) adaptivePixelRatio = Math.max(.72, adaptivePixelRatio - .16);
        else if (measuredFps > 57) adaptivePixelRatio = Math.min(Math.min(window.devicePixelRatio, maxPixelRatio), adaptivePixelRatio + .08);
        if (Math.abs(previousRatio - adaptivePixelRatio) > .02) renderer.setPixelRatio(adaptivePixelRatio);
        renderer.shadowMap.enabled = !lowPower && measuredFps >= 44;
        particles.points.material.opacity = measuredFps < 38 ? .27 : .42;
        particles.bubbles.material.opacity = measuredFps < 38 ? .22 : .34;
        qualitySampleStarted = t;
        qualitySampleFrames = 0;
      }
      const currentMode = propsRef.current.mode;
      const isCleanup = propsRef.current.cleanupActive;
      const isFreeFlight = propsRef.current.freeFlight;

      if (isFreeFlight) {
        const throttle = (pressedKeys.has('w') ? 1 : 0) - (pressedKeys.has('s') ? 1 : 0);
        const steering = (pressedKeys.has('a') ? 1 : 0) - (pressedKeys.has('d') ? 1 : 0);
        const vertical = (pressedKeys.has(' ') ? 1 : 0) - (pressedKeys.has('shift') ? 1 : 0);
        navigation.yaw += steering * delta * 1.08;
        navigation.velocity = lerp(navigation.velocity, throttle * 5.4, .055);
        navigation.verticalVelocity = lerp(navigation.verticalVelocity, vertical * 2.8, .06);
        const nextX = navigation.x - Math.cos(navigation.yaw) * navigation.velocity * delta;
        const nextZ = navigation.z + Math.sin(navigation.yaw) * navigation.velocity * delta;
        const edgeDistance = Math.hypot(nextX, nextZ);
        if (edgeDistance > WORLD_RADIUS) {
          const redirect = Math.atan2(-navigation.z, navigation.x);
          const turn = Math.atan2(Math.sin(redirect - navigation.yaw), Math.cos(redirect - navigation.yaw));
          navigation.yaw += turn * delta * 1.65;
          navigation.velocity *= .82;
          navigation.x = nextX / edgeDistance * WORLD_RADIUS;
          navigation.z = nextZ / edgeDistance * WORLD_RADIUS;
        } else {
          const edgeDamping = 1 - clamp((edgeDistance - (WORLD_RADIUS - 8)) / 8) * .55;
          navigation.x = navigation.x + (nextX - navigation.x) * edgeDamping;
          navigation.z = navigation.z + (nextZ - navigation.z) * edgeDamping;
        }
        navigation.y = clamp(navigation.y + navigation.verticalVelocity * delta, -3.8, 8.5);
        cameraState.targetPoint.set(navigation.x, navigation.y + .8, navigation.z);
      } else {
        navigation.velocity = lerp(navigation.velocity, 0, .08);
        navigation.verticalVelocity = lerp(navigation.verticalVelocity, 0, .08);
      }

      const nextRegionIndex = getRegionIndex(navigation.x, navigation.z);
      if (nextRegionIndex !== activeRegionIndex) {
        activeRegionIndex = nextRegionIndex;
        propsRef.current.onRegion?.(REGIONS[activeRegionIndex]);
      }

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

      sub.position.x = navigation.x;
      sub.position.y = 1.2 + navigation.y + Math.sin(t * .42) * .09;
      sub.position.z = navigation.z;
      sub.rotation.z = Math.sin(t * .3) * .009;
      sub.rotation.y = navigation.yaw + Math.sin(t * .2) * .012;
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

      fauna.creatures.forEach((creature, index) => {
        const data = creature.userData;
        const regionDistance = Math.hypot(navigation.x - data.region.center[0], navigation.z - data.region.center[1]);
        creature.visible = isFreeFlight ? regionDistance < 39 : ['open', 'reef'].includes(data.region.id);
        if (!creature.visible) return;
        const angle = t * data.speed * .11 + data.phase;
        const wobble = Math.sin(t * data.speed * .27 + data.phase * 1.7) * 2.2;
        const region = data.region;
        const targetX = region.center[0] + Math.cos(angle) * data.radius + Math.sin(angle * 2.3) * 2.1;
        const targetZ = region.center[1] + Math.sin(angle * .91) * data.radius + wobble;
        const previousX = creature.position.x;
        const previousZ = creature.position.z;
        creature.position.x = lerp(creature.position.x, targetX, .018 + data.speed * .006);
        creature.position.z = lerp(creature.position.z, targetZ, .018 + data.speed * .006);
        creature.position.y = data.baseY + Math.sin(t * data.speed * .38 + data.phase) * (data.variant === 'octopus' ? .12 : .72);
        const dx = creature.position.x - previousX;
        const dz = creature.position.z - previousZ;
        if (Math.abs(dx) + Math.abs(dz) > .0001) creature.rotation.y = Math.atan2(dz, -dx);
        creature.rotation.z = Math.sin(t * data.speed + data.phase) * (data.variant === 'ray' ? .13 : .035);
        const subDistance = creature.position.distanceTo(sub.position);
        if (subDistance < (data.variant === 'turtle' ? 4 : 6)) {
          const escape = creature.position.clone().sub(sub.position).normalize().multiplyScalar((6 - subDistance) * .035);
          creature.position.add(escape);
        }
        if (data.variant === 'octopus' || data.variant === 'squid') {
          creature.children.slice(1).forEach((tentacle, arm) => { tentacle.rotation.z += Math.sin(t * 1.1 + arm) * .0025; });
        }
      });

      if (frameCount % (lowPower ? 3 : 2) === 0) {
        for (let i = 0; i < fish.count; i++) {
          const speed = .42 + seeded(i, 82) * .58;
          const loop = ((t * speed + seeded(i, 83) * 44) % 34) - 17;
          const school = i % 4;
          const schoolRegion = [REGIONS[0], REGIONS[1], REGIONS[4], REGIONS[6]][school];
          let x = schoolRegion.center[0] + (school % 2 ? -loop * .72 : loop * .72);
          let z = schoolRegion.center[1] + Math.sin(t * .22 + i * .7) * (2.5 + seeded(i, 84) * 3.8);
          const y = -1 + seeded(i, 85) * 10 + Math.sin(t * .8 + i) * .45;
          const direction = school === 1 ? -1 : 1;
          const subDistance = Math.hypot(x - sub.position.x, z - sub.position.z);
          if (subDistance < 5) {
            const scatter = (5 - subDistance) * .75;
            x += (x - sub.position.x) / Math.max(subDistance, .2) * scatter;
            z += (z - sub.position.z) / Math.max(subDistance, .2) * scatter;
          }
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
      }

      world.bioMat.emissiveIntensity = 1.6 + Math.sin(t * 1.4) * .7;
      world.crystalMat.emissiveIntensity = 1.25 + Math.sin(t * .72) * .48;
      particles.points.rotation.y = t * .0025;
      particles.points.position.x = Math.sin(t * .035) * 2.8;
      particles.bubbles.position.y = Math.sin(t * .18) * .8;

      const scanOn = currentMode === 'sonar' || currentMode === 'ai' || isCleanup;
      const activeRegion = REGIONS[activeRegionIndex];
      sonar.visible = scanOn;
      sonar.position.copy(sub.position);
      sonar.children.forEach(ring => {
        const life = (t * .22 + ring.userData.offset) % 1;
        ring.scale.setScalar(1 + life * 28);
        ring.material.opacity = (1 - life) * .28;
      });
      pollution.waste.forEach((mesh, i) => {
        const meshRegion = REGIONS[mesh.userData.regionIndex];
        const regionDistance = Math.hypot(navigation.x - meshRegion.center[0], navigation.z - meshRegion.center[1]);
        if (!mesh.userData.collecting && !mesh.userData.collected) mesh.visible = !isFreeFlight || regionDistance < 39;
        const highlight = scanOn && mesh.visible && !mesh.userData.collected && mesh.userData.region === activeRegion.id && mesh.position.distanceTo(sub.position) < 28;
        mesh.userData.detected = highlight;
        if (mesh.material.emissive) mesh.material.emissiveIntensity = highlight ? 2.6 + Math.sin(t * 3 + i) * .7 : .18;
      });

      if (collection) {
        const local = clamp((t - collection.started) / 1.65);
        const eased = local * local * (3 - 2 * local);
        const armReach = Math.sin(clamp(local * 1.18) * Math.PI);
        const destination = sub.localToWorld(new THREE.Vector3(-1.1, -.55, 0));
        collection.mesh.position.lerpVectors(collection.from, destination, eased);
        collection.mesh.rotation.x += delta * 2.8;
        collection.mesh.rotation.y += delta * 1.7;
        const shrink = 1 - clamp((local - .68) / .3) * .94;
        collection.mesh.scale.copy(collection.scale).multiplyScalar(shrink);
        sub.userData.arms.rotation.z = -.5 * armReach + Math.sin(t * 1.4) * .025;
        sub.userData.arms.scale.set(1 + armReach * .42, 1 + armReach * .42, 1 + armReach * .42);
        sub.userData.bayDoor.rotation.x = -Math.PI / 2 + armReach * .82;

        if (local > .66 && !collectionBurst) {
          collectionBurst = t;
          pollution.collectionParticles.forEach((mote, index) => {
            mote.visible = true;
            mote.position.copy(destination);
            mote.userData.velocity.set((seeded(index, 221) - .5) * 2.4, .3 + seeded(index, 222) * 1.8, (seeded(index, 223) - .5) * 2.4);
          });
        }

        if (local >= 1) {
          const item = collection.mesh.userData;
          item.collecting = false; item.collected = true;
          collection.mesh.visible = false;
          collected.add(item.index);
          propsRef.current.onNotification?.(`${item.label} Collected`);
          propsRef.current.onTarget?.(null);
          collection = null;
          collectionBurst = t;
        }
      } else {
        sub.userData.arms.scale.lerp(new THREE.Vector3(1, 1, 1), .08);
        sub.userData.bayDoor.rotation.x = lerp(sub.userData.bayDoor.rotation.x, -Math.PI / 2, .08);
      }

      pollution.collectionParticles.forEach(mote => {
        if (!mote.visible) return;
        mote.position.addScaledVector(mote.userData.velocity, delta);
        mote.userData.velocity.y -= delta * .55;
        if (t - collectionBurst > .72) mote.visible = false;
      });

      pollution.drones.forEach((drone, i) => {
        drone.visible = isCleanup;
        if (!drone.visible) return;
        const angle = t * (.42 + i * .05) + i * TAU / 3;
        drone.position.set(
          sub.position.x + Math.cos(angle) * (4 + i * .6),
          sub.position.y + 1.5 + Math.sin(t * .9 + i) * .45,
          sub.position.z + Math.sin(angle) * (4 + i * .6)
        );
        drone.lookAt(sub.position);
      });

      if (t - lastStatsUpdate > .25) {
        lastStatsUpdate = t;
        const collectedItems = POLLUTION.filter((item, index) => collected.has(index));
        const removed = collectedItems.reduce((total, item) => total + item.weight, 0);
        const plastic = collectedItems.reduce((total, item) => total + item.plastic, 0);
        const progress = collected.size / POLLUTION.length;
        const regionRemaining = pollution.waste.filter(mesh => mesh.userData.region === activeRegion.id && !mesh.userData.collected).length;
        propsRef.current.onStats?.({
          progress: Math.round(progress * 100),
          health: Math.round(62 + progress * 36),
          removed: removed.toFixed(1),
          plastic: plastic.toFixed(1),
          collected: collected.size,
          remaining: POLLUTION.length - collected.size,
          regionRemaining,
          protected: 12 + collected.size * 2,
          clarity: Math.round(71 + progress * 27)
        });
      }

      if (t - lastNavigationUpdate > .2) {
        lastNavigationUpdate = t;
        const heading = ((navigation.yaw * 180 / Math.PI + 270) % 360 + 360) % 360;
        propsRef.current.onNavigation?.({
          speed: Math.abs(navigation.velocity * 1.28).toFixed(1),
          heading: String(Math.round(heading)).padStart(3, '0'),
          depth: Math.round(7842 - navigation.y * 10)
        });
      }

      const targetBg = modeBackgroundColors[currentMode] || regionBackgroundColors[activeRegionIndex];
      const targetFog = modeFogColors[currentMode] || regionFogColors[activeRegionIndex];
      scene.background.lerp(targetBg, .03);
      scene.fog.color.lerp(targetFog, .03);
      scene.fog.density = lerp(scene.fog.density, activeRegion.density + (currentMode === 'night' ? .014 : 0), .025);
      renderer.toneMappingExposure = lerp(renderer.toneMappingExposure, currentMode === 'night' ? .62 : currentMode === 'sonar' ? .78 : activeRegion.id === 'trench' ? .83 : 1.12, .03);
      hemi.color.lerp(regionAccentColors[activeRegionIndex], .018);
      hemi.intensity = lerp(hemi.intensity, currentMode === 'night' ? .38 : 1.38, .03);

      renderer.render(scene, camera);
    };
    animate();

    const resize = () => {
      const width = mount.clientWidth;
      const height = mount.clientHeight;
      camera.aspect = width / height; camera.updateProjectionMatrix();
      adaptivePixelRatio = Math.min(adaptivePixelRatio, window.devicePixelRatio, lowPower || width < 700 ? 1 : maxPixelRatio);
      renderer.setSize(width, height); renderer.setPixelRatio(adaptivePixelRatio);
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
      renderer.domElement.removeEventListener('touchend', onTouchEnd);
      window.removeEventListener('keydown', onKeyDown);
      window.removeEventListener('keyup', onKeyUp);
      window.removeEventListener('blur', clearKeys);
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
  const weightLabel = typeof target.weight === 'number' ? `${target.weight.toFixed(1)} KG` : target.weight;
  return html`
    <aside className=${`target-card target-card--${target.category}`}>
      <div className="target-card__line"><span>${target.category === 'pollution' ? 'AI OBJECT LOCK' : target.category === 'species' ? 'BIOLOGICAL CONTACT' : 'SYSTEM INSPECTION'}</span><button onClick=${onClose} aria-label="Close target details">×</button></div>
      <h2>${target.type}</h2>
      <p className="target-card__meta">${target.meta || target.method}</p>
      <p>${target.collecting ? 'MANIPULATOR LOCKED · STORAGE BAY OPENING' : target.detail || `${target.risk} RISK · ${weightLabel}`}</p>
      ${target.category === 'pollution' && html`<div className=${target.collecting ? 'risk-line is-collecting' : 'risk-line'}><span>${target.collecting ? 'AUTO RETRIEVAL' : `RISK ${target.risk}`}</span><b>${target.collecting ? 'IN PROGRESS' : weightLabel}</b></div>`}
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

function StoryExperience({ activeChapter, onChapterSelect, onSkip }) {
  return html`
    <div className="story-scroll" aria-label="Guided submarine expedition">
      ${STORY_CHAPTERS.map((chapter, index) => html`
        <section id=${chapter.id} key=${chapter.id} className=${`story-chapter story-chapter--${chapter.align} ${activeChapter === index ? 'is-active' : ''}`} aria-label=${chapter.title}>
          <div className="story-chapter__copy">
            <div className="story-chapter__index"><span>${chapter.number}</span><i></i><b>${String(STORY_CHAPTERS.length).padStart(2, '0')}</b></div>
            <p className="story-chapter__kicker">${chapter.kicker}</p>
            <h1>${chapter.title}</h1>
            <p className="story-chapter__body">${chapter.body}</p>
            <dl className="story-facts">
              ${chapter.facts.map(([label, value]) => html`<div key=${label}><dt>${label}</dt><dd>${value}</dd></div>`)}
            </dl>
            ${chapter.freeFlight && html`
              <div className="pilot-keys" aria-label="Submarine movement controls">
                <span></span><kbd>W</kbd><span></span><kbd>A</kbd><kbd>S</kbd><kbd>D</kbd>
              </div>
            `}
          </div>
        </section>
      `)}
      <nav className="chapter-dots" aria-label="Expedition chapters">
        ${STORY_CHAPTERS.map((chapter, index) => html`
          <button key=${chapter.id} className=${activeChapter === index ? 'active' : ''} onClick=${() => onChapterSelect(index)} aria-label=${`Go to chapter ${index + 1}: ${chapter.title}`} aria-current=${activeChapter === index ? 'step' : undefined}>
            <span>${chapter.number}</span><i></i>
          </button>
        `)}
      </nav>
      <button className="skip-explore" onClick=${onSkip}><span>SKIP TO EXPLORE</span><i>↘</i></button>
    </div>
  `;
}

function CleanupPanel({ active, stats, liveScan, region, onToggle }) {
  return html`
    <section className="mission-panel" aria-label="AI ocean cleanup telemetry">
      <div className="mission-panel__top"><span><i></i>AI REGIONAL SCAN</span><b>${active ? 'ACTIVE' : 'STANDBY'}</b></div>
      <div className="mission-panel__body">
        <div className="scan-ticker">
          <span>${active ? `TRACKING ${liveScan.target}` : region.label}</span>
          <b>${active ? `${liveScan.confidence}% CONF.` : region.code}</b>
        </div>
        <div className="mission-progress">
          <span>MISSION ${String(stats.progress).padStart(2, '0')}% · ${stats.collected}/${stats.collected + stats.remaining} OBJECTS RECOVERED</span>
          <i><b style=${{ width: `${stats.progress}%` }}></b></i>
        </div>
        <dl>
          <div><dt>TRASH COLLECTED</dt><dd>${stats.collected}<small>ITEMS</small></dd></div>
          <div><dt>OCEAN HEALTH</dt><dd>${stats.health}<small>%</small></dd></div>
          <div><dt>PLASTIC REMOVED</dt><dd>${stats.plastic}<small>KG</small></dd></div>
        </dl>
        <div className="cleanup-balance"><span><i>POLLUTION REMAINING</i><b>${stats.remaining}</b></span><span><i>REGION CONTACTS</i><b>${stats.regionRemaining}</b></span><span><i>TOTAL MASS</i><b>${stats.removed} KG</b></span></div>
        <div className="live-scan-row" aria-live="polite">
          <span><i>FLOW</i><b>${liveScan.flow} M/S</b></span>
          <span><i>DRONE</i><b>${liveScan.drone}</b></span>
          <span><i>PARTICLES</i><b>${liveScan.particles}/L</b></span>
        </div>
        <button className=${active ? 'cleanup-button active' : 'cleanup-button'} onClick=${onToggle} aria-pressed=${active}>
          <span className="cleanup-icon"><i></i><b></b></span>
          <span><strong>${active ? 'END REGIONAL SCAN' : 'SCAN CURRENT REGION'}</strong><small>${active ? `${region.label} · NEARBY CONTACTS ONLY` : 'C · AI LOCAL DETECTION'}</small></span>
          <i className="cleanup-arrow">↗</i>
        </button>
      </div>
    </section>
  `;
}

function CockpitPanel({ mode, cleanupActive, stats, liveScan, region, onMode, onCleanup, onExit }) {
  const buttons = [['SONAR', 'sonar'], ['LIGHTS', 'normal'], ['LOW', 'night'], ['AI', 'ai']];
  return html`
    <section className="cockpit-shell" aria-label="Interactive Nereid cockpit controls">
      <div className="cockpit-frame" aria-hidden="true"><i></i><b></b><span></span></div>
      <div className="cockpit-screen cockpit-screen--sonar">
        <div className="screen-title"><span>SPATIAL SONAR</span><b>LIVE</b></div>
        <div className="sonar-scope"><i></i><b></b><span></span><em></em></div>
        <div className="screen-readout"><span>CONTACTS <b>${String(stats.regionRemaining).padStart(3, '0')}</b></span><span>REGION <b>${region.code}</b></span></div>
      </div>
      <div className="cockpit-screen cockpit-screen--systems">
        <div className="screen-title"><span>VESSEL SYSTEMS</span><b>NOMINAL</b></div>
        <div className="system-bars">
          <span><i>HULL</i><b><em style=${{ width: '98%' }}></em></b><strong>98%</strong></span>
          <span><i>POWER</i><b><em style=${{ width: '94%' }}></em></b><strong>94%</strong></span>
          <span><i>O₂ LOOP</i><b><em style=${{ width: '100%' }}></em></b><strong>100%</strong></span>
        </div>
        <div className="screen-readout"><span>DEPTH <b>7,842 M</b></span><span>PRESS <b>78.4 MPA</b></span></div>
      </div>
      <div className="cockpit-console">
        <div className="console-grip console-grip--left" aria-hidden="true"></div>
        <div className="console-controls">
          ${buttons.map(([label, id]) => html`
            <button key=${id} className=${mode === id ? 'active' : ''} onClick=${() => onMode(id)} aria-pressed=${mode === id}><i><b></b></i><span>${label}</span></button>
          `)}
          <button className=${cleanupActive ? 'active is-amber' : 'is-amber'} onClick=${onCleanup} aria-pressed=${cleanupActive}><i><b></b></i><span>SCAN</span></button>
          <button onClick=${onExit}><i><b></b></i><span>EXIT</span></button>
        </div>
        <div className="console-center-screen">
          <span>NEREID / FLIGHT COMPUTER</span>
          <strong>${cleanupActive ? `SCANNING ${region.label.toUpperCase()}` : 'HOLDING 7,842 M'}</strong>
          <small>${cleanupActive ? `${liveScan.target} · ${liveScan.drone}` : 'AUTONOMOUS STATION KEEPING'}</small>
        </div>
        <div className="console-grip console-grip--right" aria-hidden="true"></div>
      </div>
    </section>
  `;
}

function FreeFlightHUD({ navigation, region }) {
  return html`
    <aside className="free-flight-hud" aria-label="Free exploration controls">
      <div className="free-flight-hud__status"><i></i><span>${region.code} · ${region.label}</span><b>ENGAGED</b></div>
      <div className="flight-metrics">
        <span><i>SPEED</i><b>${navigation.speed}</b><em>KN</em></span>
        <span><i>HEADING</i><b>${navigation.heading}</b><em>°</em></span>
        <span><i>DEPTH</i><b>${navigation.depth}</b><em>M</em></span>
      </div>
      <div className="flight-controls"><kbd>W</kbd><kbd>S</kbd><span>THRUST</span><kbd>A</kbd><kbd>D</kbd><span>STEER</span><kbd>SPACE</kbd><kbd>SHIFT</kbd><span>DEPTH</span><kbd>E</kbd><span>COLLECT</span></div>
      <p>Drag to orbit · Alt + scroll to zoom · Scroll up to revisit the expedition</p>
    </aside>
  `;
}

function RegionPanel({ region, stats, scanActive }) {
  return html`
    <aside className="region-panel" aria-live="polite">
      <span><i></i>${region.code}</span>
      <strong>${region.label}</strong>
      <p>${region.ambience}</p>
      <div><b>${scanActive ? `${stats.regionRemaining} LOCAL CONTACTS` : 'SCAN TO IDENTIFY DEBRIS'}</b><em>${Math.max(0, WORLD_RADIUS - 8)} MAPPED NM</em></div>
    </aside>
  `;
}

function MobilePilotControls({ onControl, onCollect }) {
  const bind = key => ({
    onPointerDown: event => { event.preventDefault(); onControl(key, true); },
    onPointerUp: event => { event.preventDefault(); onControl(key, false); },
    onPointerCancel: () => onControl(key, false),
    onPointerLeave: () => onControl(key, false)
  });
  return html`
    <section className="mobile-pilot" aria-label="Touch submarine controls">
      <div className="mobile-pilot__steer"><button ...${bind('a')} aria-label="Steer left">A</button><button ...${bind('d')} aria-label="Steer right">D</button></div>
      <div className="mobile-pilot__actions"><button onClick=${onCollect} className="collect-touch">COLLECT <b>E</b></button><button ...${bind(' ')} aria-label="Ascend">UP</button><button ...${bind('shift')} aria-label="Descend">DN</button></div>
      <div className="mobile-pilot__thrust"><button ...${bind('w')} aria-label="Move forward">W</button><button ...${bind('s')} aria-label="Move backward">S</button></div>
    </section>
  `;
}

function CollectionToast({ message }) {
  if (!message) return null;
  return html`<div className="collection-toast" role="status"><i></i><span><b>RECOVERY CONFIRMED</b>${message}</span><em>+ OCEAN HEALTH</em></div>`;
}

function ExplorationInterface({ view, mode, cleanupActive, stats, liveScan, region, navigation, notification, onView, onMode, onCleanup, onControl, onCollect }) {
  return html`
    <div className="exploration-interface" data-state="active">
      <nav className="view-rail" aria-label="Exploration camera controls">
        <span className="rail-label">CAMERA</span>
        ${VIEWS.map(item => html`
          <button key=${item.id} className=${view === item.id ? 'active' : ''} onClick=${() => onView(item.id)} aria-pressed=${view === item.id}>
            <span>${item.key}</span><i></i><b>${item.label}</b>
          </button>
        `)}
      </nav>

      <section className="mode-dock" aria-label="Imaging and sonar controls">
        <span className="dock-label">IMAGING SYSTEM</span>
        <div className="mode-options">
          ${MODES.map(item => html`
            <button key=${item.id} className=${mode === item.id ? 'active' : ''} onClick=${() => onMode(item.id)} aria-pressed=${mode === item.id}>
              <${ModeGlyph} mode=${item.id}/><span>${item.label}</span><kbd>${item.shortcut}</kbd>
            </button>
          `)}
        </div>
      </section>

      <${CleanupPanel} active=${cleanupActive} stats=${stats} liveScan=${liveScan} region=${region} onToggle=${onCleanup}/>
      <${RegionPanel} region=${region} stats=${stats} scanActive=${cleanupActive}/>
      <${FreeFlightHUD} navigation=${navigation} region=${region}/>
      <${MobilePilotControls} onControl=${onControl} onCollect=${onCollect}/>
      <${CollectionToast} message=${notification}/>
    </div>
  `;
}

function AboutPage({ onBack }) {
  return html`
    <section className="about-page" aria-labelledby="about-title">
      <div className="about-page__grid" aria-hidden="true"></div>
      <div className="about-intro">
        <p className="about-eyebrow"><i></i>PROJECT ABYSS / ORIGIN LOG</p>
        <h1 id="about-title">The ocean’s future should feel worth protecting.</h1>
        <p>Project ABYSS is a browser-based interactive documentary that combines deep-ocean exploration, speculative engineering, and environmental restoration in one continuous real-time world.</p>
        <button onClick=${onBack}><span>ENTER THE EXPEDITION</span><i>↗</i></button>
      </div>
      <article className="creator-profile">
        <div className="creator-profile__top"><span>CREATOR FILE</span><b>01 / 01</b></div>
        <div className="creator-monogram">SK<i></i></div>
        <p className="creator-role">CREATOR · DESIGNER · DEVELOPER</p>
        <h2>Shabbur Khan</h2>
        <p>Shabbur is a high school student from the Bay Area, California. He is creating Project ABYSS for a hackathon as an exploration of how technology, storytelling, and environmental responsibility can share the same world.</p>
        <dl>
          <div><dt>BASED IN</dt><dd>BAY AREA, CA</dd></div>
          <div><dt>PROJECT TYPE</dt><dd>3D HACKATHON</dd></div>
          <div><dt>MISSION</dt><dd>EXPLORE + RESTORE</dd></div>
        </dl>
      </article>
      <div className="about-principles"><span>01 <b>IMMERSION</b></span><span>02 <b>ENGINEERING</b></span><span>03 <b>OCEAN STEWARDSHIP</b></span></div>
    </section>
  `;
}

function App() {
  const routeFromPath = () => window.location.pathname.startsWith('/about') ? 'about' : 'experience';
  const savedPhase = () => {
    try { return window.sessionStorage.getItem('abyss.experience.phase') === 'exploration' ? 'exploration' : 'story'; }
    catch { return 'story'; }
  };
  const [route, setRoute] = useState(routeFromPath);
  const [experiencePhase, setExperiencePhase] = useState(savedPhase);
  const [mode, setMode] = useState('normal');
  const [view, setView] = useState('free');
  const [audio, setAudio] = useState(false);
  const [cleanupActive, setCleanupActive] = useState(false);
  const [target, setTarget] = useState(null);
  const [activeChapter, setActiveChapter] = useState(0);
  const [storyProgress, setStoryProgress] = useState(0);
  const [stats, setStats] = useState({ progress: 0, health: 62, removed: '0.0', plastic: '0.0', collected: 0, remaining: POLLUTION.length, regionRemaining: 2, protected: 12, clarity: 71 });
  const [navigation, setNavigation] = useState({ speed: '0.0', heading: '270', depth: 7842 });
  const [liveScan, setLiveScan] = useState({ target: 'GHOST NET', confidence: '99.2', flow: '0.24', drone: 'NRD-01', particles: 284 });
  const [region, setRegion] = useState(REGIONS[0]);
  const [notification, setNotification] = useState('');
  const sceneApi = useRef(null);
  const progressRef = useRef(0);
  const phaseRef = useRef(experiencePhase);
  const restoringPhase = useRef(experiencePhase === 'exploration');
  const freeFlight = route === 'experience' && experiencePhase === 'exploration';
  const cockpitVisible = route === 'experience' && (view === 'cockpit' || (!freeFlight && activeChapter === 6));

  const enterExploration = useCallback((options = {}) => {
    const finalProgress = STORY_CHAPTERS.length - 1;
    const willScroll = options.scroll !== false;
    phaseRef.current = 'exploration';
    restoringPhase.current = willScroll;
    setExperiencePhase('exploration');
    progressRef.current = finalProgress;
    setStoryProgress(finalProgress);
    setActiveChapter(finalProgress);
    setView('free');
    setMode('normal');
    setCleanupActive(false);
    setTarget(null);
    sceneApi.current?.setView('free');
    try { window.sessionStorage.setItem('abyss.experience.phase', 'exploration'); } catch {}
    if (willScroll) window.scrollTo({ top: finalProgress * window.innerHeight, behavior: options.behavior || 'smooth' });
  }, []);

  const leaveExploration = useCallback(() => {
    phaseRef.current = 'story';
    restoringPhase.current = false;
    setExperiencePhase('story');
    setCleanupActive(false);
    try { window.sessionStorage.removeItem('abyss.experience.phase'); } catch {}
  }, []);

  const syncStats = useCallback(next => {
    setStats(current => Object.keys(next).every(key => current[key] === next[key]) ? current : next);
  }, []);

  const syncNavigation = useCallback(next => {
    setNavigation(current => Object.keys(next).every(key => current[key] === next[key]) ? current : next);
  }, []);

  useEffect(() => { phaseRef.current = experiencePhase; }, [experiencePhase]);

  useEffect(() => {
    const onPopState = () => setRoute(routeFromPath());
    window.addEventListener('popstate', onPopState);
    return () => window.removeEventListener('popstate', onPopState);
  }, []);

  useEffect(() => {
    document.body.classList.toggle('is-about-route', route === 'about');
    document.title = route === 'about' ? 'About Project ABYSS — Shabbur Khan' : 'ABYSS — Interactive Deep Ocean Expedition';
    if (route === 'about') {
      window.scrollTo({ top: 0, behavior: 'auto' });
      sceneApi.current?.setView('side');
    } else if (phaseRef.current === 'exploration') {
      restoringPhase.current = true;
      requestAnimationFrame(() => {
        window.scrollTo({ top: (STORY_CHAPTERS.length - 1) * window.innerHeight, behavior: 'auto' });
        sceneApi.current?.setView('free');
      });
    } else {
      requestAnimationFrame(() => sceneApi.current?.setStoryProgress(progressRef.current));
    }
    return () => document.body.classList.remove('is-about-route');
  }, [route]);

  useEffect(() => {
    if (route !== 'experience') return undefined;
    let ticking = false;
    const update = () => {
      ticking = false;
      const progress = clamp(window.scrollY / Math.max(window.innerHeight, 1), 0, STORY_CHAPTERS.length - 1);
      const chapter = Math.min(STORY_CHAPTERS.length - 1, Math.floor(progress + .5));
      if (restoringPhase.current && phaseRef.current === 'exploration') {
        if (progress >= STORY_CHAPTERS.length - 1.05) restoringPhase.current = false;
        else return;
      }
      if (progress >= STORY_CHAPTERS.length - 1.06 && phaseRef.current !== 'exploration') {
        enterExploration({ scroll: false });
        return;
      }
      if (progress < STORY_CHAPTERS.length - 1.55 && phaseRef.current === 'exploration') leaveExploration();
      progressRef.current = progress;
      setStoryProgress(progress);
      setActiveChapter(chapter);
      if (phaseRef.current === 'story') {
        setView(current => current === STORY_CHAPTERS[chapter].view ? current : STORY_CHAPTERS[chapter].view);
        sceneApi.current?.setStoryProgress(progress);
      }
    };
    const onScroll = () => {
      if (ticking) return;
      ticking = true;
      requestAnimationFrame(update);
    };
    window.addEventListener('scroll', onScroll, { passive: true });
    window.addEventListener('resize', onScroll, { passive: true });
    update();
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.removeEventListener('resize', onScroll);
    };
  }, [route, enterExploration, leaveExploration]);

  useEffect(() => {
    if (!audio) return undefined;
    return createAudio();
  }, [audio]);

  useEffect(() => {
    if (!cleanupActive) return undefined;
    let timer;
    const drones = ['NRD-01', 'NRD-02', 'NRD-03'];
    const tick = () => {
      setLiveScan({
        target: region.pollution[Math.floor(Math.random() * region.pollution.length)],
        confidence: (96.8 + Math.random() * 3.1).toFixed(1),
        flow: (.16 + Math.random() * .23).toFixed(2),
        drone: drones[Math.floor(Math.random() * drones.length)],
        particles: Math.round(190 + Math.random() * 180)
      });
      timer = window.setTimeout(tick, 650 + Math.random() * 900);
    };
    tick();
    return () => window.clearTimeout(timer);
  }, [cleanupActive, region.id]);

  useEffect(() => {
    if (!notification) return undefined;
    const timer = window.setTimeout(() => setNotification(''), 3200);
    return () => window.clearTimeout(timer);
  }, [notification]);

  useEffect(() => {
    const onKey = event => {
      if (event.target?.matches?.('input, textarea, select')) return;
      if (event.key.toLowerCase() === 'm') setAudio(value => !value);
      if (phaseRef.current !== 'exploration') return;
      if (event.key >= '1' && event.key <= '4') setMode(MODES[Number(event.key) - 1].id);
      if (event.key.toLowerCase() === 'c') setCleanupActive(value => !value);
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, []);

  const navigate = (nextRoute, event) => {
    event?.preventDefault?.();
    const path = nextRoute === 'about' ? '/about' : '/';
    if (window.location.pathname !== path) window.history.pushState({}, '', path);
    setRoute(nextRoute);
    if (nextRoute === 'experience') {
      leaveExploration();
      window.scrollTo({ top: 0, behavior: route === 'experience' ? 'smooth' : 'auto' });
      progressRef.current = 0;
      setStoryProgress(0);
      setActiveChapter(0);
    }
  };

  const selectView = id => {
    setView(id);
    sceneApi.current?.setView(id);
    if (id === 'dome') setTarget({ category: 'sub', type: 'PANORAMIC OBSERVATORY', meta: 'PRESSURE-RESISTANT SMART GLASS', detail: 'External pressure 78.4 MPa · Optical clarity 99.7%' });
    else setTarget(null);
  };

  const selectChapter = index => index === STORY_CHAPTERS.length - 1
    ? enterExploration({ behavior: 'smooth' })
    : window.scrollTo({ top: index * window.innerHeight, behavior: 'smooth' });
  const toggleCleanup = () => {
    setCleanupActive(active => !active);
    setMode('ai');
    setTarget(null);
  };

  return html`
    <main className=${`experience route-${route} mode-${mode} ${cleanupActive ? 'cleanup-active' : ''} ${cockpitVisible ? 'cockpit-visible' : ''} ${freeFlight ? 'free-flight' : ''}`} style=${{ '--story-progress': `${(storyProgress / (STORY_CHAPTERS.length - 1)) * 100}%` }}>
      <${AbyssScene}
        mode=${mode}
        cleanupActive=${cleanupActive}
        freeFlight=${freeFlight}
        onStats=${syncStats}
        onNavigation=${syncNavigation}
        onTarget=${setTarget}
        onRegion=${setRegion}
        onNotification=${setNotification}
        onReady=${api => { sceneApi.current = api; api.setStoryProgress(progressRef.current); }}
      />

      <div className="water-volume" aria-hidden="true"><i></i><b></b></div>
      <div className="vignette" aria-hidden="true"></div>
      <div className="film-grain" aria-hidden="true"></div>
      <div className="sonar-wash" aria-hidden="true"></div>
      <div className="reticle" aria-hidden="true"><i></i><b></b><span></span></div>
      <${CursorBeacon}/>

      <header className="mission-header">
        <a className="brand" href="/" onClick=${event => navigate('experience', event)} aria-label="Project ABYSS experience home">
          <span className="brand-mark"><i></i><b></b></span>
          <span className="brand-copy"><strong>ABYSS</strong><small>HADAL RESEARCH DIVISION</small></span>
        </a>
        <nav className="main-nav" aria-label="Primary navigation">
          <a href="/" className=${route === 'experience' ? 'active' : ''} onClick=${event => navigate('experience', event)} aria-current=${route === 'experience' ? 'page' : undefined}>Experience</a>
          <a href="/about" className=${route === 'about' ? 'active' : ''} onClick=${event => navigate('about', event)} aria-current=${route === 'about' ? 'page' : undefined}>About</a>
          <span><i style=${{ width: route === 'experience' ? '0%' : '100%' }}></i></span>
        </nav>
        <div className="header-actions">
          <span className="expedition-counter">${route === 'experience' ? `${String(activeChapter + 1).padStart(2, '0')} / ${String(STORY_CHAPTERS.length).padStart(2, '0')}` : 'ORIGIN / 01'}</span>
          <button className=${audio ? 'audio is-on' : 'audio'} onClick=${() => setAudio(value => !value)} aria-label=${audio ? 'Mute spatial audio' : 'Enable spatial audio'}>
            <span><i></i><i></i><i></i><i></i></span>${audio ? 'AUDIO ON' : 'AUDIO OFF'}
          </button>
          <span className="header-rule"></span>
          <span className="depth-mini"><i>DEPTH</i><b>${navigation.depth.toLocaleString()}</b><em>M</em></span>
        </div>
        <i className="header-progress"><b></b></i>
      </header>

      ${route === 'experience' ? html`
        <${StoryExperience} activeChapter=${activeChapter} onChapterSelect=${selectChapter} onSkip=${() => enterExploration({ behavior: 'smooth' })}/>

        <section className="telemetry" aria-label="Mission telemetry">
          <div className="telemetry__eyebrow"><i></i>LIVE BATHYMETRY</div>
          <div className="depth-readout"><span>−</span><strong>${navigation.depth.toLocaleString()}</strong><em>M</em></div>
          <div className="coordinate">11° 21' 4.2" N<br/>142° 11' 38.1" E</div>
          <div className="pressure">
            <span><i>PRESSURE</i><b>${(navigation.depth * .01).toFixed(1)} MPA</b></span>
            <span><i>EXT. TEMP</i><b>1.7 °C</b></span>
          </div>
          <div className="ocean-state"><i style=${{ '--health': `${stats.health}%` }}></i><span>OCEAN INTEGRITY</span><b>${stats.health}%</b></div>
        </section>

        ${cockpitVisible && html`<${CockpitPanel} mode=${mode} cleanupActive=${cleanupActive} stats=${stats} liveScan=${liveScan} region=${region} onMode=${setMode} onCleanup=${toggleCleanup} onExit=${() => selectView('free')}/>`}
        ${freeFlight && html`<${ExplorationInterface}
          view=${view}
          mode=${mode}
          cleanupActive=${cleanupActive}
          stats=${stats}
          liveScan=${liveScan}
          region=${region}
          navigation=${navigation}
          notification=${notification}
          onView=${selectView}
          onMode=${setMode}
          onCleanup=${toggleCleanup}
          onControl=${(key, pressed) => sceneApi.current?.setControl(key, pressed)}
          onCollect=${() => sceneApi.current?.collectNearest()}
        />`}
        <${TargetCard} target=${target} onClose=${() => setTarget(null)}/>
      ` : html`<${AboutPage} onBack=${event => navigate('experience', event)}/>`}

      <footer className="status-footer">
        <span><i className="status-dot"></i>${freeFlight ? 'MANUAL NAVIGATION ACTIVE' : 'ALL SYSTEMS NOMINAL'}</span>
        <span className="footer-center">AUS NEREID <i></i> ${route === 'about' ? 'PROJECT ORIGIN LOG' : freeFlight ? region.label.toUpperCase() : 'AUTONOMOUS SUBMERSIBLE'}</span>
        <span>LOCAL TIME <b>${new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hour12: false })}</b></span>
      </footer>
    </main>
  `;
}

export { App };
