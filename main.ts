// Skyway: a canyon flight game.
// This program writes one self-contained web page (index.html) with the
// whole game inline: markup, styles, and script. No network, no assets,
// no dependencies. Run it with: node main.ts
// Output goes to MAKEFUN_OUTPUT_DIR when set, otherwise to an out/
// folder beside this script. The page is identical on every run.

import * as fs from "node:fs";
import * as path from "node:path";
import { fileURLToPath } from "node:url";

const HERE = path.dirname(fileURLToPath(import.meta.url));
const OUT_DIR = process.env.MAKEFUN_OUTPUT_DIR
  ? path.resolve(process.env.MAKEFUN_OUTPUT_DIR)
  : path.join(HERE, "out");

const html = `<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>Skyway - Canyon Flight</title>
<style>
* { box-sizing: border-box; }
html, body { margin: 0; padding: 0; }
body { background: #10131c; color: #f4ead8; font-family: system-ui, -apple-system, "Segoe UI", sans-serif; display: flex; flex-direction: column; align-items: center; padding: 18px 12px 28px; }
#wrap { position: relative; width: min(960px, 100%); }
canvas { display: block; width: 100%; height: auto; border-radius: 14px; box-shadow: 0 18px 50px rgba(0,0,0,.55); background: #1b2340; }
.panel { position: absolute; inset: 0; display: flex; flex-direction: column; align-items: center; justify-content: center; gap: 10px; text-align: center; background: rgba(10, 12, 24, .62); border-radius: 14px; padding: 20px; }
.hidden { display: none !important; }
h1 { margin: 0; font-size: 52px; letter-spacing: 6px; }
.tag { margin: 0; font-size: 16px; opacity: .9; }
button { cursor: pointer; border: 0; border-radius: 999px; padding: 12px 26px; font-size: 17px; font-weight: 700; color: #1d1305; background: #ffc53d; box-shadow: 0 6px 0 #b57e12; }
button:active { transform: translateY(3px); box-shadow: 0 3px 0 #b57e12; }
button.ghost { background: #e8e2d4; box-shadow: 0 6px 0 #9a937f; }
#help { margin: 12px 0 0; font-size: 14px; line-height: 1.6; opacity: .85; max-width: 960px; text-align: center; }
#muteBtn { position: absolute; top: 10px; right: 10px; z-index: 5; padding: 8px 12px; font-size: 13px; }
.score-line { font-size: 20px; font-weight: 700; }
</style>
</head>
<body>
<div id="wrap">
<canvas id="game" width="960" height="540"></canvas>
<button id="muteBtn" type="button">Sound: on</button>
<div id="menu" class="panel">
<h1>SKYWAY</h1>
<p class="tag">Thread the canyon. Chase the rings. Mind your fuel.</p>
<p class="score-line" id="bestLine">Best: 0</p>
<button id="startBtn" type="button">Take off</button>
<p>Controls: Arrow keys or W A S D to steer. Hold the mouse or touch and drag to guide the plane. Space starts, P pauses.</p>
</div>
<div id="pauseMenu" class="panel hidden">
<h1>PAUSED</h1>
<p class="tag">Catch your breath, pilot.</p>
<button id="resumeBtn" type="button">Resume</button>
<button id="restartBtn2" type="button" class="ghost">Restart</button>
</div>
<div id="overMenu" class="panel hidden">
<h1>FLIGHT OVER</h1>
<p class="score-line" id="finalLine">Score: 0</p>
<p class="score-line" id="bestLine2">Best: 0</p>
<button id="restartBtn" type="button">Fly again</button>
</div>
</div>
<p id="help">Controls: Up / W climbs, Down / S dives, Left / Right or A / D shifts the plane, Space starts or restarts, P pauses. Fly through rings for bonus points, grab coins, and pick up fuel cans before the tank runs dry. Dodge the rock spires and the eagles.</p>
<script>
"use strict";
var canvas = document.getElementById("game");
var ctx = canvas.getContext("2d");
var W = 960;
var H = 540;

function clamp(v, lo, hi) { return v < lo ? lo : (v > hi ? hi : v); }
function lerp(a, b, t) { return a + (b - a) * t; }
function hash(n) { var x = Math.sin(n * 127.1 + 311.7) * 43758.5453; return x - Math.floor(x); }
function distToSeg(px, py, x1, y1, x2, y2) {
  var dx = x2 - x1;
  var dy = y2 - y1;
  var len2 = dx * dx + dy * dy;
  var t = len2 === 0 ? 0 : ((px - x1) * dx + (py - y1) * dy) / len2;
  t = clamp(t, 0, 1);
  var cx = x1 + t * dx;
  var cy = y1 + t * dy;
  var ox = px - cx;
  var oy = py - cy;
  return Math.sqrt(ox * ox + oy * oy);
}
function pointInTri(px, py, ax, ay, bx, by, cx, cy) {
  var d1 = (px - bx) * (ay - by) - (ax - bx) * (py - by);
  var d2 = (px - cx) * (by - cy) - (bx - cx) * (py - cy);
  var d3 = (px - ax) * (cy - ay) - (cx - ax) * (py - ay);
  var neg = (d1 < 0) || (d2 < 0) || (d3 < 0);
  var pos = (d1 > 0) || (d2 > 0) || (d3 > 0);
  return !(neg && pos);
}

var audioCtx = null;
var muted = false;
function tone(freq, dur, type, vol, slide) {
  if (muted) { return; }
  try {
    if (!audioCtx) { audioCtx = new (window.AudioContext || window.webkitAudioContext)(); }
    if (audioCtx.state === "suspended") { audioCtx.resume(); }
    var osc = audioCtx.createOscillator();
    var gain = audioCtx.createGain();
    osc.type = type || "sine";
    osc.frequency.setValueAtTime(freq, audioCtx.currentTime);
    if (slide) { osc.frequency.exponentialRampToValueAtTime(slide, audioCtx.currentTime + dur); }
    gain.gain.setValueAtTime(vol || 0.12, audioCtx.currentTime);
    gain.gain.exponentialRampToValueAtTime(0.001, audioCtx.currentTime + dur);
    osc.connect(gain);
    gain.connect(audioCtx.destination);
    osc.start();
    osc.stop(audioCtx.currentTime + dur);
  } catch (e) { /* audio is unavailable */ }
}
function sfx(name) {
  if (name === "ring") { tone(880, 0.12, "sine", 0.14, 1320); }
  else if (name === "coin") { tone(1320, 0.08, "square", 0.07); }
  else if (name === "fuel") { tone(520, 0.14, "triangle", 0.14, 780); }
  else if (name === "crash") { tone(160, 0.5, "sawtooth", 0.2, 40); }
  else if (name === "click") { tone(660, 0.06, "square", 0.08); }
}

var keys = {};
var pointer = { active: false, x: 0, y: 0 };
function canvasPos(evt) {
  var r = canvas.getBoundingClientRect();
  return { x: (evt.clientX - r.left) * (W / r.width), y: (evt.clientY - r.top) * (H / r.height) };
}
window.addEventListener("keydown", function (e) {
  if (e.repeat) { return; }
  var k = e.key;
  if (k === " " || k.indexOf("Arrow") === 0) { e.preventDefault(); }
  keys[k.length === 1 ? k.toLowerCase() : k] = true;
  if (k === " " || k === "Enter") { onConfirm(); }
  if (k === "p" || k === "P" || k === "Escape") { onPauseKey(); }
});
window.addEventListener("keyup", function (e) {
  var k = e.key;
  keys[k.length === 1 ? k.toLowerCase() : k] = false;
});
canvas.addEventListener("mousedown", function (e) {
  pointer.active = true;
  var p = canvasPos(e);
  pointer.x = p.x;
  pointer.y = p.y;
});
window.addEventListener("mousemove", function (e) {
  if (pointer.active) {
    var p = canvasPos(e);
    pointer.x = p.x;
    pointer.y = p.y;
  }
});
window.addEventListener("mouseup", function () { pointer.active = false; });
canvas.addEventListener("touchstart", function (e) {
  e.preventDefault();
  pointer.active = true;
  var p = canvasPos(e.touches[0]);
  pointer.x = p.x;
  pointer.y = p.y;
}, { passive: false });
canvas.addEventListener("touchmove", function (e) {
  e.preventDefault();
  var p = canvasPos(e.touches[0]);
  pointer.x = p.x;
  pointer.y = p.y;
}, { passive: false });
canvas.addEventListener("touchend", function () { pointer.active = false; });

var state = "menu";
var camX = 0;
var plane = { x: 150, y: 270, vy: 0, tilt: 0, prop: 0, r: 16 };
var fuel = 100;
var score = 0;
var bonus = 0;
var ringsTaken = 0;
var coinsTaken = 0;
var best = 0;
try { best = parseInt(window.localStorage.getItem("skywayBest") || "0", 10) || 0; } catch (e) { best = 0; }
var spawnX = 700;
var spires = [];
var eagles = [];
var rings = [];
var coins = [];
var cans = [];
var parts = [];
var clouds = [];
var shake = 0;
var time = 0;
(function initClouds() {
  var i;
  for (i = 0; i < 9; i++) {
    clouds.push({ x: hash(i * 3 + 1) * 2400, y: 40 + hash(i * 7 + 2) * 150, s: 0.6 + hash(i * 5 + 3) * 0.9 });
  }
})();

function gapCenter(wx) {
  return H * 0.52 + Math.sin(wx * 0.0016) * 66 + Math.sin(wx * 0.00043 + 2.1) * 48;
}
function gapHalf(wx) {
  var narrow = Math.min(58, camX * 0.0011);
  return 196 - narrow + Math.sin(wx * 0.0021 + 1.2) * 16;
}
function topEdge(wx) { return gapCenter(wx) - gapHalf(wx); }
function bottomEdge(wx) { return gapCenter(wx) + gapHalf(wx); }
function edgeJitter(wx) { return (hash(Math.floor(wx / 26)) - 0.5) * 14; }
function showOnly(id) {
  var ids = ["menu", "pauseMenu", "overMenu"];
  var i;
  for (i = 0; i < ids.length; i++) {
    document.getElementById(ids[i]).classList.toggle("hidden", ids[i] !== id);
  }
  document.getElementById("bestLine").textContent = "Best: " + best;
}
function reset() {
  camX = 0;
  plane.x = 150;
  plane.y = 270;
  plane.vy = 0;
  plane.tilt = 0;
  fuel = 100;
  score = 0;
  bonus = 0;
  ringsTaken = 0;
  coinsTaken = 0;
  spires = [];
  eagles = [];
  rings = [];
  coins = [];
  cans = [];
  parts = [];
  spawnX = 700;
  shake = 0;
  time = 0;
}
function startGame() {
  reset();
  state = "playing";
  showOnly(null);
  sfx("click");
}
function togglePause() {
  if (state === "playing") { state = "paused"; showOnly("pauseMenu"); }
  else if (state === "paused") { state = "playing"; showOnly(null); }
}
function onPauseKey() {
  if (state === "playing" || state === "paused") { togglePause(); }
}
function onConfirm() {
  if (state === "menu" || state === "over") { startGame(); }
  else if (state === "paused") { togglePause(); }
}
function speedPx() { return 205 + Math.min(170, camX * 0.004); }
function spawnPattern() {
  var roll = Math.random();
  var x = spawnX;
  var cy = gapCenter(x);
  var i;
  var n;
  if (roll < 0.30) {
    n = 3 + Math.floor(Math.random() * 3);
    for (i = 0; i < n; i++) {
      rings.push({ x: x + i * 74, y: cy + Math.sin(i * 0.9) * 60, r: 26, got: false, tw: Math.random() * 6 });
    }
    spawnX = x + n * 74 + 190;
  } else if (roll < 0.52) {
    n = 4 + Math.floor(Math.random() * 4);
    for (i = 0; i < n; i++) {
      coins.push({ x: x + i * 56, y: cy + Math.cos(i * 0.8) * 55, got: false, ph: Math.random() * 6 });
    }
    spawnX = x + n * 56 + 170;
  } else if (roll < 0.64) {
    cans.push({ x: x, y: cy, got: false, bob: Math.random() * 6 });
    spawnX = x + 300;
  } else if (roll < 0.82) {
    eagles.push({ x: x, y: cy + (Math.random() * 160 - 80), ph: Math.random() * 6, speed: 40 + Math.random() * 50 });
    spawnX = x + 340;
  } else {
    var side = Math.random() < 0.5 ? -1 : 1;
    spires.push({ x: x, side: side, len: 46 + Math.random() * 52, w: 30 + Math.random() * 18 });
    spawnX = x + 260;
  }
}
function spawnAhead() {
  var guard = 0;
  while (spawnX < camX + W + 500 && guard < 40) {
    spawnPattern();
    guard++;
  }
}
function burst(x, y, color, count, power) {
  var i;
  for (i = 0; i < count; i++) {
    parts.push({ x: x, y: y, vx: (Math.random() - 0.5) * power, vy: (Math.random() - 0.5) * power, life: 0.5 + Math.random() * 0.5, max: 1, size: 2 + Math.random() * 4, color: color });
  }
}
function crash(why) {
  if (state !== "playing") { return; }
  state = "over";
  shake = 16;
  sfx("crash");
  burst(plane.x, plane.y, "214,69,65", 14, 420);
  burst(plane.x, plane.y, "242,230,201", 8, 320);
  burst(plane.x, plane.y, "255,197,61", 8, 360);
  if (score > best) {
    best = score;
    try { window.localStorage.setItem("skywayBest", String(best)); } catch (e) { /* storage unavailable */ }
  }
  document.getElementById("finalLine").textContent = (why === "fuel" ? "Out of fuel! Score: " : "Crashed! Score: ") + score;
  document.getElementById("bestLine2").textContent = "Best: " + best;
  showOnly("overMenu");
}
function updateParts(dt) {
  var i;
  var p;
  for (i = parts.length - 1; i >= 0; i--) {
    p = parts[i];
    p.x += p.vx * dt;
    p.y += p.vy * dt;
    p.vy += 300 * dt;
    p.life -= dt;
    if (p.life <= 0) { parts.splice(i, 1); }
  }
  if (shake > 0) {
    shake *= Math.pow(0.02, dt);
    if (shake < 0.4) { shake = 0; }
  }
}
function update(dt) {
  time += dt;
  var speed = speedPx();
  camX += speed * dt;
  var thrust = false;
  if (keys["ArrowUp"] || keys["w"]) { plane.vy -= 1850 * dt; thrust = true; }
  if (keys["ArrowDown"] || keys["s"]) { plane.vy += 1500 * dt; }
  if (keys["ArrowLeft"] || keys["a"]) { plane.x -= 130 * dt; }
  if (keys["ArrowRight"] || keys["d"]) { plane.x += 130 * dt; }
  plane.x = clamp(plane.x, 70, 340);
  if (pointer.active) {
    plane.vy += clamp((pointer.y - plane.y) * 7, -900, 900) * dt * 3;
    plane.x += clamp((pointer.x - plane.x) * 3, -140, 140) * dt;
    plane.x = clamp(plane.x, 70, 340);
    if (pointer.y < plane.y - 6) { thrust = true; }
  }
  plane.vy += 880 * dt;
  plane.vy *= Math.max(0, 1 - 1.9 * dt);
  plane.vy = clamp(plane.vy, -540, 560);
  plane.y += plane.vy * dt;
  plane.tilt = clamp(plane.vy * 0.00085, -0.42, 0.5);
  plane.prop += dt * (thrust ? 55 : 34);
  fuel -= dt * (2.1 + speed * 0.0012);
  score = Math.floor(camX / 40) + bonus;
  spawnAhead();
  var i;
  var limit = camX - 140;
  spires = spires.filter(function (s) { return s.x > limit; });
  eagles = eagles.filter(function (e) { return e.x > limit; });
  rings = rings.filter(function (r) { return r.x > limit && !r.got; });
  coins = coins.filter(function (c) { return c.x > limit && !c.got; });
  cans = cans.filter(function (c) { return c.x > limit && !c.got; });
  var ci;
  for (ci = 0; ci < clouds.length; ci++) { clouds[ci].x += 6 * dt; }
  if (thrust && Math.random() < 0.5) {
    parts.push({ x: plane.x - 26, y: plane.y + 6, vx: -speed * 0.35, vy: 20 + Math.random() * 30, life: 0.45, max: 0.45, size: 3 + Math.random() * 3, color: "255,240,200" });
  }
  var pwx = camX + plane.x;
  var pr = plane.r;
  for (i = 0; i < eagles.length; i++) {
    var eg = eagles[i];
    eg.x -= eg.speed * dt;
    var dx = eg.x - pwx;
    var dy = (eg.y + Math.sin(time * 4 + eg.ph) * 14) - plane.y;
    if (dx * dx + dy * dy < 30 * 30) { crash("eagle"); return; }
  }
  for (i = 0; i < rings.length; i++) {
    var rg = rings[i];
    var rdx = rg.x - pwx;
    var rdy = rg.y - plane.y;
    if (rdx * rdx + rdy * rdy < (rg.r + 8) * (rg.r + 8)) {
      rg.got = true;
      bonus += 50;
      ringsTaken++;
      burst(rg.x - camX, rg.y, "255,211,77", 10, 220);
      sfx("ring");
    }
  }
  for (i = 0; i < coins.length; i++) {
    var cn = coins[i];
    var cdx = cn.x - pwx;
    var cdy = cn.y - plane.y;
    if (cdx * cdx + cdy * cdy < 24 * 24) {
      cn.got = true;
      bonus += 10;
      coinsTaken++;
      burst(cn.x - camX, cn.y, "255,211,77", 6, 160);
      sfx("coin");
    }
  }
  for (i = 0; i < cans.length; i++) {
    var fc = cans[i];
    var fdx = fc.x - pwx;
    var fdy = fc.y - plane.y;
    if (fdx * fdx + fdy * fdy < 32 * 32) {
      fc.got = true;
      fuel = Math.min(100, fuel + 30);
      burst(fc.x - camX, fc.y, "255,120,110", 8, 180);
      sfx("fuel");
    }
  }
  for (i = 0; i < spires.length; i++) {
    var sp = spires[i];
    if (Math.abs(sp.x - pwx) < 70) {
      var edge = sp.side < 0 ? topEdge(sp.x) : bottomEdge(sp.x);
      var ax = sp.x - sp.w / 2;
      var bx = sp.x + sp.w / 2;
      var cxp = sp.x;
      var cyp = sp.side < 0 ? edge + sp.len : edge - sp.len;
      var ay = edge;
      var by = edge;
      if (pointInTri(pwx, plane.y, ax, ay, bx, by, cxp, cyp) ||
          distToSeg(pwx, plane.y, ax, ay, cxp, cyp) < pr ||
          distToSeg(pwx, plane.y, bx, by, cxp, cyp) < pr) {
        crash("spire");
        return;
      }
    }
  }
  var topY = topEdge(pwx) + edgeJitter(pwx);
  var botY = bottomEdge(pwx) + edgeJitter(pwx);
  if (plane.y - pr < topY || plane.y + pr > botY) { crash("wall"); return; }
  if (fuel <= 0) { fuel = 0; crash("fuel"); return; }
  updateParts(dt);
}
function updateMenu(dt) {
  time += dt;
  camX += 80 * dt;
  var target = gapCenter(camX + plane.x);
  plane.y = lerp(plane.y, target, 1 - Math.pow(0.002, dt));
  plane.vy = 0;
  plane.tilt = clamp((target - plane.y) * 0.004, -0.3, 0.3);
  plane.prop += dt * 30;
  var ci;
  for (ci = 0; ci < clouds.length; ci++) { clouds[ci].x += 6 * dt; }
  updateParts(dt);
}
function drawSky() {
  var g = ctx.createLinearGradient(0, 0, 0, H);
  g.addColorStop(0, "#2b1b4d");
  g.addColorStop(0.45, "#7a3560");
  g.addColorStop(0.72, "#c65a3a");
  g.addColorStop(1, "#f2a65a");
  ctx.fillStyle = g;
  ctx.fillRect(0, 0, W, H);
  var sx = W * 0.78;
  var sy = 108;
  var glow = ctx.createRadialGradient(sx, sy, 10, sx, sy, 130);
  glow.addColorStop(0, "rgba(255, 236, 180, 0.95)");
  glow.addColorStop(0.35, "rgba(255, 200, 120, 0.45)");
  glow.addColorStop(1, "rgba(255, 200, 120, 0)");
  ctx.fillStyle = glow;
  ctx.fillRect(sx - 130, sy - 130, 260, 260);
  ctx.fillStyle = "#ffeec2";
  ctx.beginPath();
  ctx.arc(sx, sy, 40, 0, Math.PI * 2);
  ctx.fill();
}
function mesaTop(wx, base, amp, seg) {
  return base - hash(Math.floor(wx / seg)) * amp;
}
function drawMesas() {
  var layers = [
    { f: 0.15, base: 400, amp: 90, seg: 150, color: "rgba(109, 74, 110, 0.55)" },
    { f: 0.35, base: 440, amp: 110, seg: 120, color: "rgba(94, 58, 74, 0.8)" }
  ];
  var li;
  var sx;
  for (li = 0; li < layers.length; li++) {
    var L = layers[li];
    ctx.fillStyle = L.color;
    ctx.beginPath();
    ctx.moveTo(-20, H + 20);
    for (sx = -20; sx <= W + 20; sx += 20) {
      ctx.lineTo(sx, mesaTop(camX * L.f + sx, L.base, L.amp, L.seg));
    }
    ctx.lineTo(W + 20, H + 20);
    ctx.closePath();
    ctx.fill();
  }
}
function drawClouds() {
  var i;
  ctx.fillStyle = "rgba(255, 235, 220, 0.75)";
  for (i = 0; i < clouds.length; i++) {
    var c = clouds[i];
    var span = W + 260;
    var sx = ((c.x - camX * 0.45) % span + span) % span - 130;
    var y = c.y;
    var s = c.s;
    ctx.beginPath();
    ctx.ellipse(sx, y, 52 * s, 17 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(sx - 32 * s, y + 5 * s, 32 * s, 13 * s, 0, 0, Math.PI * 2);
    ctx.ellipse(sx + 34 * s, y + 5 * s, 34 * s, 14 * s, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
function wallPath(isTop) {
  var sx;
  ctx.beginPath();
  if (isTop) {
    ctx.moveTo(-20, -20);
    for (sx = -20; sx <= W + 20; sx += 14) {
      var wx = camX + sx;
      ctx.lineTo(sx, topEdge(wx) + edgeJitter(wx));
    }
    ctx.lineTo(W + 20, -20);
  } else {
    ctx.moveTo(-20, H + 20);
    for (sx = -20; sx <= W + 20; sx += 14) {
      var wx2 = camX + sx;
      ctx.lineTo(sx, bottomEdge(wx2) + edgeJitter(wx2));
    }
    ctx.lineTo(W + 20, H + 20);
  }
  ctx.closePath();
}
function drawCanyon() {
  var gTop = ctx.createLinearGradient(0, 0, 0, 240);
  gTop.addColorStop(0, "#3a2214");
  gTop.addColorStop(1, "#7a4a28");
  wallPath(true);
  ctx.fillStyle = gTop;
  ctx.fill();
  var gBot = ctx.createLinearGradient(0, H - 240, 0, H);
  gBot.addColorStop(0, "#7a4a28");
  gBot.addColorStop(1, "#3c2413");
  wallPath(false);
  ctx.fillStyle = gBot;
  ctx.fill();
  var k;
  var sx;
  ctx.lineWidth = 2;
  for (k = 1; k <= 3; k++) {
    ctx.strokeStyle = "rgba(40, 20, 10, 0.35)";
    ctx.beginPath();
    for (sx = -20; sx <= W + 20; sx += 14) {
      var wx = camX + sx;
      var y = topEdge(wx) + edgeJitter(wx) - k * 34;
      if (sx === -20) { ctx.moveTo(sx, y); } else { ctx.lineTo(sx, y); }
    }
    ctx.stroke();
    ctx.beginPath();
    for (sx = -20; sx <= W + 20; sx += 14) {
      var wxb = camX + sx;
      var yb = bottomEdge(wxb) + edgeJitter(wxb) + k * 34;
      if (sx === -20) { ctx.moveTo(sx, yb); } else { ctx.lineTo(sx, yb); }
    }
    ctx.stroke();
  }
  ctx.strokeStyle = "#e8b07d";
  ctx.lineWidth = 3;
  ctx.beginPath();
  for (sx = -20; sx <= W + 20; sx += 14) {
    var wxt = camX + sx;
    var yt = topEdge(wxt) + edgeJitter(wxt);
    if (sx === -20) { ctx.moveTo(sx, yt); } else { ctx.lineTo(sx, yt); }
  }
  ctx.stroke();
  ctx.beginPath();
  for (sx = -20; sx <= W + 20; sx += 14) {
    var wxc = camX + sx;
    var yc = bottomEdge(wxc) + edgeJitter(wxc);
    if (sx === -20) { ctx.moveTo(sx, yc); } else { ctx.lineTo(sx, yc); }
  }
  ctx.stroke();
  var seg;
  for (seg = 0; seg < 12; seg++) {
    var gx = seg * 90 - (camX % 90);
    var wxg = camX + gx;
    var gy = topEdge(wxg) + 26 + hash(seg + Math.floor(camX / 90)) * 60;
    ctx.fillStyle = "rgba(30, 16, 8, 0.4)";
    ctx.beginPath();
    ctx.ellipse(gx + 20, gy, 12, 7, 0, 0, Math.PI * 2);
    ctx.fill();
  }
}
function drawEntities() {
  var i;
  for (i = 0; i < rings.length; i++) {
    var rg = rings[i];
    if (rg.got) { continue; }
    var sx = rg.x - camX;
    if (sx < -60 || sx > W + 60) { continue; }
    var pulse = 1 + 0.06 * Math.sin(time * 4 + rg.tw);
    ctx.save();
    ctx.translate(sx, rg.y);
    ctx.scale(pulse, pulse);
    ctx.strokeStyle = "#ffd34d";
    ctx.lineWidth = 7;
    ctx.beginPath();
    ctx.ellipse(0, 0, rg.r, rg.r * 0.78, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.strokeStyle = "#fff3b0";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.ellipse(0, 0, rg.r - 4, rg.r * 0.78 - 4, 0, 0, Math.PI * 2);
    ctx.stroke();
    ctx.restore();
  }
  for (i = 0; i < coins.length; i++) {
    var cn = coins[i];
    if (cn.got) { continue; }
    var cx = cn.x - camX;
    if (cx < -40 || cx > W + 40) { continue; }
    var sq = Math.abs(Math.cos(time * 3 + cn.ph));
    ctx.save();
    ctx.translate(cx, cn.y);
    ctx.scale(0.35 + 0.65 * sq, 1);
    ctx.fillStyle = "#ffd34d";
    ctx.beginPath();
    ctx.arc(0, 0, 11, 0, Math.PI * 2);
    ctx.fill();
    ctx.strokeStyle = "#b57e12";
    ctx.lineWidth = 2;
    ctx.stroke();
    ctx.fillStyle = "#fff3b0";
    ctx.beginPath();
    ctx.arc(0, 0, 5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  for (i = 0; i < cans.length; i++) {
    var fc = cans[i];
    if (fc.got) { continue; }
    var fx = fc.x - camX;
    if (fx < -40 || fx > W + 40) { continue; }
    var fy = fc.y + Math.sin(time * 3 + fc.bob) * 4;
    ctx.save();
    ctx.translate(fx, fy);
    ctx.fillStyle = "#d90429";
    ctx.beginPath();
    ctx.rect(-11, -13, 22, 26);
    ctx.fill();
    ctx.fillStyle = "#8d0801";
    ctx.fillRect(-11, -13, 22, 5);
    ctx.fillStyle = "#ffffff";
    ctx.font = "bold 15px system-ui, sans-serif";
    ctx.textAlign = "center";
    ctx.textBaseline = "middle";
    ctx.fillText("F", 0, 3);
    ctx.restore();
  }
  for (i = 0; i < eagles.length; i++) {
    var eg = eagles[i];
    var ex = eg.x - camX;
    if (ex < -50 || ex > W + 50) { continue; }
    var ey = eg.y + Math.sin(time * 4 + eg.ph) * 14;
    var flap = Math.sin(time * 10 + eg.ph) * 8;
    ctx.save();
    ctx.translate(ex, ey);
    ctx.strokeStyle = "#22223b";
    ctx.lineWidth = 4;
    ctx.lineCap = "round";
    ctx.beginPath();
    ctx.moveTo(-17, -flap);
    ctx.quadraticCurveTo(-5, 3, 0, 0);
    ctx.quadraticCurveTo(5, 3, 17, -flap);
    ctx.stroke();
    ctx.fillStyle = "#3a3a55";
    ctx.beginPath();
    ctx.ellipse(0, 0, 7, 4, 0, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  }
  for (i = 0; i < spires.length; i++) {
    var sp = spires[i];
    var px = sp.x - camX;
    if (px < -60 || px > W + 60) { continue; }
    var edge = sp.side < 0 ? topEdge(sp.x) : bottomEdge(sp.x);
    var tip = sp.side < 0 ? edge + sp.len : edge - sp.len;
    ctx.fillStyle = "#5a3a22";
    ctx.beginPath();
    ctx.moveTo(px - sp.w / 2, edge);
    ctx.lineTo(px + sp.w / 2, edge);
    ctx.lineTo(px, tip);
    ctx.closePath();
    ctx.fill();
    ctx.strokeStyle = "#d9a066";
    ctx.lineWidth = 2.5;
    ctx.beginPath();
    ctx.moveTo(px - sp.w / 2, edge);
    ctx.lineTo(px, tip);
    ctx.lineTo(px + sp.w / 2, edge);
    ctx.stroke();
  }
}
function drawPlane() {
  ctx.save();
  ctx.translate(plane.x, plane.y);
  ctx.rotate(plane.tilt);
  ctx.fillStyle = "#8d0801";
  ctx.beginPath();
  ctx.moveTo(-24, -2);
  ctx.lineTo(-32, -13);
  ctx.lineTo(-24, -1);
  ctx.closePath();
  ctx.fill();
  ctx.fillStyle = "#f2e6c9";
  ctx.beginPath();
  ctx.ellipse(2, -13, 16, 5, -0.08, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#d64541";
  ctx.beginPath();
  ctx.ellipse(0, 0, 27, 10, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "rgba(242, 230, 201, 0.85)";
  ctx.beginPath();
  ctx.ellipse(0, 4, 24, 5, 0, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#cfeeff";
  ctx.beginPath();
  ctx.ellipse(7, -6, 8, 6, -0.15, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#ffffff";
  ctx.beginPath();
  ctx.arc(9, -8, 2, 0, Math.PI * 2);
  ctx.fill();
  ctx.fillStyle = "#333333";
  ctx.beginPath();
  ctx.arc(28, 0, 3.5, 0, Math.PI * 2);
  ctx.fill();
  ctx.strokeStyle = "rgba(255, 255, 255, 0.55)";
  ctx.lineWidth = 3;
  ctx.lineCap = "round";
  ctx.save();
  ctx.translate(28, 0);
  ctx.rotate(plane.prop);
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.lineTo(0, 15);
  ctx.moveTo(-15, 0);
  ctx.lineTo(15, 0);
  ctx.stroke();
  ctx.restore();
  ctx.restore();
}
function drawParts() {
  var i;
  for (i = 0; i < parts.length; i++) {
    var p = parts[i];
    ctx.fillStyle = "rgba(" + p.color + "," + Math.max(0, p.life / p.max).toFixed(2) + ")";
    ctx.fillRect(p.x - p.size / 2, p.y - p.size / 2, p.size, p.size);
  }
}
function drawHUD() {
  ctx.save();
  ctx.font = "bold 19px system-ui, sans-serif";
  ctx.textBaseline = "top";
  ctx.textAlign = "left";
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillText("SCORE " + score, 17, 15);
  ctx.fillStyle = "#ffffff";
  ctx.fillText("SCORE " + score, 16, 14);
  ctx.font = "15px system-ui, sans-serif";
  ctx.fillStyle = "rgba(0, 0, 0, 0.35)";
  ctx.fillText("DIST " + Math.floor(camX / 40) + " m", 17, 39);
  ctx.fillStyle = "#ffe9b0";
  ctx.fillText("DIST " + Math.floor(camX / 40) + " m", 16, 38);
  ctx.textAlign = "right";
  ctx.font = "bold 17px system-ui, sans-serif";
  ctx.fillStyle = "#ffd34d";
  ctx.fillText("RINGS " + ringsTaken, W - 16, 14);
  ctx.fillStyle = "#ffe9b0";
  ctx.fillText("COINS " + coinsTaken, W - 16, 36);
  var bw = 210;
  var bx = (W - bw) / 2;
  var by = 14;
  ctx.fillStyle = "rgba(0, 0, 0, 0.4)";
  ctx.beginPath();
  ctx.rect(bx - 4, by - 4, bw + 8, 22);
  ctx.fill();
  ctx.fillStyle = fuel > 30 ? "#7ac74f" : "#e04b3a";
  ctx.fillRect(bx, by, bw * clamp(fuel / 100, 0, 1), 14);
  ctx.strokeStyle = "#ffffff";
  ctx.lineWidth = 1.5;
  ctx.strokeRect(bx - 4, by - 4, bw + 8, 22);
  ctx.fillStyle = "#ffffff";
  ctx.font = "bold 12px system-ui, sans-serif";
  ctx.textAlign = "center";
  ctx.fillText("FUEL", W / 2, by + 2);
  ctx.restore();
}
function draw() {
  ctx.save();
  if (shake > 0) {
    ctx.translate((Math.random() - 0.5) * shake, (Math.random() - 0.5) * shake);
  }
  drawSky();
  drawMesas();
  drawClouds();
  drawCanyon();
  drawEntities();
  drawPlane();
  drawParts();
  drawHUD();
  ctx.restore();
}

document.getElementById("startBtn").addEventListener("click", startGame);
document.getElementById("resumeBtn").addEventListener("click", togglePause);
document.getElementById("restartBtn").addEventListener("click", startGame);
document.getElementById("restartBtn2").addEventListener("click", startGame);
document.getElementById("muteBtn").addEventListener("click", function () {
  muted = !muted;
  document.getElementById("muteBtn").textContent = muted ? "Sound: off" : "Sound: on";
});
var last = 0;
function frame(ts) {
  requestAnimationFrame(frame);
  var now = ts / 1000;
  var dt = last === 0 ? 0.016 : Math.min(0.033, now - last);
  last = now;
  if (state === "playing") { update(dt); }
  else if (state === "menu") { updateMenu(dt); }
  else if (state === "over") { updateParts(dt); }
  draw();
}
reset();
showOnly("menu");
requestAnimationFrame(frame);
</script>
</body>
</html>`;

const checks = [
  html.startsWith("<!DOCTYPE html>"),
  html.indexOf("<title>Skyway") !== -1,
  html.indexOf("<canvas") !== -1,
  html.indexOf("<script>") !== -1,
  html.indexOf("Controls") !== -1,
  html.indexOf("http://") === -1 && html.indexOf("https://") === -1
];
const passed = checks.filter(function (c) { return c; }).length;
if (passed !== 6) {
  console.error("skyway: checks failed (" + passed + "/6)");
  process.exit(1);
}
fs.mkdirSync(OUT_DIR, { recursive: true });
fs.writeFileSync(path.join(OUT_DIR, "index.html"), html, "utf8");
console.log("skyway: wrote out/index.html (" + Buffer.byteLength(html, "utf8") + " bytes)");
console.log("skyway: checks passed (6/6)");
