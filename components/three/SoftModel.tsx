"use client";

/**
 * Soft factory of the brand: every object here is built from a handful of
 * procedural primitives, never a plane or an imported mesh. The whole point is
 * that the silhouettes read as *upholstery* - rounded, slightly over-quilted,
 * matte - because that is what the service sells.
 *
 * Rendering budget: each item stays under ~2.7k triangles, materials are
 * MeshStandardMaterial with roughness >= 0.75 and metalness 0, no shadows and no
 * postprocessing. Custom geometries are disposed when the item changes or the
 * scene unmounts.
 */

import { useEffect, useLayoutEffect, useMemo, useRef, type ReactElement } from "react";
import * as THREE from "three";

export type SoftItem = "sofa" | "carpet" | "mattress" | "other";

export interface SoftModelProps {
  item: SoftItem;
  /** Adds the aqua halo behind the object - the only place the accent is allowed. */
  glow?: boolean;
}

const ACCENT = "#0FB6A6";

/** Warm-neutral palette, one step of tone per material role so forms separate. */
const PALETTE: Record<SoftItem, { shell: string; soft: string; deep: string; leg: string }> = {
  sofa: { shell: "#E7DECD", soft: "#EFE9DC", deep: "#DDD2C0", leg: "#C9BBA5" },
  carpet: { shell: "#CFE3DE", soft: "#DDECE8", deep: "#BAD5CF", leg: "#E6F1EE" },
  mattress: { shell: "#F2EEE7", soft: "#F8F5F0", deep: "#E5DFD4", leg: "#D8D1C4" },
  other: { shell: "#DFD9CE", soft: "#E9E4DA", deep: "#D0C8BA", leg: "#C6B9A3" },
};

/** Where the soft contact shadow sits and how wide it is, per silhouette. */
const SHADOW: Record<SoftItem, { y: number; size: number; opacity: number }> = {
  sofa: { y: -0.52, size: 3.0, opacity: 0.22 },
  carpet: { y: -0.4, size: 3.2, opacity: 0.16 },
  mattress: { y: -0.24, size: 2.9, opacity: 0.19 },
  other: { y: -0.52, size: 2.0, opacity: 0.2 },
};

type Vec3 = [number, number, number];

/* --------------------------------------------------------------------------
   Geometry
   -------------------------------------------------------------------------- */

function roundedRectShape(width: number, height: number, radius: number): THREE.Shape {
  const shape = new THREE.Shape();
  const hw = Math.max(0.0005, width / 2);
  const hh = Math.max(0.0005, height / 2);
  const r = Math.max(0.0005, Math.min(radius, hw - 0.0005, hh - 0.0005));

  shape.moveTo(-hw + r, -hh);
  shape.lineTo(hw - r, -hh);
  shape.quadraticCurveTo(hw, -hh, hw, -hh + r);
  shape.lineTo(hw, hh - r);
  shape.quadraticCurveTo(hw, hh, hw - r, hh);
  shape.lineTo(-hw + r, hh);
  shape.quadraticCurveTo(-hw, hh, -hw, hh - r);
  shape.lineTo(-hw, -hh + r);
  shape.quadraticCurveTo(-hw, -hh, -hw + r, -hh);
  return shape;
}

/**
 * A box whose every edge is rolled over by a real bevel: extrude a rounded
 * rectangle with `bevelSize` comparable to the radius, then normalise the result
 * back to the requested dimensions (bevel maths is only approximate).
 */
function softBoxGeometry(
  width: number,
  height: number,
  depth: number,
  radius: number,
): THREE.ExtrudeGeometry {
  const bevel = Math.max(0.004, Math.min(radius * 0.55, depth / 3, width / 4, height / 4));
  const shape = roundedRectShape(width - bevel * 2, height - bevel * 2, Math.max(0.001, radius - bevel));

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: Math.max(0.001, depth - bevel * 2),
    bevelEnabled: true,
    bevelSize: bevel,
    bevelThickness: bevel,
    bevelSegments: 2,
    curveSegments: 3,
    steps: 1,
  });

  geometry.center();
  geometry.computeBoundingBox();
  const box = geometry.boundingBox;
  if (box) {
    const size = box.getSize(new THREE.Vector3());
    geometry.scale(width / (size.x || 1), height / (size.y || 1), depth / (size.z || 1));
  }
  geometry.computeVertexNormals();
  return geometry;
}

/** Builds a geometry once per prop change and frees the previous one. */
function useGeometry<T extends THREE.BufferGeometry>(build: () => T, deps: readonly unknown[]): T {
  const geometry = useMemo(build, deps);
  useEffect(() => () => geometry.dispose(), [geometry]);
  return geometry;
}

