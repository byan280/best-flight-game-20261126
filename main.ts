import fs from 'node:fs';
import path from 'node:path';

var outDir = process.env.MAKEFUN_OUTPUT_DIR || './output';

var html = '<!DOCTYPE html>\n' +
'<html lang="en">\n' +
'<head>\n' +
'<meta charset="utf-8">\n' +
'<meta name="viewport" content="width=device-width, initial-scale=1">\n' +
'<title>Skyward — A Little Flight Game</title>\n' +
'<style>\n' +
'* { box-sizing: border-box; }\n' +
'html, body { margin: 0; padding: 0; }\n' +
'body { background: #0b1020; color: #f4f7ff; font-family: "Avenir Next", "Segoe UI", system-ui, -apple-system, sans-serif; min-height: 100vh; display: flex; justify-content: center; }\n' +
'.wrap { width: min(980px, 100vw); padding: 14px 12px 26px; }\n' +
'header { display: flex; align-items: center; justify-content: space-between; gap: 10px; padding: 4px 2px 12px; }\n' +
'.logo { font-size: clamp(22px, 4vw, 30px); font-weight: 800; letter-spacing: 3px; }\n' +
'.logo span { color: #ffcf4d; }\n' +
'.head-right { display: flex; align-items: center; gap: 8px; }\n' +
'.chip { background: #1a2340; border: 1px solid #2c3a63; border-radius: 999px; padding: 7px 13px; font-size: 13px; font-weight: 600; white-space: nowrap; }\n' +
'.icon-btn { background: #1a2340; color: #f4f7ff; border: 1px solid #2c3a63; border-radius: 999px; width: 38px; height: 38px; font-size: 17px; cursor: pointer; }\n' +
'.icon-btn:hover { background: #243157; }\n' +
'.stage { position: relative; border-radius: 16px; overflow: hidden; box-shadow: 0 18px 50px rgba(0,0,0,.55), 0 0 0 1px #2c3a63; background: #79b5e8; }\n' +
'canvas { display: block; width: 100%; height: auto; touch-action: none; cursor: crosshair; }\n' +
'.overlay { position: absolute; inset: 0; display: flex; align-items: center; justify-content: center; background: rgba(8, 13, 30, .55); backdrop-filter: blur(2px); padding: 16px; }\n' +
'.overlay.hidden { display: none; }\n' +
'.panel { background: rgba(13, 20, 42, .92); border: 1px solid #33477e; border-radius: 18px; padding: 26px 28px; max-width: 560px; width: 100%; text-align: center; box-shadow: 0 14px 40px rgba(0,0,0,.5); }\n' +
'.panel h1 { margin: 0 0 4px; font-size: clamp(30px, 6vw, 44px); letter-spacing: 4px; }\n' +
'.panel h1 span { color: #ffcf4d; }\n' +
'.panel h2 { margin: 0 0 6px; font-size: clamp(24px, 5vw, 32px); letter-spacing: 2px; }\n' +
'.tagline { margin: 0 0 16px; color: #b9c6e8; font-size: 15px; line-height: 1.5; }\n' +
'.controls { display: grid; grid-template-columns: 1fr 1fr; gap: 8px 16px; text-align: left; margin: 0 auto 18px; max-width: 430px; font-size: 13.5px; color: #cdd8f2; }\n' +
'.controls b { color: #fff; background: #243157; border: 1px solid #3a4f8a; border-bottom-width: 3px; border-radius: 6px; padding: 2px 8px; font-size: 12.5px; white-space: nowrap; }\n' +
'.btn { appearance: none; border: 0; border-radius: 999px; padding: 13px 34px; font-size: 17px; font-weight: 800; letter-spacing: 1px; cursor: pointer; color: #241a00; background: linear-gradient(180deg, #ffe27a, #ffb52e); box-shadow: 0 6px 0 #b87a00, 0 12px 24px rgba(0,0,0,.35); }\n' +
'.btn:hover { filter: brightness(1.06); }\n' +
'.btn:active { transform: translateY(4px); box-shadow: 0 2px 0 #b87a00; }\n' +
'.btn.ghost { background: #243157; color: #fff; box-shadow: 0 6px 0 #141d38; border: 1px solid #3a4f8a; }\n' +
'.row { display: flex; gap: 10px; justify-content: center; flex-wrap: wrap; }\n' +
'.score-line { font-size: 17px; margin: 4px 0; }\n' +
'.score-line b { color: #ffcf4d; font-size: 24px; }\n' +
'.new-best { display: inline-block; background: #ffcf4d; color: #241a00; font-weight: 800; font-size: 13px; border-radius: 999px; padding: 4px 12px; margin-bottom: 8px; letter-spacing: 1px; }\n' +
'footer { display: flex; justify-content: space-between; gap: 10px; flex-wrap: wrap; padding: 12px 2px 0; color: #8fa0c6; font-size: 12.5px; }\n' +
'@media (max-width: 520px) { .controls { grid-template-columns: 1fr; } .chip { display: none; } }\n' +
'</style>\n' +
'</head>\n' +
'<body>\n' +
'<div class="wrap">\n' +
'<header><div class="logo">SKY<span>WARD</span></div><div class="head-right"><span class="chip" id="bestChip">Best: 0</span><button class="icon-btn" id="muteBtn" title="Sound on/off" aria-label="Toggle sound">&#9836;</button><button class="icon-btn" id="pauseBtn" title="Pause (P)" aria-label="Pause">&#10074;&#10074;</button></div></header>\n' +
'<div class="stage">\n' +
'<canvas id="game" width="960" height="540"></canvas>\n' +
'<div class="overlay" id="menu"><div class="panel"><h1>SKY<span>WARD</span></h1><p class="tagline">Fly the little red plane as far as you can. Thread the rings, dodge the storms, and grab stars to keep your boost full.</p><div class="controls"><div><b>&uarr; / W</b> &nbsp;climb</div><div><b>&darr; / S</b> &nbsp;descend</div><div><b>Mouse / Touch</b> &nbsp;steer</div><div><b>Space</b> &nbsp;boost</div><div><b>P</b> &nbsp;pause</div><div><b>M</b> &nbsp;mute</div></div><div class="row"><button class="btn" id="startBtn">TAKE OFF</button></div><p class="tagline" style="margin:14px 0 0">Best flight: <b id="menuBest" style="color:#ffcf4d">0</b> m</p></div></div>\n' +
'<div class="overlay hidden" id="over"><div class="panel"><h2>FLIGHT OVER</h2><div id="newBest" class="new-best" style="display:none">NEW BEST!</div><p class="score-line">Distance: <b id="finalScore">0</b> m</p><p class="score-line" style="color:#b9c6e8">Best: <span id="finalBest">0</span> m &nbsp;&middot;&nbsp; Rings: <span id="finalRings">0</span></p><div class="row" style="margin-top:16px"><button class="btn" id="retryBtn">FLY AGAIN</button><button class="btn ghost" id="menuBtn">MENU</button></div></div></div>\n' +
'<div class="overlay hidden" id="paused"><div class="panel"><h2>PAUSED</h2><p class="tagline">Take a breath. The sky will wait.</p><div class="row"><button class="btn" id="resumeBtn">RESUME</button></div></div></div>\n' +
'</div>\n' +
'<footer><span>Tip: rings build your combo multiplier &mdash; chain them for big points.</span><span>Keyboard, mouse and touch supported.</span></footer>\n' +
'</div>\n' +
'<script>\n' +
'"use strict";\n' +
'var canvas = document.getElementById("game");\n' +
'var ctx = canvas.getContext("2d");\n' +
'var W = 960, H = 540, GROUND = 498;\n' +
'var PI = Math.PI;\n' +
'function clamp(v, a, b) { return v < a ? a : (v > b ? b : v); }\n' +
'function lerp(a, b, t) { return a + (b - a) * t; }\n' +
'function rand(a, b) { return a + Math.random() * (b - a); }\n' +
'function irand(a, b) { return Math.floor(rand(a, b + 1)); }\n' +
'function lerpC(c1, c2, t) { return [Math.round(lerp(c1[0], c2[0], t)), Math.round(lerp(c1[1], c2[1], t)), Math.round(lerp(c1[2], c2[2], t))]; }\n' +
'function rgb(c, a) { return "rgba(" + c[0] + "," + c[1] + "," + c[2] + "," + a + ")"; }\n' +
'function circleRect(cx, cy, r, rx, ry, rw, rh) { var nx = clamp(cx, rx, rx + rw); var ny = clamp(cy, ry, ry + rh); var dx = cx - nx; var dy = cy - ny; return dx * dx + dy * dy < r * r; }\n' +
'var G = { mode: "menu", t: 0, dist: 0, speed: 240, score: 0, rings: 0, lives: 3, best: 0, combo: 1, comboT: 0, shake: 0, flash: 0, invuln: 0, shield: false, magnet: 0, slowmo: 0, meter: 60, boosting: false, muted: false, nightF: 0 };\n' +
'try { G.best = parseInt(localStorage.getItem("skyward-best") || "0", 10) || 0; } catch (e) { G.best = 0; }\n' +
'var P = { x: 150, y: 270, vy: 0, tilt: 0, prop: 0 };\n' +
'var obs = [], picks = [], parts = [], floats = [], clouds = [], stars = [];\n' +
'var spawnT = 1.2, ringT = 2.0, starT = 3.5, powerT = 9, cloudT = 0;\n' +
'var keys = {};\n' +
'var pointer = { down: false, y: 270, active: false };\n' +
'for (var ci = 0; ci < 9; ci++) { clouds.push({ x: rand(0, W), y: rand(25, 240), s: rand(0.6, 1.5), v: rand(8, 26) }); }\n' +
'for (var si = 0; si < 80; si++) { stars.push({ x: rand(0, W), y: rand(0, 330), r: rand(0.6, 1.8), tw: rand(0, 6.28) }); }\n' +
'function show(id, on) { var el = document.getElementById(id); if (on) { el.classList.remove("hidden"); } else { el.classList.add("hidden"); } }\n' +
'function refreshBest() { document.getElementById("bestChip").textContent = "Best: " + Math.floor(G.best) + " m"; document.getElementById("menuBest").textContent = Math.floor(G.best); }\n' +
'refreshBest();\n' +
'var AC = null, engineOsc = null, engineGain = null;\n' +
'function audio() { if (!AC) { try { AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { AC = null; } } if (AC && AC.state === "suspended") { AC.resume(); } return AC; }\n' +
'function tone(f, d, type, vol, slideTo) { if (G.muted || !audio()) { return; } try { var o = AC.createOscillator(); var g = AC.createGain(); var now = AC.currentTime; o.type = type || "sine"; o.frequency.setValueAtTime(f, now); if (slideTo) { o.frequency.exponentialRampToValueAtTime(slideTo, now + d); } g.gain.setValueAtTime(vol || 0.08, now); g.gain.exponentialRampToValueAtTime(0.0001, now + d); o.connect(g); g.connect(AC.destination); o.start(now); o.stop(now + d + 0.02); } catch (e) {} }\n' +
'function engineStart() { if (!audio() || engineOsc) { return; } try { engineOsc = AC.createOscillator(); engineGain = AC.createGain(); engineOsc.type = "sawtooth"; engineOsc.frequency.value = 55; engineGain.gain.value = 0.0; engineOsc.connect(engineGain); engineGain.connect(AC.destination); engineOsc.start(); } catch (e) { engineOsc = null; } }\n' +
'function engineUpdate() { if (!engineOsc || !engineGain) { return; } var target = G.mode === "playing" ? 0.022 + (G.speed - 240) / 9000 : 0.0; try { engineGain.gain.setTargetAtTime(G.muted ? 0 : target, AC.currentTime, 0.1); engineOsc.frequency.setTargetAtTime(52 + G.speed * 0.11 + (G.boosting ? 26 : 0), AC.currentTime, 0.1); } catch (e) {} }\n' +
'function engineStop() { if (engineOsc) { try { engineOsc.stop(); } catch (e) {} engineOsc = null; engineGain = null; } }\n' +
'function setMuted(m) { G.muted = m; document.getElementById("muteBtn").innerHTML = m ? "&#215;" : "&#9836;"; engineUpdate(); }\n' +
'window.addEventListener("keydown", function (e) { var c = e.code; if (c === "ArrowUp" || c === "ArrowDown" || c === "Space") { e.preventDefault(); } keys[c] = true; if (c === "KeyM") { setMuted(!G.muted); } if (c === "KeyP" || c === "Escape") { togglePause(); } if (c === "Enter" || c === "Space") { if (G.mode === "menu") { startGame(); } else if (G.mode === "over") { startGame(); } } });\n' +
'window.addEventListener("keyup", function (e) { keys[e.code] = false; });\n' +
'function canvasY(clientY) { var r = canvas.getBoundingClientRect(); return (clientY - r.top) * (H / r.height); }\n' +
'canvas.addEventListener("mousemove", function (e) { pointer.y = canvasY(e.clientY); pointer.active = true; });\n' +
'canvas.addEventListener("mousedown", function (e) { pointer.down = true; pointer.active = true; pointer.y = canvasY(e.clientY); audio(); });\n' +
'window.addEventListener("mouseup", function () { pointer.down = false; });\n' +
'canvas.addEventListener("touchstart", function (e) { e.preventDefault(); var t = e.touches[0]; pointer.down = true; pointer.active = true; pointer.y = canvasY(t.clientY); audio(); }, { passive: false });\n' +
'canvas.addEventListener("touchmove", function (e) { e.preventDefault(); var t = e.touches[0]; pointer.y = canvasY(t.clientY); pointer.active = true; }, { passive: false });\n' +
'canvas.addEventListener("touchend", function (e) { e.preventDefault(); pointer.down = false; }, { passive: false });\n';


