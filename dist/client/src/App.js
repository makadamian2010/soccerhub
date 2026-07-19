import { React, html } from './lib/deps.js';

const CHAPTERS = [
  {
    id: 'awakening', number: '00', nav: 'Awakening', kicker: 'NEXORA // SYSTEM ONLINE',
    title: ['Intelligence', 'that never', 'stops thinking.'],
    body: 'In 2055, movement is no longer managed. It is understood—every vehicle, street and city connected by one living intelligence.'
  },
  {
    id: 'city', number: '01', nav: 'Autonomous City', kicker: 'THE AUTONOMOUS CITY',
    title: ['A city that', 'moves as one.'],
    body: 'No traffic lights. No congestion. No isolated decisions. Millions of journeys choreographed in perfect, continuous motion.'
  },
  {
    id: 'vision', number: '02', nav: 'AI Vision', kicker: 'MULTIMODAL PERCEPTION',
    title: ['It sees', 'everything.'],
    body: 'Camera, LiDAR, radar and neural vision fuse into a single high-definition understanding of the world—forty times every second.'
  },
  {
    id: 'prediction', number: '03', nav: 'Prediction', kicker: 'PREDICTIVE INTELLIGENCE',
    title: ['The future,', 'before it happens.'],
    body: 'NEXORA simulates thousands of possible futures, identifies risk before it exists and chooses the safest line through uncertainty.'
  },
  {
    id: 'twin', number: '04', nav: 'Digital Twin', kicker: 'LIVE CITY MODEL',
    title: ['Every street.', 'Alive in data.'],
    body: 'A real-time holographic twin maps traffic, weather, construction and emergency response—then reshapes the city in an instant.'
  },
  {
    id: 'fleet', number: '05', nav: 'Fleet', kicker: 'COLLECTIVE MOTION',
    title: ['One network.', 'Every journey.'],
    body: 'Public pods, emergency response, freight and personal mobility think independently—then communicate as a single fleet.'
  },
  {
    id: 'energy', number: '06', nav: 'Sustainability', kicker: 'A REGENERATIVE SYSTEM',
    title: ['Movement that', 'gives back.'],
    body: 'Solar roads, dynamic charging and zero-emission fleets turn infrastructure into energy. Nature and technology move forward together.'
  },
  {
    id: 'planet', number: '07', nav: 'Global Network', kicker: 'PLANETARY INTELLIGENCE',
    title: ['Every city.', 'One pulse.'],
    body: 'Satellites, climate systems and autonomous cities exchange intelligence across continents. Earth becomes one synchronized network.'
  },
  {
    id: 'future', number: '08', nav: 'Tomorrow', kicker: 'NEXORA // 2055',
    title: ["The future doesn’t", 'drive itself.', 'Intelligence does.'],
    body: 'The next era of movement has already begun.'
  }
];

const SENSOR_ROWS = [
  ['CAM', 'OPTICAL VISION', '100%'],
  ['LDR', 'LIDAR DEPTH', '99.8%'],
  ['RDR', 'RADAR VELOCITY', '99.9%'],
  ['NN', 'NEURAL FUSION', 'ACTIVE']
];

const TAU = Math.PI * 2;
const clamp = (value, min = 0, max = 1) => Math.max(min, Math.min(max, value));
const mix = (a, b, amount) => a + (b - a) * amount;
const ease = value => 1 - Math.pow(1 - clamp(value), 3);

function seeded(index, salt = 0) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

function glowDot(ctx, x, y, radius, color, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.arc(x, y, radius, 0, TAU);
  ctx.fill();
  ctx.globalAlpha = 1;
}

function line(ctx, x1, y1, x2, y2, color, width = 1, alpha = 1) {
  ctx.globalAlpha = alpha;
  ctx.strokeStyle = color;
  ctx.lineWidth = width;
  ctx.beginPath();
  ctx.moveTo(x1, y1);
  ctx.lineTo(x2, y2);
  ctx.stroke();
  ctx.globalAlpha = 1;
}

function drawAtmosphere(ctx, w, h, t, stage) {
  const horizon = h * (stage < 1.6 ? .55 : .48);
  const sky = ctx.createLinearGradient(0, 0, 0, h);
  sky.addColorStop(0, stage > 6.7 ? '#02030a' : '#02040b');
  sky.addColorStop(.48, stage > 6.7 ? '#050313' : '#061224');
  sky.addColorStop(.74, stage > 6.7 ? '#02030a' : '#030812');
  sky.addColorStop(1, '#010205');
  ctx.fillStyle = sky;
  ctx.fillRect(0, 0, w, h);

  if (stage > .55 && stage < 6.8) {
    const dawn = ctx.createRadialGradient(w * .66, horizon, 0, w * .66, horizon, w * .55);
    dawn.addColorStop(0, stage > 5.7 ? 'rgba(36,255,188,.22)' : 'rgba(35,180,255,.22)');
    dawn.addColorStop(.22, 'rgba(80,70,255,.08)');
    dawn.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = dawn;
    ctx.fillRect(0, 0, w, h);
  }

  if (stage > 6.5 || stage < .55) {
    for (let i = 0; i < 230; i++) {
      const x = (seeded(i, 1) * w + t * (i % 3) * .45) % w;
      const y = seeded(i, 2) * h * .82;
      const pulse = .35 + .55 * Math.abs(Math.sin(t * .45 + i));
      glowDot(ctx, x, y, seeded(i, 3) * 1.2 + .25, '#b9eaff', pulse);
    }
  }
}

