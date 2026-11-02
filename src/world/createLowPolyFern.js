// Adapted from the Google AI Studio procedural fern source supplied by the project owner.
import * as THREE from 'three';
/**
* Deterministic pseudo-random number generator (Mulberry32).
*/
export class PRNG {
	constructor(seed = 1337) {
		this.s = Math.floor(seed) >>> 0;
		if (this.s === 0) this.s = 1;
	}
	/** Returns float [0, 1) */
	next() {
		let t = this.s += 1831565813;
		t = Math.imul(t ^ t >>> 15, t | 1);
		t ^= t + Math.imul(t ^ t >>> 7, t | 61);
		return ((t ^ t >>> 14) >>> 0) / 4294967296;
	}
	/** Returns float [min, max) */
	range(min, max) {
		return min + this.next() * (max - min);
	}
	/** Returns integer [min, max] */
	rangeInt(min, max) {
		return Math.floor(this.range(min, max + 1));
	}
	/** Pick random item from array */
	pick(arr) {
		return arr[Math.floor(this.next() * arr.length)];
	}
}
/**
* Color palette configuration for Knotty Pine environment.
* Deep coniferous greens, muted olives, weathered ochres, volcanic ash undertones.
*/
export const FERN_PALETTES = {
	lush: {
		stemBase: new THREE.Color("#1B2215"),
		stemTip: new THREE.Color("#25381E"),
		leafBase: new THREE.Color("#112414"),
		leafMid: new THREE.Color("#1A3B1E"),
		leafTip: new THREE.Color("#2D5428"),
		underside: new THREE.Color("#0E1D11"),
		accent: new THREE.Color("#3A6332")
	},
	young: {
		stemBase: new THREE.Color("#232B18"),
		stemTip: new THREE.Color("#314A22"),
		leafBase: new THREE.Color("#173119"),
		leafMid: new THREE.Color("#274E24"),
		leafTip: new THREE.Color("#416E31"),
		underside: new THREE.Color("#132515"),
		accent: new THREE.Color("#55873E")
	},
	withered: {
		stemBase: new THREE.Color("#221711"),
		stemTip: new THREE.Color("#33251A"),
		leafBase: new THREE.Color("#262816"),
		leafMid: new THREE.Color("#3A381E"),
		leafTip: new THREE.Color("#6B4B21"),
		underside: new THREE.Color("#1B1810"),
		accent: new THREE.Color("#7E5528")
	}
};
/**
* Procedural low-poly geometry builder holding vertices, normals, and colors.
*/
class GeometryBuilder {
	constructor() {
		this.positions = [];
		this.normals = [];
		this.colors = [];
		this.uvs = [];
		this.windFactors = [];
	}
	/**
	* Adds a triangle with flat faceted normal calculated directly.
	*/
	addTriangle(p1, p2, p3, c1, c2, c3, w1 = 0, w2 = 0, w3 = 0) {
		// Compute faceted face normal
		const vA = new THREE.Vector3().subVectors(p2, p1);
		const vB = new THREE.Vector3().subVectors(p3, p1);
		const normal = new THREE.Vector3().crossVectors(vA, vB).normalize();
		this.positions.push(p1.x, p1.y, p1.z, p2.x, p2.y, p2.z, p3.x, p3.y, p3.z);
		this.normals.push(normal.x, normal.y, normal.z, normal.x, normal.y, normal.z, normal.x, normal.y, normal.z);
		this.colors.push(c1.r, c1.g, c1.b, c2.r, c2.g, c2.b, c3.r, c3.g, c3.b);
		this.uvs.push(0, 0, 1, 0, .5, 1);
		this.windFactors.push(w1, w2, w3);
	}
	/**
	* Adds a quad (2 faceted triangles).
	*/
	addQuad(p1, p2, p3, p4, c1, c2, c3, c4, w1 = 0, w2 = 0, w3 = 0, w4 = 0) {
		this.addTriangle(p1, p2, p3, c1, c2, c3, w1, w2, w3);
		this.addTriangle(p1, p3, p4, c1, c3, c4, w1, w3, w4);
	}
	/**
	* Builds and returns a clean Three.js BufferGeometry.
	*/
	toBufferGeometry() {
		const geom = new THREE.BufferGeometry();
		geom.setAttribute("position", new THREE.Float32BufferAttribute(this.positions, 3));
		geom.setAttribute("normal", new THREE.Float32BufferAttribute(this.normals, 3));
		geom.setAttribute("color", new THREE.Float32BufferAttribute(this.colors, 3));
		geom.setAttribute("uv", new THREE.Float32BufferAttribute(this.uvs, 2));
		geom.setAttribute("windFactor", new THREE.Float32BufferAttribute(this.windFactors, 1));
		geom.computeBoundingBox();
		geom.computeBoundingSphere();
		return geom;
	}
}
/**
* Samples a 3D curved point along a fern frond's spine at parameter t in [0, 1].
*/
function sampleSpine(t, config) {
	const { angle, pitch, length, archStrength, droopStrength, lateralCurl, twist } = config;
	// Primary direction vector on ground
	const dirX = Math.cos(angle);
	const dirZ = Math.sin(angle);
	// Perpendicular horizontal right vector
	const rightX = -Math.sin(angle);
	const rightZ = Math.cos(angle);
	// Natural parabolic arch: rises up from base, peaks around t=0.45, then gracefully drops
	const arch = Math.sin(t * Math.PI) * archStrength * length;
	// Downward tip droop: quadratic falloff toward the ground at higher t
	const droop = Math.pow(Math.max(0, t - .25) / .75, 2.2) * droopStrength * length;
	// Lateral S-curve or slight wind twist
	const lateral = Math.sin(t * Math.PI * 1.2) * lateralCurl * length;
	// Forward progression along the pitch angle
	const forwardDist = t * length * Math.cos(pitch);
	const pitchHeight = t * length * Math.sin(pitch);
	const posX = dirX * forwardDist + rightX * lateral;
	const posY = Math.max(0, pitchHeight + arch - droop);
	const posZ = dirZ * forwardDist + rightZ * lateral;
	const pos = new THREE.Vector3(posX, posY, posZ);
	// Approximate numerical tangent using small delta
	const dt = .01;
	const tNext = t >= 1 ? t - dt : Math.min(1, t + dt);
	const forwardNext = tNext * length * Math.cos(pitch);
	const pitchHeightNext = tNext * length * Math.sin(pitch);
	const archNext = Math.sin(tNext * Math.PI) * archStrength * length;
	const droopNext = Math.pow(Math.max(0, tNext - .25) / .75, 2.2) * droopStrength * length;
	const lateralNext = Math.sin(tNext * Math.PI * 1.2) * lateralCurl * length;
	const nextPos = new THREE.Vector3(dirX * forwardNext + rightX * lateralNext, Math.max(0, pitchHeightNext + archNext - droopNext), dirZ * forwardNext + rightZ * lateralNext);
	const tangent = new THREE.Vector3().subVectors(t >= 1 ? pos : nextPos, t >= 1 ? nextPos : pos).normalize();
	// Establish local coordinate frame along spine with twist
	const worldUp = new THREE.Vector3(0, 1, 0);
	let right = new THREE.Vector3().crossVectors(tangent, worldUp).normalize();
	if (right.lengthSq() < 1e-4) {
		right = new THREE.Vector3(1, 0, 0);
	}
	const up = new THREE.Vector3().crossVectors(right, tangent).normalize();
	// Apply axial twist along the spine
	if (Math.abs(twist) > .001) {
		const twistAngle = t * twist;
		right.applyAxisAngle(tangent, twistAngle);
		up.applyAxisAngle(tangent, twistAngle);
	}
	return {
		pos,
		tangent,
		up,
		right
	};
}
/**
* Builds the faceted stem (rachis) for a single frond.
*/
function buildFrondStem(builder, config, variant, palette, rng) {
	const segments = 10;
	const baseRadius = .024 * (config.length / 1);
	const tipRadius = .005;
	const ringPoints = [];
	const ringColors = [];
	const ringWinds = [];
	for (let i = 0; i <= segments; i++) {
		const t = i / segments;
		const { pos, up, right } = sampleSpine(t, config);
		const radius = THREE.MathUtils.lerp(baseRadius, tipRadius, Math.pow(t, .7));
		// Color gradient along the stem
		const stemColor = palette.stemBase.clone().lerp(palette.stemTip, t);
		// Slight low-poly noise variation
		stemColor.offsetHSL(rng.range(-.02, .02), rng.range(-.03, .03), rng.range(-.03, .02));
		// 4-sided diamond / faceted lozenge cross section (crisp low-poly edges)
		const points = [
			pos.clone().addScaledVector(up, radius * 1.1),
			pos.clone().addScaledVector(right, radius * .9),
			pos.clone().addScaledVector(up, -radius * .7),
			pos.clone().addScaledVector(right, -radius * .9)
		];
		ringPoints.push(points);
		ringColors.push([
			stemColor,
			stemColor,
			stemColor,
			stemColor
		]);
		ringWinds.push([
			t,
			t,
			t,
			t
		]);
	}
	// Connect rings with quads
	for (let i = 0; i < segments; i++) {
		const cur = ringPoints[i];
		const nxt = ringPoints[i + 1];
		const curC = ringColors[i];
		const nxtC = ringColors[i + 1];
		const curW = ringWinds[i];
		const nxtW = ringWinds[i + 1];
		for (let s = 0; s < 4; s++) {
			const nextS = (s + 1) % 4;
			builder.addQuad(cur[s], nxt[s], nxt[nextS], cur[nextS], curC[s], nxtC[s], nxtC[nextS], curC[nextS], curW[s], nxtW[s], nxtW[nextS], curW[nextS]);
		}
	}
	// Stem end cap
	const lastRing = ringPoints[segments];
	const lastColor = ringColors[segments][0];
	const lastWind = ringWinds[segments][0];
	builder.addQuad(lastRing[0], lastRing[1], lastRing[2], lastRing[3], lastColor, lastColor, lastColor, lastColor, lastWind, lastWind, lastWind, lastWind);
}
/**
* Builds the faceted 3D leaflets (pinnae) along a frond.
*/
function buildFrondPinnae(builder, config, variant, palette, rng) {
	const { leafCount, width, isBroken } = config;
	const startT = .14;
	const endT = isBroken ? .72 : .97;
	for (let pairIdx = 0; pairIdx < leafCount; pairIdx++) {
		const pairRatio = pairIdx / (leafCount - 1);
		const t = THREE.MathUtils.lerp(startT, endT, pairRatio);
		// Natural fern profile: pinnae length starts small, reaches max around t=0.38-0.45, then tapers to tip
		let lengthFactor;
		if (t < .4) {
			lengthFactor = Math.sin(t / .4 * (Math.PI * .5));
		} else {
			lengthFactor = Math.cos((t - .4) / .6 * (Math.PI * .5));
		}
		lengthFactor = Math.max(.12, Math.pow(lengthFactor, .85));
		// Withered variant random dropout (missing leaflets)
		if (variant === "withered" && rng.next() < .18) {
			continue;
		}
		const { pos, tangent, up, right } = sampleSpine(t, config);
		// Forward sweep angle: leaflets point toward the frond tip at ~60-72 degrees
		const forwardSweep = rng.range(.55, .7);
		// Subtle V-angle tilt: leaflets point slightly upward, creating rich 3D depth
		const vTilt = rng.range(.18, .32);
		// Both sides: Left (-1) and Right (+1)
		const sides = [-1, 1];
		for (const side of sides) {
			// Withered side-specific missing leaf
			if (variant === "withered" && rng.next() < .15) {
				continue;
			}
			// Slight natural asymmetry between left and right
			const sideJitter = rng.range(.92, 1.08);
			const leafLength = width * lengthFactor * sideJitter;
			const leafWidthBase = leafLength * rng.range(.24, .32);
			// Construct directional vectors for this pinna
			const pinnaOut = right.clone().multiplyScalar(side);
			const pinnaDir = new THREE.Vector3().addScaledVector(pinnaOut, 1).addScaledVector(tangent, forwardSweep).addScaledVector(up, vTilt).normalize();
			// Pinna right (perpendicular to direction, for leaflet width)
			const pinnaPerp = new THREE.Vector3().crossVectors(pinnaDir, up).normalize();
			// Slightly curl the leaflet downward toward its own tip for organic curve
			const tipDroopAmount = leafLength * rng.range(.15, .3);
			const tipPos = pos.clone().addScaledVector(pinnaDir, leafLength).addScaledVector(up, -tipDroopAmount);
			// Mid-point ridge along the leaflet
			const midT = .45;
			const midPos = pos.clone().addScaledVector(pinnaDir, leafLength * midT).addScaledVector(up, leafWidthBase * .28);
			// Lateral wings (creating the 3D faceted low-poly prism)
			const leftWing = midPos.clone().addScaledVector(pinnaPerp, -leafWidthBase * .5).addScaledVector(up, -leafWidthBase * .15);
			const rightWing = midPos.clone().addScaledVector(pinnaPerp, leafWidthBase * .5).addScaledVector(up, -leafWidthBase * .15);
			// Base connection vertices at the rachis
			const baseStemOffset = .008;
			const basePos = pos.clone().addScaledVector(pinnaOut, baseStemOffset);
			// Coloring:
			// Leaf base: dark coniferous green
			// Leaf mid: rich forest green
			// Leaf tip: light highlight or scorched ochre
			const leafBaseCol = palette.leafBase.clone().lerp(palette.leafMid, t * .5);
			const leafMidCol = palette.leafMid.clone();
			const leafTipCol = palette.leafTip.clone();
			if (variant === "withered") {
				// Scorched or brown tips
				if (rng.next() < .65) {
					leafTipCol.lerp(palette.accent, rng.range(.5, 1));
				}
			} else if (variant === "young") {
				// Bright youthful tips
				leafTipCol.lerp(palette.accent, rng.range(.2, .5));
			}
			// Wind sway factor
			const wBase = t;
			const wMid = t + .1;
			const wTip = Math.min(1, t + .25);
			// ==========================================
			// GEOMETRY CONSTRUCTION:
			// 3D Faceted Pinna (2 facets on base half, 2 facets on tip half + underside)
			// This guarantees crisp specular reflection transitions across faceted low-poly edges!
			// ==========================================
			// Top Base-Left facet
			builder.addTriangle(basePos, midPos, leftWing, leafBaseCol, leafMidCol, leafMidCol, wBase, wMid, wMid);
			// Top Base-Right facet
			builder.addTriangle(basePos, rightWing, midPos, leafBaseCol, leafMidCol, leafMidCol, wBase, wMid, wMid);
			// Top Tip-Left facet
			builder.addTriangle(midPos, tipPos, leftWing, leafMidCol, leafTipCol, leafMidCol, wMid, wTip, wMid);
			// Top Tip-Right facet
			builder.addTriangle(midPos, rightWing, tipPos, leafMidCol, leafMidCol, leafTipCol, wMid, wMid, wTip);
			// Underside facets (to prevent invisible underside when looking up from ground!)
			const underCol = palette.underside.clone();
			builder.addTriangle(basePos, leftWing, midPos, underCol, underCol, underCol, wBase, wMid, wMid);
			builder.addTriangle(basePos, midPos, rightWing, underCol, underCol, underCol, wBase, wMid, wMid);
			builder.addTriangle(midPos, leftWing, tipPos, underCol, underCol, underCol, wMid, wMid, wTip);
			builder.addTriangle(midPos, tipPos, rightWing, underCol, underCol, underCol, wMid, wTip, wMid);
			// For larger basal pinnae in Lush variant, add secondary sub-lobes (pinnules)
			// for handcrafted professional silhouette!
			if (variant === "lush" && pairIdx > 2 && pairIdx < leafCount - 4 && rng.next() < .6) {
				const subLength = leafLength * .28;
				const subDir = pinnaDir.clone().applyAxisAngle(up, side * .45).normalize();
				const subTip = midPos.clone().addScaledVector(subDir, subLength).addScaledVector(up, -.01);
				const subSideWing = midPos.clone().addScaledVector(pinnaPerp, side * leafWidthBase * .25);
				builder.addTriangle(midPos, subTip, subSideWing, leafMidCol, leafTipCol, leafMidCol, wMid, wMid + .05, wMid);
				builder.addTriangle(midPos, subSideWing, subTip, underCol, underCol, underCol, wMid, wMid, wMid + .05);
			}
		}
	}
	// Apex tip leaflet
	if (!isBroken) {
		const { pos, tangent, up } = sampleSpine(1, config);
		const tipLength = width * .22;
		const apexTip = pos.clone().addScaledVector(tangent, tipLength).addScaledVector(up, -.01);
		const apexLeft = pos.clone().addScaledVector(tangent, tipLength * .3).addScaledVector(up, .005);
		const col = palette.leafTip;
		builder.addTriangle(pos, apexTip, apexLeft, col, col, col, 1, 1, 1);
		builder.addTriangle(pos, apexLeft, apexTip, palette.underside, palette.underside, palette.underside, 1, 1, 1);
	}
}
/**
* Builds young unfurling fiddlehead (crozier) in the center of the young fern.
*/
function buildFiddlehead(builder, config, palette, rng) {
	const steps = 14;
	const length = config.length * .55;
	const basePos = new THREE.Vector3(0, 0, 0);
	const dirX = Math.cos(config.angle);
	const dirZ = Math.sin(config.angle);
	const points = [];
	const spiralRadius = .08;
	for (let i = 0; i <= steps; i++) {
		const t = i / steps;
		if (t < .6) {
			// Upright stem section
			const y = t * length * 1.3;
			const x = dirX * t * .1;
			const z = dirZ * t * .1;
			points.push(new THREE.Vector3(x, y, z));
		} else {
			// Inward curl spiral
			const spiralT = (t - .6) / .4;
			const curlAngle = spiralT * Math.PI * 2.8;
			const r = spiralRadius * (1 - spiralT * .5);
			const stemY = .6 * length * 1.3;
			const x = dirX * (.6 * .1 + Math.sin(curlAngle) * r);
			const y = stemY + Math.cos(curlAngle) * r;
			const z = dirZ * (.6 * .1 + Math.sin(curlAngle) * r);
			points.push(new THREE.Vector3(x, y, z));
		}
	}
	// Render faceted tube/prism along the fiddlehead spiral
	for (let i = 0; i < steps; i++) {
		const p1 = points[i];
		const p2 = points[i + 1];
		const t = i / steps;
		const r = THREE.MathUtils.lerp(.016, .006, t);
		const col = palette.leafBase.clone().lerp(palette.accent, t);
		const normal = new THREE.Vector3(0, 1, 0);
		const pA = p1.clone().add(new THREE.Vector3(r, 0, 0));
		const pB = p1.clone().add(new THREE.Vector3(-r, 0, 0));
		const pC = p2.clone().add(new THREE.Vector3(-r, 0, 0));
		const pD = p2.clone().add(new THREE.Vector3(r, 0, 0));
		builder.addQuad(pA, pB, pC, pD, col, col, col, col, t, t, t + .05, t + .05);
	}
}
/**
* Builds central rootstock / ground crown clump to ground the fern flush with terrain.
*/
function buildRootstockCrown(builder, palette, scale, rng) {
	const crownRadius = .075 * scale;
	const crownHeight = .05 * scale;
	const segments = 7;
	const col = palette.stemBase.clone().offsetHSL(0, 0, -.05);
	const topCenter = new THREE.Vector3(0, crownHeight, 0);
	const bottomPoints = [];
	const topPoints = [];
	for (let i = 0; i < segments; i++) {
		const a = i / segments * Math.PI * 2;
		const r = crownRadius * rng.range(.85, 1.15);
		bottomPoints.push(new THREE.Vector3(Math.cos(a) * r, 0, Math.sin(a) * r));
		topPoints.push(new THREE.Vector3(Math.cos(a) * (r * .6), crownHeight * rng.range(.8, 1.2), Math.sin(a) * (r * .6)));
	}
	for (let i = 0; i < segments; i++) {
		const next = (i + 1) % segments;
		// Side faceted quads
		builder.addQuad(bottomPoints[i], bottomPoints[next], topPoints[next], topPoints[i], col, col, col, col, 0, 0, 0, 0);
		// Top crown fan
		builder.addTriangle(topCenter, topPoints[i], topPoints[next], col, col, col, 0, 0, 0);
	}
}
/**
* Generates the unified BufferGeometry for a stylized low-poly fern.
*/
export function generateFernGeometry(options) {
	const variant = options?.variant || "lush";
	const seed = options?.seed !== undefined ? options.seed : 42;
	const overallScale = options?.scale !== undefined ? options.scale : 1;
	const curvatureMult = options?.curvature !== undefined ? options.curvature : 1;
	const spreadMult = options?.spread !== undefined ? options.spread : 1;
	const rng = new PRNG(seed);
	const palette = FERN_PALETTES[variant];
	const builder = new GeometryBuilder();
	// Rootstock crown base at (0, 0, 0)
	buildRootstockCrown(builder, palette, overallScale, rng);
	// Variant-specific frond distributions:
	// - Lush: 8-10 fronds in multi-tier rosette (outer sprawling, inner upright)
	// - Young: 5-7 fronds, more upright, with 1-2 central fiddleheads
	// - Withered: 6-8 fronds, drooping, 1-2 broken/scorched stems
	let frondCount = options?.frondCount;
	if (!frondCount) {
		if (variant === "lush") frondCount = rng.rangeInt(8, 10);
		else if (variant === "young") frondCount = rng.rangeInt(5, 7);
		else frondCount = rng.rangeInt(6, 8);
	}
	// Golden ratio angle distribution for natural phyllotaxis spiral rosette
	const goldenAngle = 2.39996;
	const baseOffsetAngle = rng.range(0, Math.PI * 2);
	const frondConfigs = [];
	for (let i = 0; i < frondCount; i++) {
		const tier = i / frondCount;
		const angle = baseOffsetAngle + i * goldenAngle + rng.range(-.15, .15);
		let length;
		let pitch;
		let archStrength;
		let droopStrength;
		let width;
		let leafCount;
		let isBroken = false;
		if (variant === "lush") {
			// Lush Fern:
			// Outer fronds (low tier) are longer, flatter, and droop gracefully.
			// Inner fronds (high tier) are upright and fresh.
			length = THREE.MathUtils.lerp(.85, .65, tier) * overallScale * rng.range(.92, 1.08);
			pitch = THREE.MathUtils.lerp(.35, .85, tier) * spreadMult;
			archStrength = THREE.MathUtils.lerp(.42, .28, tier) * curvatureMult;
			droopStrength = THREE.MathUtils.lerp(.48, .18, tier) * curvatureMult;
			width = length * THREE.MathUtils.lerp(.38, .32, tier);
			leafCount = rng.rangeInt(13, 16);
		} else if (variant === "young") {
			// Young Fern:
			// Compact, vertical posture, narrower spread
			length = THREE.MathUtils.lerp(.65, .45, tier) * overallScale * rng.range(.9, 1.05);
			pitch = THREE.MathUtils.lerp(.65, 1.15, tier) * spreadMult;
			archStrength = .22 * curvatureMult;
			droopStrength = .15 * curvatureMult;
			width = length * .3;
			leafCount = rng.rangeInt(10, 13);
		} else {
			// Withered Fern:
			// Heavy droop, irregular sag, damaged tips
			length = THREE.MathUtils.lerp(.78, .58, tier) * overallScale * rng.range(.85, 1.12);
			pitch = THREE.MathUtils.lerp(.18, .55, tier) * spreadMult;
			archStrength = .25 * curvatureMult;
			droopStrength = THREE.MathUtils.lerp(.55, .35, tier) * curvatureMult;
			width = length * .32;
			leafCount = rng.rangeInt(9, 13);
			if (rng.next() < .25) {
				isBroken = true;
			}
		}
		const config = {
			angle,
			pitch,
			length,
			archStrength,
			droopStrength,
			leafCount,
			lateralCurl: rng.range(-.12, .12) * curvatureMult,
			twist: rng.range(-.25, .25),
			width,
			isBroken
		};
		frondConfigs.push(config);
	}
	// Generate fronds
	for (const config of frondConfigs) {
		buildFrondStem(builder, config, variant, palette, rng);
		buildFrondPinnae(builder, config, variant, palette, rng);
	}
	// For young variant, add 1-2 central fiddleheads (croziers)
	if (variant === "young") {
		const fiddleCount = rng.rangeInt(1, 2);
		for (let f = 0; f < fiddleCount; f++) {
			const fiddleConfig = {
				angle: rng.range(0, Math.PI * 2),
				pitch: rng.range(1.1, 1.3),
				length: .45 * overallScale,
				archStrength: .1,
				droopStrength: .05,
				leafCount: 0,
				lateralCurl: 0,
				twist: 0,
				width: .1
			};
			buildFiddlehead(builder, fiddleConfig, palette, rng);
		}
	}
	const geometry = builder.toBufferGeometry();
	return {
		geometry,
		metadata: {
			variant,
			seed,
			frondCount,
			triangleCount: builder.positions.length / 9,
			vertexCount: builder.positions.length / 3,
			palette
		}
	};
}
/**
* Creates standard low-poly PBR material for the fern with vertex colors.
*/
export function createFernMaterial(options) {
	const flatShading = options?.flatShading !== undefined ? options.flatShading : true;
	const roughness = options?.roughness !== undefined ? options.roughness : .85;
	const metalness = options?.metalness !== undefined ? options.metalness : .05;
	const material = new THREE.MeshStandardMaterial({
		vertexColors: true,
		roughness,
		metalness,
		flatShading,
		side: THREE.FrontSide
	});

	// Static by default; optional shader sway for standalone, non-instanced previews.
	if(options?.windEnabled===true){
		const uniforms={uTime:{value:0},uWindStrength:{value:Math.max(0,options?.windStrength??.15)}};
		material.userData.windUniforms=uniforms;
		material.onBeforeCompile=(shader)=>{
			Object.assign(shader.uniforms,uniforms);
			shader.vertexShader=`
				attribute float windFactor;
				uniform float uTime;
				uniform float uWindStrength;
				${shader.vertexShader}
			`;
			shader.vertexShader=shader.vertexShader.replace('#include <begin_vertex>',`
				#include <begin_vertex>
				float sway=sin(uTime*2.2+position.x*3.0+position.z*3.0)*uWindStrength*windFactor*windFactor;
				transformed.x+=sway*.12;
				transformed.z+=cos(uTime*1.7+position.z*2.5)*uWindStrength*windFactor*windFactor*.05;
			`);
		};
		material.customProgramCacheKey=()=>'kp-fern-optional-wind-v1';
	}

	return material;
}
/**
* Main exported function: creates a high-quality stylized low-poly 3D fern.
*
* Requirements fulfilled:
* - Return type: THREE.Group
* - Pivot at bottom-center (0, 0, 0)
* - Y axis points upward
* - Zero external models, textures, or dependencies
* - High-quality faceted 3D geometry with crisp lighting response
* - Fully merged into 1 single draw-call Mesh for maximum runner performance
* - Supports 3 variants ('lush', 'young', 'withered') and deterministic seeds
*/
export function createLowPolyFern(options) {
	const group = new THREE.Group();
	group.name = `Fern_${options?.variant || "lush"}`;
	const { geometry, metadata } = generateFernGeometry(options);
	const material = createFernMaterial(options);
	const mesh = new THREE.Mesh(geometry, material);
	mesh.name = "FernMesh";
	mesh.castShadow = true;
	mesh.receiveShadow = true;
	group.add(mesh);
	group.userData = {
		...metadata,
		isLowPolyFern: true,
		material,
		geometry,
		updateWind(seconds){
			const u=material.userData.windUniforms;
			if(u)u.uTime.value=seconds;
		}
	};
	return group;
}