html += 'function burst(x, y, n, color, spd, life, size, grav) { for (var i = 0; i < n; i++) { var a = rand(0, PI * 2); var v = rand(spd * 0.3, spd); parts.push({ x: x, y: y, vx: Math.cos(a) * v, vy: Math.sin(a) * v, life: rand(life * 0.5, life), max: life, size: rand(size * 0.5, size), color: color, grav: grav || 0 }); } }\n' +
'function floater(x, y, text, color) { floats.push({ x: x, y: y, text: text, color: color || "#fff", life: 1.1 }); }\n' +
'function addScore(n, x, y, label) { G.score += n; if (x !== undefined) { floater(x, y, (label || "+") + n, "#ffe27a"); } }\n' +
'function spawnObstacle() { var roll = Math.random(); var diff = clamp(G.dist / 9000, 0, 1); var y, gap, topH;\n' +
'if (roll < 0.30) { y = rand(70, GROUND - 90); obs.push({ kind: "bird", x: W + 50, y: y, w: 46, h: 26, vx: rand(30, 70), ph: rand(0, 6.28), flap: rand(6, 9) }); }\n' +
'else if (roll < 0.52) { y = rand(90, GROUND - 130); obs.push({ kind: "balloon", x: W + 60, y: y, w: 52, h: 68, vx: rand(8, 20), ph: rand(0, 6.28), baseY: y }); }\n' +
'else if (roll < 0.70) { y = rand(60, GROUND - 120); obs.push({ kind: "storm", x: W + 70, y: y, w: 92, h: 58, vx: rand(5, 18), ph: rand(0, 6.28), flash: 0 }); }\n' +
'else if (roll < 0.86) { gap = rand(230, 300) - diff * 40; topH = rand(40, GROUND - gap - 60); obs.push({ kind: "spire", x: W + 40, y: GROUND - rand(90, 210), w: 54, h: 260, vx: 0, top: false }); if (Math.random() < 0.55) { obs.push({ kind: "spire", x: W + 40, y: -30, w: 54, h: topH, vx: 0, top: true }); } }\n' +
'else { y = rand(80, GROUND - 110); obs.push({ kind: "kite", x: W + 50, y: y, w: 44, h: 44, vx: rand(20, 45), ph: rand(0, 6.28), baseY: y }); } }\n' +
'function spawnPickup(kind) { var y = rand(70, GROUND - 80); if (kind === "ring") { picks.push({ kind: "ring", x: W + 40, y: y, r: 26, spin: 0 }); } else if (kind === "star") { picks.push({ kind: "star", x: W + 40, y: y, r: 16, spin: rand(0, 6.28) }); } else { var kinds = ["shield", "magnet", "slowmo"]; picks.push({ kind: kinds[irand(0, 2)], x: W + 40, y: y, r: 18, spin: 0 }); } }\n' +
'function startGame() { audio(); G.mode = "playing"; G.t = 0; G.dist = 0; G.speed = 240; G.score = 0; G.rings = 0; G.lives = 3; G.combo = 1; G.comboT = 0; G.shake = 0; G.flash = 0; G.invuln = 0; G.shield = false; G.magnet = 0; G.slowmo = 0; G.meter = 60; G.boosting = false; P.x = 150; P.y = 270; P.vy = 0; P.tilt = 0; obs = []; picks = []; parts = []; floats = []; spawnT = 1.0; ringT = 1.6; starT = 3.0; powerT = 9; show("menu", false); show("over", false); show("paused", false); engineStart(); floater(P.x + 60, P.y - 50, "GO!", "#7dff9a"); tone(523, 0.12, "sine", 0.09); setTimeout(function () { tone(784, 0.18, "sine", 0.09); }, 110); }\n' +
'function gameOver() { G.mode = "over"; engineStop(); burst(P.x, P.y, 46, "#ff6b4a", 260, 0.9, 5, 300); burst(P.x, P.y, 24, "#ffb52e", 180, 0.7, 4, 200); G.shake = 16; tone(220, 0.5, "sawtooth", 0.1, 60); var d = Math.floor(G.dist); var isBest = d > G.best; if (isBest) { G.best = d; try { localStorage.setItem("skyward-best", String(d)); } catch (e) {} } document.getElementById("finalScore").textContent = d; document.getElementById("finalBest").textContent = Math.floor(G.best); document.getElementById("finalRings").textContent = G.rings; document.getElementById("newBest").style.display = isBest ? "inline-block" : "none"; refreshBest(); show("over", true); }\n' +
'function togglePause() { if (G.mode === "playing") { G.mode = "paused"; show("paused", true); engineUpdate(); } else if (G.mode === "paused") { G.mode = "playing"; show("paused", false); engineUpdate(); } }\n' +
'function hitObstacle(o) { if (G.invuln > 0) { return; } if (G.shield) { G.shield = false; burst(o.x + o.w / 2, o.y + o.h / 2, 22, "#7db8ff", 200, 0.6, 4, 0); floater(P.x + 30, P.y - 34, "SHIELD SAVED YOU!", "#7db8ff"); tone(880, 0.15, "square", 0.07, 440); o.dead = true; return; } G.lives -= 1; G.combo = 1; G.comboT = 0; G.invuln = 1.7; G.shake = 14; G.flash = 0.35; burst(P.x, P.y, 26, "#ff8a5c", 220, 0.7, 5, 260); tone(180, 0.3, "sawtooth", 0.11, 70); o.dead = true; if (G.lives <= 0) { gameOver(); } }\n' +
'function step(dt) { G.t += dt; var diff = clamp(G.dist / 9000, 0, 1); var targetSpeed = 240 + diff * 230; G.speed = lerp(G.speed, targetSpeed, dt * 0.5); var eff = G.speed * (G.slowmo > 0 ? 0.55 : 1) * (G.boosting && G.meter > 0 ? 1.55 : 1); G.boosting = !!(keys["Space"] && G.meter > 0); if (G.boosting) { G.meter = Math.max(0, G.meter - 22 * dt); }\n' +
'G.dist += eff * dt; G.score += eff * dt * 0.055 * (G.boosting ? 2 : 1);\n' +
'if (G.comboT > 0) { G.comboT -= dt; if (G.comboT <= 0) { G.combo = 1; } }\n' +
'if (G.invuln > 0) { G.invuln -= dt; } if (G.flash > 0) { G.flash -= dt; } if (G.shake > 0) { G.shake = Math.max(0, G.shake - 40 * dt); }\n' +
'if (G.magnet > 0) { G.magnet -= dt; } if (G.slowmo > 0) { G.slowmo -= dt; }\n' +
'var up = keys["ArrowUp"] || keys["KeyW"] || (pointer.down && pointer.y < P.y - 6); var down = keys["ArrowDown"] || keys["KeyS"] || (pointer.down && pointer.y > P.y + 6);\n' +
'if (pointer.active && !pointer.down && Math.abs(pointer.y - P.y) > 4 && !keys["ArrowUp"] && !keys["ArrowDown"] && !keys["KeyW"] && !keys["KeyS"]) { var want = (pointer.y - P.y) * 6; P.vy = lerp(P.vy, clamp(want, -430, 430), dt * 8); } else { P.vy += 1450 * dt; if (up) { P.vy -= 2650 * dt; } if (down) { P.vy += 1300 * dt; } P.vy = clamp(P.vy, -520, 520); }\n' +
'P.y += P.vy * dt; var floorY = GROUND - 22; if (P.y > floorY) { P.y = floorY; if (P.vy > 330) { hitObstacle({ x: P.x - 20, y: GROUND - 10, w: 40, h: 12, dead: false }); if (G.mode !== "over") { P.vy = -260; } } else { P.vy = Math.min(0, P.vy) * 0.4; } } if (P.y < 26) { P.y = 26; P.vy = Math.max(0, P.vy); }\n' +
'P.tilt = lerp(P.tilt, clamp(P.vy / 900, -0.42, 0.42), dt * 10); P.prop += dt * (26 + G.speed * 0.05);\n' +
'spawnT -= dt; if (spawnT <= 0) { spawnObstacle(); spawnT = rand(0.75, 1.35) - diff * 0.3; }\n' +
'ringT -= dt; if (ringT <= 0) { spawnPickup("ring"); ringT = rand(2.4, 3.8); }\n' +
'starT -= dt; if (starT <= 0) { spawnPickup("star"); starT = rand(2.2, 3.6); }\n' +
'powerT -= dt; if (powerT <= 0) { spawnPickup("power"); powerT = rand(9, 14); }\n' +
'for (var i = obs.length - 1; i >= 0; i--) { var o = obs[i]; o.x -= (eff + (o.vx || 0)) * dt; if (o.kind === "bird") { o.y += Math.sin(G.t * o.flap + o.ph) * 42 * dt; } if (o.kind === "balloon" || o.kind === "kite") { o.y = o.baseY + Math.sin(G.t * 1.4 + o.ph) * 22; } if (o.kind === "storm") { o.flash -= dt; if (o.flash <= -rand(1.2, 2.4)) { o.flash = 0.12; } }\n' +
'if (!o.dead && G.invuln <= 0 && circleRect(P.x, P.y, 17, o.x, o.y, o.w, o.h)) { hitObstacle(o); }\n' +
'if (o.x + o.w < -80 || o.dead) { obs.splice(i, 1); } }\n' +
'for (var j = picks.length - 1; j >= 0; j--) { var k = picks[j]; k.spin += dt * 3; k.x -= eff * dt; if (G.magnet > 0) { var dx = P.x - k.x, dy = P.y - k.y; var dd = Math.sqrt(dx * dx + dy * dy); if (dd < 250 && dd > 1) { k.x += dx / dd * 320 * dt; k.y += dy / dd * 320 * dt; } }\n' +
'var kx = k.x, ky = k.y; var hit = false;\n' +
'if (k.kind === "ring") { var rdx = P.x - kx, rdy = P.y - ky; if (rdx * rdx + rdy * rdy < 34 * 34) { hit = true; } } else { var pdx = P.x - kx, pdy = P.y - ky; if (pdx * pdx + pdy * pdy < (k.r + 17) * (k.r + 17)) { hit = true; } }\n' +
'if (hit) { if (k.kind === "ring") { G.rings += 1; addScore(100 * G.combo, kx, ky - 20, "+"); G.combo = Math.min(5, G.combo + 1); G.comboT = 4; burst(kx, ky, 16, "#ffe27a", 150, 0.5, 3.5, 0); tone(660 + G.combo * 90, 0.14, "sine", 0.09, 990 + G.combo * 90); } else if (k.kind === "star") { G.meter = Math.min(100, G.meter + 26); addScore(25, kx, ky - 18, "+"); burst(kx, ky, 12, "#7dff9a", 130, 0.5, 3, 0); tone(980, 0.12, "triangle", 0.08, 1320); } else if (k.kind === "shield") { G.shield = true; floater(P.x + 30, P.y - 34, "SHIELD!", "#7db8ff"); tone(520, 0.2, "triangle", 0.09, 780); } else if (k.kind === "magnet") { G.magnet = 6; floater(P.x + 30, P.y - 34, "MAGNET!", "#ff9de2"); tone(520, 0.2, "triangle", 0.09, 780); } else if (k.kind === "slowmo") { G.slowmo = 5; floater(P.x + 30, P.y - 34, "SLOW-MO!", "#9de8ff"); tone(440, 0.2, "triangle", 0.09, 660); } picks.splice(j, 1); continue; }\n' +
'if (k.x < -60) { picks.splice(j, 1); } }\n' +
'if (Math.random() < dt * (G.boosting ? 60 : 22)) { parts.push({ x: P.x - 26, y: P.y + 6, vx: -rand(60, 130) - eff * 0.25, vy: rand(-8, 8), life: rand(0.25, 0.5), max: 0.5, size: rand(2, 4.5), color: G.boosting ? "#ffd76e" : "#ffffff", grav: 0 }); }\n' +
'for (var m = parts.length - 1; m >= 0; m--) { var q = parts[m]; q.life -= dt; q.x += q.vx * dt; q.y += q.vy * dt; q.vy += (q.grav || 0) * dt; if (q.life <= 0) { parts.splice(m, 1); } }\n' +
'for (var n = floats.length - 1; n >= 0; n--) { floats[n].life -= dt; floats[n].y -= 42 * dt; if (floats[n].life <= 0) { floats.splice(n, 1); } }\n' +
'for (var c = 0; c < clouds.length; c++) { clouds[c].x -= (clouds[c].v + eff * 0.08) * dt; if (clouds[c].x < -160) { clouds[c].x = W + rand(20, 160); clouds[c].y = rand(25, 240); } }\n' +
'cloudT -= dt; if (cloudT <= 0) { cloudT = 0.4; if (clouds.length < 12 && Math.random() < 0.5) { clouds.push({ x: W + 120, y: rand(25, 240), s: rand(0.6, 1.5), v: rand(8, 26) }); } }\n' +
'engineUpdate(); }\n';