function drawRoad(ctx, w, h, t, pointer, green = false) {
  const horizon = h * .53;
  const vanishingX = w * (.56 + pointer.x * .018);
  const road = ctx.createLinearGradient(0, horizon, 0, h);
  road.addColorStop(0, 'rgba(13,24,36,.15)');
  road.addColorStop(1, 'rgba(3,10,18,.96)');
  ctx.fillStyle = road;
  ctx.beginPath();
  ctx.moveTo(vanishingX - w * .035, horizon);
  ctx.lineTo(vanishingX + w * .035, horizon);
  ctx.lineTo(w * .93, h);
  ctx.lineTo(w * .08, h);
  ctx.closePath();
  ctx.fill();

  const roadColor = green ? '#5effbd' : '#59e8ff';
  ctx.shadowColor = roadColor;
  ctx.shadowBlur = 14;
  for (let i = -5; i <= 5; i++) {
    line(ctx, vanishingX + i * 7, horizon, vanishingX + i * w * .083, h, roadColor, i === 0 ? 1.4 : .55, i === 0 ? .75 : .2);
  }
  for (let z = 0; z < 18; z++) {
    const travel = (z / 18 + t * .095) % 1;
    const depth = travel * travel;
    const y = mix(horizon, h, depth);
    const spread = depth * w * .46;
    line(ctx, vanishingX - spread, y, vanishingX + spread, y, roadColor, .6 + depth * 1.2, .08 + depth * .22);
  }
  ctx.shadowBlur = 0;

  const pulseX = pointer.screenX || w * .5;
  const pulseY = clamp((pointer.screenY - horizon) / (h - horizon)) * (h - horizon) + horizon;
  const pulse = ctx.createRadialGradient(pulseX, pulseY, 0, pulseX, pulseY, w * .16);
  pulse.addColorStop(0, green ? 'rgba(66,255,177,.12)' : 'rgba(55,224,255,.13)');
  pulse.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = pulse;
  ctx.fillRect(0, horizon, w, h - horizon);
}

function drawBuilding(ctx, x, base, width, height, seed, t, pointer) {
  const lean = (x - innerWidth * .54) * .018;
  const topX = x + lean;
  const hoverDistance = Math.hypot(pointer.screenX - x, pointer.screenY - (base - height * .5));
  const hover = clamp(1 - hoverDistance / 230);
  const facade = ctx.createLinearGradient(x - width, 0, x + width, 0);
  facade.addColorStop(0, '#030812');
  facade.addColorStop(.48, '#0a1928');
  facade.addColorStop(1, '#02050b');
  ctx.fillStyle = facade;
  ctx.beginPath();
  ctx.moveTo(topX - width * .38, base - height);
  ctx.lineTo(topX + width * .38, base - height);
  ctx.lineTo(x + width * .5, base);
  ctx.lineTo(x - width * .5, base);
  ctx.closePath();
  ctx.fill();
  ctx.strokeStyle = `rgba(61,211,255,${.11 + hover * .32})`;
  ctx.lineWidth = .7;
  ctx.stroke();

  const columns = Math.max(2, Math.floor(width / 12));
  const rows = Math.max(3, Math.floor(height / 16));
  for (let row = 1; row < rows; row++) {
    for (let col = 1; col < columns; col++) {
      if (seeded(row * 17 + col, seed) > .46) {
        const wx = mix(topX - width * .28, topX + width * .28, col / columns);
        const wy = base - height + row * (height / rows);
        const on = .35 + .65 * Math.abs(Math.sin(t * .32 + row + col + seed));
        ctx.fillStyle = seed % 7 === 0 ? `rgba(175,99,255,${on * (.35 + hover)})` : `rgba(73,224,255,${on * (.25 + hover)})`;
        ctx.fillRect(wx, wy, Math.max(1, width / columns * .22), 1.2);
      }
    }
  }
  if (seed % 4 === 0) {
    ctx.fillStyle = `rgba(79,229,255,${.025 + hover * .06})`;
    ctx.fillRect(x - width * .44, base - height * .6, width * .88, height * .12);
  }
}