/* --------------------------------------------------------------------------
   Procedural textures (no files, no network)
   -------------------------------------------------------------------------- */

function useRadialTexture(stops: [string, string], size = 128): THREE.CanvasTexture | null {
  const inner = stops[0];
  const outer = stops[1];

  const texture = useMemo(() => {
    if (typeof document === "undefined") return null;
    const canvas = document.createElement("canvas");
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext("2d");
    if (!ctx) return null;
    const gradient = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    gradient.addColorStop(0, inner);
    gradient.addColorStop(1, outer);
    ctx.fillStyle = gradient;
    ctx.fillRect(0, 0, size, size);
    const next = new THREE.CanvasTexture(canvas);
    next.needsUpdate = true;
    return next;
  }, [inner, outer, size]);

  useEffect(() => () => texture?.dispose(), [texture]);
  return texture;
}

/* --------------------------------------------------------------------------
   Reusable parts
   -------------------------------------------------------------------------- */

function SoftMaterial({ color, roughness = 0.88 }: { color: string; roughness?: number }) {
  return <meshStandardMaterial color={color} roughness={roughness} metalness={0} />;
}

function SoftBox({
  size,
  radius,
  color,
  position,
  rotation,
  roughness,
}: {
  size: Vec3;
  radius: number;
  color: string;
  position?: Vec3;
  rotation?: Vec3;
  roughness?: number;
}) {
  const [width, height, depth] = size;
  const geometry = useGeometry(
    () => softBoxGeometry(width, height, depth, radius),
    [width, height, depth, radius],
  );
  return (
    <mesh geometry={geometry} position={position} rotation={rotation}>
      <SoftMaterial color={color} roughness={roughness} />
    </mesh>
  );
}

function SoftCapsule({
  radius,
  length,
  color,
  position,
  rotation,
  roughness = 0.9,
}: {
  radius: number;
  length: number;
  color: string;
  position?: Vec3;
  rotation?: Vec3;
  roughness?: number;
}) {
  const geometry = useGeometry(() => new THREE.CapsuleGeometry(radius, length, 2, 8), [radius, length]);
  return (
    <mesh geometry={geometry} position={position} rotation={rotation}>
      <SoftMaterial color={color} roughness={roughness} />
    </mesh>
  );
}

/** A tapered leg with a rolled foot - a plain cylinder would read as hardware. */
function SoftLeg({ position, color }: { position: Vec3; color: string }) {
  const geometry = useGeometry(() => new THREE.CapsuleGeometry(0.042, 0.13, 2, 7), []);
  return (
    <mesh geometry={geometry} position={position}>
      <SoftMaterial color={color} roughness={0.94} />
    </mesh>
  );
}

/** Cheap ground contact: a radial-gradient sprite instead of a shadow map. */
function ContactShadow({ y, size, opacity }: { y: number; size: number; opacity: number }) {
  const texture = useRadialTexture(["rgba(28, 30, 34, 0.62)", "rgba(28, 30, 34, 0)"], 128);
  if (!texture) return null;
  return (
    <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, y, 0]} renderOrder={-2}>
      <planeGeometry args={[size, size * 0.78]} />
      <meshBasicMaterial map={texture} transparent opacity={opacity} depthWrite={false} />
    </mesh>
  );
}

function AccentGlow() {
  const texture = useRadialTexture(["rgba(15, 182, 166, 0.3)", "rgba(15, 182, 166, 0)"], 256);
  if (!texture) return null;
  return (
    <sprite position={[0, 0.02, -1.4]} scale={[2.6, 2.0, 1]}>
      <spriteMaterial map={texture} transparent opacity={0.22} depthWrite={false} />
    </sprite>
  );
}

/* --------------------------------------------------------------------------
 Sofa: base, back, two arm rolls, three squab cushions, two back cushions
   -------------------------------------------------------------------------- */