html += 'var SKY = [{ p: 0, top: [121, 181, 232], bot: [198, 228, 246] }, { p: 0.32, top: [121, 181, 232], bot: [198, 228, 246] }, { p: 0.5, top: [64, 80, 150], bot: [255, 158, 92] }, { p: 0.62, top: [64, 80, 150], bot: [255, 158, 92] }, { p: 0.8, top: [10, 14, 34], bot: [34, 50, 94] }, { p: 0.92, top: [10, 14, 34], bot: [34, 50, 94] }, { p: 1, top: [121, 181, 232], bot: [198, 228, 246] }];\n' +
'function skyColors() { var cyc = (G.dist / 9000) % 1; var i = 0; while (i < SKY.length - 2 && cyc > SKY[i + 1].p) { i++; } var a = SKY[i], b = SKY[i + 1]; var t = (cyc - a.p) / Math.max(0.0001, b.p - a.p); t = clamp(t, 0, 1); return { top: lerpC(a.top, b.top, t), bot: lerpC(a.bot, b.bot, t), cyc: cyc }; }\n' +
'function drawRidge(off, base, a1, f1, a2, f2, color) { ctx.fillStyle = color; ctx.beginPath(); ctx.moveTo(-4, H); for (var x = -4; x <= W + 24; x += 24) { var y = base - (Math.sin((x + off) * f1) * a1 + Math.sin((x + off) * f2 + 1.7) * a2); ctx.lineTo(x, y); } ctx.lineTo(W + 4, H); ctx.closePath(); ctx.fill(); }\n' +
'function drawCloud(x, y, s, nightF) { ctx.fillStyle = "rgba(255,255,255," + (0.92 - nightF * 0.55) + ")"; ctx.beginPath(); ctx.ellipse(x, y, 42 * s, 20 * s, 0, 0, PI * 2); ctx.ellipse(x - 30 * s, y + 6 * s, 26 * s, 14 * s, 0, 0, PI * 2); ctx.ellipse(x + 30 * s, y + 6 * s, 28 * s, 15 * s, 0, 0, PI * 2); ctx.fill(); }\n' +
'function drawBird(o) { var flap = Math.sin(G.t * o.flap + o.ph) * 10; ctx.save(); ctx.translate(o.x + o.w / 2, o.y + o.h / 2); ctx.fillStyle = "#3a3f4a"; ctx.beginPath(); ctx.ellipse(0, 0, 20, 9, 0, 0, PI * 2); ctx.fill(); ctx.beginPath(); ctx.moveTo(18, -3); ctx.lineTo(28, 0); ctx.lineTo(18, 3); ctx.closePath(); ctx.fillStyle = "#f5a623"; ctx.fill(); ctx.strokeStyle = "#3a3f4a"; ctx.lineWidth = 4; ctx.beginPath(); ctx.moveTo(-4, -2); ctx.quadraticCurveTo(-12, -14 - flap, -22, -10 - flap); ctx.moveTo(-4, -2); ctx.quadraticCurveTo(-12, 10 + flap, -22, 6 + flap); ctx.stroke(); ctx.fillStyle = "#fff"; ctx.beginPath(); ctx.arc(12, -3, 3, 0, PI * 2); ctx.fill(); ctx.restore(); }\n' +
'function drawBalloon(o) { var bob = Math.sin(G.t * 1.4 + o.ph) * 2; ctx.save(); ctx.translate(o.x + o.w / 2, o.y + o.h / 2 + bob); ctx.fillStyle = "#e2503e"; ctx.beginPath(); ctx.ellipse(0, -12, 24, 28, 0, 0, PI * 2); ctx.fill(); ctx.fillStyle = "#f6d365"; ctx.beginPath(); ctx.ellipse(0, -12, 10, 28, 0, 0, PI * 2); ctx.fill(); ctx.fillStyle = "#e2503e"; ctx.beginPath(); ctx.ellipse(0, -12, 4, 28, 0, 0, PI * 2); ctx.fill(); ctx.strokeStyle = "#5a4632"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(-12, 12); ctx.lineTo(-8, 26); ctx.moveTo(12, 12); ctx.lineTo(8, 26); ctx.stroke(); ctx.fillStyle = "#8a5a2b"; ctx.fillRect(-9, 26, 18, 12); ctx.restore(); }\n' +
'function drawStorm(o) { ctx.save(); ctx.translate(o.x + o.w / 2, o.y + o.h / 2); var dark = o.flash > 0; ctx.fillStyle = dark ? "#5a6376" : "#3c4356"; ctx.beginPath(); ctx.ellipse(-18, 4, 26, 16, 0, 0, PI * 2); ctx.ellipse(4, -6, 30, 20, 0, 0, PI * 2); ctx.ellipse(24, 6, 22, 14, 0, 0, PI * 2); ctx.fill(); ctx.fillStyle = "#2c3242"; ctx.beginPath(); ctx.ellipse(0, 12, 34, 10, 0, 0, PI * 2); ctx.fill(); if (dark) { ctx.strokeStyle = "#ffe27a"; ctx.lineWidth = 3; ctx.beginPath(); ctx.moveTo(6, 18); ctx.lineTo(-2, 34); ctx.lineTo(6, 34); ctx.lineTo(-4, 52); ctx.stroke(); } ctx.restore(); }\n' +
'function drawSpire(o) { ctx.save(); ctx.fillStyle = "#6d5a49"; ctx.strokeStyle = "#4c3e32"; ctx.lineWidth = 2; ctx.beginPath(); if (o.top) { ctx.moveTo(o.x - 6, o.y); ctx.lineTo(o.x + o.w + 6, o.y); ctx.lineTo(o.x + o.w - 8, o.y + o.h - 26); ctx.lineTo(o.x + o.w / 2 + 6, o.y + o.h); ctx.lineTo(o.x + 10, o.y + o.h - 30); ctx.closePath(); } else { ctx.moveTo(o.x - 6, o.y + o.h); ctx.lineTo(o.x + o.w + 6, o.y + o.h); ctx.lineTo(o.x + o.w - 6, o.y + 34); ctx.lineTo(o.x + o.w / 2 - 4, o.y); ctx.lineTo(o.x + 8, o.y + 40); ctx.closePath(); } ctx.fill(); ctx.stroke(); ctx.fillStyle = "#8f7a64"; ctx.beginPath(); if (o.top) { ctx.moveTo(o.x + 12, o.y); ctx.lineTo(o.x + o.w - 12, o.y); ctx.lineTo(o.x + o.w / 2 + 2, o.y + 26); ctx.closePath(); } else { ctx.moveTo(o.x + 10, o.y + o.h); ctx.lineTo(o.x + o.w - 10, o.y + o.h); ctx.lineTo(o.x + o.w / 2, o.y + o.h - 30); ctx.closePath(); } ctx.fill(); ctx.restore(); }\n' +
'function drawKite(o) { var sway = Math.sin(G.t * 2 + o.ph) * 0.14; ctx.save(); ctx.translate(o.x + o.w / 2, o.y + o.h / 2); ctx.rotate(sway); ctx.fillStyle = "#7c5cd6"; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(16, 0); ctx.lineTo(0, 22); ctx.lineTo(-16, 0); ctx.closePath(); ctx.fill(); ctx.strokeStyle = "#fff"; ctx.lineWidth = 2; ctx.beginPath(); ctx.moveTo(0, -20); ctx.lineTo(0, 22); ctx.moveTo(-16, 0); ctx.lineTo(16, 0); ctx.stroke(); ctx.strokeStyle = "#e8e8e8"; ctx.lineWidth = 1.5; ctx.beginPath(); ctx.moveTo(0, 22); ctx.quadraticCurveTo(10, 40, 2, 56); ctx.stroke(); ctx.fillStyle = "#ffcf4d"; ctx.beginPath(); ctx.arc(2, 56, 4, 0, PI * 2); ctx.fill(); ctx.restore(); }\n' +
'function drawRingPickup(k) { var sq = Math.abs(Math.cos(k.spin)); ctx.save(); ctx.translate(k.x, k.y); ctx.scale(0.35 + 0.65 * sq, 1); ctx.strokeStyle = "#ffcf4d"; ctx.lineWidth = 7; ctx.beginPath(); ctx.arc(0, 0, 24, 0, PI * 2); ctx.stroke(); ctx.strokeStyle = "rgba(255,255,255,.85)"; ctx.lineWidth = 2; ctx.beginPath(); ctx.arc(0, 0, 24, 0, PI * 2); ctx.stroke(); ctx.restore(); }\n' +
'function drawStarPickup(k) { ctx.save(); ctx.translate(k.x, k.y); ctx.rotate(k.spin * 0.4); ctx.fillStyle = "#7dff9a"; ctx.strokeStyle = "#2f9e4f"; ctx.lineWidth = 2; ctx.beginPath(); for (var i = 0; i < 10; i++) { var r = i % 2 === 0 ? 16 : 7; var a = -PI / 2 + i * PI / 5; var px = Math.cos(a) * r, py = Math.sin(a) * r; if (i === 0) { ctx.moveTo(px, py); } else { ctx.lineTo(px, py); } } ctx.closePath(); ctx.fill(); ctx.stroke(); ctx.restore(); }\n' +
'function drawPowerPickup(k) { var colors = { shield: "#7db8ff", magnet: "#ff9de2", slowmo: "#9de8ff" }; ctx.save(); ctx.translate(k.x, k.y); var pulse = 1 + Math.sin(G.t * 5) * 0.07; ctx.scale(pulse, pulse); ctx.fillStyle = colors[k.kind] || "#fff"; ctx.beginPath(); ctx.arc(0, 0, 18, 0, PI * 2); ctx.fill(); ctx.strokeStyle = "rgba(255,255,255,.9)"; ctx.lineWidth = 3; ctx.stroke(); ctx.fillStyle = "#14213d"; ctx.font = "bold 17px sans-serif"; ctx.textAlign = "center"; ctx.textBaseline = "middle"; var glyph = k.kind === "shield" ? "S" : (k.kind === "magnet" ? "M" : "C"); ctx.fillText(glyph, 0, 1); ctx.restore(); }\n' +
'function drawPlane() { if (G.invuln > 0 && Math.floor(G.t * 12) % 2 === 0 && G.mode === "playing") { return; } ctx.save(); ctx.translate(P.x, P.y); ctx.rotate(P.tilt); if (G.boosting && G.meter > 0) { var fl = 10 + Math.random() * 12; ctx.fillStyle = "#ffb52e"; ctx.beginPath(); ctx.moveTo(-24, 2); ctx.lineTo(-24 - fl, 6); ctx.lineTo(-24, 10); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#ffe27a"; ctx.beginPath(); ctx.moveTo(-24, 4); ctx.lineTo(-24 - fl * 0.55, 6); ctx.lineTo(-24, 8); ctx.closePath(); ctx.fill(); }\n' +
'ctx.fillStyle = "#c93326"; ctx.beginPath(); ctx.moveTo(-30, 8); ctx.lineTo(-20, -4); ctx.lineTo(-8, -6); ctx.lineTo(-8, 10); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#e23b2e"; ctx.beginPath(); ctx.ellipse(0, 2, 28, 10, 0, 0, PI * 2); ctx.fill(); ctx.fillStyle = "#fff"; ctx.fillRect(-14, -4, 34, 4); ctx.fillStyle = "#8f1d15"; ctx.beginPath(); ctx.moveTo(-26, -8); ctx.lineTo(-14, -8); ctx.lineTo(-18, 2); ctx.closePath(); ctx.fill(); ctx.fillStyle = "#bfe8ff"; ctx.beginPath(); ctx.ellipse(8, -4, 8, 6, -0.2, 0, PI * 2); ctx.fill(); ctx.fillStyle = "#a8d8f0"; ctx.beginPath(); ctx.ellipse(8, -4, 4, 3.4, -0.2, 0, PI * 2); ctx.fill(); ctx.fillStyle = "#f4f7ff"; ctx.fillRect(-6, -16, 10, 22); ctx.fillStyle = "#c93326"; ctx.fillRect(-6, -16, 10, 4); ctx.strokeStyle = "#5a4632"; ctx.lineWidth = 2.5; ctx.beginPath(); ctx.moveTo(28, 2); ctx.lineTo(28 + Math.cos(P.prop) * 13, 2 + Math.sin(P.prop) * 13); ctx.moveTo(28, 2); ctx.lineTo(28 - Math.cos(P.prop) * 13, 2 - Math.sin(P.prop) * 13); ctx.stroke(); ctx.fillStyle = "#333"; ctx.beginPath(); ctx.arc(28, 2, 3.4, 0, PI * 2); ctx.fill(); ctx.restore(); if (G.shield) { ctx.save(); ctx.strokeStyle = "rgba(125,184,255," + (0.55 + Math.sin(G.t * 6) * 0.25) + ")"; ctx.lineWidth = 3; ctx.beginPath(); ctx.arc(P.x, P.y, 30, 0, PI * 2); ctx.stroke(); ctx.restore(); } }\n' +
'function drawHeart(x, y, filled) { ctx.save(); ctx.translate(x, y); ctx.fillStyle = filled ? "#ff5a6e" : "rgba(255,255,255,.28)"; ctx.beginPath(); ctx.moveTo(0, 6); ctx.bezierCurveTo(-11, -4, -6, -12, 0, -6); ctx.bezierCurveTo(6, -12, 11, -4, 0, 6); ctx.fill(); ctx.restore(); }\n' +
'function render() { var sky = skyColors(); var nightF = clamp((sky.cyc - 0.62) / 0.18, 0, 1); if (sky.cyc > 0.92) { nightF = clamp((1 - sky.cyc) / 0.08, 0, 1); } G.nightF = nightF; var grad = ctx.createLinearGradient(0, 0, 0, H); grad.addColorStop(0, rgb(sky.top, 1)); grad.addColorStop(1, rgb(sky.bot, 1)); ctx.fillStyle = grad; ctx.fillRect(0, 0, W, H);\n' +
'if (nightF > 0.05) { for (var s = 0; s < stars.length; s++) { var st = stars[s]; var tw = 0.35 + 0.65 * Math.abs(Math.sin(G.t * 1.6 + st.tw)); ctx.fillStyle = "rgba(255,255,255," + (nightF * tw * 0.9) + ")"; ctx.beginPath(); ctx.arc(st.x, st.y, st.r, 0, PI * 2); ctx.fill(); } }\n' +
'ctx.save(); if (nightF < 0.7) { var sg = ctx.createRadialGradient(788, 88, 8, 788, 88, 74); sg.addColorStop(0, "rgba(255,232,150,.95)"); sg.addColorStop(0.35, "rgba(255,214,110,.55)"); sg.addColorStop(1, "rgba(255,214,110,0)"); ctx.fillStyle = sg; ctx.beginPath(); ctx.arc(788, 88, 74, 0, PI * 2); ctx.fill(); ctx.fillStyle = "#ffe89a"; ctx.beginPath(); ctx.arc(788, 88, 34, 0, PI * 2); ctx.fill(); } if (nightF > 0.3) { ctx.fillStyle = "rgba(235,240,255," + (0.25 + nightF * 0.7) + ")"; ctx.beginPath(); ctx.arc(788, 88, 28, 0, PI * 2); ctx.fill(); ctx.fillStyle = rgb(sky.top, 0.9); ctx.beginPath(); ctx.arc(800, 80, 24, 0, PI * 2); ctx.fill(); } ctx.restore();\n' +
'ctx.save(); if (G.shake > 0) { ctx.translate(rand(-G.shake, G.shake) * 0.5, rand(-G.shake, G.shake) * 0.5); }\n' +
'drawRidge(G.dist * 0.1, 470, 46, 0.006, 22, 0.017, rgb(lerpC([122, 143, 178], [20, 26, 52], nightF), 0.85));\n' +
'drawRidge(G.dist * 0.22, 488, 34, 0.009, 16, 0.023, rgb(lerpC([88, 110, 148], [14, 19, 40], nightF), 0.9));\n' +
'for (var c = 0; c < clouds.length; c++) { drawCloud(clouds[c].x, clouds[c].y, clouds[c].s, nightF); }\n' +
'var groundCol = rgb(lerpC([106, 168, 84], [24, 40, 34], nightF), 1); ctx.fillStyle = groundCol; ctx.fillRect(0, GROUND, W, H - GROUND); ctx.fillStyle = rgb(lerpC([84, 138, 68], [18, 32, 28], nightF), 1); ctx.fillRect(0, GROUND, W, 5);\n' +
'var treeOff = G.dist % 150; for (var tx = -150; tx < W + 150; tx += 150) { var gx = tx - treeOff + 40; ctx.fillStyle = "#5a4632"; ctx.fillRect(gx - 3, GROUND + 8, 6, 16); ctx.fillStyle = rgb(lerpC([46, 110, 52], [14, 30, 26], nightF), 1); ctx.beginPath(); ctx.moveTo(gx, GROUND - 8); ctx.lineTo(gx - 13, GROUND + 12); ctx.lineTo(gx + 13, GROUND + 12); ctx.closePath(); ctx.fill(); }\n' +
'for (var o = 0; o < obs.length; o++) { var ob = obs[o]; if (ob.kind === "bird") { drawBird(ob); } else if (ob.kind === "balloon") { drawBalloon(ob); } else if (ob.kind === "storm") { drawStorm(ob); } else if (ob.kind === "spire") { drawSpire(ob); } else if (ob.kind === "kite") { drawKite(ob); } }\n' +
'for (var p = 0; p < picks.length; p++) { var pk = picks[p]; if (pk.kind === "ring") { drawRingPickup(pk); } else if (pk.kind === "star") { drawStarPickup(pk); } else { drawPowerPickup(pk); } }\n' +
'for (var q = 0; q < parts.length; q++) { var pt = parts[q]; ctx.fillStyle = pt.color; ctx.globalAlpha = clamp(pt.life / pt.max, 0, 1); ctx.beginPath(); ctx.arc(pt.x, pt.y, pt.size, 0, PI * 2); ctx.fill(); } ctx.globalAlpha = 1;\n' +
'if (G.mode !== "over") { drawPlane(); }\n' +
'ctx.restore();\n' +
'ctx.textAlign = "left"; ctx.textBaseline = "alphabetic";\n' +
'for (var f = 0; f < floats.length; f++) { var fl2 = floats[f]; ctx.globalAlpha = clamp(fl2.life, 0, 1); ctx.font = "bold 19px sans-serif"; ctx.lineWidth = 4; ctx.strokeStyle = "rgba(10,16,34,.8)"; ctx.strokeText(fl2.text, fl2.x, fl2.y); ctx.fillStyle = fl2.color; ctx.fillText(fl2.text, fl2.x, fl2.y); } ctx.globalAlpha = 1;\n' +
'if (G.mode === "playing" || G.mode === "paused") { ctx.fillStyle = "rgba(10,16,34,.45)"; ctx.beginPath(); ctx.roundRect(12, 12, 196, 52, 12); ctx.fill(); ctx.fillStyle = "#fff"; ctx.font = "bold 19px sans-serif"; ctx.fillText("SCORE " + Math.floor(G.score), 24, 35); ctx.font = "13px sans-serif"; ctx.fillStyle = "#cdd8f2"; ctx.fillText(Math.floor(G.dist) + " m  ·  " + Math.round(G.speed * (G.boosting ? 1.55 : 1)) + " km/h", 24, 54); for (var h = 0; h < 3; h++) { drawHeart(W - 34 - h * 30, 32, h < G.lives); } ctx.fillStyle = "rgba(10,16,34,.45)"; ctx.beginPath(); ctx.roundRect(W - 178, 46, 166, 14, 7); ctx.fill(); var meterCol = G.meter > 25 ? "#7dff9a" : "#ffcf4d"; ctx.fillStyle = meterCol; var mw = 162 * clamp(G.meter / 100, 0, 1); if (mw > 4) { ctx.beginPath(); ctx.roundRect(W - 176, 48, mw, 10, 5); ctx.fill(); } ctx.fillStyle = "#fff"; ctx.font = "bold 10px sans-serif"; ctx.textAlign = "right"; ctx.fillText("BOOST", W - 14, 41); ctx.textAlign = "left"; if (G.combo > 1 && G.comboT > 0) { ctx.fillStyle = "rgba(255,207,77,.95)"; ctx.beginPath(); ctx.roundRect(W / 2 - 62, 14, 124, 30, 15); ctx.fill(); ctx.fillStyle = "#241a00"; ctx.font = "bold 16px sans-serif"; ctx.textAlign = "center"; ctx.fillText("COMBO x" + G.combo, W / 2, 35); ctx.fillStyle = "#b87a00"; ctx.fillRect(W / 2 - 50, 40, 100 * clamp(G.comboT / 4, 0, 1), 3); ctx.textAlign = "left"; } var chipY = H - 30; ctx.font = "bold 12px sans-serif"; if (G.slowmo > 0) { ctx.fillStyle = "rgba(157,232,255,.9)"; ctx.beginPath(); ctx.roundRect(12, chipY - 14, 108, 22, 11); ctx.fill(); ctx.fillStyle = "#14213d"; ctx.fillText("SLOW-MO " + G.slowmo.toFixed(1) + "s", 22, chipY + 1); chipY -= 28; } if (G.magnet > 0) { ctx.fillStyle = "rgba(255,157,226,.9)"; ctx.beginPath(); ctx.roundRect(12, chipY - 14, 108, 22, 11); ctx.fill(); ctx.fillStyle = "#14213d"; ctx.fillText("MAGNET " + G.magnet.toFixed(1) + "s", 22, chipY + 1); } }\n' +
'if (G.flash > 0) { ctx.fillStyle = "rgba(255,60,40," + clamp(G.flash, 0, 0.35) + ")"; ctx.fillRect(0, 0, W, H); } }\n' +
'function ambient(dt) { G.t += dt; P.prop += dt * 20; if (G.mode === "menu") { P.y = 270 + Math.sin(G.t * 1.8) * 12; P.tilt = Math.sin(G.t * 1.8 + 0.6) * 0.06; } for (var c = 0; c < clouds.length; c++) { clouds[c].x -= clouds[c].v * dt; if (clouds[c].x < -160) { clouds[c].x = W + rand(20, 160); clouds[c].y = rand(25, 240); } } }\n' +
'var last = performance.now();\n' +
'function frame(now) { var dt = Math.min(0.033, (now - last) / 1000); last = now; if (G.mode === "playing") { step(dt); } else if (G.mode !== "paused") { ambient(dt); } render(); requestAnimationFrame(frame); }\n' +
'document.getElementById("startBtn").addEventListener("click", startGame);\n' +
'document.getElementById("retryBtn").addEventListener("click", startGame);\n' +
'document.getElementById("resumeBtn").addEventListener("click", togglePause);\n' +
'document.getElementById("pauseBtn").addEventListener("click", togglePause);\n' +
'document.getElementById("muteBtn").addEventListener("click", function () { setMuted(!G.muted); });\n' +
'document.getElementById("menuBtn").addEventListener("click", function () { G.mode = "menu"; show("over", false); show("menu", true); refreshBest(); });\n' +
'requestAnimationFrame(frame);\n' +
'</script>\n' +
'</body>\n' +
'</html>\n';

fs.mkdirSync(outDir, { recursive: true });
fs.writeFileSync(path.join(outDir, 'index.html'), html);