function drawCity(ctx, w, h, t, pointer, wireframe = false, green = false) {
  const base = h * .58;
  ctx.save();
  if (wireframe) ctx.globalAlpha = .44;
  for (let i = 0; i < 42; i++) {
    const depth = seeded(i, 4);
    const side = i % 2 === 0 ? -1 : 1;
    const x = w * .55 + side * (w * (.09 + depth * .49));
    const width = 16 + depth * 67;
    const height = h * (.12 + seeded(i, 8) * .42) * (.48 + depth * .7);
    drawBuilding(ctx, x, base + depth * h * .08, width, height, i, t, pointer);
  }
  ctx.restore();
  drawRoad(ctx, w, h, t, pointer, green);

  // Autonomous traffic and airborne taxis.
  for (let i = 0; i < 28; i++) {
    const travel = (seeded(i, 9) + t * (.018 + seeded(i, 10) * .035)) % 1;
    const depth = travel * travel;
    const lane = (i % 5) - 2;
    const x = w * .56 + lane * (8 + depth * w * .07);
    const y = mix(h * .54, h * 1.04, depth);
    const size = 1.5 + depth * 13;
    const color = i % 7 === 0 ? '#b27aff' : green && i % 3 === 0 ? '#62ffc1' : '#62eaff';
    ctx.shadowColor = color;
    ctx.shadowBlur = 12;
    line(ctx, x - size, y, x + size, y, color, .7 + depth * 2, .45 + depth * .5);
    ctx.shadowBlur = 0;
  }
  for (let i = 0; i < 9; i++) {
    const direction = i % 2 ? -1 : 1;
    const x = ((seeded(i, 11) * w + direction * t * (16 + i * 2)) % (w * 1.3)) - w * .15;
    const y = h * (.16 + seeded(i, 12) * .25) + Math.sin(t * .7 + i) * 8;
    line(ctx, x - direction * 20, y, x + direction * 10, y, i % 3 ? '#65eaff' : '#b67aff', 1.2, .65);
    line(ctx, x - direction * 90, y, x - direction * 20, y, '#57dfff', .5, .12);
  }

  // Atmospheric fog layers.
  for (let i = 0; i < 3; i++) {
    const fog = ctx.createLinearGradient(0, h * (.34 + i * .11), 0, h * (.68 + i * .08));
    fog.addColorStop(0, 'rgba(4,12,25,0)');
    fog.addColorStop(.48, `rgba(36,100,130,${.025 + i * .012})`);
    fog.addColorStop(1, 'rgba(0,0,0,0)');
    ctx.fillStyle = fog;
    ctx.fillRect(Math.sin(t * .05 + i) * 60, h * .3, w, h * .5);
  }
}

function vehiclePoint(index) {
  const side = index % 2 ? 1 : -1;
  const u = seeded(index, 21);
  const v = seeded(index, 22);
  const roof = Math.max(0, 1 - Math.abs((u - .5) * 2));
  const x = (u - .5) * 2;
  let y = (v - .5) * .58 - roof * .28;
  if (index % 5 === 0) y = .26 + Math.sin(u * Math.PI) * .09;
  return { x, y, side, depth: seeded(index, 23) };
}

function drawVehicleAwakening(ctx, w, h, t, local, pointer) {
  const cx = w * (.59 + pointer.x * .035);
  const cy = h * (.51 + pointer.y * .025);
  const size = Math.min(w, h) * .42;
  const assemble = ease(clamp(local * 1.8));
  ctx.save();
  ctx.translate(cx, cy);
  for (let i = 0; i < 680; i++) {
    const point = vehiclePoint(i);
    const cloudAngle = seeded(i, 24) * TAU + t * (.03 + point.depth * .08);
    const cloudRadius = size * (.28 + seeded(i, 25) * 1.35);
    const originX = Math.cos(cloudAngle) * cloudRadius;
    const originY = Math.sin(cloudAngle) * cloudRadius * .62;
    const attract = clamp(assemble + (1 - assemble) * clamp(1 - Math.hypot(pointer.x * 2, pointer.y * 2)) * .04);
    const x = mix(originX, point.x * size, attract) + Math.sin(t + i) * (1 - assemble) * 3;
    const y = mix(originY, point.y * size, attract) + Math.cos(t * .7 + i) * (1 - assemble) * 3;
    const color = i % 11 === 0 ? '#b078ff' : i % 5 === 0 ? '#ffffff' : '#55e8ff';
    glowDot(ctx, x, y, .45 + point.depth * 1.15, color, .2 + point.depth * .7);
    if (assemble > .45 && i % 43 === 0) line(ctx, x, y, point.x * size * .72, point.y * size * .72, '#4ee7ff', .45, .2);
  }
  if (assemble > .65) {
    const on = clamp((assemble - .65) * 3);
    ctx.shadowColor = '#6ff2ff';
    ctx.shadowBlur = 30 * on;
    line(ctx, -size * .82, size * .04, -size * .48, size * .025, '#e9fdff', 2.5, on);
    line(ctx, size * .48, size * .025, size * .82, size * .04, '#e9fdff', 2.5, on);
    ctx.shadowBlur = 0;
    ctx.strokeStyle = `rgba(92,235,255,${on * .3})`;
    ctx.setLineDash([4, 14]);
    ctx.beginPath();
    ctx.ellipse(0, size * .16, size * .92, size * .29, 0, 0, TAU);
    ctx.stroke();
    ctx.setLineDash([]);
  }
  ctx.restore();

  const roadReveal = clamp((local - .68) * 3.2);
  ctx.globalAlpha = roadReveal;
  drawRoad(ctx, w, h, t * 1.5, pointer);
  ctx.globalAlpha = 1;
}

