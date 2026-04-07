'use client';

import { useEffect, useRef, useCallback } from 'react';

interface RobotConfig {
  id: string;
  gradientStart: string;
  gradientEnd: string;
  irisColor: string;
  blushColor: string;
  footColor: string;
}

const ROBOT_SIZE = 60;

const ROBOTS: RobotConfig[] = [
  {
    id: 'builder',
    gradientStart: '#7C6FFF',
    gradientEnd: '#5A4FE0',
    irisColor: '#3730A3',
    blushColor: '#A89BFF',
    footColor: '#4A3FC8',
  },
  {
    id: 'lou',
    gradientStart: '#22D3A0',
    gradientEnd: '#0EA874',
    irisColor: '#065F46',
    blushColor: '#6EE7B7',
    footColor: '#059669',
  },
  {
    id: 'elio',
    gradientStart: '#FF5C87',
    gradientEnd: '#E0325E',
    irisColor: '#881337',
    blushColor: '#FDA4AF',
    footColor: '#BE123C',
  },
  {
    id: 'julia',
    gradientStart: '#FFD166',
    gradientEnd: '#F5B800',
    irisColor: '#78350F',
    blushColor: '#FDE68A',
    footColor: '#D97706',
  },
  {
    id: 'tom',
    gradientStart: '#A78BFA',
    gradientEnd: '#7C3AED',
    irisColor: '#4C1D95',
    blushColor: '#C4B5FD',
    footColor: '#6D28D9',
  },
  {
    id: 'manue',
    gradientStart: '#FB923C',
    gradientEnd: '#EA580C',
    irisColor: '#7C2D12',
    blushColor: '#FDBA74',
    footColor: '#C2410C',
  },
  {
    id: 'john',
    gradientStart: '#38BDF8',
    gradientEnd: '#0284C7',
    irisColor: '#0C4A6E',
    blushColor: '#7DD3FC',
    footColor: '#0369A1',
  },
  {
    id: 'chatbot',
    gradientStart: '#2DD4BF',
    gradientEnd: '#0D9488',
    irisColor: '#134E4A',
    blushColor: '#5EEAD4',
    footColor: '#0F766E',
  },
  {
    id: 'router',
    gradientStart: '#94A3B8',
    gradientEnd: '#64748B',
    irisColor: '#1E293B',
    blushColor: '#CBD5E1',
    footColor: '#475569',
  },
  {
    id: 'fiche',
    gradientStart: '#F472B6',
    gradientEnd: '#DB2777',
    irisColor: '#831843',
    blushColor: '#F9A8D4',
    footColor: '#BE185D',
  },
  {
    id: 'alex',
    gradientStart: '#F43F5E',
    gradientEnd: '#BE123C',
    irisColor: '#4C0519',
    blushColor: '#FDA4AF',
    footColor: '#9F1239',
  },
  {
    id: 'nova',
    gradientStart: '#06B6D4',
    gradientEnd: '#0891B2',
    irisColor: '#164E63',
    blushColor: '#67E8F9',
    footColor: '#0E7490',
  },
];

interface PhysicsState {
  x: number;
  y: number;
  vx: number;
  vy: number;
  rotation: number;
  vr: number;
  landed: boolean;
  dragging: boolean;
  dropDelay: number;
  idlePhase: number;
}

