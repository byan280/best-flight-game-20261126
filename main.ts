// Skyway — page builder, second rewrite.
//
// This script produces one self-contained HTML file: the Skyway flight
// game. It runs with plain Node, needs no packages and no network, and
// writes nothing except the single page it generates.
//
// The page text is kept in a handful of named sections below and joined
// together. The destination folder honours MAKEFUN_OUTPUT_DIR when that
// variable is set, so the script also works when the checkout itself is
// read-only; otherwise the page lands in an "out" folder beside this file.

import { mkdirSync, writeFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

// Directory that holds this script, resolved from its own URL so the
// default output folder is always next to the script itself.
const SCRIPT_DIR = path.dirname(fileURLToPath(import.meta.url));

function resolveOutputDir(): string {
  const override = process.env.MAKEFUN_OUTPUT_DIR;
  if (override) return override;
  return path.join(SCRIPT_DIR, "out");
}

// First section: document head, styles, overlay markup, and the opening
// of the game script (helpers, canvas setup, input, procedural audio,
// and the start of the shared game state).
const partTop = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Skyway — a little flight game</title>
<style>
  * { box-sizing: border-box; margin: 0; padding: 0; }
  html, body { width: 100%; height: 100%; overflow: hidden; background: #0b1026; }
  body { font-family: "Avenir Next", "Segoe UI", system-ui, -apple-system, sans-serif; color: #fff; }
  #game { position: fixed; inset: 0; width: 100%; height: 100%; display: block; touch-action: none; cursor: crosshair; }
  .overlay {
    position: fixed; inset: 0; display: flex; flex-direction: column;
    align-items: center; justify-content: center; text-align: center;
    padding: 24px; z-index: 5;
  }
  .overlay.hidden { display: none; }
  .panel {
    background: rgba(8, 14, 34, 0.72); border: 1px solid rgba(255,255,255,0.22);
    border-radius: 18px; padding: 28px 34px; max-width: 560px; width: min(92vw, 560px);
    box-shadow: 0 18px 60px rgba(0,0,0,0.45); backdrop-filter: blur(6px);
  }
  h1 { font-size: clamp(44px, 9vw, 72px); letter-spacing: 0.14em; font-weight: 800; line-height: 1; }
  h1 .accent { color: #ffb703; }
  h2 { font-size: clamp(30px, 6vw, 44px); letter-spacing: 0.08em; font-weight: 800; }
  .tag { margin-top: 10px; font-size: 16px; opacity: 0.92; }
  .controls { margin: 18px auto 4px; font-size: 14.5px; line-height: 1.85; opacity: 0.95; text-align: left; display: inline-block; }
  .controls b { color: #8ecae6; font-weight: 700; }
  .best-line { margin-top: 14px; font-size: 15px; letter-spacing: 0.06em; }
  .best-line span { color: #ffb703; font-weight: 700; }
  .score-line { margin-top: 8px; font-size: 19px; }
  .score-line span { color: #ffb703; font-weight: 800; }
  .newbest { margin-top: 8px; font-size: 16px; font-weight: 800; color: #80ed99; letter-spacing: 0.1em; }
  .btn {
    margin-top: 22px; appearance: none; border: 0; cursor: pointer;
    background: linear-gradient(180deg, #ffb703, #fb8500); color: #231303;
    font: inherit; font-size: 18px; font-weight: 800; letter-spacing: 0.12em;
    padding: 13px 34px; border-radius: 999px; box-shadow: 0 8px 24px rgba(251,133,0,0.45);
  }
  .btn:hover { filter: brightness(1.07); }
  .btn:active { transform: translateY(1px); }
  .btn.ghost { background: rgba(255,255,255,0.14); color: #fff; box-shadow: none; border: 1px solid rgba(255,255,255,0.35); }
  .tip { margin-top: 16px; font-size: 13px; opacity: 0.75; }
  #muteBtn {
    position: fixed; top: 14px; right: 14px; z-index: 6; appearance: none; cursor: pointer;
    background: rgba(8,14,34,0.6); color: #fff; border: 1px solid rgba(255,255,255,0.3);
    font: inherit; font-size: 13px; font-weight: 700; letter-spacing: 0.08em;
    padding: 8px 14px; border-radius: 999px;
  }
  #toast {
    position: fixed; left: 50%; top: 74px; transform: translateX(-50%); z-index: 4;
    font-size: 15px; font-weight: 800; letter-spacing: 0.22em; color: #fff;
    text-shadow: 0 2px 10px rgba(0,0,0,0.6); opacity: 0; transition: opacity 0.25s; pointer-events: none;
  }
  @media (max-width: 520px) { .panel { padding: 22px 20px; } .controls { font-size: 13.5px; } }
</style>
</head>
<body>
<canvas id="game"></canvas>
<div id="toast"></div>
<button id="muteBtn" type="button">SOUND: ON</button>

<div class="overlay" id="titleScreen">
  <div class="panel">
    <h1>SKY<span class="accent">WAY</span></h1>
    <p class="tag">Fly far. Thread the rings. Mind the mountains.</p>
    <div class="controls">
      <div><b>Hold &uarr; / W / touch</b> &mdash; climb &nbsp;&middot;&nbsp; <b>&darr; / S</b> &mdash; dive</div>
      <div><b>&larr; / &rarr; or A / D</b> &mdash; slower / faster</div>
      <div><b>Rings</b> build your combo &nbsp;&middot;&nbsp; <b>Stars</b> score &nbsp;&middot;&nbsp; <b>Fuel cans</b> keep you flying</div>
      <div><b>P</b> pause &nbsp;&middot;&nbsp; <b>M</b> sound</div>
    </div>
    <p class="best-line">BEST SCORE &nbsp;<span id="titleBest">0</span></p>
    <button class="btn" id="startBtn" type="button">TAKE OFF</button>
    <p class="tip">Three lives. Empty tank, weak engine. Storms bite.</p>
  </div>
</div>

<div class="overlay hidden" id="overScreen">
  <div class="panel">
    <h2>FLIGHT OVER</h2>
    <p class="score-line">SCORE &nbsp;<span id="finalScore">0</span></p>
    <p class="score-line">DISTANCE &nbsp;<span id="finalDist">0 m</span></p>
    <p class="best-line">BEST &nbsp;<span id="finalBest">0</span></p>
    <p class="newbest hidden" id="newBestTag">NEW BEST!</p>
    <button class="btn" id="restartBtn" type="button">FLY AGAIN</button>
    <p class="tip">Tip: thread three rings in a row to double the third one.</p>
  </div>
</div>

<div class="overlay hidden" id="pauseScreen">
  <div class="panel">
    <h2>PAUSED</h2>
    <p class="tag">The sky waits for no one. Except now.</p>
    <button class="btn" id="resumeBtn" type="button">RESUME</button>
    <button class="btn ghost" id="quitBtn" type="button">BACK TO TITLE</button>
  </div>
</div>

<script>
"use strict";
/* ---------- helpers ---------- */
var TAU = Math.PI * 2;
function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function fract(x) { return x - Math.floor(x); }
function hash(n) { return fract(Math.sin(n * 127.1 + 311.7) * 43758.5453); }
function mulberry32(seed) {
  var a = seed >>> 0;
  return function () {
    a |= 0; a = (a + 0x6D2B79F5) | 0;
    var t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}
function mix3(c1, c2, t) {
  return [Math.round(lerp(c1[0], c2[0], t)), Math.round(lerp(c1[1], c2[1], t)), Math.round(lerp(c1[2], c2[2], t))];
}
function rgb(c) { return "rgb(" + c[0] + "," + c[1] + "," + c[2] + ")"; }

/* ---------- canvas ---------- */
var cv = document.getElementById("game");
var ctx = cv.getContext("2d");
var W = 0, H = 0, DPR = 1;
function resize() {
  DPR = Math.min(window.devicePixelRatio || 1, 2);
  W = window.innerWidth; H = window.innerHeight;
  cv.width = Math.round(W * DPR); cv.height = Math.round(H * DPR);
  ctx.setTransform(DPR, 0, 0, DPR, 0, 0);
}
window.addEventListener("resize", resize);
resize();
function groundY() { return H - 84; }

/* ---------- input ---------- */
var keys = {};
var pointer = { down: false };
window.addEventListener("keydown", function (e) {
  if (["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", "Space"].indexOf(e.code) !== -1) e.preventDefault();
  if (e.repeat) return;
  keys[e.code] = true;
  if (e.code === "Space" || e.code === "Enter") {
    if (G.mode === "title") startGame();
    else if (G.mode === "over") startGame();
    else if (G.mode === "paused") resumeGame();
  }
  if (e.code === "KeyP") {
    if (G.mode === "playing") pauseGame();
    else if (G.mode === "paused") resumeGame();
  }
  if (e.code === "KeyM") toggleMute();
});
window.addEventListener("keyup", function (e) { keys[e.code] = false; });
cv.addEventListener("pointerdown", function () {
  pointer.down = true;
  if (G.mode === "title" || G.mode === "over") startGame();
});
window.addEventListener("pointerup", function () { pointer.down = false; });
window.addEventListener("pointercancel", function () { pointer.down = false; });
cv.addEventListener("touchstart", function (e) { e.preventDefault(); }, { passive: false });

/* ---------- audio (all procedural, no assets) ---------- */
var AU = {
  ctx: null, muted: false, engineOsc: null, engineGain: null, engineFilter: null,
  init: function () {
    if (this.ctx) { if (this.ctx.state === "suspended") this.ctx.resume(); return; }
    try {
      var AC = window.AudioContext || window.webkitAudioContext;
      this.ctx = new AC();
    } catch (err) { this.ctx = null; }
  },
  tone: function (freq, dur, type, vol, slideTo) {
    if (!this.ctx || this.muted) return;
    var t0 = this.ctx.currentTime;
    var o = this.ctx.createOscillator();
    var g = this.ctx.createGain();
    o.type = type || "sine";
    o.frequency.setValueAtTime(freq, t0);
    if (slideTo) o.frequency.exponentialRampToValueAtTime(slideTo, t0 + dur);
    g.gain.setValueAtTime(0.0001, t0);
    g.gain.exponentialRampToValueAtTime(vol || 0.15, t0 + 0.015);
    g.gain.exponentialRampToValueAtTime(0.0001, t0 + dur);
    o.connect(g); g.connect(this.ctx.destination);
    o.start(t0); o.stop(t0 + dur + 0.05);
  },
  chime: function () { this.tone(880, 0.12, "sine", 0.18); this.tone(1318.5, 0.18, "sine", 0.14); },
  pickup: function () { this.tone(1046.5, 0.09, "triangle", 0.16, 1568); },
  fuel: function () { this.tone(523.25, 0.1, "triangle", 0.16); this.tone(784, 0.14, "triangle", 0.14); },
  crash: function () {
    if (!this.ctx || this.muted) return;
    var t0 = this.ctx.currentTime;
    var len = Math.floor(this.ctx.sampleRate * 0.35);
    var buf = this.ctx.createBuffer(1, len, this.ctx.sampleRate);
    var data = buf.getChannelData(0);
    for (var i = 0; i < len; i++) data[i] = (Math.random() * 2 - 1) * (1 - i / len);
    var src = this.ctx.createBufferSource(); src.buffer = buf;
    var g = this.ctx.createGain(); g.gain.value = 0.3;
    src.connect(g); g.connect(this.ctx.destination); src.start(t0);
    this.tone(160, 0.3, "sawtooth", 0.12, 40);
  },
  engineStart: function () {
    if (!this.ctx || this.engineOsc) return;
    var o = this.ctx.createOscillator();
    var g = this.ctx.createGain();
    var f = this.ctx.createBiquadFilter();
    o.type = "sawtooth"; o.frequency.value = 70;
    f.type = "lowpass"; f.frequency.value = 320;
    g.gain.value = this.muted ? 0 : 0.05;
    o.connect(f); f.connect(g); g.connect(this.ctx.destination);
    o.start();
    this.engineOsc = o; this.engineGain = g; this.engineFilter = f;
  },
  engineSet: function (frac) {
    if (!this.engineOsc) return;
    this.engineOsc.frequency.value = 55 + frac * 75;
    this.engineGain.gain.value = this.muted ? 0 : 0.035 + frac * 0.03;
  },
  engineStop: function () {
    if (!this.engineOsc) return;
    try { this.engineOsc.stop(); } catch (err) {}
    this.engineOsc = null; this.engineGain = null; this.engineFilter = null;
  }
};
function toggleMute() {
  AU.muted = !AU.muted;
  document.getElementById("muteBtn").textContent = AU.muted ? "SOUND: OFF" : "SOUND: ON";
  if (AU.engineGain) AU.engineGain.gain.value = AU.muted ? 0 : 0.05;
}
/* ---------- state ---------- */
function loadBest() {
  try { return parseInt(window.localStorage.getItem("skyway-best") || "0", 10) || 0; }
  catch (err) { return 0; }
}
function saveBest(v) {
  try { window.localStorage.setItem("skyway-best", String(v)); } catch (err) {}
}
var G = {
  mode: "title", time: 0, dist: 0, score: 0, best: loadBest(), combo: 1,
  speed: 280, baseSpeed: 280, shake: 0, spawnIn: 500, gustT: 0, gustNext: 16,
`;

// Second section: the rest of the shared state, entity spawners, the
// per-frame update with collisions, and the start of the render code.
const partState = `  flash: 0, toastT: 0,
  rings: [], stars: [], fuels: [], mounts: [], birds: [], balloons: [], storms: [],
  clouds: [], parts: [], floats: []
};
var plane = { x: 0, y: 0, vy: 0, r: 16, fuel: 100, lives: 3, inv: 0, prop: 0, trailT: 0 };
function resetPlane() {
  plane.x = Math.round(W * 0.22);
  plane.y = Math.round(H * 0.42);
  plane.vy = 0; plane.fuel = 100; plane.lives = 3; plane.inv = 0; plane.prop = 0;
}
/* deterministic starfield + drifting clouds, seeded so every load looks composed */
var starRng = mulberry32(20261126);
var starfield = [];
for (var si = 0; si < 90; si++) {
  starfield.push({ x: starRng(), y: starRng() * 0.55, r: 0.6 + starRng() * 1.5, tw: starRng() * TAU });
}
for (var ci = 0; ci < 9; ci++) {
  G.clouds.push({ x: hash(ci * 3 + 1) * 1.4, y: 0.06 + hash(ci * 7 + 2) * 0.42, s: 0.6 + hash(ci * 5 + 3) * 0.9, drift: 6 + hash(ci + 9) * 10 });
}
function showToast(text, secs) {
  var el = document.getElementById("toast");
  el.textContent = text;
  el.style.opacity = "1";
  G.toastT = secs || 2.2;
}
function addFloat(x, y, text, color) {
  G.floats.push({ x: x, y: y, text: text, color: color, life: 1.1 });
}
function burst(x, y, color, n, spd) {
  for (var i = 0; i < n; i++) {
    var a = Math.random() * TAU;
    var v = (spd || 120) * (0.35 + Math.random() * 0.85);
    G.parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: 0.5 + Math.random() * 0.5, max: 1, size: 2 + Math.random() * 3.5, color: color, grav: 160 });
  }
}

/* ---------- spawners ---------- */
function spawnRingArc(cx, cy) {
  for (var i = -1; i <= 1; i++) {
    G.rings.push({ x: cx + i * 90, y: cy + i * i * 26 - 26, r: 30, done: false, ph: Math.random() * TAU });
  }
}
function spawnStarRow(cx, cy, n) {
  for (var i = 0; i < n; i++) {
    G.stars.push({ x: cx + i * 56, y: cy + Math.sin(i * 1.1) * 18, r: 13, ph: Math.random() * TAU });
  }
}
function spawnMountainPair(cx) {
  var gy = groundY();
  var h1 = 90 + Math.random() * 150;
  var h2 = 90 + Math.random() * 150;
  var gap = 190 + Math.random() * 90;
  G.mounts.push({ x: cx, w: 150 + Math.random() * 90, h: h1, peak: 0.42 + Math.random() * 0.2 });
  G.mounts.push({ x: cx + gap + 170, w: 150 + Math.random() * 90, h: h2, peak: 0.42 + Math.random() * 0.2 });
}
function spawnHazard(cx) {
  var roll = Math.random();
  var gy = groundY();
  if (roll < 0.4) {
    var n = 2 + Math.floor(Math.random() * 3);
    for (var i = 0; i < n; i++) {
      G.birds.push({ x: cx + i * 70, y: 90 + Math.random() * (gy - 320), ph: Math.random() * TAU, spd: 30 + Math.random() * 40 });
    }
  } else if (roll < 0.7) {
    G.balloons.push({ x: cx, y: 110 + Math.random() * (gy - 360), r: 26 + Math.random() * 10, hue: Math.floor(Math.random() * 360), bob: Math.random() * TAU });
  } else {
    G.storms.push({ x: cx, y: 100 + Math.random() * (gy - 380), r: 52 + Math.random() * 18, flash: 0, flashNext: 1 + Math.random() * 2 });
  }
}
function spawnPattern() {
  var cx = W + 120;
  var gy = groundY();
  var tier = Math.min(3, Math.floor(G.dist / 2200));
  var roll = Math.random();
  if (roll < 0.3) {
    spawnRingArc(cx + 120, 110 + Math.random() * (gy - 300));
    if (Math.random() < 0.55) spawnStarRow(cx + 60, 120 + Math.random() * (gy - 320), 4);
  } else if (roll < 0.5) {
    spawnStarRow(cx + 60, 120 + Math.random() * (gy - 320), 5);
    if (Math.random() < 0.5) G.fuels.push({ x: cx + 320, y: 130 + Math.random() * (gy - 330), ph: 0 });
  } else if (roll < 0.72) {
    spawnMountainPair(cx);
    if (Math.random() < 0.6) spawnRingArc(cx + 320, 130 + Math.random() * (gy - 340));
  } else if (roll < 0.86) {
    spawnHazard(cx + 80);
    if (Math.random() < 0.5) spawnStarRow(cx + 40, 130 + Math.random() * (gy - 330), 3);
  } else {
    if (tier >= 1) spawnHazard(cx + 60);
    spawnRingArc(cx + 200, 120 + Math.random() * (gy - 320));
    if (Math.random() < 0.4) G.fuels.push({ x: cx + 420, y: 140 + Math.random() * (gy - 340), ph: 0 });
  }
}

/* ---------- update ---------- */
function thrusting() {
  return !!(keys["ArrowUp"] || keys["KeyW"] || keys["Space"] || pointer.down);
}
function update(dt) {
  G.time += dt;
  var gy = groundY();
  /* difficulty: speed grows with distance, spawn gap shrinks */
  var target = Math.min(560, G.baseSpeed + G.dist * 0.004);
  if (keys["ArrowRight"] || keys["KeyD"]) target += 70;
  if (keys["ArrowLeft"] || keys["KeyA"]) target -= 80;
  G.speed = lerp(G.speed, clamp(target, 170, 640), 1 - Math.pow(0.001, dt));
  var dx = G.speed * dt;
  G.dist += dx;
  G.score = Math.max(G.score, Math.floor(G.dist / 10));
  /* wind gusts */
  G.gustNext -= dt;
  if (G.gustNext <= 0) {
    G.gustT = 2.6; G.gustNext = 17 + Math.random() * 13;
    showToast("WIND GUST", 1.6);
  }
  if (G.gustT > 0) G.gustT -= dt;
  /* plane physics */
  var power = plane.fuel > 0 ? 1 : 0.35;
  var gravity = 1450, lift = 2650 * power;
  if (thrusting()) plane.vy -= lift * dt;
  plane.vy += gravity * dt;
  if (G.gustT > 0) plane.vy += Math.sin(G.time * 7.3) * 260 * dt;
  plane.vy = clamp(plane.vy, -540, 640);
  plane.y += plane.vy * dt;
  plane.prop += dt * (18 + G.speed * 0.05);
  plane.inv = Math.max(0, plane.inv - dt);
  plane.fuel = Math.max(0, plane.fuel - dt * (1.35 + (thrusting() ? 1.25 : 0)));
  if (plane.y < 26) { plane.y = 26; plane.vy = Math.max(plane.vy, 0); }
  /* engine trail */
  plane.trailT -= dt;
  if (plane.trailT <= 0) {
    plane.trailT = 0.05;
    G.parts.push({ x: plane.x - 22, y: plane.y + 4, vx: -G.speed * 0.35, vy: 12 + Math.random() * 16, life: 0.55, max: 0.55, size: 2.5 + Math.random() * 2, color: "#e8e8e8", grav: -30 });
  }
  /* spawn director */
  G.spawnIn -= dx;
  if (G.spawnIn <= 0) { spawnPattern(); G.spawnIn = 430 + Math.random() * 260 - Math.min(160, G.dist * 0.004); }
  /* move world */
  var i, e;
  function sweep(arr, fn) {
    for (var k = arr.length - 1; k >= 0; k--) { if (fn(arr[k], dt)) arr.splice(k, 1); }
  }
  sweep(G.rings, function (r) { r.x -= dx; r.ph += dt * 2; return r.x < -80; });
  sweep(G.stars, function (s) { s.x -= dx; s.ph += dt * 3; return s.x < -50; });
  sweep(G.fuels, function (f) { f.x -= dx; f.ph += dt * 2; return f.x < -50; });
  sweep(G.mounts, function (m) { m.x -= dx; return m.x + m.w < -20; });
  sweep(G.birds, function (b) { b.x -= dx + b.spd * dt; b.y += Math.sin(G.time * 6 + b.ph) * 26 * dt; b.ph += dt * 9; return b.x < -60; });
  sweep(G.balloons, function (b) { b.x -= dx * 0.92; b.y += Math.sin(G.time * 0.9 + b.bob) * 9 * dt; return b.x < -90; });
  sweep(G.storms, function (s) {
    s.x -= dx * 0.94; s.flashNext -= dt;
    if (s.flashNext <= 0) { s.flash = 0.16; s.flashNext = 1.2 + Math.random() * 2.4; }
    if (s.flash > 0) s.flash -= dt;
    return s.x < -120;
  });
  sweep(G.clouds, function (c) { c.x -= (dx * 0.12 + c.drift * dt) / W; return c.x < -0.25; });
  if (G.clouds.length < 9 && Math.random() < 0.01) {
    G.clouds.push({ x: 1.15, y: 0.05 + Math.random() * 0.42, s: 0.6 + Math.random() * 0.9, drift: 6 + Math.random() * 10 });
  }
  sweep(G.parts, function (p) {
    p.life -= dt; p.x += p.vx * dt; p.y += p.vy * dt; p.vy += p.grav * dt; p.vx -= dx * 0.4 * dt;
    return p.life <= 0;
  });
  sweep(G.floats, function (f) { f.life -= dt; f.y -= 34 * dt; return f.life <= 0; });
  G.shake = Math.max(0, G.shake - dt * 26);
  if (G.toastT > 0) {
    G.toastT -= dt;
    if (G.toastT <= 0) document.getElementById("toast").style.opacity = "0";
  }
  /* ring resolution: crossed the plane's x? */
  for (i = 0; i < G.rings.length; i++) {
    e = G.rings[i];
    if (!e.done && e.x < plane.x) {
      e.done = true;
      if (Math.abs(plane.y - e.y) < e.r * 0.8 && plane.inv <= 0) {
        var gained = 50 * G.combo;
        G.score += gained;
        addFloat(e.x, e.y - 34, "+" + gained, "#ffd60a");
        addFloat(e.x, e.y - 52, G.combo > 1 ? "COMBO x" + G.combo : "RING!", "#ffffff");
        burst(e.x, e.y, "#ffd60a", 16, 170);
        AU.chime();
        G.combo++;
      } else {
        G.combo = 1;
      }
    }
  }
  /* pickups + hazards */
  function near(x, y, r) {
    var ddx = plane.x - x, ddy = plane.y - y;
    return ddx * ddx + ddy * ddy < (r + plane.r) * (r + plane.r);
  }
  sweep(G.stars, function (s) {
    if (near(s.x, s.y, s.r) && plane.inv <= 0) { G.score += 25; addFloat(s.x, s.y - 20, "+25", "#fff3b0"); burst(s.x, s.y, "#ffe66d", 10, 130); AU.pickup(); return true; }
    return false;
  });
  sweep(G.fuels, function (f) {
    if (near(f.x, f.y, 20) && plane.inv <= 0) {
      plane.fuel = Math.min(100, plane.fuel + 40); G.score += 10;
      addFloat(f.x, f.y - 20, "+FUEL", "#80ed99"); burst(f.x, f.y, "#80ed99", 10, 120); AU.fuel(); return true;
    }
    return false;
  });
  if (plane.inv <= 0) {
    var hit = false;
    for (i = 0; i < G.mounts.length && !hit; i++) {
      var m = G.mounts[i];
      if (plane.x + plane.r > m.x && plane.x - plane.r < m.x + m.w) {
        var px = m.x + m.w * m.peak;
        var surf;
        if (plane.x <= px) surf = gy - (m.h * (plane.x - m.x)) / (m.w * m.peak);
        else surf = gy - (m.h * (m.x + m.w - plane.x)) / (m.w * (1 - m.peak));
        if (plane.y + plane.r * 0.7 > surf) hit = true;
      }
    }
    for (i = 0; i < G.birds.length && !hit; i++) if (near(G.birds[i].x, G.birds[i].y, 13)) hit = true;
    for (i = 0; i < G.balloons.length && !hit; i++) if (near(G.balloons[i].x, G.balloons[i].y, G.balloons[i].r)) hit = true;
    for (i = 0; i < G.storms.length && !hit; i++) if (near(G.storms[i].x, G.storms[i].y, G.storms[i].r * 0.8)) hit = true;
    if (plane.y + plane.r > gy) hit = true;
    if (hit) crash();
  }
  /* engine sound follows speed */
  AU.engineSet((G.speed - 170) / 470);
}
function crash() {
  burst(plane.x, plane.y, "#ff6b35", 34, 260);
  burst(plane.x, plane.y, "#ffd60a", 20, 200);
  G.shake = 15;
  AU.crash();
  plane.lives--;
  if (plane.lives <= 0) { gameOver(); return; }
  plane.inv = 2.5;
  plane.y = Math.round(H * 0.38);
  plane.vy = 0;
  plane.fuel = Math.max(plane.fuel, 42);
  G.speed = Math.max(240, G.speed * 0.72);
  showToast("OUCH — " + plane.lives + (plane.lives === 1 ? " LIFE" : " LIVES") + " LEFT", 1.6);
}
/* ---------- rendering ---------- */
var SKIES = [
  { top: [58, 134, 212], hor: [191, 230, 255], sun: [255, 214, 90], night: 0 },
  { top: [43, 42, 107], hor: [255, 154, 90], sun: [255, 122, 60], night: 0.25 },
  { top: [11, 16, 38], hor: [39, 75, 115], sun: [235, 240, 255], night: 1 }
];
function skyMix() {
  var ph = (G.dist / 4500) % 3;
  var i0 = Math.floor(ph), f = ph - i0;
  var t = clamp((f - 0.8) / 0.2, 0, 1);
  var a = SKIES[i0], b = SKIES[(i0 + 1) % 3];
  return {
    top: mix3(a.top, b.top, t), hor: mix3(a.hor, b.hor, t),
    sun: mix3(a.sun, b.sun, t), night: lerp(a.night, b.night, t)
  };
}
function drawSky(sky) {
  var g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, rgb(sky.top));
  g.addColorStop(0.7, rgb(sky.hor));
  g.addColorStop(1, rgb(mix3(sky.hor, [240, 230, 200], 0.35)));
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  /* stars */
`;

// Third section: the rest of the drawing routines — sky and stars,
// ridges, clouds, ground, mountains, rings, pickups, birds, balloons,
// storms, and the start of the plane drawing.
const partRender = `  if (sky.night > 0.05) {
    ctx.save();
    ctx.globalAlpha = sky.night;
    for (var i = 0; i < starfield.length; i++) {
      var st = starfield[i];
      var tw = 0.55 + 0.45 * Math.sin(G.time * 2 + st.tw);
      ctx.globalAlpha = sky.night * tw;
      ctx.fillStyle = "#ffffff";
      ctx.beginPath();
      ctx.arc(st.x * W, st.y * H, st.r, 0, TAU);
      ctx.fill();
    }
    ctx.restore();
  }
  /* sun / moon with glow */
  var sx = W * 0.78, sy = H * 0.17, sr = 34;
  var glow = ctx.createRadialGradient(sx, sy, sr * 0.3, sx, sy, sr * 3.2);
  var sc = rgb(sky.sun);
  glow.addColorStop(0, sc);
  glow.addColorStop(0.25, sc.replace("rgb", "rgba").replace(")", ",0.45)"));
  glow.addColorStop(1, sc.replace("rgb", "rgba").replace(")", ",0)"));
  ctx.fillStyle = glow;
  ctx.fillRect(sx - sr * 3.2, sy - sr * 3.2, sr * 6.4, sr * 6.4);
  ctx.fillStyle = sc;
  ctx.beginPath(); ctx.arc(sx, sy, sr, 0, TAU); ctx.fill();
  if (sky.night > 0.5) {
    ctx.fillStyle = rgb(sky.top);
    ctx.beginPath(); ctx.arc(sx + 13, sy - 7, sr * 0.88, 0, TAU); ctx.fill();
  }
}
function drawRidge(off, amp, base, color) {
  ctx.fillStyle = color;
  ctx.beginPath();
  ctx.moveTo(-4, groundY() + 4);
  for (var x = -4; x <= W + 14; x += 14) {
    var wx = x + off;
    var y = base - (Math.sin(wx * 0.008) * 0.5 + 0.5) * amp - (Math.sin(wx * 0.021 + 2) * 0.5 + 0.5) * amp * 0.55;
    ctx.lineTo(x, y);
  }
  ctx.lineTo(W + 4, groundY() + 4);
  ctx.closePath();
  ctx.fill();
}
function drawClouds(sky) {
  for (var i = 0; i < G.clouds.length; i++) {
    var c = G.clouds[i];
    var x = c.x * W, y = c.y * H, s = c.s;
    var shade = 255 - Math.round(sky.night * 90);
    ctx.fillStyle = "rgba(" + shade + "," + shade + "," + Math.min(255, shade + 8) + ",0.88)";
    ctx.beginPath();
    ctx.ellipse(x, y, 52 * s, 20 * s, 0, 0, TAU);
    ctx.ellipse(x - 34 * s, y + 6 * s, 34 * s, 15 * s, 0, 0, TAU);
    ctx.ellipse(x + 36 * s, y + 5 * s, 36 * s, 16 * s, 0, 0, TAU);
    ctx.ellipse(x + 6 * s, y - 13 * s, 30 * s, 15 * s, 0, 0, TAU);
    ctx.fill();
  }
}
function drawGround() {
  var gy = groundY();
  ctx.fillStyle = "#7d9b4f";
  ctx.fillRect(0, gy, W, H - gy);
  ctx.fillStyle = "#9c7a54";
  ctx.fillRect(0, gy + 26, W, H - gy - 26);
  ctx.fillStyle = "#a8c46a";
  ctx.fillRect(0, gy, W, 5);
  /* scrolling runway dashes */
  ctx.fillStyle = "rgba(255,255,255,0.75)";
  var dashOff = G.dist % 90;
  for (var x = -dashOff; x < W; x += 90) ctx.fillRect(x, gy + 10, 44, 4);
  /* trees and houses, keyed to world slots so they stay put */
  var slotW = 170;
  var baseSlot = Math.floor(G.dist / slotW);
  for (var k = -1; k <= Math.ceil(W / slotW) + 1; k++) {
    var idx = baseSlot + k;
    var sx = k * slotW - (G.dist % slotW);
    var r = hash(idx);
    if (r < 0.42) {
      var th = 26 + hash(idx * 3) * 22;
      ctx.fillStyle = "#6b4a2b";
      ctx.fillRect(sx - 3, gy - 12, 6, 12);
      ctx.fillStyle = "#2f6b33";
      ctx.beginPath();
      ctx.moveTo(sx, gy - 12 - th);
      ctx.lineTo(sx - 15, gy - 12);
      ctx.lineTo(sx + 15, gy - 12);
      ctx.closePath();
      ctx.fill();
    } else if (r < 0.56) {
      ctx.fillStyle = "#e8dcc8";
      ctx.fillRect(sx - 20, gy - 24, 40, 24);
      ctx.fillStyle = "#b3543f";
      ctx.beginPath();
      ctx.moveTo(sx - 24, gy - 24);
      ctx.lineTo(sx, gy - 40);
      ctx.lineTo(sx + 24, gy - 24);
      ctx.closePath();
      ctx.fill();
    }
  }
}
function drawMounts() {
  var gy = groundY();
  for (var i = 0; i < G.mounts.length; i++) {
    var m = G.mounts[i];
    var px = m.x + m.w * m.peak;
    ctx.fillStyle = "#5d6b7a";
    ctx.beginPath();
    ctx.moveTo(m.x, gy);
    ctx.lineTo(px, gy - m.h);
    ctx.lineTo(m.x + m.w, gy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#77879a";
    ctx.beginPath();
    ctx.moveTo(px, gy - m.h);
    ctx.lineTo(m.x + m.w, gy);
    ctx.lineTo(px, gy);
    ctx.closePath();
    ctx.fill();
    ctx.fillStyle = "#f4f8ff";
    ctx.beginPath();
    ctx.moveTo(px, gy - m.h);
    ctx.lineTo(px - m.w * 0.09, gy - m.h * 0.78);
    ctx.lineTo(px - m.w * 0.02, gy - m.h * 0.84);
    ctx.lineTo(px + m.w * 0.04, gy - m.h * 0.76);
    ctx.lineTo(px + m.w * 0.1, gy - m.h * 0.8);
    ctx.closePath();
    ctx.fill();
  }
}
function drawRings() {
  for (var i = 0; i < G.rings.length; i++) {
    var r = G.rings[i];
    var pulse = 1 + Math.sin(r.ph) * 0.05;
    ctx.save();
    ctx.globalAlpha = r.done ? 0.3 : 1;
    ctx.strokeStyle = "#ffd60a";
    ctx.lineWidth = 6;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r * pulse, 0, TAU); ctx.stroke();
    ctx.strokeStyle = "#fff3b0";
    ctx.lineWidth = 2;
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r * pulse, 0, TAU); ctx.stroke();
    ctx.fillStyle = "rgba(255,214,10,0.16)";
    ctx.beginPath(); ctx.arc(r.x, r.y, r.r * pulse, 0, TAU); ctx.fill();
    ctx.restore();
  }
}
function drawPickups() {
  var i, s;
  for (i = 0; i < G.stars.length; i++) {
    s = G.stars[i];
    var tw = 0.7 + 0.3 * Math.sin(s.ph);
    ctx.save();
    ctx.translate(s.x, s.y);
    ctx.rotate(s.ph * 0.4);
    ctx.globalAlpha = tw;
    ctx.fillStyle = "#ffe66d";
    ctx.beginPath();
    for (var p = 0; p < 5; p++) {
      var a = -Math.PI / 2 + p * TAU / 5;
      var a2 = a + TAU / 10;
      ctx.lineTo(Math.cos(a) * s.r, Math.sin(a) * s.r);
      ctx.lineTo(Math.cos(a2) * s.r * 0.45, Math.sin(a2) * s.r * 0.45);
    }
    ctx.closePath();
    ctx.fill();
    ctx.restore();
  }
  for (i = 0; i < G.fuels.length; i++) {
    var f = G.fuels[i];
    var bob = Math.sin(f.ph) * 4;
    ctx.save();
    ctx.translate(f.x, f.y + bob);
    ctx.fillStyle = "#d90429";
    ctx.fillRect(-11, -13, 22, 26);
    ctx.fillStyle = "#8d0801";
    ctx.fillRect(-11, -13, 22, 5);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px system-ui, sans-serif";
    ctx.textAlign = "center"; ctx.textBaseline = "middle";
    ctx.fillText("F", 0, 3);
    ctx.restore();
  }
}
function drawBirds() {
  ctx.strokeStyle = "#2b2d42";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  for (var i = 0; i < G.birds.length; i++) {
    var b = G.birds[i];
    var flap = Math.sin(b.ph) * 8;
    ctx.beginPath();
    ctx.moveTo(b.x - 12, b.y - flap);
    ctx.quadraticCurveTo(b.x - 4, b.y + 3, b.x, b.y);
    ctx.quadraticCurveTo(b.x + 4, b.y + 3, b.x + 12, b.y - flap);
    ctx.stroke();
  }
}
function drawBalloons() {
  for (var i = 0; i < G.balloons.length; i++) {
    var b = G.balloons[i];
    ctx.save();
    ctx.translate(b.x, b.y);
    ctx.fillStyle = "hsl(" + b.hue + ",75%,58%)";
    ctx.beginPath(); ctx.ellipse(0, -14, b.r * 0.78, b.r, 0, 0, TAU); ctx.fill();
    ctx.fillStyle = "rgba(255,255,255,0.35)";
    ctx.beginPath(); ctx.ellipse(-b.r * 0.28, -14, b.r * 0.22, b.r * 0.8, -0.15, 0, TAU); ctx.fill();
    ctx.strokeStyle = "#3a3a3a"; ctx.lineWidth = 1.5;
    ctx.beginPath();
    ctx.moveTo(-b.r * 0.4, b.r - 16); ctx.lineTo(-7, b.r + 8);
    ctx.moveTo(b.r * 0.4, b.r - 16); ctx.lineTo(7, b.r + 8);
    ctx.stroke();
    ctx.fillStyle = "#6b4a2b";
    ctx.fillRect(-8, b.r + 8, 16, 11);
    ctx.restore();
  }
}
function drawStorms() {
  for (var i = 0; i < G.storms.length; i++) {
    var s = G.storms[i];
    ctx.fillStyle = "#3d405b";
    ctx.beginPath();
    ctx.ellipse(s.x, s.y, s.r, s.r * 0.55, 0, 0, TAU);
    ctx.ellipse(s.x - s.r * 0.55, s.y + 6, s.r * 0.6, s.r * 0.4, 0, 0, TAU);
    ctx.ellipse(s.x + s.r * 0.55, s.y + 6, s.r * 0.6, s.r * 0.4, 0, 0, TAU);
    ctx.fill();
    ctx.fillStyle = "#2b2d42";
    ctx.beginPath();
    ctx.ellipse(s.x, s.y + s.r * 0.28, s.r * 0.9, s.r * 0.3, 0, 0, TAU);
    ctx.fill();
    if (s.flash > 0) {
      ctx.strokeStyle = "#ffe66d";
      ctx.lineWidth = 3;
      ctx.beginPath();
      ctx.moveTo(s.x, s.y + s.r * 0.3);
      ctx.lineTo(s.x - 8, s.y + s.r * 0.85);
      ctx.lineTo(s.x + 2, s.y + s.r * 0.85);
      ctx.lineTo(s.x - 6, s.y + s.r * 1.35);
      ctx.stroke();
    }
    ctx.strokeStyle = "rgba(174,194,255,0.5)";
    ctx.lineWidth = 1;
    for (var d = -2; d <= 2; d++) {
      ctx.beginPath();
      ctx.moveTo(s.x + d * 16, s.y + s.r * 0.5);
      ctx.lineTo(s.x + d * 16 - 4, s.y + s.r * 0.5 + 18);
      ctx.stroke();
    }
  }
}
function drawPlane() {
  var blink = plane.inv > 0 && Math.floor(G.time * 12) % 2 === 0;
  ctx.save();
  ctx.translate(plane.x, plane.y);
  ctx.rotate(clamp(plane.vy / 900, -0.45, 0.5));
  if (blink) ctx.globalAlpha = 0.35;
  /* tail + fuselage */
  ctx.fillStyle = "#8d0801";
  ctx.beginPath();
  ctx.moveTo(-20, -3); ctx.lineTo(-30, -14); ctx.lineTo(-24, 0); ctx.lineTo(-30, 2);
`;

// Fourth section: the rest of the plane drawing, particles, floating
// scores, the HUD, the frame composer, screen flow, and the main loop,
// followed by the document closing tags.
const partFinal = `  ctx.closePath(); ctx.fill();
  var body = ctx.createLinearGradient(0, -12, 0, 12);
  body.addColorStop(0, "#ef476f"); body.addColorStop(0.55, "#e63946"); body.addColorStop(1, "#b0222f");
  ctx.fillStyle = body;
  ctx.beginPath();
  ctx.ellipse(0, 0, 26, 10, 0, 0, TAU);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(-6, -9, 12, 3);
  /* wing */
  ctx.fillStyle = "#f4f1de";
  ctx.beginPath();
  ctx.moveTo(-4, 2); ctx.lineTo(-12, 20); ctx.lineTo(-2, 20); ctx.lineTo(8, 2);
  ctx.closePath(); ctx.fill();
  /* cockpit */
  ctx.fillStyle = "#caf0f8";
  ctx.beginPath(); ctx.ellipse(9, -5, 7, 5, -0.2, 0, TAU); ctx.fill();
  ctx.fillStyle = "#1d3557";
  ctx.beginPath(); ctx.ellipse(10, -5, 4, 3, -0.2, 0, TAU); ctx.fill();
  /* propeller */
  var pa = plane.prop;
  ctx.strokeStyle = "rgba(30,30,30,0.85)";
  ctx.lineWidth = 3;
  ctx.beginPath();
  ctx.moveTo(26 + Math.cos(pa) * 12, Math.sin(pa) * 12);
  ctx.lineTo(26 - Math.cos(pa) * 12, -Math.sin(pa) * 12);
  ctx.stroke();
  ctx.fillStyle = "#333";
  ctx.beginPath(); ctx.arc(26, 0, 3, 0, TAU); ctx.fill();
  ctx.restore();
}
function drawParticles() {
  for (var i = 0; i < G.parts.length; i++) {
    var p = G.parts[i];
    ctx.globalAlpha = clamp(p.life / p.max, 0, 1);
    ctx.fillStyle = p.color;
    ctx.beginPath(); ctx.arc(p.x, p.y, p.size, 0, TAU); ctx.fill();
  }
  ctx.globalAlpha = 1;
}
function drawFloats() {
  ctx.textAlign = "center"; ctx.textBaseline = "middle";
  for (var i = 0; i < G.floats.length; i++) {
    var f = G.floats[i];
    ctx.globalAlpha = clamp(f.life, 0, 1);
    ctx.font = "800 20px system-ui, sans-serif";
    ctx.fillStyle = f.color;
    ctx.fillText(f.text, f.x, f.y);
  }
  ctx.globalAlpha = 1;
}
function drawHUD() {
  ctx.textBaseline = "alphabetic";
  /* left panel */
  ctx.fillStyle = "rgba(8,14,34,0.55)";
  ctx.beginPath(); ctx.roundRect(14, 14, 196, 74, 12); ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.textAlign = "left";
  ctx.font = "800 21px system-ui, sans-serif";
  ctx.fillText("SCORE " + G.score, 26, 42);
  ctx.font = "600 14px system-ui, sans-serif";
  ctx.fillStyle = "#cdd7ff";
  ctx.fillText("BEST " + G.best + "   DIST " + Math.floor(G.dist / 10) + " m", 26, 66);
  /* fuel bar, top center */
  var fw = Math.min(240, W * 0.3);
  var fx = W / 2 - fw / 2;
  ctx.fillStyle = "rgba(8,14,34,0.55)";
  ctx.beginPath(); ctx.roundRect(fx - 10, 14, fw + 20, 34, 10); ctx.fill();
  ctx.fillStyle = "#2b2d42";
  ctx.beginPath(); ctx.roundRect(fx, 24, fw, 13, 6); ctx.fill();
  var fuelFrac = plane.fuel / 100;
  ctx.fillStyle = fuelFrac < 0.25 ? (Math.floor(G.time * 4) % 2 ? "#ff595e" : "#ffb703") : "#80ed99";
  if (fuelFrac > 0) { ctx.beginPath(); ctx.roundRect(fx, 24, fw * fuelFrac, 13, 6); ctx.fill(); }
  ctx.fillStyle = "#ffffff";
  ctx.font = "700 11px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("FUEL", W / 2, 30);
  /* speed / altitude / lives, top right */
  ctx.textAlign = "right";
  ctx.fillStyle = "#ffffff";
  ctx.font = "800 19px system-ui, sans-serif";
  ctx.fillText(Math.round(G.speed * 0.9) + " km/h", W - 26, 44);
  ctx.font = "600 14px system-ui, sans-serif";
  ctx.fillStyle = "#cdd7ff";
  ctx.fillText("ALT " + Math.max(0, Math.round((groundY() - plane.y) / 4)) + " m", W - 26, 66);
  for (var l = 0; l < 3; l++) {
    ctx.fillStyle = l < plane.lives ? "#e63946" : "rgba(255,255,255,0.25)";
    ctx.beginPath(); ctx.arc(W - 30 - l * 20, 86, 6, 0, TAU); ctx.fill();
  }
  /* combo badge */
  if (G.combo > 1 && G.mode === "playing") {
    var pulse = 1 + Math.sin(G.time * 6) * 0.06;
    ctx.save();
    ctx.translate(W / 2, 66);
    ctx.scale(pulse, pulse);
    ctx.font = "800 17px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = "#ffd60a";
    ctx.fillText("COMBO x" + G.combo, 0, 0);
    ctx.restore();
  }
  if (plane.fuel <= 0 && G.mode === "playing") {
    ctx.font = "800 16px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.fillStyle = Math.floor(G.time * 4) % 2 ? "#ff595e" : "#ffffff";
    ctx.fillText("OUT OF FUEL — FIND A CAN", W / 2, 92);
  }
}
function render() {
  var sky = skyMix();
  ctx.save();
  if (G.shake > 0) {
    ctx.translate((Math.random() - 0.5) * G.shake, (Math.random() - 0.5) * G.shake);
  }
  drawSky(sky);
  drawRidge(G.dist * 0.12, 60, groundY() - 60, "rgba(90,110,140,0.75)");
  drawClouds(sky);
  drawRidge(G.dist * 0.3, 90, groundY() - 26, "rgba(70,92,120,0.9)");
  drawGround();
  drawMounts();
  drawRings();
  drawPickups();
  drawBirds();
  drawBalloons();
  drawStorms();
  drawParticles();
  if (G.mode !== "title") drawPlane();
  else {
    var bobY = H * 0.42 + Math.sin(G.time * 1.6) * 10;
    var saveY = plane.y;
    plane.y = bobY;
    plane.x = Math.round(W * 0.22);
    drawPlane();
    plane.y = saveY;
  }
  drawFloats();
  if (sky.night > 0.05) {
    ctx.fillStyle = "rgba(5,8,25," + (sky.night * 0.14) + ")";
    ctx.fillRect(0, 0, W, H);
  }
  ctx.restore();
  if (G.mode === "playing" || G.mode === "paused") drawHUD();
}
/* ---------- flow ---------- */
function showScreen(id) {
  var ids = ["titleScreen", "overScreen", "pauseScreen"];
  for (var i = 0; i < ids.length; i++) {
    document.getElementById(ids[i]).classList.toggle("hidden", ids[i] !== id);
  }
}
function startGame() {
  AU.init();
  AU.engineStart();
  G.mode = "playing";
  G.time = 0; G.dist = 0; G.score = 0; G.combo = 1;
  G.speed = G.baseSpeed; G.shake = 0; G.gustT = 0; G.gustNext = 16;
  G.rings = []; G.stars = []; G.fuels = []; G.mounts = [];
  G.birds = []; G.balloons = []; G.storms = []; G.parts = []; G.floats = [];
  G.spawnIn = 500;
  resetPlane();
  spawnRingArc(W + 220, H * 0.38);
  spawnStarRow(W + 420, H * 0.3, 4);
  document.getElementById("toast").style.opacity = "0";
  showScreen(null);
}
function pauseGame() {
  if (G.mode !== "playing") return;
  G.mode = "paused";
  AU.engineSet(0);
  showScreen("pauseScreen");
}
function resumeGame() {
  if (G.mode !== "paused") return;
  G.mode = "playing";
  showScreen(null);
}
function quitToTitle() {
  G.mode = "title";
  AU.engineStop();
  document.getElementById("titleBest").textContent = String(G.best);
  showScreen("titleScreen");
}
function gameOver() {
  G.mode = "over";
  AU.engineStop();
  var isBest = G.score > G.best;
  if (isBest) { G.best = G.score; saveBest(G.best); }
  document.getElementById("finalScore").textContent = String(G.score);
  document.getElementById("finalDist").textContent = Math.floor(G.dist / 10) + " m";
  document.getElementById("finalBest").textContent = String(G.best);
  document.getElementById("newBestTag").classList.toggle("hidden", !isBest);
  showScreen("overScreen");
}
document.getElementById("startBtn").addEventListener("click", startGame);
document.getElementById("restartBtn").addEventListener("click", startGame);
document.getElementById("resumeBtn").addEventListener("click", resumeGame);
document.getElementById("quitBtn").addEventListener("click", quitToTitle);
document.getElementById("muteBtn").addEventListener("click", function () { AU.init(); toggleMute(); });
document.getElementById("titleBest").textContent = String(G.best);

/* ---------- main loop (fixed timestep) ---------- */
var STEP = 1 / 60;
var acc = 0, last = 0;
function frame(now) {
  if (!last) last = now;
  var dt = Math.min(0.05, (now - last) / 1000);
  last = now;
  if (G.mode === "playing") {
    acc += dt;
    var guard = 0;
    while (acc >= STEP && guard < 5) { update(STEP); acc -= STEP; guard++; }
    if (guard >= 5) acc = 0;
  } else {
    /* idle drift behind the title / pause / over screens */
    G.time += dt;
    for (var i = 0; i < G.clouds.length; i++) {
      G.clouds[i].x -= (G.clouds[i].drift * dt) / W;
      if (G.clouds[i].x < -0.25) G.clouds[i].x = 1.15;
    }
    if (G.toastT > 0) {
      G.toastT -= dt;
      if (G.toastT <= 0) document.getElementById("toast").style.opacity = "0";
    }
  }
  render();
  window.requestAnimationFrame(frame);
}
resetPlane();
showScreen("titleScreen");
window.requestAnimationFrame(frame);

</script>
</body>
</html>
`;

// Assemble the page from its sections, in order.
const pageText: string = [partTop, partState, partRender, partFinal].join("");

// Sanity markers: the assembled page must contain each of these.
// They are checked before anything is written.
const EXPECTED_MARKERS: string[] = [
  "<!DOCTYPE html>",
  "<title>Skyway — a little flight game</title>",
  'id="game"',
  "requestAnimationFrame",
  "COMBO x",
  "</html>\n",
];

function countPassedMarkers(text: string): number {
  let passed = 0;
  for (const marker of EXPECTED_MARKERS) {
    if (text.includes(marker)) passed++;
  }
  return passed;
}

function main(): void {
  const passed = countPassedMarkers(pageText);
  if (passed !== EXPECTED_MARKERS.length) {
    console.error("skyway: checks failed (" + passed + "/" + EXPECTED_MARKERS.length + ")");
    process.exit(1);
  }
  const dir = resolveOutputDir();
  mkdirSync(dir, { recursive: true });
  writeFileSync(path.join(dir, "index.html"), pageText, "utf8");
  console.log("skyway: wrote out/index.html (" + pageText.length + " bytes)");
  console.log("skyway: checks passed (" + passed + "/" + EXPECTED_MARKERS.length + ")");
}

main();