function drawVision(ctx, w, h, t, pointer) {
  drawCity(ctx, w, h, t, pointer, true);
  const originX = w * .55;
  const originY = h * .68;
  ctx.save();
  ctx.globalCompositeOperation = 'lighter';
  for (let i = 0; i < 44; i++) {
    const angle = -Math.PI * .84 + (i / 43) * Math.PI * .68 + Math.sin(t * .4) * .03;
    const distance = h * (.16 + seeded(i, 30) * .73);
    const endX = originX + Math.cos(angle) * distance * 1.5;
    const endY = originY + Math.sin(angle) * distance;
    line(ctx, originX, originY, endX, endY, i % 8 === 0 ? '#b36dff' : '#51dfff', i % 8 === 0 ? 1 : .45, .08 + seeded(i, 31) * .16);
  }
  const sweep = (t * .22) % 1;
  ctx.fillStyle = 'rgba(67,235,255,.055)';
  ctx.beginPath();
  ctx.moveTo(originX, originY);
  ctx.arc(originX, originY, h * .78, -Math.PI * .84 + sweep * .35, -Math.PI * .72 + sweep * .35);
  ctx.closePath();
  ctx.fill();
  ctx.restore();

  const targets = [
    [.28, .57, 'PEDESTRIAN', '98.7'], [.72, .54, 'CYCLIST', '97.4'], [.81, .45, 'SIGN', '99.9'], [.41, .51, 'VEHICLE', '100']
  ];
  targets.forEach((target, i) => {
    const x = w * target[0], y = h * target[1];
    const bw = 36 + i * 4, bh = 60 - i * 5;
    ctx.strokeStyle = i === 1 ? 'rgba(180,102,255,.8)' : 'rgba(85,237,255,.75)';
    ctx.lineWidth = 1;
    ctx.setLineDash([5, 5]);
    ctx.strokeRect(x - bw / 2, y - bh, bw, bh);
    ctx.setLineDash([]);
    ctx.fillStyle = '#bff9ff';
    ctx.font = '7px monospace';
    ctx.fillText(`${target[2]} / ${target[3]}`, x - bw / 2, y - bh - 7);
  });
}

function drawPrediction(ctx, w, h, t, pointer) {
  drawCity(ctx, w, h, t * .16, pointer, true);
  const startX = w * .55, startY = h * .78;
  const destinations = [
    { x: w * .24, y: h * .46, color: '#ff4c74', alpha: .62 },
    { x: w * .39, y: h * .43, color: '#ff4c74', alpha: .42 },
    { x: w * .68, y: h * .42, color: '#65ffbd', alpha: .92 },
    { x: w * .8, y: h * .5, color: '#f9c76d', alpha: .3 },
    { x: w * .51, y: h * .38, color: '#ff4c74', alpha: .33 }
  ];
  destinations.forEach((dest, i) => {
    ctx.strokeStyle = dest.color;
    ctx.lineWidth = i === 2 ? 2.3 : .9;
    ctx.globalAlpha = dest.alpha;
    ctx.setLineDash(i === 2 ? [] : [5, 8]);
    ctx.beginPath();
    ctx.moveTo(startX, startY);
    ctx.bezierCurveTo(startX + (dest.x - startX) * .1, h * .57, dest.x + (i - 2) * 30, h * .56, dest.x, dest.y);
    ctx.stroke();
    ctx.setLineDash([]);
    ctx.globalAlpha = 1;
    glowDot(ctx, dest.x, dest.y, i === 2 ? 4 : 2.5, dest.color, .85);
  });
  const childX = w * (.43 + Math.sin(t * .08) * .015), childY = h * .58;
  ctx.fillStyle = 'rgba(255,66,102,.07)';
  ctx.beginPath(); ctx.arc(childX, childY, 64 + Math.sin(t) * 5, 0, TAU); ctx.fill();
  ctx.strokeStyle = 'rgba(255,78,112,.7)';
  ctx.setLineDash([4, 5]);
  ctx.strokeRect(childX - 18, childY - 54, 36, 55);
  ctx.setLineDash([]);
  glowDot(ctx, childX, childY - 67, 3, '#ff5276', .9);
  ctx.font = '8px monospace'; ctx.fillStyle = '#ff8ba2'; ctx.fillText('PREDICTED CROSSING · 0.72s', childX - 86, childY - 74);
}

function drawDigitalTwin(ctx, w, h, t, pointer) {
  ctx.save();
  ctx.translate(0, h * .06);
  ctx.transform(1, -.2, 0, .56, 0, h * .28);
  const grid = 46;
  ctx.strokeStyle = 'rgba(80,222,255,.18)';
  ctx.lineWidth = .7;
  for (let x = -grid; x < w + grid; x += grid) line(ctx, x, 0, x, h, '#59e7ff', .6, .18);
  for (let y = 0; y < h; y += grid) line(ctx, 0, y, w, y, '#59e7ff', .6, .18);
  for (let i = 0; i < 64; i++) {
    const x = seeded(i, 41) * w;
    const y = seeded(i, 42) * h;
    const height = 18 + seeded(i, 43) * 120;
    ctx.strokeStyle = i % 11 === 0 ? 'rgba(181,99,255,.56)' : 'rgba(69,223,255,.34)';
    ctx.strokeRect(x - 8, y - height, 16 + seeded(i, 44) * 18, height);
  }
  ctx.restore();
  for (let i = 0; i < 56; i++) {
    const angle = seeded(i, 45) * TAU;
    const radius = (seeded(i, 46) + t * .025 * (i % 3 + 1)) % 1;
    const x = w * .53 + Math.cos(angle) * radius * w * .43;
    const y = h * .58 + Math.sin(angle) * radius * h * .24;
    glowDot(ctx, x, y, 1 + seeded(i, 47) * 2, i % 9 === 0 ? '#b66eff' : '#57e7ff', .36 + seeded(i, 48) * .55);
  }
}