function buildRobotSVG(config: RobotConfig): string {
  const s = ROBOT_SIZE;
  const bodyW = s * 0.95;
  const bodyH = s;
  const rx = s * 0.3;
  const eyeRx = s * 0.125;
  const eyeRy = s * 0.136;
  const irisR = s * 0.085;
  const pupilR = s * 0.045;
  const reflectR = s * 0.028;
  const reflectSmallR = s * 0.011;
  const leftEyeX = -s * 0.16;
  const rightEyeX = s * 0.16;
  const eyeY = s * 0.41;

  return `<svg viewBox="${-bodyW / 2 - 10} -5 ${bodyW + 20} ${bodyH + s * 0.15}" width="${s + 20}" height="${s + s * 0.15}" style="overflow:visible;pointer-events:none">
    <defs><linearGradient id="g-${config.id}" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="${config.gradientStart}"/><stop offset="100%" stop-color="${config.gradientEnd}"/></linearGradient></defs>
    <rect x="${-bodyW / 2}" y="0" width="${bodyW}" height="${bodyH}" rx="${rx}" fill="url(#g-${config.id})"/>
    <rect x="${-bodyW / 2}" y="0" width="${bodyW}" height="${bodyH * 0.36}" rx="${rx}" fill="white" opacity="0.12"/>
    <ellipse cx="${-bodyW / 2 - s * 0.045}" cy="${bodyH * 0.41}" rx="${s * 0.08}" ry="${s * 0.114}" fill="${config.gradientEnd}"/>
    <ellipse cx="${bodyW / 2 + s * 0.045}" cy="${bodyH * 0.41}" rx="${s * 0.08}" ry="${s * 0.114}" fill="${config.gradientEnd}"/>
    <ellipse cx="${-bodyW / 2 - s * 0.045}" cy="${bodyH * 0.41}" rx="${s * 0.04}" ry="${s * 0.068}" fill="${config.gradientStart}" opacity="0.5"/>
    <ellipse cx="${bodyW / 2 + s * 0.045}" cy="${bodyH * 0.41}" rx="${s * 0.04}" ry="${s * 0.068}" fill="${config.gradientStart}" opacity="0.5"/>
    <ellipse cx="${leftEyeX}" cy="${eyeY}" rx="${eyeRx}" ry="${eyeRy}" fill="white"/>
    <ellipse cx="${rightEyeX}" cy="${eyeY}" rx="${eyeRx}" ry="${eyeRy}" fill="white"/>
    <circle class="iris-l" cx="${leftEyeX}" cy="${eyeY + s * 0.02}" r="${irisR}" fill="${config.irisColor}"/>
    <circle class="iris-r" cx="${rightEyeX}" cy="${eyeY + s * 0.02}" r="${irisR}" fill="${config.irisColor}"/>
    <circle class="pupil-l" cx="${leftEyeX}" cy="${eyeY + s * 0.03}" r="${pupilR}" fill="#0f0a2e"/>
    <circle class="pupil-r" cx="${rightEyeX}" cy="${eyeY + s * 0.03}" r="${pupilR}" fill="#0f0a2e"/>
    <circle cx="${leftEyeX - s * 0.01}" cy="${eyeY - s * 0.03}" r="${reflectR}" fill="white"/>
    <circle cx="${rightEyeX - s * 0.01}" cy="${eyeY - s * 0.03}" r="${reflectR}" fill="white"/>
    <circle cx="${leftEyeX + s * 0.05}" cy="${eyeY + s * 0.03}" r="${reflectSmallR}" fill="white" opacity="0.6"/>
    <circle cx="${rightEyeX + s * 0.05}" cy="${eyeY + s * 0.03}" r="${reflectSmallR}" fill="white" opacity="0.6"/>
    <ellipse cx="${-s * 0.3}" cy="${bodyH * 0.64}" rx="${s * 0.125}" ry="${s * 0.08}" fill="${config.blushColor}" opacity="0.35"/>
    <ellipse cx="${s * 0.3}" cy="${bodyH * 0.64}" rx="${s * 0.125}" ry="${s * 0.08}" fill="${config.blushColor}" opacity="0.35"/>
    <path d="M${-s * 0.16} ${bodyH * 0.68} Q0 ${bodyH * 0.84} ${s * 0.16} ${bodyH * 0.68}" stroke="white" stroke-width="${s * 0.028}" fill="none" stroke-linecap="round"/>
    <rect x="${-bodyW / 2 + s * 0.05}" y="${bodyH - s * 0.02}" width="${s * 0.25}" height="${s * 0.18}" rx="${s * 0.09}" fill="${config.footColor}"/>
    <rect x="${bodyW / 2 - s * 0.3}" y="${bodyH - s * 0.02}" width="${s * 0.25}" height="${s * 0.18}" rx="${s * 0.09}" fill="${config.footColor}"/>
  </svg>`;
}

