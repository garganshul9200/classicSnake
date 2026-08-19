import { useCallback, useEffect, useRef, useState } from 'react';
import { Capacitor } from '@capacitor/core';
import { App as CapApp } from '@capacitor/app';
import { Joystick } from './Joystick';

// ============================================================================
// NEON SERPENT — a smooth-curve snake remix
// ============================================================================

type GameState = 'menu' | 'playing' | 'paused' | 'gameover' | 'scores';

interface Vec {
  x: number;
  y: number;
}

interface Segment extends Vec {
  angle: number;
}

interface Orb {
  x: number;
  y: number;
  r: number;
  type: 'normal' | 'gold' | 'slow';
  phase: number;
  life: number;
}

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  decay: number;
}

interface FloatingText {
  x: number;
  y: number;
  text: string;
  life: number;
  maxLife: number;
  color: string;
}

interface HighScore {
  score: number;
  date: string;
}

// ----- Config ----------------------------------------------------------------
const GAME_W = 480;
const GAME_H = 760;
const SEG_SPACING = 10;
const BASE_SPEED = 180; // px/sec
const MAX_SPEED = 380;
const TURN_RATE = 6.5; // radians/sec max turn
const START_LEN = 12;
const ORB_R = 10;
const HEAD_R = 12;
const BODY_R = 9;

const SCORE_KEY = 'neon-serpent-hiscores-v1';

// ----- Utilities -------------------------------------------------------------
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));
const rand = (lo: number, hi: number) => lo + Math.random() * (hi - lo);

function angleDiff(a: number, b: number) {
  let d = b - a;
  while (d > Math.PI) d -= Math.PI * 2;
  while (d < -Math.PI) d += Math.PI * 2;
  return d;
}

function loadHighScores(): HighScore[] {
  try {
    const raw = localStorage.getItem(SCORE_KEY);
    if (!raw) return [];
    const parsed = JSON.parse(raw);
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((x) => typeof x?.score === 'number').slice(0, 10);
  } catch {
    return [];
  }
}

function saveHighScore(score: number): HighScore[] {
  const list = loadHighScores();
  list.push({ score, date: new Date().toISOString() });
  list.sort((a, b) => b.score - a.score);
  const top = list.slice(0, 10);
  try {
    localStorage.setItem(SCORE_KEY, JSON.stringify(top));
  } catch {
    /* ignore */
  }
  return top;
}