function drawFleet(ctx, w, h, t, pointer) {
  drawCity(ctx, w, h, t, pointer, false);
  const vehicles = Array.from({ length: 18 }, (_, i) => {
    const lane = i % 6;
    const depth = ((seeded(i, 51) + t * (.014 + (i % 4) * .004)) % 1) ** 1.7;
    return {
      x: w * .55 + (lane - 2.5) * (12 + depth * w * .08),
      y: mix(h * .55, h * .94, depth),
      depth,
      color: i % 6 === 0 ? '#ff6f8c' : i % 5 === 0 ? '#b675ff' : '#5feaff'
    };
  });
  vehicles.forEach((vehicle, i) => {
    const next = vehicles[(i + 5) % vehicles.length];
    if (i % 2 === 0) line(ctx, vehicle.x, vehicle.y, next.x, next.y, vehicle.color, .65, .1 + vehicle.depth * .25);
    const width = 5 + vehicle.depth * 34;
    const height = 3 + vehicle.depth * 13;
    ctx.fillStyle = 'rgba(4,10,16,.92)';
    ctx.fillRect(vehicle.x - width / 2, vehicle.y - height, width, height);
    ctx.shadowColor = vehicle.color; ctx.shadowBlur = 18;
    line(ctx, vehicle.x - width * .36, vehicle.y - 1, vehicle.x + width * .36, vehicle.y - 1, vehicle.color, 1 + vehicle.depth * 2, .9);
    ctx.shadowBlur = 0;
  });
}

function drawEnergy(ctx, w, h, t, pointer) {
  drawCity(ctx, w, h, t, pointer, false, true);
  const horizon = h * .56;
  for (let i = 0; i < 15; i++) {
    const x = (i / 14) * w;
    const sway = Math.sin(t * .45 + i) * 6;
    line(ctx, x, horizon + 28, x + sway, horizon - 20 - (i % 4) * 9, '#52ffb1', 1, .34);
    glowDot(ctx, x + sway, horizon - 22 - (i % 4) * 9, 2, '#7effc4', .55);
  }
  // Solar road bands.
  for (let i = 0; i < 10; i++) {
    const y = mix(h * .6, h, (i / 10) ** 1.6);
    ctx.fillStyle = `rgba(70,255,175,${.018 + i * .004})`;
    ctx.fillRect(w * .32 - i * 19, y, w * .46 + i * 38, Math.max(2, i * .7));
  }
}

function drawEarth(ctx, w, h, t, local) {
  const cx = w * .59, cy = h * (.54 + local * .04);
  const radius = Math.min(w, h) * (local > .72 ? .18 : .3);
  const halo = ctx.createRadialGradient(cx, cy, radius * .68, cx, cy, radius * 1.65);
  halo.addColorStop(0, 'rgba(52,220,255,.22)');
  halo.addColorStop(.42, 'rgba(81,92,255,.08)');
  halo.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = halo; ctx.fillRect(cx - radius * 1.7, cy - radius * 1.7, radius * 3.4, radius * 3.4);

  const sphere = ctx.createRadialGradient(cx - radius * .34, cy - radius * .4, radius * .04, cx, cy, radius);
  sphere.addColorStop(0, '#71edff'); sphere.addColorStop(.18, '#14749f'); sphere.addColorStop(.55, '#092957'); sphere.addColorStop(.86, '#030a20'); sphere.addColorStop(1, '#01030b');
  ctx.fillStyle = sphere; ctx.beginPath(); ctx.arc(cx, cy, radius, 0, TAU); ctx.fill();
  ctx.save(); ctx.beginPath(); ctx.arc(cx, cy, radius * .99, 0, TAU); ctx.clip();
  ctx.strokeStyle = 'rgba(107,231,255,.15)'; ctx.lineWidth = .8;
  for (let i = -6; i <= 6; i++) {
    ctx.beginPath(); ctx.ellipse(cx, cy, radius * Math.cos(i * .11), radius * .18 * Math.abs(i), 0, 0, TAU); ctx.stroke();
    ctx.beginPath(); ctx.ellipse(cx, cy, radius * .2 * Math.abs(i), radius, 0, 0, TAU); ctx.stroke();
  }
  for (let i = 0; i < 85; i++) {
    const angle = seeded(i, 62) * TAU + t * .015;
    const r = radius * Math.sqrt(seeded(i, 63)) * .88;
    const x = cx + Math.cos(angle) * r;
    const y = cy + Math.sin(angle) * r * .82;
    glowDot(ctx, x, y, seeded(i, 64) * 2.4 + .5, i % 13 === 0 ? '#b276ff' : '#78f3ff', .25 + seeded(i, 65) * .65);
  }
  ctx.restore();
  ctx.shadowColor = '#60eaff'; ctx.shadowBlur = 24;
  ctx.strokeStyle = 'rgba(101,234,255,.45)'; ctx.lineWidth = 1; ctx.beginPath(); ctx.arc(cx, cy, radius, 0, TAU); ctx.stroke(); ctx.shadowBlur = 0;
  for (let i = 0; i < 5; i++) {
    const angle = t * (.08 + i * .012) + i * 1.22;
    const orbit = radius * (1.25 + i * .08);
    const x = cx + Math.cos(angle) * orbit;
    const y = cy + Math.sin(angle) * orbit * .34;
    glowDot(ctx, x, y, 1.7, '#f2fbff', .8);
    line(ctx, x - 12, y, x, y, '#60eaff', .7, .34);
  }
}

