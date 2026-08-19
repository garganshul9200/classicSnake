import { useCallback, useRef } from 'react';
import { cn } from './utils/cn';

const SIZE = 132;
const KNOB = 52;
const RADIUS = (SIZE - KNOB) / 2;

interface JoystickProps {
  onChange: (x: number, y: number, active: boolean) => void;
  className?: string;
}

export function Joystick({ onChange, className }: JoystickProps) {
  const baseRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const pointerIdRef = useRef<number | null>(null);

  const setKnobPosition = useCallback((dx: number, dy: number) => {
    if (!knobRef.current) return;
    knobRef.current.style.transform = `translate(calc(-50% + ${dx}px), calc(-50% + ${dy}px))`;
  }, []);

  const updateFromClient = useCallback(
    (clientX: number, clientY: number, active: boolean) => {
      const base = baseRef.current;
      if (!base) return;

      const rect = base.getBoundingClientRect();
      const cx = rect.left + rect.width / 2;
      const cy = rect.top + rect.height / 2;
      let dx = clientX - cx;
      let dy = clientY - cy;
      const dist = Math.hypot(dx, dy);

      if (dist > RADIUS) {
        dx = (dx / dist) * RADIUS;
        dy = (dy / dist) * RADIUS;
      }

      setKnobPosition(dx, dy);
      onChange(dx / RADIUS, dy / RADIUS, active);
    },
    [onChange, setKnobPosition],
  );

  const reset = useCallback(() => {
    pointerIdRef.current = null;
    setKnobPosition(0, 0);
    onChange(0, 0, false);
  }, [onChange, setKnobPosition]);

  const onPointerDown = (e: React.PointerEvent) => {
    e.preventDefault();
    pointerIdRef.current = e.pointerId;
    baseRef.current?.setPointerCapture(e.pointerId);
    updateFromClient(e.clientX, e.clientY, true);
  };

  const onPointerMove = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    updateFromClient(e.clientX, e.clientY, true);
  };

  const onPointerEnd = (e: React.PointerEvent) => {
    if (pointerIdRef.current !== e.pointerId) return;
    e.preventDefault();
    baseRef.current?.releasePointerCapture(e.pointerId);
    reset();
  };

  return (
    <div
      ref={baseRef}
      className={cn('joystick-base', className)}
      style={{ width: SIZE, height: SIZE }}
      onPointerDown={onPointerDown}
      onPointerMove={onPointerMove}
      onPointerUp={onPointerEnd}
      onPointerCancel={onPointerEnd}
      aria-label="Movement joystick"
      role="application"
    >
      <div ref={knobRef} className="joystick-knob" style={{ width: KNOB, height: KNOB }} />
    </div>
  );
}
