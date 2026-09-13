"use client";

import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

// iOS 13+ gates the orientation events behind an explicit permission
// prompt, fired from a real user gesture — everywhere else (Android,
// desktop) the events just work with no prompt at all.
type DeviceOrientationEventIOS = typeof DeviceOrientationEvent & {
  requestPermission?: () => Promise<"granted" | "denied">;
};

const MAX_MOUSE_TILT = 14;
const MAX_DEVICE_TILT = 16;

/**
 * A card that leans toward the cursor on desktop, and toward the phone's
 * own tilt on mobile — same "synced to input" idea either way, just a
 * different input. Falls back to sitting flat if neither is available.
 */
export function TiltCard({ children, className }: { children: React.ReactNode; className?: string }) {
  const ref = useRef<HTMLDivElement>(null);
  const [tilt, setTilt] = useState({ x: 0, y: 0 });
  const [needsPermission, setNeedsPermission] = useState(false);
  const [listening, setListening] = useState(false);

  useEffect(() => {
    // A one-time browser-capability check after mount, deliberately kept in
    // an effect (not a lazy useState initializer) so the very first client
    // render still matches the server-rendered HTML — window.
    // DeviceOrientationEvent doesn't exist during SSR, so computing this
    // during render would make the "Enable tilt" button appear/disappear
    // between the server and client's first paint.
    const DOE = window.DeviceOrientationEvent as DeviceOrientationEventIOS | undefined;
    if (typeof DOE?.requestPermission === "function") {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- see comment above
      setNeedsPermission(true);
    } else if (typeof window.DeviceOrientationEvent !== "undefined") {
      setListening(true);
    }
  }, []);

  useEffect(() => {
    if (!listening) return;
    function handler(e: DeviceOrientationEvent) {
      const beta = e.beta ?? 0; // front/back tilt, ~0 flat, ~45-60 held upright
      const gamma = e.gamma ?? 0; // left/right tilt
      const x = Math.max(-MAX_DEVICE_TILT, Math.min(MAX_DEVICE_TILT, (beta - 45) * -0.35));
      const y = Math.max(-MAX_DEVICE_TILT, Math.min(MAX_DEVICE_TILT, gamma * 0.45));
      setTilt({ x, y });
    }
    window.addEventListener("deviceorientation", handler);
    return () => window.removeEventListener("deviceorientation", handler);
  }, [listening]);

  async function enableDeviceTilt() {
    const DOE = window.DeviceOrientationEvent as DeviceOrientationEventIOS | undefined;
    try {
      const result = await DOE?.requestPermission?.();
      if (result === "granted") {
        setListening(true);
        setNeedsPermission(false);
      }
    } catch {
      // Declined or unsupported — the card just stays flat, no harm done.
    }
  }

  function handleMouseMove(e: React.MouseEvent<HTMLDivElement>) {
    if (listening) return; // device tilt takes priority once it's active
    const rect = ref.current?.getBoundingClientRect();
    if (!rect) return;
    const px = (e.clientX - rect.left) / rect.width;
    const py = (e.clientY - rect.top) / rect.height;
    setTilt({ x: (0.5 - py) * MAX_MOUSE_TILT, y: (px - 0.5) * MAX_MOUSE_TILT });
  }

  function handleMouseLeave() {
    if (!listening) setTilt({ x: 0, y: 0 });
  }

  return (
    <div style={{ perspective: "1000px" }}>
      <div
        ref={ref}
        onMouseMove={handleMouseMove}
        onMouseLeave={handleMouseLeave}
        className={cn(
          "relative transition-transform duration-150 ease-out will-change-transform",
          className
        )}
        style={{ transform: `rotateX(${tilt.x}deg) rotateY(${tilt.y}deg)`, transformStyle: "preserve-3d" }}
      >
        {children}
        {needsPermission && (
          <button
            type="button"
            onClick={enableDeviceTilt}
            className="absolute bottom-3 right-3 rounded-md border border-border-strong bg-surface-2 px-2.5 py-1 text-[11px] font-medium text-text-secondary hover:text-text-primary"
          >
            Enable tilt
          </button>
        )}
      </div>
    </div>
  );
}