function CinematicWorld({ progress, reduced }) {
  const canvasRef = React.useRef(null);
  const pointer = React.useRef({ x: 0, y: 0, targetX: 0, targetY: 0, screenX: 0, screenY: 0 });

  React.useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext('2d', { alpha: false });
    let raf = 0;
    let frame = 0;
    const resize = () => {
      const dpr = Math.min(window.devicePixelRatio || 1, window.innerWidth < 700 ? 1.2 : 1.65);
      canvas.width = Math.floor(window.innerWidth * dpr);
      canvas.height = Math.floor(window.innerHeight * dpr);
      canvas.style.width = `${window.innerWidth}px`;
      canvas.style.height = `${window.innerHeight}px`;
      ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    };
    const move = event => {
      pointer.current.targetX = event.clientX / window.innerWidth - .5;
      pointer.current.targetY = event.clientY / window.innerHeight - .5;
      pointer.current.screenX = event.clientX;
      pointer.current.screenY = event.clientY;
    };
    resize();
    window.addEventListener('resize', resize);
    window.addEventListener('pointermove', move, { passive: true });

    const render = () => {
      const w = window.innerWidth, h = window.innerHeight;
      const p = clamp(progress.current);
      const stage = p * (CHAPTERS.length - 1);
      const chapter = Math.min(CHAPTERS.length - 1, Math.floor(stage + .001));
      const local = stage - Math.floor(stage);
      const t = reduced ? 4 : frame * .012;
      pointer.current.x = mix(pointer.current.x, pointer.current.targetX, .055);
      pointer.current.y = mix(pointer.current.y, pointer.current.targetY, .055);

      drawAtmosphere(ctx, w, h, t, stage);
      ctx.save();
      ctx.translate(pointer.current.x * -8, pointer.current.y * -5);
      if (chapter === 0) drawVehicleAwakening(ctx, w, h, t, local, pointer.current);
      if (chapter === 1) drawCity(ctx, w, h, t, pointer.current);
      if (chapter === 2) drawVision(ctx, w, h, t, pointer.current);
      if (chapter === 3) drawPrediction(ctx, w, h, t, pointer.current);
      if (chapter === 4) drawDigitalTwin(ctx, w, h, t, pointer.current);
      if (chapter === 5) drawFleet(ctx, w, h, t, pointer.current);
      if (chapter === 6) drawEnergy(ctx, w, h, t, pointer.current);
      if (chapter >= 7) drawEarth(ctx, w, h, t, chapter === 8 ? .78 + local * .22 : local * .48);
      ctx.restore();

      // Cinematic light, vignette and chapter cut.
      const beam = ctx.createLinearGradient(0, 0, w, h);
      beam.addColorStop(0, 'rgba(0,0,0,0)');
      beam.addColorStop(.52, chapter === 6 ? 'rgba(56,255,173,.025)' : 'rgba(48,208,255,.028)');
      beam.addColorStop(.58, 'rgba(0,0,0,0)');
      ctx.fillStyle = beam; ctx.fillRect(0, 0, w, h);
      const vignette = ctx.createRadialGradient(w * .53, h * .49, h * .18, w * .53, h * .49, w * .7);
      vignette.addColorStop(0, 'rgba(0,0,0,0)'); vignette.addColorStop(.72, 'rgba(0,0,0,.32)'); vignette.addColorStop(1, 'rgba(0,0,0,.92)');
      ctx.fillStyle = vignette; ctx.fillRect(0, 0, w, h);
      const cut = Math.max(0, (local - .88) / .12);
      if (cut > 0) { ctx.fillStyle = `rgba(1,2,5,${cut * .7})`; ctx.fillRect(0, 0, w, h); }
      frame += 1;
      raf = requestAnimationFrame(render);
    };
    render();
    return () => {
      cancelAnimationFrame(raf);
      window.removeEventListener('resize', resize);
      window.removeEventListener('pointermove', move);
    };
  }, [progress, reduced]);

  return html`<canvas ref=${canvasRef} className="cinematic-world" aria-hidden="true"></canvas>`;
}

function SensorPanel() {
  return html`<aside className="scene-panel sensor-panel" aria-label="Live perception systems">
    <div className="panel-heading"><span>PERCEPTION STACK</span><b>LIVE</b></div>
    ${SENSOR_ROWS.map((row, i) => html`<div className="sensor-row" key=${row[0]} style=${{ '--delay': `${i * .08}s` }}>
      <span>${row[0]}</span><p>${row[1]}</p><strong>${row[2]}</strong><i></i>
    </div>`)}
  </aside>`;
}

function PredictionPanel() {
  return html`<aside className="scene-panel prediction-panel" aria-label="Predictive decision">
    <div className="alert-line"><i></i><span>OBJECT ENTERING PATH</span></div>
    <div className="decision-time"><strong>0.23</strong><span>SECONDS<br/>TO DECISION</span></div>
    <div className="route-choice"><span>SAFE ROUTE 04</span><b>99.98%</b></div>
  </aside>`;
}

function TwinPanel() {
  return html`<aside className="scene-panel twin-panel" aria-label="Digital twin live data">
    <div className="panel-heading"><span>CITY TWIN / TOKYO-04</span><b>SYNCED</b></div>
    <div className="metric-grid">
      <div><strong>1.42M</strong><span>LIVE OBJECTS</span></div>
      <div><strong>12ms</strong><span>LATENCY</span></div>
      <div><strong>0</strong><span>COLLISIONS</span></div>
      <div><strong>98.4%</strong><span>FLOW RATE</span></div>
    </div>
  </aside>`;
}

function FleetPanel() {
  return html`<aside className="scene-panel fleet-panel" aria-label="Fleet types">
    ${['PUBLIC / 24,804', 'EMERGENCY / 1,129', 'LOGISTICS / 42,061', 'PERSONAL / 182,490'].map((label, i) => html`<div key=${label}><i style=${{ '--i': i }}></i><span>${label}</span><b>LINKED</b></div>`)}
  </aside>`;
}

