import * as THREE from 'three';
import { mergeGeometries } from 'three/addons/utils/BufferGeometryUtils.js';
const TAU = Math.PI * 2;
function mulberry32(a) {
    return function () {
        a = (a + 0x6d2b79f5) | 0;
        let t = Math.imul(a ^ (a >>> 15), 1 | a);
        t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
        return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
    };
}
function makeNoise2(rand) {
    const perm = new Uint8Array(512);
    const p = Array.from({ length: 256 }, (_, i) => i);
    for (let i = 255; i > 0; i--) {
        const j = (rand() * (i + 1)) | 0;
        const tmp = p[i];
        p[i] = p[j];
        p[j] = tmp;
    }
    for (let i = 0; i < 512; i++)
        perm[i] = p[i & 255];
    const hash = (ix, iy) => perm[(perm[ix & 255] + iy) & 255] / 255;
    const fade = (t) => t * t * (3 - 2 * t);
    return (x, y) => {
        const ix = Math.floor(x), iy = Math.floor(y);
        const fx = x - ix, fy = y - iy;
        const a = hash(ix, iy), b = hash(ix + 1, iy);
        const c = hash(ix, iy + 1), d = hash(ix + 1, iy + 1);
        const u = fade(fx), v = fade(fy);
        return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
    };
}
function angDist(a, b) {
    let d = Math.abs(a - b) % TAU;
    return d > Math.PI ? TAU - d : d;
}
function smoothstep(e0, e1, x) {
    const t = Math.min(1, Math.max(0, (x - e0) / (e1 - e0)));
    return t * t * (3 - 2 * t);
}
const C = {
    barkDark: new THREE.Color(0x584231),
    barkMid: new THREE.Color(0x715638),
    barkLight: new THREE.Color(0x8d6d47),
    charcoal: new THREE.Color(0x2b241d),
    ash: new THREE.Color(0x8f877c),
    woodFresh: new THREE.Color(0xa8885f),
    woodOld: new THREE.Color(0x8a6d4e),
    rot: new THREE.Color(0x5f4c36),
    rock: new THREE.Color(0x5a544c),
    rockDark: new THREE.Color(0x413c35),
};
function colorAttribute(geom, fn) {
    const pos = geom.getAttribute('position');
    const arr = new Float32Array(pos.count * 3);
    const v = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
        v.fromBufferAttribute(pos, i);
        const c = fn(v);
        arr[i * 3] = c.r;
        arr[i * 3 + 1] = c.g;
        arr[i * 3 + 2] = c.b;
    }
    geom.setAttribute('color', new THREE.BufferAttribute(arr, 3));
}
const _tmpColor = new THREE.Color();
function catmullRom(pts, t, out) {
    const n = pts.length - 1;
    const f = Math.min(Math.max(t, 0), 0.99999) * n;
    const i = Math.floor(f);
    const u = f - i;
    const p0 = pts[Math.max(0, i - 1)], p1 = pts[i], p2 = pts[Math.min(n, i + 1)], p3 = pts[Math.min(n, i + 2)];
    const u2 = u * u, u3 = u2 * u;
    out.set(0.5 * ((2 * p1.x) + (-p0.x + p2.x) * u + (2 * p0.x - 5 * p1.x + 4 * p2.x - p3.x) * u2 + (-p0.x + 3 * p1.x - 3 * p2.x + p3.x) * u3), 0.5 * ((2 * p1.y) + (-p0.y + p2.y) * u + (2 * p0.y - 5 * p1.y + 4 * p2.y - p3.y) * u2 + (-p0.y + 3 * p1.y - 3 * p2.y + p3.y) * u3), 0.5 * ((2 * p1.z) + (-p0.z + p2.z) * u + (2 * p0.z - 5 * p1.z + 4 * p2.z - p3.z) * u2 + (-p0.z + 3 * p1.z - 3 * p2.z + p3.z) * u3));
    return out;
}
function makeShard(rand, p0, dir, len, w, bark, wood, woodTip) {
    const d = dir.clone().normalize();
    const up = Math.abs(d.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const u = new THREE.Vector3().crossVectors(d, up).normalize();
    const v = new THREE.Vector3().crossVectors(d, u).normalize();
    const a0 = rand() * TAU;
    const base = [0, 1, 2].map((i) => p0.clone()
        .addScaledVector(u, Math.cos(a0 + (i * TAU) / 3) * w * (0.75 + rand() * 0.5))
        .addScaledVector(v, Math.sin(a0 + (i * TAU) / 3) * w * (0.75 + rand() * 0.5)));
    const tipA = p0.clone().addScaledVector(d, len * (0.85 + rand() * 0.2))
        .addScaledVector(u, (rand() - 0.5) * w * 1.4).addScaledVector(v, (rand() - 0.5) * w * 1.4);
    const tipB = tipA.clone().addScaledVector(d, len * 0.16 * (0.6 + rand() * 0.7))
        .addScaledVector(u, (rand() - 0.5) * w * 0.9);
    const pos = [];
    const col = [];
    const push = (p, c) => { pos.push(p.x, p.y, p.z); col.push(c.r, c.g, c.b); };
    for (let i = 0; i < 3; i++) {
        const j = (i + 1) % 3;
        const b0 = base[i], b1 = base[j];
        const c0 = _tmpColor.copy(bark).lerp(wood, 0.15).clone();
        const c1 = _tmpColor.copy(bark).lerp(wood, 0.35).clone();
        const cT = wood.clone();
        const cT2 = woodTip.clone();
        push(b0, c0);
        push(b1, c1);
        push(tipA, cT);
        push(b1, c1);
        push(tipB, cT2);
        push(tipA, cT);
    }
    for (let i = 0; i < 3; i++) {
        const j = (i + 1) % 3;
        push(base[0], wood.clone());
        push(base[j], wood.clone());
        push(base[i], wood.clone());
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
}
function buildTrunk(rand, noise2, spine, radiusAt, cracks, knots, rings, segs) {
    const count = rings * segs;
    const pos = new Float32Array(count * 3);
    const col = new Float32Array(count * 3);
    const idx = [];
    const P = new THREE.Vector3(), P2 = new THREE.Vector3();
    const tan = new THREE.Vector3(), side = new THREE.Vector3(), bin = new THREE.Vector3();
    const UP = new THREE.Vector3(0, 1, 0);
    const radial = new THREE.Vector3(), vv = new THREE.Vector3();
    const color = new THREE.Color();
    let underside = Infinity;
    for (let i = 0; i < rings; i++) {
        const t = i / (rings - 1);
        catmullRom(spine, t, P);
        catmullRom(spine, Math.min(1, t + 0.01), P2);
        tan.subVectors(P2, P).normalize();
        side.crossVectors(UP, tan);
        if (side.lengthSq() < 1e-6)
            side.set(1, 0, 0);
        side.normalize();
        bin.crossVectors(tan, side).normalize();
        const rBase = radiusAt(t);
        const rMacro = rBase * (1 + (noise2(t * 6.3, 3.7) - 0.5) * 0.22);
        for (let j = 0; j < segs; j++) {
            const a = (j / segs) * TAU;
            radial.copy(side).multiplyScalar(Math.cos(a)).addScaledVector(bin, Math.sin(a));
            const ridge = Math.pow(0.5 + 0.5 * Math.sin(a * 7 + t * 24 + noise2(a * 0.9, t * 7) * 3.2), 1.7);
            const n = (noise2(t * 26, a * 2.4) - 0.5) * 0.045 + (noise2(t * 61, a * 5.1) - 0.5) * 0.02;
            let bump = 0;
            for (const k of knots) {
                const dt = (t - k.t) * 26, da = angDist(a, k.angle) * 1.9;
                bump += k.size * Math.exp(-(dt * dt + da * da));
            }
            let crack = 0, crackDepth = 0;
            for (const c of cracks) {
                if (t < c.t0 || t > c.t1)
                    continue;
                const edge = Math.min(smoothstep(c.t0, c.t0 + 0.07, t), 1 - smoothstep(c.t1 - 0.07, c.t1, t));
                const ang = c.angle + Math.sin(t * 9 + c.wander) * 0.35 + (noise2(t * 14, c.wander) - 0.5) * 0.4;
                const d = angDist(a, ang);
                const v = Math.exp(-((d / c.width) ** 2)) * edge;
                if (v > crack) {
                    crack = v;
                    crackDepth = c.depth;
                }
            }
            let rEff = rMacro + 0.045 * ridge + bump - crackDepth * crack + n;
            rEff = Math.max(rEff, rMacro * 0.5);
            vv.copy(P).addScaledVector(radial, rEff);
            const k = smoothstep(0.84, 1.0, t);
            if (k > 0)
                vv.y = vv.y * (1 - 0.88 * k) + 0.02 * k;
            const vi = i * segs + j;
            pos[vi * 3] = vv.x;
            pos[vi * 3 + 1] = vv.y;
            pos[vi * 3 + 2] = vv.z;
            if (Math.abs(vv.x) < 0.4)
                underside = Math.min(underside, vv.y);
            const barkMix = noise2(t * 9, a * 1.6);
            color.copy(C.barkDark).lerp(C.barkMid, barkMix).lerp(C.barkLight, Math.max(0, barkMix - 0.55) * 1.6);
            const charF = smoothstep(0.66, 0.84, noise2(t * 4.4 + 9.1, a * 2.2 + 3.3));
            color.lerp(C.charcoal, charF * 0.6);
            const upness = Math.max(0, radial.y);
            const ashF = smoothstep(0.45, 0.85, noise2(t * 13 + 4.4, a * 3.1)) * upness;
            color.lerp(C.ash, ashF * 0.42);
            color.lerp(C.woodOld, Math.min(1, crack * 1.25));
            col[vi * 3] = color.r;
            col[vi * 3 + 1] = color.g;
            col[vi * 3 + 2] = color.b;
        }
    }
    for (let i = 0; i < rings - 1; i++) {
        for (let j = 0; j < segs; j++) {
            const j1 = (j + 1) % segs;
            const a = i * segs + j, b = i * segs + j1, c = (i + 1) * segs + j, d = (i + 1) * segs + j1;
            idx.push(a, c, b, b, c, d);
        }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(idx);
    return { geometry: g.toNonIndexed(), undersideAtCenter: underside };
}
function buildBreakCap(rand, noise2, center, axis, radius, points) {
    const d = axis.clone().normalize();
    const up = Math.abs(d.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const u = new THREE.Vector3().crossVectors(d, up).normalize();
    const v = new THREE.Vector3().crossVectors(d, u).normalize();
    const outer = [];
    const inner = [];
    const phase = rand() * TAU;
    for (let i = 0; i < points; i++) {
        const a = (i / points) * TAU;
        const r0 = radius * (0.92 + noise2(Math.cos(a) * 2 + 5, Math.sin(a) * 2) * 0.35);
        const r1 = radius * (0.42 + noise2(Math.cos(a) * 3 + 11, Math.sin(a) * 3) * 0.28);
        const sag = (noise2(i * 1.7, phase) - 0.5) * radius * 0.9;
        outer.push(center.clone()
            .addScaledVector(u, Math.cos(a + phase * 0.1) * r0)
            .addScaledVector(v, Math.sin(a + phase * 0.1) * r0)
            .addScaledVector(d, (noise2(i * 2.3, 8.8) - 0.65) * radius * 0.55));
        inner.push(center.clone()
            .addScaledVector(u, Math.cos(a + phase * 0.1 + 0.25) * r1)
            .addScaledVector(v, Math.sin(a + phase * 0.1 + 0.25) * r1)
            .addScaledVector(d, sag - radius * 0.12));
    }
    const mid = center.clone().addScaledVector(d, -radius * (0.35 + rand() * 0.3));
    const pos = [];
    const col = [];
    const push = (p, c) => { pos.push(p.x, p.y, p.z); col.push(c.r, c.g, c.b); };
    for (let i = 0; i < points; i++) {
        const j = (i + 1) % points;
        const cIn = _tmpColor.copy(C.woodOld).lerp(C.woodFresh, noise2(i * 3.1, 1.2)).clone();
        const cOut = C.barkDark.clone();
        push(outer[i], cOut);
        push(outer[j], cOut);
        push(inner[i], cIn);
        push(outer[j], cOut);
        push(inner[j], _tmpColor.copy(C.woodOld).lerp(C.woodFresh, noise2(j * 3.1, 1.2)).clone());
        push(inner[i], cIn);
        push(inner[i], cIn);
        push(inner[j], _tmpColor.copy(C.woodOld).lerp(C.rot, noise2(j * 5.7, 2.2)).clone());
        push(mid, C.rot.clone());
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.Float32BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.Float32BufferAttribute(col, 3));
    return g;
}
function buildStump(rand, noise2, center, radius, height, segs, rings) {
    const pos = new Float32Array((rings * segs + 1) * 3);
    const col = new Float32Array((rings * segs + 1) * 3);
    const idx = [];
    const color = new THREE.Color();
    const lean = new THREE.Vector3((rand() - 0.5) * 0.35, 1, (rand() - 0.5) * 0.35).normalize();
    for (let i = 0; i < rings; i++) {
        const t = i / (rings - 1);
        for (let j = 0; j < segs; j++) {
            const a = (j / segs) * TAU;
            const r = radius * (1 + (noise2(Math.cos(a) * 1.5 + 7, Math.sin(a) * 1.5) - 0.5) * 0.35) * (1 - t * 0.15);
            const h = t * height * (0.55 + noise2(j * 1.31, t * 4.4) * 0.75);
            const vi = i * segs + j;
            pos[vi * 3] = center.x + Math.cos(a) * r + lean.x * h;
            pos[vi * 3 + 1] = h;
            pos[vi * 3 + 2] = center.z + Math.sin(a) * r + lean.z * h;
            const m = noise2(j * 0.8, t * 5.5);
            color.copy(C.barkDark).lerp(C.barkMid, m * 0.55);
            if (noise2(j * 2.2 + 3, t * 3 + 8) > 0.55)
                color.lerp(C.charcoal, 0.7);
            if (t > 0.8)
                color.lerp(C.rot, (t - 0.8) * 3.0);
            col[vi * 3] = color.r;
            col[vi * 3 + 1] = color.g;
            col[vi * 3 + 2] = color.b;
        }
    }
    for (let i = 0; i < rings - 1; i++) {
        for (let j = 0; j < segs; j++) {
            const j1 = (j + 1) % segs;
            const a = i * segs + j, b = i * segs + j1, c = (i + 1) * segs + j, d = (i + 1) * segs + j1;
            idx.push(a, c, b, b, c, d);
        }
    }
    const baseCenter = rings * segs;
    pos[baseCenter * 3] = center.x;
    pos[baseCenter * 3 + 1] = 0.0;
    pos[baseCenter * 3 + 2] = center.z;
    col[baseCenter * 3] = C.barkDark.r;
    col[baseCenter * 3 + 1] = C.barkDark.g;
    col[baseCenter * 3 + 2] = C.barkDark.b;
    for (let j = 0; j < segs; j++) {
        idx.push(baseCenter, (j + 1) % segs, j);
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(idx);
    return g.toNonIndexed();
}
function buildBranchStub(rand, base, dir, len, r0) {
    const segs = 5, rings = 4;
    const d = dir.clone().normalize();
    const up = Math.abs(d.y) > 0.9 ? new THREE.Vector3(1, 0, 0) : new THREE.Vector3(0, 1, 0);
    const u = new THREE.Vector3().crossVectors(d, up).normalize();
    const v = new THREE.Vector3().crossVectors(d, u).normalize();
    const bendAxis = u.clone().multiplyScalar(rand() - 0.5).addScaledVector(v, rand() - 0.5).normalize();
    const pos = new Float32Array(rings * segs * 3);
    const col = new Float32Array(rings * segs * 3);
    const idx = [];
    const color = new THREE.Color();
    const p = new THREE.Vector3(), rad = new THREE.Vector3();
    for (let i = 0; i < rings; i++) {
        const t = i / (rings - 1);
        p.copy(base).addScaledVector(d, len * t).addScaledVector(bendAxis, Math.sin(t * Math.PI) * len * 0.18);
        const r = r0 * (1 - t * 0.75);
        for (let j = 0; j < segs; j++) {
            const a = (j / segs) * TAU;
            rad.copy(u).multiplyScalar(Math.cos(a)).addScaledVector(v, Math.sin(a));
            const vi = i * segs + j;
            pos[vi * 3] = p.x + rad.x * r;
            pos[vi * 3 + 1] = p.y + rad.y * r;
            pos[vi * 3 + 2] = p.z + rad.z * r;
            color.copy(C.barkDark).lerp(C.barkMid, noiseStub(i * 3 + j));
            if (i === rings - 1)
                color.lerp(C.woodOld, 0.8);
            col[vi * 3] = color.r;
            col[vi * 3 + 1] = color.g;
            col[vi * 3 + 2] = color.b;
        }
    }
    function noiseStub(x) { return 0.5 + 0.5 * Math.sin(x * 12.9898); }
    for (let i = 0; i < rings - 1; i++) {
        for (let j = 0; j < segs; j++) {
            const j1 = (j + 1) % segs;
            const a = i * segs + j, b = i * segs + j1, c = (i + 1) * segs + j, dd = (i + 1) * segs + j1;
            idx.push(a, c, b, b, c, dd);
        }
    }
    const g = new THREE.BufferGeometry();
    g.setAttribute('position', new THREE.BufferAttribute(pos, 3));
    g.setAttribute('color', new THREE.BufferAttribute(col, 3));
    g.setIndex(idx);
    return g.toNonIndexed();
}
function buildRock(rand, r) {
    const g = new THREE.IcosahedronGeometry(r, 1).toNonIndexed();
    const posA = g.getAttribute('position');
    const v = new THREE.Vector3();
    for (let i = 0; i < posA.count; i++) {
        v.fromBufferAttribute(posA, i);
        const s = 1 + (Math.sin(v.x * 12.9 + v.y * 7.7) * Math.cos(v.z * 9.3 + v.x * 3.1)) * 0.28;
        v.multiplyScalar(s);
        posA.setXYZ(i, v.x, v.y * 0.72, v.z);
    }
    g.computeVertexNormals();
    colorAttribute(g, (p) => _tmpColor.copy(C.rock).lerp(C.rockDark, 0.5 + 0.5 * Math.sin(p.x * 5 + p.z * 7)).clone());
    return g;
}
export function createFallenPineObstacle(options = {}) {
    const seed = options.seed ?? 1;
    const L = options.length ?? 8.4;
    const clearanceTarget = options.clearance ?? 1.0;
    const rand = mulberry32((seed * 2654435761) >>> 0);
    const noise2 = makeNoise2(mulberry32((seed ^ 0x9e3779b9) >>> 0));

    // Visible silhouettes: sparse, forked, swept, thick, branchy and bare.
    // The seed controls unique details within each silhouette.
    const profiles = [
      {name:'splintered', thickness:.86, bend:.03, lift:.02, branches:2, branchSize:.65, crown:9},
      {name:'forked', thickness:1.03, bend:-.20, lift:.05, branches:7, branchSize:1.55, crown:5},
      {name:'swept', thickness:.93, bend:.32, lift:-.02, branches:5, branchSize:1.05, crown:7},
      {name:'massive', thickness:1.23, bend:-.28, lift:.12, branches:3, branchSize:.90, crown:4},
      {name:'branchy', thickness:.97, bend:.17, lift:0, branches:9, branchSize:1.70, crown:7},
      {name:'stripped', thickness:1.11, bend:-.09, lift:.07, branches:1, branchSize:1.10, crown:3},
    ];
    const profileIndex = ((Number.isInteger(options.profile) ? options.profile : seed) % profiles.length + profiles.length) % profiles.length;
    const profile = profiles[profileIndex];
    const group = new THREE.Group();
    group.name = 'fallen-pine-obstacle';
    const lift = clearanceTarget - 0.35;
    const spine = [
        new THREE.Vector3(-L * 0.52, 1.02 + lift * 0.3, -0.18),
        new THREE.Vector3(-L * 0.30, 1.12 + lift * 0.6 + profile.lift * .5, 0.06 + profile.bend * .55),
        new THREE.Vector3(0.02, 0.72 + lift + profile.lift, 0.26 + profile.bend),
        new THREE.Vector3(L * 0.28, 0.66 + lift * 0.8 + profile.lift * .6, 0.14 + profile.bend * .55),
        new THREE.Vector3(L * 0.44, 0.50, -0.06),
        new THREE.Vector3(L * 0.51, 0.30, -0.20),
    ];
    const rMid = (0.275 + rand() * 0.075) * profile.thickness;
    const rButt = rMid * (1.35 + rand() * 0.15);
    const rTip = 0.07 + rand() * 0.04;
    const radiusAt = (t) => {
        const taper = Math.pow(1 - t, 0.85);
        let r = rTip + (rButt - rTip) * taper;
        r = Math.min(r, rMid * (1 + smoothstep(0.16, 0.0, t) * (rButt / rMid - 1)));
        return r;
    };
    const cracks = [];
    const nCracks = 4 + Math.floor(rand() * 3);
    for (let i = 0; i < nCracks; i++) {
        cracks.push({
            angle: rand() * TAU,
            wander: rand() * 20,
            width: 0.06 + rand() * 0.05,
            depth: 0.06 + rand() * 0.06,
            t0: rand() * 0.25,
            t1: 0.55 + rand() * 0.45,
        });
    }
    const knots = [];
    const nKnots = 2 + Math.floor(rand() * 2);
    for (let i = 0; i < nKnots; i++) {
        knots.push({ t: 0.12 + rand() * 0.72, angle: rand() * TAU, size: 0.03 + rand() * 0.035 });
    }
    const woodParts = [];
    const trunk = buildTrunk(rand, noise2, spine, radiusAt, cracks, knots, 60, 16);
    woodParts.push(trunk.geometry);
    const underside = trunk.undersideAtCenter;
    const P0 = new THREE.Vector3(), PT = new THREE.Vector3();
    catmullRom(spine, 0, P0);
    catmullRom(spine, 1, PT);
    const tan0 = new THREE.Vector3(), tanT = new THREE.Vector3();
    catmullRom(spine, 0.012, tan0).sub(P0).normalize();
    catmullRom(spine, 0.988, tanT).sub(PT).normalize().negate();
    woodParts.push(buildBreakCap(rand, noise2, P0, tan0.clone().negate(), rButt * 0.97, 9));
    woodParts.push(buildBreakCap(rand, noise2, PT, tanT, rTip * 1.6 + 0.06, 8));
    const crownBase = P0.clone();
    const nCrown = profile.crown + Math.floor(rand() * 2);
    for (let i = 0; i < nCrown; i++) {
        const a = rand() * TAU;
        const dir = new THREE.Vector3(Math.cos(a) * 0.3 + tan0.x * 0.3, 1.0 + rand() * 0.5, Math.sin(a) * 0.3 + tan0.z * 0.3).normalize();
        const bp = crownBase.clone().add(new THREE.Vector3(Math.cos(a) * rButt * 0.5, (rand() - 0.3) * rButt * 0.35, Math.sin(a) * rButt * 0.5));
        woodParts.push(makeShard(rand, bp, dir, 0.32 + rand() * 0.5, 0.045 + rand() * 0.045, C.barkDark, C.woodOld, C.rot));
    }
    for (let i = 0; i < 3 + Math.floor(rand() * 2); i++) {
        const a = rand() * TAU;
        const dir = new THREE.Vector3(Math.cos(a) * 0.5, 0.3 + rand() * 0.5, Math.sin(a) * 0.5).normalize();
        const bp = PT.clone().add(new THREE.Vector3(Math.cos(a) * 0.05, 0.02, Math.sin(a) * 0.05));
        woodParts.push(makeShard(rand, bp, dir, 0.14 + rand() * 0.2, 0.035 + rand() * 0.03, C.barkDark, C.woodOld, C.woodFresh));
    }
    const branchTs = Array.from({length:profile.branches},(_,i)=>
      0.15 + ((i + .3 + rand()*.4)/profile.branches)*.66);
    for(const bt of branchTs){
      catmullRom(spine,bt,P0);
      // All stubs grow above the trunk; keep the slide corridor unobstructed.
      const dir=new THREE.Vector3((rand()-.5)*1.4,.95+rand()*.5,(rand()-.5)*1.35).normalize();
      const rHere=radiusAt(bt);
      const base=P0.clone().addScaledVector(dir,rHere*.8);
      const len=(.40+rand()*.45)*profile.branchSize;
      woodParts.push(buildBranchStub(rand,base,dir,len,.05+rand()*.035));
      woodParts.push(makeShard(rand,base.clone().addScaledVector(dir,len),
        dir.clone().add(new THREE.Vector3((rand()-.5)*.6,rand()*.4,(rand()-.5)*.6)).normalize(),
        .12+rand()*.14,.028,C.barkDark,C.woodOld,C.woodFresh));
    }
    const stumpCenter = new THREE.Vector3(spine[0].x - 0.28, 0, spine[0].z - 0.12);
    woodParts.push(buildStump(rand, noise2, stumpCenter, rButt * 1.15, 0.85 + rand() * 0.35, 12, 5));
    for (let i = 0; i < 4; i++) {
        const a = (i / 4) * TAU + rand() * 0.8;
        const bp = new THREE.Vector3(stumpCenter.x + Math.cos(a) * rButt * 0.8, 0.72 + rand() * 0.3, stumpCenter.z + Math.sin(a) * rButt * 0.8);
        const dir = new THREE.Vector3(Math.cos(a) * 0.5, 1, Math.sin(a) * 0.5).normalize();
        woodParts.push(makeShard(rand, bp, dir, 0.3 + rand() * 0.4, 0.06 + rand() * 0.05, C.barkDark, C.woodOld, C.woodFresh));
    }
    for (let i = 0; i < 22; i++) {
        const side = rand() < 0.5 ? -1 : 1;
        const x = side * (3.3 + rand() * 1.6);
        const z = (rand() - 0.5) * 3.4;
        const s = 0.05 + rand() * 0.12;
        const chip = new THREE.TetrahedronGeometry(s, 0).toNonIndexed();
        chip.deleteAttribute('normal');
        chip.deleteAttribute('uv');
        chip.scale(1, 0.45, 1.6);
        chip.rotateY(rand() * TAU);
        chip.rotateZ((rand() - 0.5) * 0.4);
        chip.translate(x, s * 0.3, z);
        colorAttribute(chip, () => (rand() < 0.5 ? C.woodOld : C.charcoal));
        woodParts.push(chip);
    }
    const woodGeom = mergeGeometries(woodParts, false);
    woodGeom.computeVertexNormals();
    const woodMat = new THREE.MeshStandardMaterial({
        vertexColors: true, roughness: 0.94, metalness: 0.0, flatShading: true,
    });
    const woodMesh = new THREE.Mesh(woodGeom, woodMat);
    woodMesh.castShadow = true;
    woodMesh.receiveShadow = true;
    group.add(woodMesh);
    const rockParts = [];
    const rockSpots = [
        new THREE.Vector3(spine[5].x - 0.25, 0.1, spine[5].z + 0.3),
        new THREE.Vector3(spine[5].x + 0.45, 0.06, spine[5].z - 0.25),
        new THREE.Vector3(stumpCenter.x + 0.7, 0.08, stumpCenter.z + 0.55),
        new THREE.Vector3(stumpCenter.x - 0.5, 0.05, stumpCenter.z - 0.4),
        new THREE.Vector3(-3.6, 0.06, 1.4 + rand()),
    ];
    for (const s of rockSpots) {
        const r = 0.16 + rand() * 0.22;
        const rock = buildRock(rand, r);
        rock.rotateY(rand() * TAU);
        rock.translate(s.x, r * 0.35, s.z);
        rockParts.push(rock);
    }
    const rockGeom = mergeGeometries(rockParts, false);
    const rockMat = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 1, metalness: 0, flatShading: true });
    const rockMesh = new THREE.Mesh(rockGeom, rockMat);
    rockMesh.castShadow = true;
    rockMesh.receiveShadow = true;
    group.add(rockMesh);
    group.userData = {
        seed,
        profile: profileIndex,
        silhouette: profile.name,
        branchCount: profile.branches,
        length: L,
        clearance: Number(underside.toFixed(3)),
        trunkMidDiameter: Number((rMid * 2).toFixed(3)),
        triangles: woodGeom.getAttribute('position').count / 3 + rockGeom.getAttribute('position').count / 3,
    };
    return group;
}
