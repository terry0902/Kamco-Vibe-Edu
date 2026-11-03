// 유리 조각 시작 화면의 3D 장면. 조각 모양, 기울기, 호버, 깨짐을 모두 여기서 다룬다.
import * as THREE from "three";
import { RoomEnvironment } from "three/examples/jsm/environments/RoomEnvironment.js";
import {
  computeLayout,
  drawPage,
  sliverGeometry,
  type PageLayout,
} from "./glassLayout";

export type SceneState = "in" | "idle" | "out" | "gone";

export type GlassScene = {
  update: (options: { needsApiKey: boolean; hover: string | null }) => void;
  shatter: () => void;
  assemble: () => void;
  setSliverHover: (hover: boolean) => void;
  dispose: () => void;
};

export type SceneOptions = {
  canvas: HTMLCanvasElement;
  getTextLayer: () => HTMLElement | null;
  needsApiKey: boolean;
  onLayout: (layout: PageLayout) => void;
  onState?: (state: SceneState) => void;
};

type Pt = { x: number; y: number };

const BASE: Record<string, Pt> = {
  TL: { x: 0, y: 0 },
  TR: { x: 1, y: 0 },
  BL: { x: 0, y: 1 },
  BR: { x: 1, y: 1 },
  tAB: { x: 0.22, y: 0 },
  tBC: { x: 0.515, y: 0 },
  tCE: { x: 0.84, y: 0 },
  bAD: { x: 0.34, y: 1 },
  bDE: { x: 0.865, y: 1 },
  J0: { x: 0.385, y: 0.72 },
  J1: { x: 0.48, y: 0.62 },
  J2: { x: 0.716, y: 0.49 },
};
const CELLS: Record<string, string[]> = {
  A: ["TL", "tAB", "J0", "bAD", "BL"],
  B: ["tAB", "tBC", "J1", "J0"],
  C: ["tBC", "tCE", "J2", "J1"],
  D: ["J0", "J1", "J2", "bDE", "bAD"],
  E: ["tCE", "TR", "BR", "bDE", "J2"],
};
const PIECE_ORDER = ["nav", "A", "B", "C", "D", "E"];

const FLIGHT_SECONDS = 0.72;
const REBUILD_INTERVAL = 1 / 45;
const GRAVITY_FACTOR = 1.25;

const clamp = (value: number, min: number, max: number) =>
  Math.min(max, Math.max(min, value));
const easeInCubic = (t: number) => t * t * t;
const easeOutCubic = (t: number) => 1 - (1 - t) ** 3;
const easeOutBack = (t: number) => {
  const c1 = 1.70158;
  const c3 = c1 + 1;
  return 1 + c3 * (t - 1) ** 3 + c1 * (t - 1) ** 2;
};

function seeded(index: number, salt: number) {
  const value = Math.sin(index * 127.1 + salt * 311.7) * 43758.5453;
  return value - Math.floor(value);
}

// 가장자리를 안쪽으로 밀어 조각 사이에 틈을 만든다.
function insetPolygon(poly: Pt[], distance: number): Pt[] {
  const n = poly.length;
  let area = 0;
  for (let i = 0; i < n; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % n];
    area += a.x * b.y - b.x * a.y;
  }
  const sign = area >= 0 ? 1 : -1;
  const lines = poly.map((a, i) => {
    const b = poly[(i + 1) % n];
    const dx = b.x - a.x;
    const dy = b.y - a.y;
    const length = Math.hypot(dx, dy) || 1;
    const nx = (-dy / length) * sign;
    const ny = (dx / length) * sign;
    return {
      px: a.x + nx * distance,
      py: a.y + ny * distance,
      dx: dx / length,
      dy: dy / length,
      nx,
      ny,
    };
  });
  return poly.map((point, i) => {
    const prev = lines[(i + n - 1) % n];
    const next = lines[i];
    const cross = prev.dx * next.dy - prev.dy * next.dx;
    if (Math.abs(cross) < 1e-6) {
      return { x: point.x + next.nx * distance, y: point.y + next.ny * distance };
    }
    const t =
      ((next.px - prev.px) * next.dy - (next.py - prev.py) * next.dx) / cross;
    const x = prev.px + prev.dx * t;
    const y = prev.py + prev.dy * t;
    const limit = distance * 3;
    const offset = Math.hypot(x - point.x, y - point.y);
    if (offset > limit) {
      const scale = limit / offset;
      return {
        x: point.x + (x - point.x) * scale,
        y: point.y + (y - point.y) * scale,
      };
    }
    return { x, y };
  });
}