// ============================================================================
// Component
// ============================================================================
export default function Game() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const containerRef = useRef<HTMLDivElement>(null);

  const [state, setState] = useState<GameState>('menu');
  const [score, setScore] = useState(0);
  const [combo, setCombo] = useState(1);
  const [best, setBest] = useState(() => {
    const hs = loadHighScores();
    return hs[0]?.score ?? 0;
  });
  const [highScores, setHighScores] = useState<HighScore[]>(() => loadHighScores());
  const [newBest, setNewBest] = useState(false);

  // Mutable refs used inside the render loop
  const stateRef = useRef<GameState>('menu');
  useEffect(() => {
    stateRef.current = state;
  }, [state]);

  const scoreRef = useRef(0);
  const comboRef = useRef(1);
  const comboTimerRef = useRef(0);
  const slowMoRef = useRef(0);
  const shakeRef = useRef({ t: 0, strength: 0 });
  const timeRef = useRef(0);

  // Game world refs
  const segmentsRef = useRef<Segment[]>([]);
  const targetAngleRef = useRef(0);
  const orbsRef = useRef<Orb[]>([]);
  const particlesRef = useRef<Particle[]>([]);
  const floatingRef = useRef<FloatingText[]>([]);
  const orbSpawnRef = useRef(0);
  const powerSpawnRef = useRef(0);

  // Input refs
  const keysRef = useRef<Set<string>>(new Set());
  const joystickRef = useRef<{ active: boolean; x: number; y: number }>({
    active: false,
    x: 0,
    y: 0,
  });

  // Scale / layout
  const scaleRef = useRef(1);
  const offsetRef = useRef({ x: 0, y: 0 });

  // ----- Init & reset -------------------------------------------------------
  const resetWorld = useCallback(() => {
    const segs: Segment[] = [];
    for (let i = 0; i < START_LEN; i++) {
      segs.push({ x: GAME_W / 2, y: GAME_H / 2 + i * SEG_SPACING, angle: -Math.PI / 2 });
    }
    segmentsRef.current = segs;
    targetAngleRef.current = -Math.PI / 2;
    orbsRef.current = [];
    particlesRef.current = [];
    floatingRef.current = [];
    orbSpawnRef.current = 0;
    powerSpawnRef.current = rand(6, 12);
    scoreRef.current = 0;
    comboRef.current = 1;
    comboTimerRef.current = 0;
    slowMoRef.current = 0;
    shakeRef.current = { t: 0, strength: 0 };
    timeRef.current = 0;
    joystickRef.current = { active: false, x: 0, y: 0 };
    setScore(0);
    setCombo(1);
    setNewBest(false);
  }, []);

  const startGame = useCallback(() => {
    resetWorld();
    setState('playing');
  }, [resetWorld]);

  const endGame = useCallback(() => {
    // Death burst
    const head = segmentsRef.current[0];
    for (let i = 0; i < 80; i++) {
      const a = Math.random() * Math.PI * 2;
      const s = rand(60, 280);
      particlesRef.current.push({
        x: head.x,
        y: head.y,
        vx: Math.cos(a) * s,
        vy: Math.sin(a) * s,
        life: 1,
        maxLife: 1,
        size: rand(2, 5),
        color: Math.random() < 0.5 ? '#ff2bd6' : '#00e5ff',
        decay: rand(0.6, 1.2),
      });
    }
    shakeRef.current = { t: 0.6, strength: 18 };
    const finalScore = scoreRef.current;
    const prevBest = loadHighScores()[0]?.score ?? 0;
    const scores = saveHighScore(finalScore);
    setHighScores(scores);
    if (finalScore > prevBest && finalScore > 0) {
      setNewBest(true);
      setBest(finalScore);
    } else {
      setBest(Math.max(prevBest, finalScore));
    }
    setState('gameover');
  }, []);

  // ----- Input handling -----------------------------------------------------
  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      const k = e.key.toLowerCase();
      if (['arrowup', 'arrowdown', 'arrowleft', 'arrowright', ' '].includes(k)) {
        e.preventDefault();
      }
      if (e.type === 'keydown') {
        keysRef.current.add(k);
        if (k === 'escape' || k === 'p') {
          if (stateRef.current === 'playing') setState('paused');
          else if (stateRef.current === 'paused') setState('playing');
        }
        if (k === 'enter' || k === ' ') {
          if (stateRef.current === 'menu' || stateRef.current === 'gameover' || stateRef.current === 'scores') {
            startGame();
          }
        }
        // Direction input
        if (k === 'arrowup' || k === 'w') targetAngleRef.current = -Math.PI / 2;
        else if (k === 'arrowdown' || k === 's') targetAngleRef.current = Math.PI / 2;
        else if (k === 'arrowleft' || k === 'a') targetAngleRef.current = Math.PI;
        else if (k === 'arrowright' || k === 'd') targetAngleRef.current = 0;
      } else {
        keysRef.current.delete(k);
      }
    };
    window.addEventListener('keydown', onKey);
    window.addEventListener('keyup', onKey);
    return () => {
      window.removeEventListener('keydown', onKey);
      window.removeEventListener('keyup', onKey);
    };
  }, [startGame]);

  // Android hardware back button
  useEffect(() => {
    if (!Capacitor.isNativePlatform()) return;

    const listener = CapApp.addListener('backButton', () => {
      const current = stateRef.current;
      if (current === 'playing') {
        setState('paused');
      } else if (current === 'paused' || current === 'gameover' || current === 'scores') {
        setState('menu');
      } else {
        void CapApp.minimizeApp();
      }
    });

    return () => {
      void listener.then((handle) => handle.remove());
    };
  }, []);

  const handleJoystickChange = useCallback((x: number, y: number, active: boolean) => {
    joystickRef.current = { active, x, y };
  }, []);

  // ----- Canvas sizing ------------------------------------------------------
  useEffect(() => {
    const handleResize = () => {
      const canvas = canvasRef.current;
      const container = containerRef.current;
      if (!canvas || !container) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const cw = container.clientWidth;
      const ch = container.clientHeight;
      canvas.width = cw * dpr;
      canvas.height = ch * dpr;
      canvas.style.width = cw + 'px';
      canvas.style.height = ch + 'px';
      // Compute scale & offset to fit GAME_W/GAME_H
      const scale = Math.min(cw / GAME_W, ch / GAME_H);
      scaleRef.current = scale;
      offsetRef.current = {
        x: (cw - GAME_W * scale) / 2,
        y: (ch - GAME_H * scale) / 2,
      };
    };
    handleResize();
    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleResize);
    window.visualViewport?.addEventListener('resize', handleResize);
    const ro = new ResizeObserver(handleResize);
    if (containerRef.current) ro.observe(containerRef.current);
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleResize);
      window.visualViewport?.removeEventListener('resize', handleResize);
      ro.disconnect();
    };
  }, []);

  // ----- Spawn helpers ------------------------------------------------------
  const spawnOrb = useCallback((type: Orb['type'] = 'normal') => {
    const margin = 30;
    orbsRef.current.push({
      x: rand(margin, GAME_W - margin),
      y: rand(margin, GAME_H - margin),
      r: ORB_R,
      type,
      phase: Math.random() * Math.PI * 2,
      life: 1,
    });
  }, []);

  // ----- Game loop ----------------------------------------------------------
  useEffect(() => {
    let raf = 0;
    let last = performance.now();

    const step = (now: number) => {
      const rawDt = Math.min(0.05, (now - last) / 1000);
      last = now;
      const slow = slowMoRef.current > 0 ? 0.5 : 1;
      const dt = stateRef.current === 'playing' ? rawDt * slow : rawDt * 0.25;
      timeRef.current += dt;

      // Decay slow-mo
      if (slowMoRef.current > 0) slowMoRef.current = Math.max(0, slowMoRef.current - rawDt);

      // Update shake
      if (shakeRef.current.t > 0) {
        shakeRef.current.t = Math.max(0, shakeRef.current.t - rawDt);
      }

      if (stateRef.current === 'playing') {
        updateGame(dt);
      }
      // Always update particles (for death burst even on gameover)
      updateParticles(rawDt);
      render();
      raf = requestAnimationFrame(step);
    };
    raf = requestAnimationFrame(step);
    return () => cancelAnimationFrame(raf);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateGame = (dt: number) => {
    // ----- Head steering -----
    const segs = segmentsRef.current;
    if (segs.length === 0) return;

    // Joystick steering overrides keyboard
    const joystick = joystickRef.current;
    const joyMag = Math.hypot(joystick.x, joystick.y);
    if (joystick.active && joyMag > 0.15) {
      targetAngleRef.current = Math.atan2(joystick.y, joystick.x);
    } else {
      // Keyboard continuous press
      const keys = keysRef.current;
      if (keys.has('arrowup') || keys.has('w')) targetAngleRef.current = -Math.PI / 2;
      else if (keys.has('arrowdown') || keys.has('s')) targetAngleRef.current = Math.PI / 2;
      else if (keys.has('arrowleft') || keys.has('a')) targetAngleRef.current = Math.PI;
      else if (keys.has('arrowright') || keys.has('d')) targetAngleRef.current = 0;
    }

    // Speed scales with length
    const speed = clamp(BASE_SPEED + segs.length * 1.4, BASE_SPEED, MAX_SPEED);
    const head = segs[0];
    // Turn toward target
    const diff = angleDiff(head.angle, targetAngleRef.current);
    const maxTurn = TURN_RATE * dt;
    const turn = clamp(diff, -maxTurn, maxTurn);
    head.angle += turn;
    // Move head
    head.x += Math.cos(head.angle) * speed * dt;
    head.y += Math.sin(head.angle) * speed * dt;

    // Trail particles from head
    if (Math.random() < 0.7) {
      particlesRef.current.push({
        x: head.x - Math.cos(head.angle) * HEAD_R * 0.5 + rand(-2, 2),
        y: head.y - Math.sin(head.angle) * HEAD_R * 0.5 + rand(-2, 2),
        vx: rand(-10, 10),
        vy: rand(-10, 10),
        life: 1,
        maxLife: 1,
        size: rand(1.5, 3),
        color: '#ff2bd6',
        decay: 1.8,
      });
    }

    // Follow-the-leader for body
    for (let i = 1; i < segs.length; i++) {
      const prev = segs[i - 1];
      const cur = segs[i];
      const dx = cur.x - prev.x;
      const dy = cur.y - prev.y;
      const d = Math.hypot(dx, dy);
      if (d > SEG_SPACING) {
        const t = (d - SEG_SPACING) / d;
        cur.x -= dx * t;
        cur.y -= dy * t;
        cur.angle = Math.atan2(prev.y - cur.y, prev.x - cur.x);
      } else {
        cur.angle = prev.angle;
      }
    }

    // ----- Wall collision -----
    if (head.x < 4 || head.x > GAME_W - 4 || head.y < 4 || head.y > GAME_H - 4) {
      endGame();
      return;
    }

    // ----- Self collision (skip first 20 segments to avoid instant death) -----
    if (segs.length > 22) {
      for (let i = 22; i < segs.length; i++) {
        const s = segs[i];
        const dx = s.x - head.x;
        const dy = s.y - head.y;
        if (dx * dx + dy * dy < (BODY_R + HEAD_R - 2) * (BODY_R + HEAD_R - 2)) {
          endGame();
          return;
        }
      }
    }

    // ----- Orb collision -----
    const orbs = orbsRef.current;
    for (let i = orbs.length - 1; i >= 0; i--) {
      const o = orbs[i];
      const dx = o.x - head.x;
      const dy = o.y - head.y;
      if (dx * dx + dy * dy < (o.r + HEAD_R) * (o.r + HEAD_R)) {
        // Collect
        let points = 10;
        let color = '#00e5ff';
        if (o.type === 'gold') {
          points = 50;
          color = '#ffd23f';
        } else if (o.type === 'slow') {
          points = 20;
          color = '#8affff';
          slowMoRef.current = 4;
        }
        const gained = points * comboRef.current;
        scoreRef.current += gained;
        setScore(scoreRef.current);
        comboRef.current = Math.min(10, comboRef.current + 1);
        comboTimerRef.current = 2.2;
        setCombo(comboRef.current);

        floatingRef.current.push({
          x: o.x,
          y: o.y,
          text: `+${gained}${comboRef.current > 1 ? ` x${comboRef.current}` : ''}`,
          life: 1,
          maxLife: 1,
          color,
        });
        // Burst particles
        const count = o.type === 'gold' ? 30 : 18;
        for (let k = 0; k < count; k++) {
          const a = Math.random() * Math.PI * 2;
          const s = rand(60, 220);
          particlesRef.current.push({
            x: o.x,
            y: o.y,
            vx: Math.cos(a) * s,
            vy: Math.sin(a) * s,
            life: 1,
            maxLife: 1,
            size: rand(2, 4.5),
            color,
            decay: rand(0.8, 1.4),
          });
        }
        shakeRef.current = { t: 0.15, strength: 4 + (o.type === 'gold' ? 6 : 0) };
        orbs.splice(i, 1);
        // Grow
        const tail = segs[segs.length - 1];
        const grow = o.type === 'gold' ? 5 : 2;
        for (let g = 0; g < grow; g++) {
          segs.push({ x: tail.x, y: tail.y, angle: tail.angle });
        }
      }
    }

    // ----- Combo timer -----
    if (comboTimerRef.current > 0) {
      comboTimerRef.current -= dt;
      if (comboTimerRef.current <= 0) {
        comboRef.current = 1;
        setCombo(1);
      }
    }

    // ----- Orb spawning -----
    orbSpawnRef.current -= dt;
    if (orbSpawnRef.current <= 0 || orbs.length === 0) {
      spawnOrb('normal');
      orbSpawnRef.current = rand(1.8, 3.2);
    }
    powerSpawnRef.current -= dt;
    if (powerSpawnRef.current <= 0) {
      const type = Math.random() < 0.35 ? 'gold' : 'slow';
      spawnOrb(type);
      powerSpawnRef.current = rand(8, 16);
    }

    // Orb animation
    for (const o of orbs) {
      o.phase += dt * 3;
    }
  };

  const updateParticles = (dt: number) => {
    const parts = particlesRef.current;
    for (let i = parts.length - 1; i >= 0; i--) {
      const p = parts[i];
      p.life -= dt * p.decay;
      if (p.life <= 0) {
        parts.splice(i, 1);
        continue;
      }
      p.x += p.vx * dt;
      p.y += p.vy * dt;
      p.vx *= 0.94;
      p.vy *= 0.94;
    }
    const texts = floatingRef.current;
    for (let i = texts.length - 1; i >= 0; i--) {
      const t = texts[i];
      t.life -= dt * 0.9;
      if (t.life <= 0) texts.splice(i, 1);
    }
  };

  // ----- Render -------------------------------------------------------------
  const render = () => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const ctx = canvas.getContext('2d');
    if (!ctx) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    const cw = canvas.width / dpr;
    const ch = canvas.height / dpr;

    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    // Clear
    ctx.clearRect(0, 0, cw, ch);

    // Dark background with subtle vignette
    const bg = ctx.createRadialGradient(cw / 2, ch / 2, 0, cw / 2, ch / 2, Math.max(cw, ch) / 1.2);
    bg.addColorStop(0, '#140729');
    bg.addColorStop(0.6, '#080318');
    bg.addColorStop(1, '#03010a');
    ctx.fillStyle = bg;
    ctx.fillRect(0, 0, cw, ch);

    // Move to game area
    ctx.save();
    ctx.translate(offsetRef.current.x, offsetRef.current.y);
    ctx.scale(scaleRef.current, scaleRef.current);

    // Screen shake
    if (shakeRef.current.t > 0) {
      const k = shakeRef.current.strength * (shakeRef.current.t / 0.6);
      ctx.translate(rand(-k, k), rand(-k, k));
    }

    drawBackground(ctx);

    if (stateRef.current === 'playing' || stateRef.current === 'paused' || stateRef.current === 'gameover') {
      drawOrbs(ctx);
      drawSnake(ctx);
      drawParticles(ctx);
      drawFloatingTexts(ctx);
      drawWalls(ctx);
    }

    ctx.restore();

    // Scanline overlay
    ctx.save();
    ctx.globalAlpha = 0.08;
    ctx.fillStyle = '#000';
    for (let y = 0; y < ch; y += 3) {
      ctx.fillRect(0, y, cw, 1);
    }
    ctx.restore();
  };

  const drawBackground = (ctx: CanvasRenderingContext2D) => {
    // Play area border
    ctx.strokeStyle = 'rgba(0, 229, 255, 0.35)';
    ctx.lineWidth = 2;
    ctx.shadowColor = '#00e5ff';
    ctx.shadowBlur = 14;
    ctx.strokeRect(1, 1, GAME_W - 2, GAME_H - 2);
    ctx.shadowBlur = 0;

    // Animated grid
    const t = timeRef.current;
    ctx.strokeStyle = 'rgba(255, 43, 214, 0.08)';
    ctx.lineWidth = 1;
    const gs = 40;
    const offset = (t * 20) % gs;
    ctx.beginPath();
    for (let x = -offset; x <= GAME_W; x += gs) {
      ctx.moveTo(x, 0);
      ctx.lineTo(x, GAME_H);
    }
    for (let y = -offset; y <= GAME_H; y += gs) {
      ctx.moveTo(0, y);
      ctx.lineTo(GAME_W, y);
    }
    ctx.stroke();

    // Horizon line glow
    const grad = ctx.createLinearGradient(0, 0, 0, GAME_H);
    grad.addColorStop(0, 'rgba(255, 43, 214, 0.12)');
    grad.addColorStop(0.5, 'rgba(0, 0, 0, 0)');
    grad.addColorStop(1, 'rgba(0, 229, 255, 0.12)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, GAME_W, GAME_H);
  };

  const drawWalls = (ctx: CanvasRenderingContext2D) => {
    // inner glow frame
    ctx.strokeStyle = 'rgba(255, 43, 214, 0.5)';
    ctx.lineWidth = 3;
    ctx.shadowColor = '#ff2bd6';
    ctx.shadowBlur = 20;
    ctx.strokeRect(2, 2, GAME_W - 4, GAME_H - 4);
    ctx.shadowBlur = 0;
  };

  const drawOrbs = (ctx: CanvasRenderingContext2D) => {
    for (const o of orbsRef.current) {
      const pulse = 1 + Math.sin(o.phase) * 0.15;
      const color =
        o.type === 'gold' ? '#ffd23f' : o.type === 'slow' ? '#8affff' : '#00e5ff';
      const glow = o.type === 'gold' ? '#ff9a00' : o.type === 'slow' ? '#00e5ff' : '#ff2bd6';
      ctx.save();
      ctx.shadowColor = glow;
      ctx.shadowBlur = 22;
      ctx.fillStyle = color;
      ctx.beginPath();
      ctx.arc(o.x, o.y, o.r * pulse, 0, Math.PI * 2);
      ctx.fill();
      // Inner highlight
      ctx.shadowBlur = 0;
      ctx.fillStyle = 'rgba(255,255,255,0.8)';
      ctx.beginPath();
      ctx.arc(o.x - o.r * 0.25, o.y - o.r * 0.25, o.r * 0.3 * pulse, 0, Math.PI * 2);
      ctx.fill();
      // Symbol for power orbs
      if (o.type !== 'normal') {
        ctx.fillStyle = 'rgba(10,0,20,0.85)';
        ctx.font = 'bold 11px system-ui';
        ctx.textAlign = 'center';
        ctx.textBaseline = 'middle';
        ctx.fillText(o.type === 'gold' ? '★' : '◈', o.x, o.y + 0.5);
      }
      ctx.restore();
    }
  };

  const drawSnake = (ctx: CanvasRenderingContext2D) => {
    const segs = segmentsRef.current;
    if (segs.length === 0) return;

    // Body — tail to head so head draws on top
    for (let i = segs.length - 1; i >= 1; i--) {
      const s = segs[i];
      const t = 1 - i / segs.length;
      const r = BODY_R * (0.55 + t * 0.45);
      const hue = (i * 4 + timeRef.current * 60) % 360;
      ctx.save();
      ctx.shadowColor = `hsl(${hue}, 100%, 60%)`;
      ctx.shadowBlur = 14;
      ctx.fillStyle = `hsl(${hue}, 95%, 55%)`;
      ctx.beginPath();
      ctx.arc(s.x, s.y, r, 0, Math.PI * 2);
      ctx.fill();
      // Inner highlight
      ctx.shadowBlur = 0;
      ctx.fillStyle = `hsla(${hue}, 100%, 85%, 0.6)`;
      ctx.beginPath();
      ctx.arc(s.x - r * 0.3, s.y - r * 0.3, r * 0.35, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }

    // Head
    const head = segs[0];
    ctx.save();
    ctx.shadowColor = '#ff2bd6';
    ctx.shadowBlur = 24;
    const headGrad = ctx.createRadialGradient(head.x, head.y, 0, head.x, head.y, HEAD_R);
    headGrad.addColorStop(0, '#ffffff');
    headGrad.addColorStop(0.4, '#ff6be8');
    headGrad.addColorStop(1, '#c10aa8');
    ctx.fillStyle = headGrad;
    ctx.beginPath();
    ctx.arc(head.x, head.y, HEAD_R, 0, Math.PI * 2);
    ctx.fill();
    // Eye direction
    const eyeX = head.x + Math.cos(head.angle) * HEAD_R * 0.4;
    const eyeY = head.y + Math.sin(head.angle) * HEAD_R * 0.4;
    ctx.shadowBlur = 0;
    ctx.fillStyle = '#05010f';
    ctx.beginPath();
    ctx.arc(eyeX, eyeY, 2.5, 0, Math.PI * 2);
    ctx.fill();
    ctx.restore();
  };

  const drawParticles = (ctx: CanvasRenderingContext2D) => {
    for (const p of particlesRef.current) {
      const a = clamp(p.life / p.maxLife, 0, 1);
      ctx.save();
      ctx.globalAlpha = a;
      ctx.shadowColor = p.color;
      ctx.shadowBlur = 10;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * a, 0, Math.PI * 2);
      ctx.fill();
      ctx.restore();
    }
  };

  const drawFloatingTexts = (ctx: CanvasRenderingContext2D) => {
    for (const t of floatingRef.current) {
      const a = clamp(t.life / t.maxLife, 0, 1);
      const rise = (1 - a) * 28;
      ctx.save();
      ctx.globalAlpha = a;
      ctx.font = 'bold 16px system-ui';
      ctx.textAlign = 'center';
      ctx.fillStyle = t.color;
      ctx.shadowColor = t.color;
      ctx.shadowBlur = 10;
      ctx.fillText(t.text, t.x, t.y - rise);
      ctx.restore();
    }
  };

  // ===========================================================================
  // UI
  // ===========================================================================
  return (
    <div
      className={`safe-area-root flex h-full w-full flex-col overflow-hidden bg-[#05010f] ${
        Capacitor.isNativePlatform() ? 'safe-area-root--native' : ''
      }`}
    >
      <div ref={containerRef} className="relative min-h-0 w-full flex-1 overflow-hidden">
        <canvas ref={canvasRef} className="absolute inset-0 h-full w-full" />

        {/* HUD (during play) */}
        {state === 'playing' && (
          <div className="pointer-events-none absolute inset-0 p-3 sm:p-5">
            <div className="flex items-start justify-between">
              <div className="rounded-xl border border-cyan-400/30 bg-black/40 px-3 py-2 backdrop-blur-md">
                <div className="text-[10px] uppercase tracking-widest text-cyan-300/80">Score</div>
                <div className="font-mono text-2xl font-bold text-cyan-200 neon-text">{score}</div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <button
                  onClick={() => setState('paused')}
                  className="pointer-events-auto rounded-xl border border-fuchsia-400/40 bg-black/40 px-3 py-2 text-xs uppercase tracking-widest text-fuchsia-200 backdrop-blur-md hover:bg-black/60"
                  aria-label="Pause"
                >
                  ⏸ Pause
                </button>
                {combo > 1 && (
                  <div className="animate-pulse-glow rounded-xl border border-yellow-400/50 bg-black/40 px-3 py-2 text-right backdrop-blur-md">
                    <div className="text-[10px] uppercase tracking-widest text-yellow-300/80">Combo</div>
                    <div className="font-mono text-xl font-bold text-yellow-200 neon-text">x{combo}</div>
                  </div>
                )}
              </div>
            </div>
            {slowMoRef.current > 0 && (
              <div className="absolute left-1/2 top-3 -translate-x-1/2 rounded-full border border-cyan-300/50 bg-cyan-500/10 px-3 py-1 text-[10px] uppercase tracking-[0.3em] text-cyan-200 backdrop-blur-md">
                Slow-Mo
              </div>
            )}
          </div>
        )}

        {state === 'playing' && (
          <div className="pointer-events-none absolute inset-x-0 bottom-0 z-20 flex justify-center pb-4">
            <Joystick onChange={handleJoystickChange} className="pointer-events-auto" />
          </div>
        )}

        {/* MENU */}
        {state === 'menu' && (
          <Overlay>
            <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center sm:gap-8">
              <div className="animate-title-glow flex flex-col items-center">
                <div className="text-[10px] uppercase tracking-[0.5em] text-cyan-300/80 sm:text-xs">
                  — A Neon Arcade —
                </div>
                <h1 className="mt-1 bg-gradient-to-r from-fuchsia-400 via-pink-300 to-cyan-300 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:mt-2 sm:text-6xl">
                  NEON
                </h1>
                <h1 className="-mt-1 bg-gradient-to-r from-cyan-300 via-fuchsia-300 to-pink-400 bg-clip-text text-4xl font-black tracking-tight text-transparent sm:-mt-2 sm:text-6xl">
                  SERPENT
                </h1>
                <div className="mt-2 h-[2px] w-40 bg-gradient-to-r from-transparent via-fuchsia-400 to-transparent" />
              </div>

              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <button className="btn-neon primary" onClick={startGame}>
                  ▶ Start
                </button>
                <button className="btn-neon" onClick={() => setState('scores')}>
                  🏆 High Scores
                </button>
              </div>

              <div className="w-full space-y-2 rounded-2xl border border-white/10 bg-black/30 p-3 text-sm text-white/70 backdrop-blur-md sm:p-4">
                <div className="text-[10px] uppercase tracking-[0.3em] text-white/50">Controls</div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-cyan-300">⌨ Desktop</span>
                  <span className="font-mono text-xs text-white/60">Arrows / WASD</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-fuchsia-300">🕹 Mobile</span>
                  <span className="font-mono text-xs text-white/60">Joystick to steer</span>
                </div>
                <div className="flex items-center justify-between gap-4">
                  <span className="text-yellow-300">⏸ Pause</span>
                  <span className="font-mono text-xs text-white/60">P / Esc</span>
                </div>
              </div>

              {best > 0 && (
                <div className="text-xs uppercase tracking-[0.3em] text-white/50">
                  Best Score: <span className="font-mono text-sm text-fuchsia-300">{best}</span>
                </div>
              )}
            </div>
          </Overlay>
        )}

        {/* PAUSE */}
        {state === 'paused' && (
          <Overlay>
            <div className="flex w-full max-w-sm flex-col items-center gap-5 text-center sm:gap-6">
              <h2 className="bg-gradient-to-r from-cyan-300 to-fuchsia-300 bg-clip-text text-4xl font-black tracking-tight text-transparent neon-text sm:text-5xl">
                PAUSED
              </h2>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <button className="btn-neon primary" onClick={() => setState('playing')}>
                  ▶ Resume
                </button>
                <button className="btn-neon" onClick={() => setState('menu')}>
                  ✕ Main Menu
                </button>
              </div>
            </div>
          </Overlay>
        )}

        {/* GAME OVER */}
        {state === 'gameover' && (
          <Overlay>
            <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center sm:gap-6">
              {newBest ? (
                <div className="animate-pulse-glow rounded-full border border-yellow-400/60 bg-yellow-400/10 px-4 py-1 text-xs uppercase tracking-[0.3em] text-yellow-300 neon-text">
                  ★ New High Score ★
                </div>
              ) : (
                <div className="rounded-full border border-fuchsia-400/40 bg-fuchsia-400/10 px-4 py-1 text-xs uppercase tracking-[0.3em] text-fuchsia-300">
                  Game Over
                </div>
              )}
              <h2 className="bg-gradient-to-r from-fuchsia-400 to-cyan-300 bg-clip-text text-5xl font-black tracking-tight text-transparent neon-text sm:text-6xl">
                {score}
              </h2>
              <div className="text-xs uppercase tracking-[0.3em] text-white/50">
                Best: <span className="font-mono text-sm text-cyan-300">{Math.max(best, score)}</span>
              </div>
              <div className="flex w-full flex-col gap-3 sm:w-auto sm:flex-row">
                <button className="btn-neon primary" onClick={startGame}>
                  ↻ Play Again
                </button>
                <button className="btn-neon" onClick={() => setState('scores')}>
                  🏆 Scores
                </button>
                <button className="btn-neon" onClick={() => setState('menu')}>
                  ✕ Menu
                </button>
              </div>
            </div>
          </Overlay>
        )}

        {/* HIGH SCORES */}
        {state === 'scores' && (
          <Overlay>
            <div className="flex w-full max-w-sm flex-col items-center gap-4 text-center sm:gap-5">
              <h2 className="bg-gradient-to-r from-yellow-300 via-fuchsia-400 to-cyan-300 bg-clip-text text-3xl font-black tracking-tight text-transparent sm:text-4xl">
                HIGH SCORES
              </h2>
              <div className="flex min-h-0 w-full flex-col overflow-hidden rounded-2xl border border-white/10 bg-black/40 p-4 backdrop-blur-md">
                {highScores.length === 0 ? (
                  <div className="py-6 text-sm text-white/50">No scores yet — go make one!</div>
                ) : (
                  <ol className="max-h-[min(46dvh,360px)] space-y-2 overflow-y-auto overscroll-contain">
                    {highScores.map((h, i) => (
                      <li
                        key={i}
                        className="flex items-center justify-between gap-4 rounded-lg border border-white/5 bg-white/5 px-3 py-2"
                      >
                        <div className="flex items-center gap-3">
                          <span
                            className={`font-mono text-lg font-bold ${
                              i === 0
                                ? 'text-yellow-300 neon-text'
                                : i === 1
                                ? 'text-slate-200'
                                : i === 2
                                ? 'text-amber-500'
                                : 'text-white/60'
                            }`}
                          >
                            #{i + 1}
                          </span>
                          <span className="font-mono text-lg text-white">{h.score}</span>
                        </div>
                        <span className="text-[10px] uppercase tracking-widest text-white/40">
                          {new Date(h.date).toLocaleDateString()}
                        </span>
                      </li>
                    ))}
                  </ol>
                )}
              </div>
              <button className="btn-neon primary" onClick={() => setState('menu')}>
                ← Back
              </button>
            </div>
          </Overlay>
        )}
      </div>
    </div>
  );
}

function Overlay({ children }: { children: React.ReactNode }) {
  return (
    <div className="scanlines absolute inset-0 z-10 overflow-x-hidden overflow-y-auto overscroll-contain bg-gradient-to-b from-black/70 via-black/50 to-black/80 backdrop-blur-sm animate-float-in">
      <div className="flex min-h-full w-full items-center justify-center px-4 py-3">
        {children}
      </div>
    </div>
  );
}