function Sofa() {
  const tone = PALETTE.sofa;
  const seatCushions: Vec3[] = [
    [-0.55, 0.06, 0.05],
    [0, 0.06, 0.05],
    [0.55, 0.06, 0.05],
  ];

  return (
    <group>
      <SoftLeg position={[-0.92, -0.4, 0.3]} color={tone.leg} />
      <SoftLeg position={[0.92, -0.4, 0.3]} color={tone.leg} />
      <SoftLeg position={[-0.92, -0.4, -0.3]} color={tone.leg} />
      <SoftLeg position={[0.92, -0.4, -0.3]} color={tone.leg} />

      <SoftBox size={[2.12, 0.3, 0.94]} radius={0.1} color={tone.deep} position={[0, -0.16, 0]} />
      <SoftBox
        size={[2.1, 0.66, 0.26]}
        radius={0.12}
        color={tone.shell}
        position={[0, 0.2, -0.34]}
        rotation={[-0.05, 0, 0]}
      />

      <SoftCapsule
        radius={0.13}
        length={0.6}
        color={tone.shell}
        position={[-0.95, 0.04, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />
      <SoftCapsule
        radius={0.13}
        length={0.6}
        color={tone.shell}
        position={[0.95, 0.04, 0]}
        rotation={[Math.PI / 2, 0, 0]}
      />

      {seatCushions.map((position) => (
        <SoftBox
          key={position[0]}
          size={[0.53, 0.18, 0.74]}
          radius={0.09}
          color={tone.soft}
          position={position}
          roughness={0.92}
        />
      ))}

      <SoftBox
        size={[0.86, 0.46, 0.17]}
        radius={0.08}
        color={tone.soft}
        position={[-0.44, 0.3, -0.24]}
        rotation={[-0.18, 0, 0]}
        roughness={0.93}
      />
      <SoftBox
        size={[0.86, 0.46, 0.17]}
        radius={0.08}
        color={tone.soft}
        position={[0.44, 0.3, -0.24]}
        rotation={[-0.18, 0, 0]}
        roughness={0.93}
      />

      <SoftBox
        size={[0.34, 0.3, 0.14]}
        radius={0.1}
        color={ACCENT}
        position={[0.6, 0.26, 0.14]}
        rotation={[-0.14, 0.16, 0.24]}
        roughness={0.82}
      />
    </group>
  );
}

/* --------------------------------------------------------------------------
 Carpet: one displaced plane plus an instanced fringe
   -------------------------------------------------------------------------- */

const RUG_WIDTH = 2.5;
const RUG_DEPTH = 1.8;
const FRINGE_PER_END = 26;

/** Shared by the mesh displacement and the fringe so the strands sit on the edge. */
function rugHeight(x: number, y: number): number {
  const fold = Math.sin(y * 2.1 + 0.6) * 0.07 + Math.sin(x * 2.7) * 0.038;
  const edge = Math.max(0, (Math.abs(y) - 0.6) / 0.3);
  return fold + edge * edge * 0.13;
}

function Carpet() {
  const tone = PALETTE.carpet;

  const rug = useGeometry(() => {
    const geometry = new THREE.PlaneGeometry(RUG_WIDTH, RUG_DEPTH, 36, 26);
    const position = geometry.attributes.position;
    for (let i = 0; i < position.count; i += 1) {
      position.setZ(i, rugHeight(position.getX(i), position.getY(i)));
    }
    position.needsUpdate = true;
    geometry.computeVertexNormals();
    return geometry;
  }, []);

  const fringe = useRef<THREE.InstancedMesh>(null);

  useLayoutEffect(() => {
    const mesh = fringe.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3(1, 1, 1);
    const point = new THREE.Vector3();
    const tiltAxis = new THREE.Vector3(1, 0, 0);
    let index = 0;

    for (const end of [-1, 1]) {
      for (let i = 0; i < FRINGE_PER_END; i += 1) {
        const x = -1.2 + (i / (FRINGE_PER_END - 1)) * 2.4;
        point.set(x, end * 0.92, rugHeight(x, end * 0.9));
        rotation.setFromAxisAngle(tiltAxis, end * 0.1);
        matrix.compose(point, rotation, scale);
        mesh.setMatrixAt(index, matrix);
        index += 1;
      }
    }
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, []);

  return (
    <group rotation={[-Math.PI / 2 + 0.42, 0.04, 0.05]} position={[0, -0.08, 0]}>
      <mesh geometry={rug}>
        <meshStandardMaterial color={tone.shell} roughness={0.94} metalness={0} side={THREE.DoubleSide} />
      </mesh>
      <instancedMesh ref={fringe} args={[undefined, undefined, FRINGE_PER_END * 2]} frustumCulled={false}>
        <boxGeometry args={[0.007, 0.1, 0.009]} />
        <meshStandardMaterial color={tone.leg} roughness={0.96} metalness={0} />
      </instancedMesh>
    </group>
  );
}

/* --------------------------------------------------------------------------
 Mattress: thick slab, welt seam, instanced quilt bumps
   -------------------------------------------------------------------------- */

const QUILT_COLUMNS = 5;
const QUILT_ROWS = 4;

function QuiltBumps() {
  const meshRef = useRef<THREE.InstancedMesh>(null);

  const points = useMemo(() => {
    const list: [number, number][] = [];
    for (let column = 0; column < QUILT_COLUMNS; column += 1) {
      for (let row = 0; row < QUILT_ROWS; row += 1) {
        const x = -0.7 + (column / (QUILT_COLUMNS - 1)) * 1.4;
        const z = -0.42 + (row / (QUILT_ROWS - 1)) * 0.84;
        list.push([x, z]);
      }
    }
    return list;
  }, []);

  useLayoutEffect(() => {
    const mesh = meshRef.current;
    if (!mesh) return;
    const matrix = new THREE.Matrix4();
    const rotation = new THREE.Quaternion();
    const scale = new THREE.Vector3(0.32, 0.095, 0.28);
    const point = new THREE.Vector3();
    points.forEach(([x, z], index) => {
      point.set(x, 0.158, z);
      matrix.compose(point, rotation, scale);
      mesh.setMatrixAt(index, matrix);
    });
    mesh.instanceMatrix.needsUpdate = true;
    mesh.computeBoundingSphere();
  }, [points]);

  return (
    <instancedMesh ref={meshRef} args={[undefined, undefined, points.length]} frustumCulled={false}>
      <sphereGeometry args={[0.5, 8, 5]} />
      <meshStandardMaterial color={PALETTE.mattress.soft} roughness={0.93} metalness={0} />
    </instancedMesh>
  );
}

function Mattress() {
  const tone = PALETTE.mattress;
  return (
    <group>
      <SoftBox size={[2.0, 0.34, 1.4]} radius={0.15} color={tone.shell} />
      <SoftBox
        size={[2.028, 0.03, 1.428]}
        radius={0.16}
        color={tone.deep}
        position={[0, -0.005, 0]}
        roughness={0.94}
      />
      <QuiltBumps />
    </group>
  );
}

/* --------------------------------------------------------------------------
 Armchair: a C-shell extrusion on four tapered legs
   -------------------------------------------------------------------------- */

function buildShellGeometry(): THREE.BufferGeometry {
  const outer = 0.56;
  const inner = 0.46;
  const start = THREE.MathUtils.degToRad(-25);
  const end = THREE.MathUtils.degToRad(205);

  const shape = new THREE.Shape();
  shape.absarc(0, 0, outer, start, end, false);
  shape.absarc(0, 0, inner, end, start, true);
  shape.closePath();

  const geometry = new THREE.ExtrudeGeometry(shape, {
    depth: 0.66,
    bevelEnabled: true,
    bevelSize: 0.028,
    bevelThickness: 0.028,
    bevelSegments: 2,
    curveSegments: 10,
    steps: 1,
  });
  geometry.center();
  // Extrusions are born in XY; the shell has to stand up around Y.
  geometry.rotateX(-Math.PI / 2);
  geometry.computeVertexNormals();
  return geometry;
}

function Armchair() {
  const tone = PALETTE.other;
  const shell = useGeometry(() => buildShellGeometry(), []);

  return (
    <group>
      <SoftLeg position={[-0.28, -0.4, 0.22]} color={tone.leg} />
      <SoftLeg position={[0.28, -0.4, 0.22]} color={tone.leg} />
      <SoftLeg position={[-0.28, -0.4, -0.22]} color={tone.leg} />
      <SoftLeg position={[0.28, -0.4, -0.22]} color={tone.leg} />

      <SoftBox
        size={[0.66, 0.08, 0.56]}
        radius={0.03}
        color={tone.deep}
        position={[0, -0.28, 0.02]}
        roughness={0.94}
      />
      <SoftBox
        size={[0.68, 0.2, 0.58]}
        radius={0.09}
        color={tone.soft}
        position={[0, -0.12, 0.02]}
        roughness={0.92}
      />

      <mesh geometry={shell} position={[0, 0.04, 0]}>
        <meshStandardMaterial color={tone.shell} roughness={0.9} metalness={0} side={THREE.DoubleSide} />
      </mesh>

      <SoftBox
        size={[0.34, 0.3, 0.12]}
        radius={0.09}
        color={ACCENT}
        position={[0.06, 0.03, -0.05]}
        rotation={[-0.26, 0.16, 0.08]}
        roughness={0.82}
      />
    </group>
  );
}

/* --------------------------------------------------------------------------
   Root
   -------------------------------------------------------------------------- */

export function SoftModel({ item, glow = false }: SoftModelProps): ReactElement {
  const shadow = SHADOW[item];

  return (
    <group>
      {item === "sofa" ? <Sofa /> : null}
      {item === "carpet" ? <Carpet /> : null}
      {item === "mattress" ? <Mattress /> : null}
      {item === "other" ? <Armchair /> : null}
      {glow ? <AccentGlow /> : null}
      <ContactShadow y={shadow.y} size={shadow.size} opacity={shadow.opacity} />
    </group>
  );
}