function centroidOf(poly: Pt[]): Pt {
  let area = 0;
  let cx = 0;
  let cy = 0;
  for (let i = 0; i < poly.length; i += 1) {
    const a = poly[i];
    const b = poly[(i + 1) % poly.length];
    const cross = a.x * b.y - b.x * a.y;
    area += cross;
    cx += (a.x + b.x) * cross;
    cy += (a.y + b.y) * cross;
  }
  if (Math.abs(area) < 1e-6) return poly[0];
  return { x: cx / (3 * area), y: cy / (3 * area) };
}

function roundedShape(poly: Pt[], radius: number, origin: Pt): THREE.Shape {
  const n = poly.length;
  const points = poly.map((p) => ({ x: p.x - origin.x, y: p.y - origin.y }));
  const shape = new THREE.Shape();
  for (let i = 0; i < n; i += 1) {
    const prev = points[(i + n - 1) % n];
    const cur = points[i];
    const next = points[(i + 1) % n];
    const l1 = Math.hypot(prev.x - cur.x, prev.y - cur.y) || 1;
    const l2 = Math.hypot(next.x - cur.x, next.y - cur.y) || 1;
    const r = Math.min(radius, l1 * 0.45, l2 * 0.45);
    const a = { x: cur.x + ((prev.x - cur.x) / l1) * r, y: cur.y + ((prev.y - cur.y) / l1) * r };
    const b = { x: cur.x + ((next.x - cur.x) / l2) * r, y: cur.y + ((next.y - cur.y) / l2) * r };
    if (i === 0) shape.moveTo(a.x, a.y);
    else shape.lineTo(a.x, a.y);
    shape.quadraticCurveTo(cur.x, cur.y, b.x, b.y);
  }
  shape.closePath();
  return shape;
}

// 네 점이 화면의 어디에 찍히는지로 평면 변환(CSS matrix3d)을 만든다.
function homography(w: number, h: number, dst: Pt[]): string {
  const src = [
    [0, 0],
    [w, 0],
    [w, h],
    [0, h],
  ];
  const a: number[][] = [];
  const b: number[] = [];
  for (let i = 0; i < 4; i += 1) {
    const [x, y] = src[i];
    const { x: u, y: v } = dst[i];
    a.push([x, y, 1, 0, 0, 0, -x * u, -y * u]);
    b.push(u);
    a.push([0, 0, 0, x, y, 1, -x * v, -y * v]);
    b.push(v);
  }
  // 가우스 소거법
  for (let col = 0; col < 8; col += 1) {
    let pivot = col;
    for (let row = col + 1; row < 8; row += 1) {
      if (Math.abs(a[row][col]) > Math.abs(a[pivot][col])) pivot = row;
    }
    [a[col], a[pivot]] = [a[pivot], a[col]];
    [b[col], b[pivot]] = [b[pivot], b[col]];
    const div = a[col][col] || 1e-9;
    for (let row = col + 1; row < 8; row += 1) {
      const factor = a[row][col] / div;
      for (let k = col; k < 8; k += 1) a[row][k] -= factor * a[col][k];
      b[row] -= factor * b[col];
    }
  }
  const x = new Array<number>(8).fill(0);
  for (let row = 7; row >= 0; row -= 1) {
    let sum = b[row];
    for (let k = row + 1; k < 8; k += 1) sum -= a[row][k] * x[k];
    x[row] = sum / (a[row][row] || 1e-9);
  }
  const [m0, m1, m2, m3, m4, m5, m6, m7] = x;
  return `matrix3d(${m0},${m3},0,${m6},${m1},${m4},0,${m7},0,0,1,0,${m2},${m5},0,1)`;
}