function EnergyPanel() {
  return html`<aside className="scene-panel energy-panel" aria-label="Sustainability data">
    <div><strong>−98.7%</strong><span>URBAN EMISSIONS</span></div>
    <div><strong>34.2 GW</strong><span>ROAD ENERGY / DAY</span></div>
    <div><strong>∞</strong><span>CIRCULAR MOBILITY</span></div>
  </aside>`;
}

function NetworkPanel() {
  return html`<aside className="scene-panel network-panel" aria-label="Global network data">
    <span>GLOBAL SYNC</span>
    <strong>12,408</strong>
    <small>CONNECTED CITIES</small>
    <div><i></i></div>
    <p>8.7B journeys coordinating now</p>
  </aside>`;
}

function MagneticButton({ children, onClick, primary = false, label }) {
  const ref = React.useRef(null);
  const move = event => {
    const rect = ref.current.getBoundingClientRect();
    const x = event.clientX - rect.left - rect.width / 2;
    const y = event.clientY - rect.top - rect.height / 2;
    ref.current.style.setProperty('--mx', `${x * .18}px`);
    ref.current.style.setProperty('--my', `${y * .18}px`);
  };
  const leave = () => {
    ref.current.style.setProperty('--mx', '0px');
    ref.current.style.setProperty('--my', '0px');
  };
  return html`<button ref=${ref} className=${`magnetic ${primary ? 'primary' : ''}`} onPointerMove=${move} onPointerLeave=${leave} onClick=${onClick} aria-label=${label || children}>
    <span>${children}</span><i aria-hidden="true">↗</i><b aria-hidden="true"></b>
  </button>`;
}

function useAmbientAudio(enabled) {
  const audio = React.useRef(null);
  React.useEffect(() => {
    if (!enabled) {
      if (audio.current) audio.current.context.suspend();
      return;
    }
    const AudioContext = window.AudioContext || window.webkitAudioContext;
    if (!AudioContext) return;
    if (audio.current) {
      audio.current.context.resume();
      return;
    }
    const context = new AudioContext();
    const master = context.createGain();
    master.gain.value = .055;
    master.connect(context.destination);
    const filter = context.createBiquadFilter();
    filter.type = 'lowpass'; filter.frequency.value = 260; filter.Q.value = 1.2; filter.connect(master);
    const oscillators = [43.65, 65.41, 87.31].map((frequency, index) => {
      const oscillator = context.createOscillator();
      const gain = context.createGain();
      oscillator.type = index === 0 ? 'sine' : 'triangle';
      oscillator.frequency.value = frequency;
      gain.gain.value = index === 0 ? .42 : .09;
      oscillator.connect(gain); gain.connect(filter); oscillator.start();
      return oscillator;
    });
    const heartbeat = () => {
      if (context.state !== 'running') return;
      const now = context.currentTime;
      [0, .17].forEach((offset, i) => {
        const oscillator = context.createOscillator();
        const gain = context.createGain();
        oscillator.frequency.setValueAtTime(i ? 55 : 48, now + offset);
        oscillator.frequency.exponentialRampToValueAtTime(28, now + offset + .2);
        gain.gain.setValueAtTime(.0001, now + offset);
        gain.gain.exponentialRampToValueAtTime(.18, now + offset + .015);
        gain.gain.exponentialRampToValueAtTime(.0001, now + offset + .22);
        oscillator.connect(gain); gain.connect(master); oscillator.start(now + offset); oscillator.stop(now + offset + .24);
      });
    };
    heartbeat();
    const interval = window.setInterval(heartbeat, 2200);
    audio.current = { context, oscillators, interval };
    return () => {
      window.clearInterval(interval);
      oscillators.forEach(oscillator => oscillator.stop());
      context.close();
      audio.current = null;
    };
  }, [enabled]);
}

