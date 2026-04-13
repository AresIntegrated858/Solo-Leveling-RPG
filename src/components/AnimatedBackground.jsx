// AnimatedBackground — Igris + Shadow Army scene inspired by Solo Leveling
// Dark armored silhouettes with crackling blue electric energy outlines,
// glowing eye slits, vortex portal, ember/blue particles

import React, { useEffect, useRef } from 'react';

export default function AnimatedBackground({ opacity = 1 }) {
  const canvasRef = useRef(null);
  const animRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');

    function resize() {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    }
    resize();
    window.addEventListener('resize', resize);

    // ── Electric crackle effect ─────────────────────────────────────────────
    // Returns an array of jagged points between two coords
    function crackle(x1, y1, x2, y2, segs, spread) {
      const pts = [{ x: x1, y: y1 }];
      for (let i = 1; i < segs; i++) {
        const t = i / segs;
        pts.push({
          x: x1 + (x2 - x1) * t + (Math.random() - 0.5) * spread,
          y: y1 + (y2 - y1) * t + (Math.random() - 0.5) * spread,
        });
      }
      pts.push({ x: x2, y: y2 });
      return pts;
    }

    function drawCrackle(pts, alpha, width, color) {
      if (pts.length < 2) return;
      ctx.save();
      ctx.globalAlpha = alpha;
      ctx.shadowColor = color;
      ctx.shadowBlur = 10;
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.lineJoin = 'round';
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
      // Bright core
      ctx.shadowBlur = 0;
      ctx.strokeStyle = '#ddeeff';
      ctx.lineWidth = width * 0.3;
      ctx.globalAlpha = alpha * 0.6;
      ctx.beginPath();
      ctx.moveTo(pts[0].x, pts[0].y);
      for (let i = 1; i < pts.length; i++) ctx.lineTo(pts[i].x, pts[i].y);
      ctx.stroke();
      ctx.restore();
    }

    // ── Igris — the dominant armored general ───────────────────────────────
    function drawIgris(cx, cy, sc, op, pulse, frame) {
      ctx.save();
      ctx.globalAlpha = op;
      ctx.translate(cx, cy);
      ctx.scale(sc, sc);

      const eBlue = `rgba(80,160,255,${pulse})`;
      const eDim = `rgba(60,130,220,${pulse * 0.6})`;
      const body = '#080818';
      const bodyMid = '#0b0b22';

      // Body aura glow
      const aura = ctx.createRadialGradient(0, -80, 10, 0, -50, 280);
      aura.addColorStop(0, `rgba(60,130,255,${0.2 * pulse})`);
      aura.addColorStop(0.4, `rgba(30,80,200,${0.08 * pulse})`);
      aura.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = aura;
      ctx.beginPath();
      ctx.ellipse(0, -50, 240, 320, 0, 0, Math.PI * 2);
      ctx.fill();

      // Cape
      ctx.beginPath();
      ctx.moveTo(-65, -170);
      ctx.bezierCurveTo(-110, -90, -125, 30, -100, 165);
      ctx.lineTo(-22, 185);
      ctx.lineTo(22, 185);
      ctx.lineTo(100, 165);
      ctx.bezierCurveTo(125, 30, 110, -90, 65, -170);
      ctx.closePath();
      ctx.fillStyle = '#06061a';
      ctx.fill();
      ctx.strokeStyle = `rgba(50,110,210,0.25)`;
      ctx.lineWidth = 1;
      ctx.stroke();

      // Legs
      [[-30, -14], [30, 14]].forEach(([la, ra]) => {
        const sign = la < 0 ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(la, 55);
        ctx.lineTo(la + sign * 8, 60);
        ctx.bezierCurveTo(la + sign * 10, 90, la + sign * 8, 125, la + sign * 3, 162);
        ctx.lineTo(la - sign * 5, 167);
        ctx.lineTo(la, 55);
        ctx.closePath();
        ctx.fillStyle = body;
        ctx.fill();
        ctx.strokeStyle = eDim;
        ctx.lineWidth = 1.3;
        ctx.stroke();
      });

      // Torso
      ctx.beginPath();
      ctx.moveTo(-48, -68);
      ctx.lineTo(-54, -12);
      ctx.bezierCurveTo(-52, 28, -34, 52, -24, 62);
      ctx.lineTo(24, 62);
      ctx.bezierCurveTo(34, 52, 52, 28, 54, -12);
      ctx.lineTo(48, -68);
      ctx.bezierCurveTo(34, -88, -34, -88, -48, -68);
      ctx.closePath();
      ctx.fillStyle = bodyMid;
      ctx.fill();
      ctx.strokeStyle = eBlue;
      ctx.lineWidth = 2;
      ctx.shadowColor = '#4A90D9';
      ctx.shadowBlur = 8 * pulse;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Chest armor lines
      ctx.beginPath();
      ctx.moveTo(-30, -62); ctx.lineTo(-32, 24);
      ctx.moveTo(30, -62); ctx.lineTo(32, 24);
      ctx.moveTo(-44, -36); ctx.lineTo(44, -36);
      ctx.moveTo(-42, -10); ctx.lineTo(42, -10);
      ctx.moveTo(-20, -62); ctx.lineTo(0, -75); ctx.lineTo(20, -62);
      ctx.strokeStyle = eDim;
      ctx.lineWidth = 0.8;
      ctx.stroke();

      // Left pauldron
      ctx.beginPath();
      ctx.moveTo(-48, -68);
      ctx.bezierCurveTo(-72, -82, -100, -68, -94, -40);
      ctx.lineTo(-78, -14);
      ctx.bezierCurveTo(-62, -8, -48, -20, -44, -36);
      ctx.closePath();
      ctx.fillStyle = '#0d0d28';
      ctx.fill();
      ctx.strokeStyle = eBlue;
      ctx.lineWidth = 1.8;
      ctx.shadowColor = '#4A90D9';
      ctx.shadowBlur = 6 * pulse;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Right pauldron
      ctx.beginPath();
      ctx.moveTo(48, -68);
      ctx.bezierCurveTo(72, -82, 100, -68, 94, -40);
      ctx.lineTo(78, -14);
      ctx.bezierCurveTo(62, -8, 48, -20, 44, -36);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = eBlue;
      ctx.shadowColor = '#4A90D9';
      ctx.shadowBlur = 6 * pulse;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Shoulder spikes
      [[-90, -28, -112, -8], [90, -28, 112, -8]].forEach(([x1,y1,x2,y2]) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.lineCap = 'round';
        ctx.lineWidth = 5;
        ctx.strokeStyle = eBlue;
        ctx.shadowColor = '#4A90D9';
        ctx.shadowBlur = 10 * pulse;
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Arms
      [[-46, -44, -76, -20, -68, 58, -58, 64, -52, -38],
       [46, -44, 76, -26, 72, 52, 62, 58, 52, -38]].forEach(([ax,ay,bx,by,cx2,cy2,dx,dy,ex,ey]) => {
        ctx.beginPath();
        ctx.moveTo(ax, ay);
        ctx.bezierCurveTo(bx, by, cx2, cy2, dx, dy);
        ctx.lineTo(ex, ey);
        ctx.closePath();
        ctx.fillStyle = body;
        ctx.fill();
        ctx.strokeStyle = eDim;
        ctx.lineWidth = 1.2;
        ctx.stroke();
      });

      // Great Sword (Igris's signature weapon)
      // Blade
      ctx.beginPath();
      ctx.moveTo(-60, 80); ctx.lineTo(-54, 84); ctx.lineTo(-46, 225); ctx.lineTo(-52, 225);
      ctx.closePath();
      ctx.fillStyle = '#0e0e28';
      ctx.fill();
      ctx.strokeStyle = `rgba(100,175,255,0.8)`;
      ctx.lineWidth = 1.2;
      ctx.stroke();
      // Sword glow
      ctx.beginPath();
      ctx.moveTo(-57, 82); ctx.lineTo(-49, 225);
      ctx.strokeStyle = `rgba(74,144,217,0.6)`;
      ctx.lineWidth = 5;
      ctx.shadowColor = '#4A90D9';
      ctx.shadowBlur = 16 * pulse;
      ctx.stroke();
      ctx.shadowBlur = 0;
      // Crossguard
      ctx.beginPath();
      ctx.moveTo(-76, 86); ctx.lineTo(-40, 82); ctx.lineTo(-40, 90); ctx.lineTo(-76, 94);
      ctx.closePath();
      ctx.fillStyle = '#100028';
      ctx.fill();
      ctx.strokeStyle = eBlue;
      ctx.lineWidth = 1.4;
      ctx.stroke();

      // Neck
      ctx.beginPath();
      ctx.moveTo(-20, -88); ctx.lineTo(20, -88); ctx.lineTo(16, -110); ctx.lineTo(-16, -110);
      ctx.closePath();
      ctx.fillStyle = '#0a0a1e'; ctx.fill();

      // Helmet base
      ctx.beginPath();
      ctx.moveTo(-34, -110);
      ctx.bezierCurveTo(-38, -156, -24, -196, 0, -202);
      ctx.bezierCurveTo(24, -196, 38, -156, 34, -110);
      ctx.bezierCurveTo(28, -98, -28, -98, -34, -110);
      ctx.closePath();
      ctx.fillStyle = '#0c0c22';
      ctx.fill();
      ctx.strokeStyle = eBlue;
      ctx.lineWidth = 2;
      ctx.shadowColor = '#4A90D9';
      ctx.shadowBlur = 8 * pulse;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Helmet crest — tall horn
      ctx.beginPath();
      ctx.moveTo(-12, -202);
      ctx.bezierCurveTo(-14, -238, -6, -265, 0, -284);
      ctx.bezierCurveTo(6, -265, 14, -238, 12, -202);
      ctx.closePath();
      ctx.fillStyle = '#0e0e26';
      ctx.fill();
      ctx.strokeStyle = eBlue;
      ctx.lineWidth = 1.6;
      ctx.shadowColor = '#4A90D9';
      ctx.shadowBlur = 6 * pulse;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Helmet side horns
      [[-34, -158, -64, -176], [34, -158, 64, -176]].forEach(([x1,y1,x2,y2]) => {
        ctx.beginPath();
        ctx.moveTo(x1, y1); ctx.lineTo(x2, y2);
        ctx.lineCap = 'round';
        ctx.lineWidth = 6;
        ctx.strokeStyle = eBlue;
        ctx.shadowColor = '#4A90D9';
        ctx.shadowBlur = 10 * pulse;
        ctx.stroke();
        ctx.shadowBlur = 0;
      });

      // Visor — glowing eye slit
      ctx.save();
      ctx.shadowColor = '#4A90D9';
      ctx.shadowBlur = 28 * pulse;
      ctx.fillStyle = `rgba(80,160,255,${pulse})`;
      ctx.beginPath();
      ctx.moveTo(-26, -148); ctx.lineTo(26, -148); ctx.lineTo(24, -138); ctx.lineTo(-24, -138);
      ctx.closePath();
      ctx.fill();
      // Bright center
      ctx.fillStyle = `rgba(200,230,255,${pulse * 0.85})`;
      ctx.shadowBlur = 12 * pulse;
      ctx.beginPath();
      ctx.rect(-18, -146, 36, 5);
      ctx.fill();
      ctx.restore();

      // Electric crackle arcs FROM the body (animated every ~20 frames)
      if (frame % 22 < 4) {
        const arcs = [
          crackle(0, -200, -60 + Math.random() * 120, -280 + Math.random() * 60, 5, 18),
          crackle(-100, -40, -160 + Math.random() * 60, -80 + Math.random() * 120, 4, 14),
          crackle(100, -40, 140 + Math.random() * 40, -80 + Math.random() * 120, 4, 14),
        ];
        arcs.forEach(pts => drawCrackle(pts, 0.7, 1.5, '#7ac8ff'));
      }

      ctx.restore();
    }

    // ── Shadow Knight soldier ──────────────────────────────────────────────
    function drawKnight(cx, cy, sc, op, eyePulse, frame, frameOffset) {
      ctx.save();
      ctx.globalAlpha = op;
      ctx.translate(cx, cy);
      ctx.scale(sc, sc);

      const ef = `rgba(70,150,240,${eyePulse})`;
      const ed = `rgba(50,120,210,${eyePulse * 0.55})`;
      const fill = '#0b0b20';

      // Body
      ctx.beginPath();
      ctx.moveTo(-24, -48);
      ctx.lineTo(-26, -8);
      ctx.bezierCurveTo(-24, 22, -16, 38, -12, 50);
      ctx.lineTo(12, 50);
      ctx.bezierCurveTo(16, 38, 24, 22, 26, -8);
      ctx.lineTo(24, -48);
      ctx.bezierCurveTo(14, -60, -14, -60, -24, -48);
      ctx.closePath();
      ctx.fillStyle = fill;
      ctx.fill();
      ctx.strokeStyle = ef;
      ctx.lineWidth = 1.4;
      ctx.shadowColor = '#4A90D9';
      ctx.shadowBlur = 5 * eyePulse;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Legs
      [[-11, -5], [11, 5]].forEach(([la, ra]) => {
        const sign = la < 0 ? -1 : 1;
        ctx.beginPath();
        ctx.moveTo(la, 49);
        ctx.lineTo(la + sign * 4, 52);
        ctx.bezierCurveTo(la + sign * 5, 68, la + sign * 4, 85, la + sign * 2, 102);
        ctx.lineTo(la - sign * 3, 105);
        ctx.lineTo(la, 49);
        ctx.closePath();
        ctx.fillStyle = fill;
        ctx.fill();
        ctx.strokeStyle = ed;
        ctx.lineWidth = 1;
        ctx.stroke();
      });

      // Left pauldron
      ctx.beginPath();
      ctx.moveTo(-24, -48);
      ctx.bezierCurveTo(-38, -58, -52, -48, -48, -30);
      ctx.lineTo(-38, -14);
      ctx.bezierCurveTo(-28, -10, -22, -18, -20, -30);
      ctx.closePath();
      ctx.fillStyle = '#0e0e26';
      ctx.fill();
      ctx.strokeStyle = ef;
      ctx.lineWidth = 1.3;
      ctx.shadowColor = '#4A90D9';
      ctx.shadowBlur = 4 * eyePulse;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Right pauldron
      ctx.beginPath();
      ctx.moveTo(24, -48);
      ctx.bezierCurveTo(38, -58, 52, -48, 48, -30);
      ctx.lineTo(38, -14);
      ctx.bezierCurveTo(28, -10, 22, -18, 20, -30);
      ctx.closePath();
      ctx.fill();
      ctx.strokeStyle = ef;
      ctx.shadowColor = '#4A90D9';
      ctx.shadowBlur = 4 * eyePulse;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Helmet
      ctx.beginPath();
      ctx.moveTo(-18, -60);
      ctx.bezierCurveTo(-20, -88, -10, -110, 0, -114);
      ctx.bezierCurveTo(10, -110, 20, -88, 18, -60);
      ctx.bezierCurveTo(12, -52, -12, -52, -18, -60);
      ctx.closePath();
      ctx.fillStyle = '#0d0d22';
      ctx.fill();
      ctx.strokeStyle = ef;
      ctx.lineWidth = 1.5;
      ctx.shadowColor = '#4A90D9';
      ctx.shadowBlur = 5 * eyePulse;
      ctx.stroke();
      ctx.shadowBlur = 0;

      // Helmet spike
      ctx.beginPath();
      ctx.moveTo(-6, -114);
      ctx.bezierCurveTo(-7, -132, -3, -148, 0, -156);
      ctx.bezierCurveTo(3, -148, 7, -132, 6, -114);
      ctx.closePath();
      ctx.fillStyle = '#100020';
      ctx.fill();
      ctx.strokeStyle = ef;
      ctx.lineWidth = 1.2;
      ctx.stroke();

      // Eye slits — the signature glowing eyes
      ctx.save();
      ctx.shadowColor = '#4A90D9';
      ctx.shadowBlur = 16 * eyePulse;
      ctx.fillStyle = `rgba(80,160,255,${eyePulse})`;
      ctx.beginPath();
      // Left eye slit
      ctx.moveTo(-14, -84); ctx.lineTo(-5, -84); ctx.lineTo(-4, -79); ctx.lineTo(-13, -79);
      ctx.closePath(); ctx.fill();
      // Right eye slit
      ctx.beginPath();
      ctx.moveTo(14, -84); ctx.lineTo(5, -84); ctx.lineTo(4, -79); ctx.lineTo(13, -79);
      ctx.closePath(); ctx.fill();
      // Bright center
      ctx.fillStyle = `rgba(200,230,255,${eyePulse * 0.75})`;
      ctx.shadowBlur = 6 * eyePulse;
      ctx.fillRect(-12, -83, 7, 3);
      ctx.fillRect(5, -83, 7, 3);
      ctx.restore();

      // Spear
      ctx.beginPath();
      ctx.moveTo(34, 55); ctx.lineTo(36, 57); ctx.lineTo(26, 160); ctx.lineTo(24, 158);
      ctx.closePath();
      ctx.fillStyle = '#0a0a1c'; ctx.fill();
      ctx.beginPath(); ctx.moveTo(35, 55); ctx.lineTo(25, 159);
      ctx.strokeStyle = `rgba(70,150,240,${eyePulse * 0.5})`;
      ctx.lineWidth = 2; ctx.stroke();
      // Spear tip
      ctx.beginPath();
      ctx.moveTo(30, 55); ctx.lineTo(42, 50); ctx.lineTo(36, 58);
      ctx.closePath();
      ctx.fillStyle = `rgba(100,180,255,${eyePulse * 0.7})`; ctx.fill();

      // Occasional crackle off the body
      if ((frame + frameOffset) % 30 < 3) {
        const pts = crackle(0, -80, (Math.random() - 0.5) * 80, -140 + Math.random() * 30, 4, 12);
        drawCrackle(pts, 0.55, 1, '#7ac8ff');
      }

      ctx.restore();
    }

    // ── Particles (blue energy + ember sparks) ─────────────────────────────
    const particles = Array.from({ length: 130 }, () => makeParticle());
    function makeParticle() {
      const isEmber = Math.random() > 0.72;
      return {
        x: Math.random() * (canvas.width || 1440),
        y: (canvas.height || 900) + Math.random() * 80,
        vx: (Math.random() - 0.5) * (isEmber ? 0.8 : 0.4),
        vy: -(isEmber ? 0.4 + Math.random() * 1.0 : 0.2 + Math.random() * 0.7),
        size: isEmber ? 1.2 + Math.random() * 2.2 : 0.4 + Math.random() * 1.6,
        opacity: isEmber ? 0.3 + Math.random() * 0.6 : 0.1 + Math.random() * 0.5,
        twinkle: Math.random() * Math.PI * 2,
        isEmber,
        color: isEmber
          ? `hsl(${28 + Math.random() * 18},90%,${55 + Math.random() * 20}%)`
          : ['#4A90D9', '#6ab0ff', '#8ac8ff', '#2255aa'][Math.floor(Math.random() * 4)],
      };
    }

    // ── Lightning arcs from portal ─────────────────────────────────────────
    const portalArcs = [];
    let ltimer = 0;
    function spawnPortalArc(cx, cy) {
      const angle = Math.random() * Math.PI * 2;
      const len = 70 + Math.random() * 200;
      const pts = [{ x: cx, y: cy }];
      for (let i = 1; i <= 8; i++) {
        const t = i / 8;
        pts.push({
          x: cx + Math.cos(angle) * len * t + (Math.random() - 0.5) * 38,
          y: cy + Math.sin(angle) * len * t + (Math.random() - 0.5) * 38,
        });
      }
      portalArcs.push({ pts, life: 1, decay: 0.07 + Math.random() * 0.06 });
    }

    // ── Army positions ─────────────────────────────────────────────────────
    const knights = [];
    // Back row: 7 knights spread wide
    for (let i = 0; i < 7; i++) {
      knights.push({
        xFrac: (i / 6) * 0.88 + 0.06,
        yFrac: 0.72,
        sc: 0.28 + Math.random() * 0.05,
        baseOp: 0.6,
        phase: Math.random() * Math.PI * 2,
        risen: 0,
        fOff: Math.floor(Math.random() * 30),
      });
    }
    // Mid row: 4 knights (flanking, avoid center)
    [0.06, 0.24, 0.76, 0.94].forEach((xf) => {
      knights.push({
        xFrac: xf,
        yFrac: 0.79,
        sc: 0.40 + Math.random() * 0.06,
        baseOp: 0.72,
        phase: Math.random() * Math.PI * 2,
        risen: 0,
        fOff: Math.floor(Math.random() * 30),
      });
    });
    // Front row: 2 flanking (Igris is center)
    [0.10, 0.90].forEach((xf) => {
      knights.push({
        xFrac: xf,
        yFrac: 0.87,
        sc: 0.55 + Math.random() * 0.07,
        baseOp: 0.82,
        phase: Math.random() * Math.PI * 2,
        risen: 0,
        fOff: Math.floor(Math.random() * 30),
      });
    });

    let vortexAngle = 0;
    let igrisEyeT = 0;
    let frame = 0;

    function draw() {
      animRef.current = requestAnimationFrame(draw);
      frame++;
      const W = canvas.width;
      const H = canvas.height;
      const cx = W * 0.5;
      const cy = H * 0.30;

      // Background — deep navy-black
      const bg = ctx.createRadialGradient(cx, cy, 0, cx, cy, H * 1.1);
      bg.addColorStop(0, '#080820');
      bg.addColorStop(0.25, '#050514');
      bg.addColorStop(1, '#000008');
      ctx.fillStyle = bg;
      ctx.fillRect(0, 0, W, H);

      // ── Vortex rings ────────────────────────────────────────────────────
      vortexAngle += 0.004;
      for (let r = 10; r >= 0; r--) {
        const ro = 28 + r * 30;
        const ri = ro - 15;
        const dir = r % 2 === 0 ? 1 : -1;
        const ao = vortexAngle * dir + r * 0.28;
        ctx.save();
        ctx.globalAlpha = 0.035 + (10 - r) * 0.01;
        ctx.beginPath();
        ctx.arc(cx, cy, ro, ao, ao + Math.PI * 1.7);
        ctx.arc(cx, cy, ri, ao + Math.PI * 1.7, ao, true);
        ctx.closePath();
        const rg = ctx.createLinearGradient(cx - ro, cy, cx + ro, cy);
        rg.addColorStop(0, '#1a3a9a');
        rg.addColorStop(0.5, '#4A90D9');
        rg.addColorStop(1, '#7ac8ff');
        ctx.fillStyle = rg;
        ctx.fill();
        ctx.restore();
      }

      // Portal core glow
      const pp = 1 + 0.08 * Math.sin(frame * 0.035);
      const pg = ctx.createRadialGradient(cx, cy, 0, cx, cy, 100 * pp);
      pg.addColorStop(0, 'rgba(90,160,255,0.38)');
      pg.addColorStop(0.4, 'rgba(50,110,220,0.15)');
      pg.addColorStop(1, 'rgba(0,0,28,0)');
      ctx.fillStyle = pg;
      ctx.beginPath();
      ctx.arc(cx, cy, 190 * pp, 0, Math.PI * 2);
      ctx.fill();

      // ── Shadow knights ─────────────────────────────────────────────────
      knights.forEach((k) => {
        k.risen = Math.min(1, k.risen + 0.005);
        k.phase += 0.007;
        const sway = Math.sin(k.phase) * 2.2;
        const ax = W * k.xFrac + sway;
        const baseY = H * k.yFrac;
        const ky = baseY - k.risen * 22;
        const eyeG = 0.55 + 0.45 * Math.sin(k.phase * 1.5);
        drawKnight(ax, ky, k.sc, k.baseOp * k.risen, eyeG, frame, k.fOff);
      });

      // ── Igris — center, dominant ───────────────────────────────────────
      igrisEyeT += 0.028;
      const igrisEye = 0.75 + 0.25 * Math.sin(igrisEyeT);
      const igrisY = H * 0.56 - Math.sin(frame * 0.011) * 5;
      const igrisSc = Math.min(W, H) / 430;
      drawIgris(cx, igrisY, igrisSc, 0.96, igrisEye, frame);

      // Foot mist under Igris
      const fm = ctx.createRadialGradient(cx, igrisY + 12, 0, cx, igrisY + 12, 210 * igrisSc);
      fm.addColorStop(0, `rgba(74,144,217,${0.13 * igrisEye})`);
      fm.addColorStop(1, 'rgba(0,0,0,0)');
      ctx.fillStyle = fm;
      ctx.beginPath();
      ctx.ellipse(cx, igrisY + 160 * igrisSc, 170 * igrisSc, 38 * igrisSc, 0, 0, Math.PI * 2);
      ctx.fill();

      // ── Particles ──────────────────────────────────────────────────────
      particles.forEach((p, i) => {
        p.x += p.vx;
        p.y += p.vy;
        p.twinkle += 0.025;
        if (p.y < -12) {
          particles[i] = makeParticle();
          particles[i].x = Math.random() * W;
          return;
        }
        const tw = 0.55 + 0.45 * Math.sin(p.twinkle);
        ctx.save();
        ctx.globalAlpha = p.opacity * tw;
        ctx.shadowColor = p.color;
        ctx.shadowBlur = p.isEmber ? 6 : 8;
        ctx.fillStyle = p.color;
        ctx.beginPath();
        ctx.arc(p.x, p.y, p.size, 0, Math.PI * 2);
        ctx.fill();
        ctx.restore();
      });

      // ── Portal lightning arcs ──────────────────────────────────────────
      ltimer++;
      if (ltimer > 75 + Math.random() * 100) {
        ltimer = 0;
        spawnPortalArc(cx, cy);
        if (Math.random() > 0.4) spawnPortalArc(cx, cy);
      }
      for (let i = portalArcs.length - 1; i >= 0; i--) {
        const a = portalArcs[i];
        a.life -= a.decay;
        if (a.life <= 0) { portalArcs.splice(i, 1); continue; }
        drawCrackle(a.pts, a.life * 0.85, 1.8, '#6ab8ff');
      }

      // ── Ground mist ─────────────────────────────────────────────────────
      const gm = ctx.createLinearGradient(0, H * 0.66, 0, H);
      gm.addColorStop(0, 'rgba(2,2,14,0)');
      gm.addColorStop(0.45, 'rgba(2,2,14,0.45)');
      gm.addColorStop(1, 'rgba(0,0,10,0.96)');
      ctx.fillStyle = gm;
      ctx.fillRect(0, H * 0.66, W, H * 0.34);
    }

    draw();

    return () => {
      if (animRef.current) cancelAnimationFrame(animRef.current);
      window.removeEventListener('resize', resize);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 w-full h-full pointer-events-none"
      style={{ opacity, zIndex: 0 }}
    />
  );
}