export default function FallingRobots() {
  const containerRef = useRef<HTMLDivElement>(null);
  const robotEls = useRef<HTMLDivElement[]>([]);
  const physics = useRef<PhysicsState[]>([]);
  const mousePos = useRef({ x: 0, y: 0 });
  const dragRef = useRef<{
    index: number;
    offsetX: number;
    offsetY: number;
    lastX: number;
    lastY: number;
    lastTime: number;
  } | null>(null);
  const mounted = useRef(false);

  const applyTransform = useCallback((el: HTMLDivElement, state: PhysicsState) => {
    const scale = state.dragging ? 1.12 : 1;
    el.style.transform = `translate3d(${state.x}px, ${state.y}px, 0) rotate(${state.rotation}deg) scale(${scale})`;
  }, []);

  const updateEyes = useCallback(() => {
    const rect = containerRef.current?.getBoundingClientRect();

    if (!rect) {
      return;
    }

    const mx = mousePos.current.x;
    const my = mousePos.current.y;
    const s = ROBOT_SIZE;
    const maxOffset = s * 0.045;
    const leftBaseX = -s * 0.16;
    const rightBaseX = s * 0.16;
    const baseEyeY = s * 0.41;

    for (let i = 0; i < ROBOTS.length; i++) {
      const el = robotEls.current[i];
      const st = physics.current[i];

      if (!el || !st) {
        continue;
      }

      const cx = rect.left + st.x + s / 2;
      const cy = rect.top + st.y + s * 0.225;
      const dx = mx - cx;
      const dy = my - cy;
      const dist = Math.sqrt(dx * dx + dy * dy);
      const offX = dist > 0 ? (dx / dist) * maxOffset : 0;
      const offY = dist > 0 ? (dy / dist) * maxOffset : 0;

      const irisL = el.querySelector('.iris-l') as SVGCircleElement | null;
      const irisR = el.querySelector('.iris-r') as SVGCircleElement | null;
      const pupilL = el.querySelector('.pupil-l') as SVGCircleElement | null;
      const pupilR = el.querySelector('.pupil-r') as SVGCircleElement | null;

      if (irisL) {
        irisL.setAttribute('cx', String(leftBaseX + offX * 0.7));
        irisL.setAttribute('cy', String(baseEyeY + s * 0.02 + offY * 0.7));
      }

      if (irisR) {
        irisR.setAttribute('cx', String(rightBaseX + offX * 0.7));
        irisR.setAttribute('cy', String(baseEyeY + s * 0.02 + offY * 0.7));
      }

      if (pupilL) {
        pupilL.setAttribute('cx', String(leftBaseX + offX * 0.5));
        pupilL.setAttribute('cy', String(baseEyeY + s * 0.03 + offY * 0.5));
      }

      if (pupilR) {
        pupilR.setAttribute('cx', String(rightBaseX + offX * 0.5));
        pupilR.setAttribute('cy', String(baseEyeY + s * 0.03 + offY * 0.5));
      }
    }
  }, []);

  useEffect(() => {
    if (mounted.current || !containerRef.current) {
      return undefined;
    }

    mounted.current = true;

    const container = containerRef.current;
    const rect = container.getBoundingClientRect();
    const w = rect.width;
    const count = ROBOTS.length;
    const margin = ROBOT_SIZE;
    const usableWidth = w - margin * 2;
    const basePositions: number[] = [];

    for (let i = 0; i < count; i++) {
      const base = margin + (usableWidth / (count - 1)) * i;
      const jitter = (Math.random() - 0.5) * (usableWidth / count) * 0.6;
      basePositions.push(Math.max(10, Math.min(w - ROBOT_SIZE - 10, base + jitter)));
    }

    container.innerHTML = '';
    robotEls.current = [];
    physics.current = [];

    for (let i = 0; i < count; i++) {
      const config = ROBOTS[i];
      const el = document.createElement('div');
      el.style.cssText = `position:absolute;left:0;top:0;width:${ROBOT_SIZE}px;height:${ROBOT_SIZE + ROBOT_SIZE * 0.15}px;cursor:grab;user-select:none;touch-action:none;filter:drop-shadow(0 4px 12px rgba(0,0,0,0.3));z-index:10;will-change:transform;pointer-events:auto;transition:filter 0.15s;`;
      el.innerHTML = buildRobotSVG(config);
      el.dataset.robotIdx = String(i);

      el.addEventListener('pointerenter', () => {
        if (!physics.current[i]?.dragging) {
          el.style.filter = 'drop-shadow(0 6px 20px rgba(0,0,0,0.45))';
        }
      });
      el.addEventListener('pointerleave', () => {
        if (!physics.current[i]?.dragging) {
          el.style.filter = 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))';
        }
      });

      container.appendChild(el);
      robotEls.current.push(el);

      physics.current.push({
        x: basePositions[i],
        y: -ROBOT_SIZE - Math.random() * 400 - 150,
        vx: (Math.random() - 0.5) * 2,
        vy: 0,
        rotation: (Math.random() - 0.5) * 40,
        vr: 0,
        landed: false,
        dragging: false,
        dropDelay: i * 100 + Math.random() * 80,
        idlePhase: Math.random() * Math.PI * 2,
      });

      applyTransform(el, physics.current[i]);
    }

    const startTime = performance.now();
    const gravity = 0.5;
    const bounce = 0.35;
    const friction = 0.985;
    const rotFriction = 0.93;
    const collisionRadius = ROBOT_SIZE * 0.45;
    const collisionBounce = 0.7;

    let animId = 0;
    let eyeCounter = 0;

    const resolveCollisions = () => {
      const half = ROBOT_SIZE / 2;
      const minDist = collisionRadius * 2;
      const cRect2 = container.getBoundingClientRect();
      const floorY2 = cRect2.height - 100;

      for (let i = 0; i < count; i++) {
        const a = physics.current[i];

        if (a.y < -ROBOT_SIZE) {
          continue;
        }

        for (let j = i + 1; j < count; j++) {
          const b = physics.current[j];

          if (b.y < -ROBOT_SIZE) {
            continue;
          }

          const dx = b.x + half - (a.x + half);
          const dy = b.y + half - (a.y + half);
          const dist = Math.sqrt(dx * dx + dy * dy);

          if (dist < minDist && dist > 0.01) {
            const nx = dx / dist;
            const ny = dy / dist;
            const overlap = minDist - dist;

            if (a.dragging) {
              b.x += nx * overlap;
              b.y += ny * overlap;

              const impactSpeed = Math.sqrt(a.vx * a.vx + a.vy * a.vy) * 0.8 + 2;
              b.vx += nx * impactSpeed;
              b.vy += ny * impactSpeed;
              b.vr += (Math.random() - 0.5) * 8;
              b.landed = false;
            } else if (b.dragging) {
              a.x -= nx * overlap;
              a.y -= ny * overlap;

              const impactSpeed = Math.sqrt(b.vx * b.vx + b.vy * b.vy) * 0.8 + 2;
              a.vx -= nx * impactSpeed;
              a.vy -= ny * impactSpeed;
              a.vr += (Math.random() - 0.5) * 8;
              a.landed = false;
            } else {
              a.x -= nx * (overlap * 0.5);
              a.y -= ny * (overlap * 0.5);
              b.x += nx * (overlap * 0.5);
              b.y += ny * (overlap * 0.5);

              const dvx = a.vx - b.vx;
              const dvy = a.vy - b.vy;
              const dvDotN = dvx * nx + dvy * ny;

              if (dvDotN > 0) {
                const impulse = dvDotN * collisionBounce;
                a.vx -= impulse * nx;
                a.vy -= impulse * ny;
                b.vx += impulse * nx;
                b.vy += impulse * ny;
                a.vr += (Math.random() - 0.5) * 6;
                b.vr += (Math.random() - 0.5) * 6;
                a.landed = false;
                b.landed = false;
              }
            }

            const clamp = (s: PhysicsState) => {
              if (s.x < 0) {
                s.x = 0;
                s.vx *= -bounce;
              }

              if (s.x + ROBOT_SIZE > cRect2.width) {
                s.x = cRect2.width - ROBOT_SIZE;
                s.vx *= -bounce;
              }

              if (s.y < 0) {
                s.y = 0;
                s.vy *= -bounce;
              }

              if (s.y + ROBOT_SIZE > floorY2) {
                s.y = floorY2 - ROBOT_SIZE;
                s.vy *= -bounce;
              }
            };
            clamp(a);
            clamp(b);

            applyTransform(robotEls.current[i], a);
            applyTransform(robotEls.current[j], b);
          }
        }
      }
    };

    const animate = () => {
      const cRect = container.getBoundingClientRect();
      const floorY = cRect.height - 100;
      const elapsed = performance.now() - startTime;

      for (let i = 0; i < count; i++) {
        const st = physics.current[i];

        if (st.dragging) {
          continue;
        }

        if (elapsed < st.dropDelay) {
          continue;
        }

        st.vy += gravity;
        st.vx *= friction;
        st.vy *= friction;
        st.vr *= rotFriction;

        st.x += st.vx;
        st.y += st.vy;
        st.rotation += st.vr;

        if (st.y + ROBOT_SIZE > floorY) {
          st.y = floorY - ROBOT_SIZE;
          st.vy *= -bounce;
          st.vr *= 0.6;

          if (Math.abs(st.vy) < 1.2) {
            st.vy = 0;
            st.landed = true;
            st.rotation += (0 - st.rotation) * 0.2;
          }
        }

        if (st.y < 0) {
          st.y = 0;
          st.vy *= -bounce;
        }

        if (st.x < 0) {
          st.x = 0;
          st.vx *= -bounce;
        } else if (st.x + ROBOT_SIZE > cRect.width) {
          st.x = cRect.width - ROBOT_SIZE;
          st.vx *= -bounce;
        }

        applyTransform(robotEls.current[i], st);
      }

      resolveCollisions();

      eyeCounter++;

      if (eyeCounter % 3 === 0) {
        updateEyes();
      }

      animId = requestAnimationFrame(animate);
    };

    animId = requestAnimationFrame(animate);

    const onPointerDown = (e: PointerEvent) => {
      const target = (e.target as HTMLElement).closest('[data-robot-idx]') as HTMLElement | null;

      if (!target) {
        return;
      }

      e.preventDefault();

      const idx = parseInt(target.dataset.robotIdx!, 10);
      const st = physics.current[idx];

      if (!st) {
        return;
      }

      st.dragging = true;
      st.landed = false;
      robotEls.current[idx].style.zIndex = '100';
      robotEls.current[idx].style.cursor = 'grabbing';
      robotEls.current[idx].style.filter = 'drop-shadow(0 8px 24px rgba(0,0,0,0.5))';
      applyTransform(robotEls.current[idx], st);

      dragRef.current = {
        index: idx,
        offsetX: e.clientX - cRect().left - st.x,
        offsetY: e.clientY - cRect().top - st.y,
        lastX: e.clientX,
        lastY: e.clientY,
        lastTime: performance.now(),
      };
    };

    function cRect() {
      return container.getBoundingClientRect();
    }

    const onPointerMove = (e: PointerEvent) => {
      mousePos.current = { x: e.clientX, y: e.clientY };

      if (dragRef.current === null) {
        return;
      }

      const info = dragRef.current;
      const st = physics.current[info.index];

      if (!st) {
        return;
      }

      const r = cRect();
      const now = performance.now();
      const dt = Math.max(now - info.lastTime, 1);

      const newX = e.clientX - r.left - info.offsetX;
      const newY = e.clientY - r.top - info.offsetY;

      st.vx = ((newX - st.x) / dt) * 16;
      st.vy = ((newY - st.y) / dt) * 16;
      st.x = newX;
      st.y = newY;

      info.lastX = e.clientX;
      info.lastY = e.clientY;
      info.lastTime = now;

      applyTransform(robotEls.current[info.index], st);
    };

    const onPointerUp = () => {
      if (dragRef.current === null) {
        return;
      }

      const idx = dragRef.current.index;
      const st = physics.current[idx];

      if (st) {
        st.dragging = false;
        st.vr = (Math.random() - 0.5) * 12;
      }

      robotEls.current[idx].style.zIndex = '10';
      robotEls.current[idx].style.cursor = 'grab';
      robotEls.current[idx].style.filter = 'drop-shadow(0 4px 12px rgba(0,0,0,0.3))';
      applyTransform(robotEls.current[idx], st!);
      dragRef.current = null;
    };

    container.addEventListener('pointerdown', onPointerDown);
    window.addEventListener('pointermove', onPointerMove);
    window.addEventListener('pointerup', onPointerUp);

    return () => {
      cancelAnimationFrame(animId);
      container.removeEventListener('pointerdown', onPointerDown);
      window.removeEventListener('pointermove', onPointerMove);
      window.removeEventListener('pointerup', onPointerUp);
    };
  }, [applyTransform, updateEyes]);

  return (
    <div
      ref={containerRef}
      style={{
        position: 'absolute',
        inset: 0,
        overflow: 'hidden',
        zIndex: 0,
        pointerEvents: 'auto',
      }}
    />
  );
}