export function App() {
  const progress = React.useRef(0);
  const [active, setActive] = React.useState(0);
  const [sound, setSound] = React.useState(false);
  const [reduced, setReduced] = React.useState(window.matchMedia?.('(prefers-reduced-motion: reduce)').matches || false);
  const [loaded, setLoaded] = React.useState(false);
  const [clock, setClock] = React.useState('05:55:00');
  useAmbientAudio(sound);

  React.useEffect(() => {
    let ticking = false;
    const update = () => {
      const max = document.documentElement.scrollHeight - window.innerHeight;
      progress.current = max > 0 ? window.scrollY / max : 0;
      const next = Math.min(CHAPTERS.length - 1, Math.floor(progress.current * CHAPTERS.length));
      setActive(next);
      document.documentElement.style.setProperty('--journey', progress.current);
      ticking = false;
    };
    const onScroll = () => {
      if (!ticking) { ticking = true; requestAnimationFrame(update); }
    };
    update();
    window.addEventListener('scroll', onScroll, { passive: true });
    const ready = window.setTimeout(() => setLoaded(true), reduced ? 150 : 2450);
    const timer = window.setInterval(() => {
      const elapsed = Math.floor(performance.now() / 1000);
      setClock(`05:55:${String(elapsed % 60).padStart(2, '0')}`);
    }, 1000);
    return () => {
      window.removeEventListener('scroll', onScroll);
      window.clearTimeout(ready);
      window.clearInterval(timer);
    };
  }, [reduced]);

  React.useEffect(() => {
    const cursor = document.querySelector('.cursor');
    const dot = document.querySelector('.cursor-dot');
    if (!cursor || !dot) return;
    let x = innerWidth / 2, y = innerHeight / 2, tx = x, ty = y, raf;
    const move = event => { tx = event.clientX; ty = event.clientY; dot.style.transform = `translate3d(${tx}px,${ty}px,0)`; };
    const animate = () => { x += (tx - x) * .14; y += (ty - y) * .14; cursor.style.transform = `translate3d(${x}px,${y}px,0)`; raf = requestAnimationFrame(animate); };
    window.addEventListener('pointermove', move, { passive: true }); animate();
    return () => { window.removeEventListener('pointermove', move); cancelAnimationFrame(raf); };
  }, []);

  const jump = index => document.getElementById(CHAPTERS[index].id)?.scrollIntoView({ behavior: reduced ? 'auto' : 'smooth' });
  const sectionPanel = index => {
    if (index === 2) return html`<${SensorPanel} />`;
    if (index === 3) return html`<${PredictionPanel} />`;
    if (index === 4) return html`<${TwinPanel} />`;
    if (index === 5) return html`<${FleetPanel} />`;
    if (index === 6) return html`<${EnergyPanel} />`;
    if (index === 7) return html`<${NetworkPanel} />`;
    return null;
  };

  return html`<main className=${`experience ${loaded ? 'is-loaded' : ''} ${reduced ? 'reduce-motion' : ''}`}>
    <${CinematicWorld} progress=${progress} reduced=${reduced} />
    <div className="noise" aria-hidden="true"></div>
    <div className="scanlines" aria-hidden="true"></div>
    <div className="cursor" aria-hidden="true"></div><div className="cursor-dot" aria-hidden="true"></div>

    <header className="topbar">
      <button className="brand" onClick=${() => jump(0)} aria-label="NEXORA — return to the beginning">
        <span className="nexora-mark"><i></i><b></b></span>
        <span className="brand-word">NEXORA<small>NEURAL MOBILITY</small></span>
      </button>
      <div className="system-state"><i></i><span>AUTONOMOUS NETWORK</span><b>2055</b></div>
      <div className="top-tools">
        <span className="clock">${clock} / PST</span>
        <button onClick=${() => setReduced(!reduced)} aria-pressed=${reduced}>${reduced ? 'MOTION — OFF' : 'MOTION — ON'}</button>
        <button className=${sound ? 'is-on' : ''} onClick=${() => setSound(!sound)} aria-pressed=${sound} aria-label=${sound ? 'Mute ambient sound' : 'Play ambient sound'}>
          <span className="equalizer"><i></i><i></i><i></i></span>${sound ? 'SOUND — ON' : 'SOUND — OFF'}
        </button>
      </div>
    </header>

    <nav className="chapter-rail" aria-label="Journey chapters">
      ${CHAPTERS.map((chapter, index) => html`<button key=${chapter.id} className=${active === index ? 'active' : ''} onClick=${() => jump(index)} aria-label=${`Go to ${chapter.nav}`}>
        <span>${chapter.number}</span><i></i><b>${chapter.nav}</b>
      </button>`)}
    </nav>

    <div className="journey-meter" aria-hidden="true"><i></i><span>${String(active + 1).padStart(2, '0')} / ${String(CHAPTERS.length).padStart(2, '0')}</span></div>
    <div className="location-tag"><span>35.6762° N</span><i></i><span>139.6503° E</span></div>

    <div className="chapters">
      ${CHAPTERS.map((chapter, index) => html`<section id=${chapter.id} className=${`chapter chapter-${index} ${index === active ? 'is-active' : ''}`} key=${chapter.id} aria-labelledby=${`title-${chapter.id}`}>
        <div className="chapter-copy">
          <div className="kicker"><span>${chapter.number}</span><i></i><b>${chapter.kicker}</b></div>
          ${index === 0 ? html`<div className="hero-brand">NEXORA</div>` : null}
          <h1 id=${`title-${chapter.id}`}>${chapter.title.map((lineText, lineIndex) => html`<span key=${lineText} style=${{ '--line': lineIndex }}>${lineText}</span>`)}</h1>
          <p>${chapter.body}</p>
          ${index === 0 ? html`<div className="hero-actions">
            <${MagneticButton} primary=${true} onClick=${() => jump(1)}>ENTER THE CITY<//>
            <${MagneticButton} onClick=${() => jump(2)}>WATCH AI DRIVE<//>
          </div>` : null}
          ${index === 8 ? html`<div className="final-actions"><${MagneticButton} primary=${true} onClick=${() => jump(0)}>REPLAY 2055<//><span>NEXORA / THE INTELLIGENCE THAT DRIVES TOMORROW</span></div>` : null}
        </div>
        ${sectionPanel(index)}
        <div className="scene-number" aria-hidden="true">${chapter.number}<span>— 08</span></div>
      </section>`)}
    </div>

    <div className="scroll-prompt"><span>${active === 8 ? 'END OF TRANSMISSION' : 'SCROLL TO MOVE THROUGH 2055'}</span><i></i></div>

    <div className="intro" aria-hidden=${loaded}>
      <div className="intro-core"><i></i><b></b><span></span></div>
      <div className="intro-word">NEXORA</div>
      <p>INITIALIZING COLLECTIVE INTELLIGENCE</p>
      <div className="intro-progress"><i></i></div>
      <small>2055 / NEURAL MOBILITY SYSTEM</small>
    </div>
  </main>`;
}