type Spring = { value: number; velocity: number };

function stepSpring(spring: Spring, target: number, dt: number) {
  const k = 170;
  const c = 19;
  const steps = Math.max(1, Math.ceil(dt / 0.008));
  const h = dt / steps;
  for (let i = 0; i < steps; i += 1) {
    const accel = -k * (spring.value - target) - c * spring.velocity;
    spring.velocity += accel * h;
    spring.value += spring.velocity * h;
  }
}

type Piece = {
  id: string;
  isNav: boolean;
  group: THREE.Group;
  glass: THREE.Mesh;
  text: THREE.Mesh;
  material: THREE.MeshPhysicalMaterial;
  centroid: THREE.Vector2;
  halfW: number;
  halfH: number;
  lift: Spring;
  tiltX: Spring;
  tiltY: Spring;
  hover: number;
  delay: number;
  vel: THREE.Vector3;
  axis: THREE.Vector3;
  angle: number;
};

export function createGlassScene(options: SceneOptions): GlassScene {
  const { canvas } = options;
  const family = getComputedStyle(document.body).fontFamily;

  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    powerPreference: "high-performance",
  });
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.setClearColor(0x050507, 1);
  const scene = new THREE.Scene();
  const camera = new THREE.PerspectiveCamera(30, 1, 10, 20000);

  const pmrem = new THREE.PMREMGenerator(renderer);
  const envTexture = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  scene.environmentIntensity = 0.42;
  const keyLight = new THREE.DirectionalLight(0xdfe8ff, 2.4);
  scene.add(keyLight);

  const measureCtx = document.createElement("canvas").getContext("2d")!;
  const measure = (font: string, text: string) => {
    measureCtx.font = font;
    return measureCtx.measureText(text).width;
  };

  const glow = {
    pos: { value: new THREE.Vector3() },
    amount: { value: 0 },
    radius: { value: 300 },
  };

  const slab = new THREE.Group();
  scene.add(slab);

  const pageCanvas = document.createElement("canvas");
  const textMaterial = new THREE.MeshBasicMaterial({
    transparent: true,
    depthWrite: false,
    toneMapped: false,
    polygonOffset: true,
    polygonOffsetFactor: -2,
    polygonOffsetUnits: -2,
  });
  let pageTexture: THREE.CanvasTexture | null = null;

  let layout: PageLayout;
  let needsApiKey = options.needsApiKey;
  let hoverId: string | null = null;
  let W = 1;
  let H = 1;
  let depth = 1;
  let bevel = 1;
  let cornerRadius = 1;
  const pieces: Piece[] = [];

  const sliverMaterial = new THREE.MeshPhysicalMaterial({
    color: 0x17171b,
    roughness: 0.36,
    clearcoat: 0.7,
    clearcoatRoughness: 0.12,
    specularIntensity: 0.7,
    iridescence: 0.35,
    iridescenceIOR: 1.3,
    iridescenceThicknessRange: [250, 650],
    envMap: envTexture,
    envMapIntensity: 0.42 * 1.3,
  });
  const sliver = new THREE.Group();
  const sliverMesh = new THREE.Mesh(new THREE.BufferGeometry(), sliverMaterial);
  sliver.add(sliverMesh);
  sliver.visible = false;
  scene.add(sliver);
  const sliverTilt = { x: { value: 0, velocity: 0 }, y: { value: 0, velocity: 0 } };
  let sliverHover = false;
  let sliverPhase: "hidden" | "showing" | "shown" | "hiding" = "hidden";
  let sliverT0 = 0;
  let sliverScale = 0;

  function makeGlassMaterial() {
    const material = new THREE.MeshPhysicalMaterial({
      color: 0x17171b,
      roughness: 0.36,
      clearcoat: 0.7,
      clearcoatRoughness: 0.12,
      specularIntensity: 0.7,
      iridescence: 0.55,
      iridescenceIOR: 1.3,
      iridescenceThicknessRange: [250, 650],
      envMap: envTexture,
      envMapIntensity: 0.42,
    });
    material.onBeforeCompile = (shader) => {
      shader.uniforms.uGlowPos = glow.pos;
      shader.uniforms.uGlow = glow.amount;
      shader.uniforms.uGlowR = glow.radius;
      shader.vertexShader = shader.vertexShader
        .replace("#include <common>", "#include <common>\nvarying vec3 vGlowPos;")
        .replace(
          "#include <begin_vertex>",
          "#include <begin_vertex>\nvGlowPos = (modelMatrix * vec4(transformed, 1.0)).xyz;",
        );
      shader.fragmentShader = shader.fragmentShader
        .replace(
          "#include <common>",
          "#include <common>\nvarying vec3 vGlowPos;\nuniform vec3 uGlowPos;\nuniform float uGlow;\nuniform float uGlowR;",
        )
        .replace(
          "#include <opaque_fragment>",
          "float glowD = distance(vGlowPos.xy, uGlowPos.xy) / uGlowR;\noutgoingLight += vec3(0.42, 0.37, 0.62) * 0.16 * exp(-1.6 * glowD * glowD) * uGlow;\n#include <opaque_fragment>",
        );
    };
    return material;
  }

  function disposePieces() {
    for (const piece of pieces) {
      piece.glass.geometry.dispose();
      piece.text.geometry.dispose();
      piece.material.dispose();
      slab.remove(piece.group);
    }
    pieces.length = 0;
  }

  function redrawPage() {
    const dpr = Math.min(Math.max(window.devicePixelRatio || 1, 1.5), 2);
    const width = Math.ceil(layout.bw * dpr);
    const height = Math.ceil(layout.bh * dpr);
    if (pageCanvas.width !== width || pageCanvas.height !== height) {
      pageCanvas.width = width;
      pageCanvas.height = height;
      pageTexture?.dispose();
      pageTexture = new THREE.CanvasTexture(pageCanvas);
      pageTexture.colorSpace = THREE.SRGBColorSpace;
      pageTexture.anisotropy = renderer.capabilities.getMaxAnisotropy();
      textMaterial.map = pageTexture;
      textMaterial.needsUpdate = true;
    }
    const ctx = pageCanvas.getContext("2d")!;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    drawPage(ctx, layout, family, hoverId);
    if (pageTexture) pageTexture.needsUpdate = true;
  }

  function relayout() {
    layout = computeLayout(W, H, family, measure, needsApiKey);
    const S = layout.S;
    depth = 13 * S;
    bevel = 2.6 * S;
    cornerRadius = 20 * S;
    glow.radius.value = 300 * S;
    options.onLayout(layout);
    redrawPage();

    disposePieces();
    PIECE_ORDER.forEach((id, index) => {
      const isNav = id === "nav";
      const material = makeGlassMaterial();
      const glass = new THREE.Mesh(new THREE.BufferGeometry(), material);
      const text = new THREE.Mesh(new THREE.BufferGeometry(), textMaterial);
      text.renderOrder = 2;
      const group = new THREE.Group();
      group.add(glass, text);
      slab.add(group);

      const a = seeded(index, 1);
      const b = seeded(index, 2);
      const c = seeded(index, 3);
      pieces.push({
        id,
        isNav,
        group,
        glass,
        text,
        material,
        centroid: new THREE.Vector2(),
        halfW: 1,
        halfH: 1,
        lift: { value: 0, velocity: 0 },
        tiltX: { value: 0, velocity: 0 },
        tiltY: { value: 0, velocity: 0 },
        hover: 0,
        delay: index * (isNav ? 0 : 0.035),
        vel: new THREE.Vector3(),
        axis: new THREE.Vector3(a - 0.5, b - 0.5, c - 0.5 + 0.2).normalize(),
        angle: (2.0 + seeded(index, 4) * 1.6) * (seeded(index, 5) > 0.5 ? 1 : -1),
      });
    });
    rebuildGeometry(performance.now() / 1000, true);

    // 조각이 날아갈 방향과 속도. 바깥쪽과 아래쪽, 카메라 쪽으로 간다.
    for (const piece of pieces) {
      const dirX = piece.centroid.x / (layout.bw / 2);
      const dirY = piece.centroid.y / (layout.bh / 2);
      const index = PIECE_ORDER.indexOf(piece.id);
      piece.vel.set(
        (dirX * 0.55 + (seeded(index, 6) - 0.5) * 0.3) * W,
        (dirY * 0.3 - 0.32 + (seeded(index, 7) - 0.5) * 0.2) * H,
        (420 + seeded(index, 8) * 380) * S,
      );
    }
    buildSliver();
  }

  const pointer = { x: 0, y: 0, active: false };
  const tilt = { x: 0, y: 0 };
  let lastRebuild = 0;
  let pointerNormalized = { x: 0, y: 0 };

  function currentPoints(time: number) {
    const points: Record<string, Pt> = {};
    const { portrait } = layout;
    const panel = layout.panel;
    // 포인터 위치를 가로 화면 기준 판 좌표(0~1)로 바꾼다.
    const fx = (pointer.x - layout.blockLeft) / layout.bw;
    const fy = (pointer.y - layout.blockTop - panel.y) / panel.h;
    const lx = portrait ? fy : fx;
    const ly = portrait ? fx : fy;
    const pushScale = glow.amount.value;

    Object.keys(BASE).forEach((name, index) => {
      const base = BASE[name];
      let { x, y } = base;
      const isCorner = name.length === 2 && name[0] !== "t" && name[0] !== "b" && name[0] !== "J";
      const isJunction = name.startsWith("J");
      if (!isCorner) {
        const periodX = 10 + seeded(index, 11) * 10;
        x += 0.03 * Math.sin((time / periodX) * Math.PI * 2 + seeded(index, 12) * 6.28);
        if (isJunction) {
          const periodY = 10 + seeded(index, 13) * 10;
          y += 0.05 * Math.sin((time / periodY) * Math.PI * 2 + seeded(index, 14) * 6.28);
        }
        if (pushScale > 0.001) {
          const dx = x - lx;
          const dy = y - ly;
          const d = Math.hypot(dx, dy);
          if (d < 0.6 && d > 1e-4) {
            const amount = 0.05 * (1 - d / 0.6) ** 2 * pushScale;
            x += (dx / d) * amount;
            if (isJunction) y += (dy / d) * amount;
          }
        }
      }
      points[name] = portrait ? { x: y, y: x } : { x, y };
    });
    return points;
  }

  function toSlab(point: Pt): Pt {
    const panel = layout.panel;
    const centerY = layout.bh / 2 - (panel.y + panel.h / 2);
    return {
      x: (point.x - 0.5) * panel.w,
      y: centerY + (0.5 - point.y) * panel.h,
    };
  }

  function navPolygon(): Pt[] {
    const { nav, bw, bh } = layout;
    const top = bh / 2;
    const bottom = bh / 2 - nav.h;
    return [
      { x: -bw / 2, y: top },
      { x: bw / 2, y: top },
      { x: bw / 2, y: bottom },
      { x: -bw / 2, y: bottom },
    ];
  }

  function buildPiece(piece: Piece, poly: Pt[]) {
    const inset = insetPolygon(poly, layout.gap / 2 + bevel);
    const centroid = centroidOf(inset);
    piece.centroid.set(centroid.x, centroid.y);
    const xs = inset.map((p) => p.x);
    const ys = inset.map((p) => p.y);
    piece.halfW = (Math.max(...xs) - Math.min(...xs)) / 2;
    piece.halfH = (Math.max(...ys) - Math.min(...ys)) / 2;

    const shape = roundedShape(inset, cornerRadius, centroid);
    const glassGeometry = new THREE.ExtrudeGeometry(shape, {
      depth,
      bevelEnabled: true,
      bevelThickness: bevel,
      bevelSize: bevel,
      bevelSegments: 3,
      curveSegments: 4,
    });
    glassGeometry.translate(0, 0, -depth / 2);

    const textGeometry = new THREE.ShapeGeometry(shape, 6);
    const position = textGeometry.getAttribute("position");
    const uv = textGeometry.getAttribute("uv");
    for (let i = 0; i < position.count; i += 1) {
      const blockX = position.getX(i) + centroid.x + layout.bw / 2;
      const blockY = layout.bh / 2 - (position.getY(i) + centroid.y);
      uv.setXY(i, blockX / layout.bw, 1 - blockY / layout.bh);
    }
    uv.needsUpdate = true;
    textGeometry.translate(0, 0, depth / 2 + bevel + 0.6);

    piece.glass.geometry.dispose();
    piece.text.geometry.dispose();
    piece.glass.geometry = glassGeometry;
    piece.text.geometry = textGeometry;
  }

  function rebuildGeometry(time: number, includeNav: boolean) {
    const points = currentPoints(time);
    for (const piece of pieces) {
      if (piece.isNav) {
        if (includeNav) buildPiece(piece, navPolygon());
        continue;
      }
      buildPiece(
        piece,
        CELLS[piece.id].map((name) => toSlab(points[name])),
      );
    }
  }

  function buildSliver() {
    const info = sliverGeometry(W, H);
    const k = Math.max(info.k, 0.5);
    const world = info.points.map((p) => ({ x: p.x - W / 2, y: H / 2 - p.y }));
    const inset = insetPolygon(world, 0);
    const centroid = centroidOf(inset);
    const shape = roundedShape(inset, 6 * k, centroid);
    const geometry = new THREE.ExtrudeGeometry(shape, {
      depth: 11 * k,
      bevelEnabled: true,
      bevelThickness: 2.4 * k,
      bevelSize: 1.6 * k,
      bevelSegments: 3,
      curveSegments: 4,
    });
    geometry.translate(0, 0, -5.5 * k);
    sliverMesh.geometry.dispose();
    sliverMesh.geometry = geometry;
    sliver.position.set(centroid.x, centroid.y, 0);
  }

  function resize() {
    W = window.innerWidth;
    H = window.innerHeight;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    renderer.setPixelRatio(dpr);
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.position.set(0, 0, H / 2 / Math.tan(THREE.MathUtils.degToRad(15)));
    camera.updateProjectionMatrix();
    keyLight.position.set(-W * 0.5, H * 0.8, H * 1.1);
    relayout();
  }

  const raycaster = new THREE.Raycaster();
  const ndc = new THREE.Vector2();
  let hovered: Piece | null = null;
  let state: SceneState = "in";
  let stateT0 = performance.now() / 1000;
  options.onState?.("in");

  function setState(next: SceneState, time: number) {
    state = next;
    stateT0 = time;
    options.onState?.(next);
  }

  const onMove = (event: PointerEvent) => {
    pointer.x = event.clientX;
    pointer.y = event.clientY;
    pointer.active = true;
    pointerNormalized = {
      x: (event.clientX / W) * 2 - 1,
      y: (event.clientY / H) * 2 - 1,
    };
  };
  const onLeave = () => {
    pointer.active = false;
  };
  const onOut = (event: MouseEvent) => {
    if (event.relatedTarget === null) pointer.active = false;
  };
  window.addEventListener("pointermove", onMove);
  window.addEventListener("pointerdown", onMove);
  document.addEventListener("mouseleave", onLeave);
  window.addEventListener("mouseout", onOut);
  window.addEventListener("resize", resize);

  const tmpQuatA = new THREE.Quaternion();
  const tmpQuatB = new THREE.Quaternion();
  const tmpEuler = new THREE.Euler();
  const tmpVec = new THREE.Vector3();
  const corners: [number, number][] = [
    [-1, 1],
    [1, 1],
    [1, -1],
    [-1, -1],
  ];
  let last = performance.now() / 1000;
  let frameId = 0;
  let disposed = false;

  function flightProgress(piece: Piece, time: number) {
    if (state === "idle") return 0;
    if (state === "gone") return 1;
    const order = PIECE_ORDER.indexOf(piece.id);
    const delay = state === "in" ? order * 0.03 : piece.delay;
    const p = clamp((time - stateT0 - delay) / FLIGHT_SECONDS, 0, 1);
    return state === "out" ? easeInCubic(p) : 1 - easeOutBack(p);
  }

  function frame() {
    if (disposed) return;
    frameId = requestAnimationFrame(frame);
    const time = performance.now() / 1000;
    const dt = Math.min(time - last, 0.05);
    last = time;
    const damp = 1 - Math.exp(-dt / 0.3);

    // 전체 기울기: 포인터가 누르는 곳이 안쪽으로 들어간다.
    const targetY = THREE.MathUtils.degToRad(
      (pointer.active ? pointerNormalized.x * 7 : 0) - 1.2,
    );
    const targetX = THREE.MathUtils.degToRad(
      (pointer.active ? pointerNormalized.y * 5.5 : 0) - 0.8,
    );
    tilt.y += (targetY - tilt.y) * damp;
    tilt.x += (targetX - tilt.x) * damp;
    slab.rotation.set(tilt.x, tilt.y, 0);
    slab.updateMatrixWorld(true);

    glow.amount.value +=
      ((pointer.active && state === "idle" ? 1 : 0) - glow.amount.value) *
      (1 - Math.exp(-dt / 0.15));
    glow.pos.value.set(pointer.x - W / 2, H / 2 - pointer.y, 0);

    // 포인터 아래의 조각을 찾는다.
    let target: Piece | null = null;
    if (state === "idle" && pointer.active) {
      ndc.set((pointer.x / W) * 2 - 1, -(pointer.y / H) * 2 + 1);
      raycaster.setFromCamera(ndc, camera);
      const hits = raycaster.intersectObjects(
        pieces.map((piece) => piece.glass),
        false,
      );
      if (hits.length > 0) {
        target = pieces.find((piece) => piece.glass === hits[0].object) ?? null;
      }
    }
    hovered = target;

    if (time - lastRebuild >= REBUILD_INTERVAL && state !== "gone") {
      lastRebuild = time;
      rebuildGeometry(time, false);
    }

    const S = layout.S;
    for (const piece of pieces) {
      const isHover = piece === hovered;
      const liftTarget = isHover ? (piece.isNav ? 32 : 50) * S : 0;
      let tiltXTarget = 0;
      let tiltYTarget = 0;
      if (isHover) {
        tmpVec.set(pointer.x - W / 2, H / 2 - pointer.y, 0);
        const dx = (tmpVec.x - piece.centroid.x) / Math.max(piece.halfW, 1);
        const dy = (tmpVec.y - piece.centroid.y) / Math.max(piece.halfH, 1);
        tiltYTarget = clamp(dx, -1, 1) * 0.24;
        tiltXTarget = -clamp(dy, -1, 1) * 0.24;
      }
      stepSpring(piece.lift, liftTarget, dt);
      stepSpring(piece.tiltX, tiltXTarget, dt);
      stepSpring(piece.tiltY, tiltYTarget, dt);
      piece.hover += ((isHover ? 1 : 0) - piece.hover) * (1 - Math.exp(-dt / 0.12));
      piece.material.iridescence = 0.55 + 0.45 * piece.hover;
      piece.material.envMapIntensity = 0.42 * (1 + 0.9 * piece.hover);

      const f = flightProgress(piece, time);
      piece.group.visible = f < 0.999;

      const gravity = H * GRAVITY_FACTOR;
      piece.group.position.set(
        piece.centroid.x + piece.vel.x * f,
        piece.centroid.y + piece.vel.y * f - 0.5 * gravity * f * f,
        piece.lift.value + piece.vel.z * f,
      );
      tmpEuler.set(piece.tiltX.value, piece.tiltY.value, 0);
      tmpQuatA.setFromEuler(tmpEuler);
      tmpQuatB.setFromAxisAngle(piece.axis, piece.angle * f);
      piece.group.quaternion.copy(tmpQuatB).multiply(tmpQuatA);
    }

    if (state === "in" || state === "out") {
      const finished = (time - stateT0) / FLIGHT_SECONDS > 1 + (pieces.length - 1) * 0.04;
      if (finished) setState(state === "in" ? "idle" : "gone", time);
    }

    updateSliver(time, dt);

    // 글자 레이어를 기울어진 면에 맞춘다.
    const layer = options.getTextLayer();
    if (layer) {
      const topZ = depth / 2 + bevel;
      const screen = corners.map(([sx, sy]) => {
        tmpVec
          .set((sx * layout.bw) / 2, (sy * layout.bh) / 2, topZ)
          .applyMatrix4(slab.matrixWorld)
          .project(camera);
        return { x: ((tmpVec.x + 1) / 2) * W, y: ((1 - tmpVec.y) / 2) * H };
      });
      layer.style.transform = homography(layout.bw, layout.bh, screen);
      layer.style.visibility = state === "idle" ? "visible" : "hidden";
    }

    renderer.render(scene, camera);
  }

  function updateSliver(time: number, dt: number) {
    if (sliverPhase === "showing") {
      const p = clamp((time - sliverT0) / 0.45, 0, 1);
      sliverScale = easeOutCubic(p);
      if (p >= 1) sliverPhase = "shown";
    } else if (sliverPhase === "hiding") {
      const p = clamp((time - sliverT0) / 0.3, 0, 1);
      sliverScale = 1 - easeInCubic(p);
      if (p >= 1) sliverPhase = "hidden";
    } else if (sliverPhase === "hidden") {
      sliverScale = 0;
    }
    sliver.visible = sliverScale > 0.002;
    if (!sliver.visible) return;

    const info = sliverGeometry(W, H);
    const centerX = info.left + info.w * 0.5 - W / 2;
    const centerY = H / 2 - (info.top + info.h * 0.5);
    let tipX = 0;
    let tipY = 0;
    if (sliverHover && pointer.active) {
      tipY = clamp((pointer.x - W / 2 - centerX) / (info.w * 0.5), -1, 1) * 0.14;
      tipX = -clamp((H / 2 - pointer.y - centerY) / (info.h * 0.5 + 40), -1, 1) * 0.14;
    }
    stepSpring(sliverTilt.x, tipX, dt);
    stepSpring(sliverTilt.y, tipY, dt);
    const wobbleX = Math.sin(time * Math.PI * 2 * 1.0) * 0.03;
    const wobbleY = Math.sin(time * Math.PI * 2 * 0.9 + 1) * 0.04;
    tmpEuler.set(
      -0.08 + wobbleX + sliverTilt.x.value,
      -0.16 + wobbleY + sliverTilt.y.value,
      0,
    );
    sliver.quaternion.setFromEuler(tmpEuler);
    sliver.scale.setScalar(Math.max(sliverScale, 0.0001));
  }

  resize();
  // 처음 들어올 때도 같은 날아오기를 쓴다.
  stateT0 = performance.now() / 1000;
  frameId = requestAnimationFrame(frame);
  if (document.fonts) {
    void document.fonts.ready.then(() => {
      if (!disposed) {
        relayout();
      }
    });
  }

  return {
    update(next) {
      const changedKey = next.needsApiKey !== needsApiKey;
      needsApiKey = next.needsApiKey;
      hoverId = next.hover;
      if (changedKey) {
        relayout();
      } else {
        redrawPage();
      }
    },
    shatter() {
      if (state !== "idle") return;
      const time = performance.now() / 1000;
      setState("out", time);
      sliverPhase = "showing";
      sliverT0 = time + 0.3;
      sliverScale = 0;
    },
    assemble() {
      if (state !== "gone" && state !== "out") return;
      const time = performance.now() / 1000;
      setState("in", time);
      sliverPhase = sliverScale > 0.002 ? "hiding" : "hidden";
      sliverT0 = time;
    },
    setSliverHover(value) {
      sliverHover = value;
    },
    dispose() {
      disposed = true;
      cancelAnimationFrame(frameId);
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onMove);
      document.removeEventListener("mouseleave", onLeave);
      window.removeEventListener("mouseout", onOut);
      window.removeEventListener("resize", resize);
      disposePieces();
      sliverMesh.geometry.dispose();
      sliverMaterial.dispose();
      textMaterial.dispose();
      pageTexture?.dispose();
      envTexture.dispose();
      pmrem.dispose();
      renderer.dispose();
    },
  };
}
