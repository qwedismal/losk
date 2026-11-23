"use client";

/**
 * The stage the product objects live on.
 *
 * Constraints that shaped this file:
 *  - the page background must show through, so the canvas is alpha-only and
 *    there is no <color attach="background">;
 *  - no shadows and no postprocessing - the softness comes from lighting and
 *    from the models themselves;
 *  - the render loop stops whenever the canvas leaves the viewport, and the
 *    whole motion vocabulary collapses to a single static pose for users who
 *    ask for reduced motion.
 */

import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { Suspense, useEffect, useMemo, useRef, useState, type ReactElement } from "react";
import * as THREE from "three";
import { SoftModel, type SoftItem } from "./SoftModel";

export interface SoftSceneProps {
  item: SoftItem;
  /** Sizing/radius classes for the wrapper; it always fills 100% of its parent. */
  className?: string;
}

const MAX_TILT = THREE.MathUtils.degToRad(6);
const STATIC_POSE: [number, number, number] = [-0.03, -0.16, 0];

function usePrefersReducedMotion(): boolean {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const query = window.matchMedia("(prefers-reduced-motion: reduce)");
    const sync = () => setReduced(query.matches);
    sync();
    query.addEventListener("change", sync);
    return () => query.removeEventListener("change", sync);
  }, []);

  return reduced;
}

function StudioLights(): ReactElement {
  // three r169 uses physical light units (irradiance is divided by PI in the
  // Lambert term), so these numbers look large but land at a soft studio key.
  // Sum on a top face stays under 1.0 so the warm beige never clips to white.
  return (
    <>
      <ambientLight intensity={0.9} color="#f6f8fb" />
      <directionalLight position={[3.4, 5.4, 3.2]} intensity={2.0} color="#fff1dc" />
      <directionalLight position={[-4.2, 2.2, 2.4]} intensity={0.6} color="#e6f2ff" />
      <directionalLight position={[-1.2, 3.4, -4.6]} intensity={0.9} color="#ffffff" />
    </>
  );
}

function Stage({ item, reduced }: { item: SoftItem; reduced: boolean }): ReactElement {
  const group = useRef<THREE.Group>(null);
  const spring = useRef({ x: 0, y: 0, vx: 0, vy: 0 });
  const size = useThree((state) => state.size);

  // The camera shows ~3.5 world units of height. Keep the object inside ~72% of
  // the width and ~60% of the height, whichever constraint binds first, so the
  // same scene works in a square hero and in a tall phone card.
  const fit = useMemo(() => {
    const aspect = size.width / Math.max(1, size.height);
    return THREE.MathUtils.clamp(Math.min(1.15 * aspect, 1.45), 0.55, 1.45);
  }, [size.width, size.height]);

  useFrame((state, delta) => {
    const node = group.current;
    // Reduced motion keeps the declarative static pose: no float, no parallax.
    if (!node || reduced) return;

    const dt = Math.min(delta, 1 / 30);
    const time = state.clock.elapsedTime;
    const motion = spring.current;

    // Underdamped spring: the object answers the cursor with a small, slightly
    // bouncy lean rather than a linear follow.
    const targetX = -THREE.MathUtils.clamp(state.pointer.y, -1, 1) * MAX_TILT * 0.55;
    const targetY = THREE.MathUtils.clamp(state.pointer.x, -1, 1) * MAX_TILT;
    const stiffness = 120;
    const damping = 14;

    motion.vx += ((targetX - motion.x) * stiffness - motion.vx * damping) * dt;
    motion.vy += ((targetY - motion.y) * stiffness - motion.vy * damping) * dt;
    motion.x += motion.vx * dt;
    motion.y += motion.vy * dt;

    node.rotation.x = STATIC_POSE[0] + motion.x;
    node.rotation.y = STATIC_POSE[1] + motion.y;
    node.position.y = Math.sin(time * 0.85) * 0.035;
    node.scale.setScalar(fit * (1 + Math.sin(time * 1.3) * 0.005));
  });

  return (
    <group ref={group} position={[0, 0, 0]} rotation={STATIC_POSE} scale={fit}>
      <SoftModel item={item} glow />
    </group>
  );
}

function SceneSkeleton(): ReactElement {
  return (
    <div aria-hidden className="absolute inset-0 grid place-items-center">
      <div className="size-36 animate-pulse rounded-full bg-canvas-soft" />
    </div>
  );
}

/**
 * Reports the first presented frame. Until that happens the loop must not be
 * parked, otherwise a canvas that mounts below the fold stays blank until the
 * user scrolls back to it.
 */
function FirstFrame({ onPainted }: { onPainted: () => void }): null {
  const done = useRef(false);
  useFrame(() => {
    if (done.current) return;
    done.current = true;
    onPainted();
  });
  return null;
}

export function SoftScene({ item, className = "" }: SoftSceneProps): ReactElement {
  const host = useRef<HTMLDivElement>(null);
  const [ready, setReady] = useState(false);
  const [inView, setInView] = useState(true);
  const [painted, setPainted] = useState(false);
  const reduced = usePrefersReducedMotion();

  // WebGL only ever exists on the client.
  useEffect(() => setReady(true), []);

  useEffect(() => {
    const node = host.current;
    if (!node || typeof IntersectionObserver === "undefined") return;
    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) setInView(entry.isIntersecting);
      },
      { rootMargin: "240px 0px", threshold: 0 },
    );
    observer.observe(node);
    return () => observer.disconnect();
  }, []);

  const frameloop = reduced ? "demand" : inView || !painted ? "always" : "never";

  return (
    <div ref={host} className={className} style={{ position: "relative", width: "100%", height: "100%" }}>
      {ready ? (
        <Suspense fallback={<SceneSkeleton />}>
          <Canvas
            frameloop={frameloop}
            dpr={[1, 1.75]}
            flat
            camera={{ position: [3.3, 2.25, 4.3], fov: 32, near: 0.1, far: 60 }}
            gl={{ antialias: true, alpha: true, powerPreference: "high-performance" }}
            style={{ width: "100%", height: "100%" }}
            onCreated={({ camera, gl }) => {
              camera.lookAt(0, -0.04, 0);
              gl.setClearAlpha(0);
            }}
          >
            <StudioLights />
            <Stage item={item} reduced={reduced} />
            <FirstFrame onPainted={() => setPainted(true)} />
          </Canvas>
        </Suspense>
      ) : (
        <SceneSkeleton />
      )}
    </div>
  );
}

export default SoftScene;
