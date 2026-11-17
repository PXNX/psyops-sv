// tools/map/projection.ts
// Converts world-map coordinates (the 1400x600 SVG) to latitude/longitude.
//
// The map is a cylindrical world projection; rather than guess which one, we
// fit a small polynomial (x, y) -> (lat, lon) by least squares on reference
// points whose real coordinates are known, rejecting outliers iteratively.
// The fitted coefficients are written to projection.json so the build is
// reproducible without the reference data.

export interface Reference {
	x: number;
	y: number;
	lat: number;
	lon: number;
}

export interface Projection {
	/** Polynomial terms: lat = Σ latCoef[i]·term_i(x,y), same for lon. */
	latCoef: number[];
	lonCoef: number[];
	/** Reference points kept after outlier rejection, and the median fit error. */
	inliers: number;
	medianErrorKm: number;
}

// Normalise to ~[-1, 1] for numerical stability.
const nx = (x: number) => (x - 700) / 700;
const ny = (y: number) => (y - 300) / 300;

/** Cubic terms in x and y. */
function terms(x: number, y: number): number[] {
	const u = nx(x);
	const v = ny(y);
	return [1, u, v, u * u, u * v, v * v, u * u * u, u * u * v, u * v * v, v * v * v];
}

function solve(A: number[][], b: number[]): number[] {
	// Normal equations with Gaussian elimination (small, well-conditioned system).
	const n = A[0]!.length;
	const M = Array.from({ length: n }, (_, i) => Array.from({ length: n + 1 }, (_, j) => 0));
	for (let r = 0; r < A.length; r++) {
		for (let i = 0; i < n; i++) {
			for (let j = 0; j < n; j++) M[i]![j]! += A[r]![i]! * A[r]![j]!;
			M[i]![n]! += A[r]![i]! * b[r]!;
		}
	}
	for (let i = 0; i < n; i++) {
		let p = i;
		for (let r = i + 1; r < n; r++) if (Math.abs(M[r]![i]!) > Math.abs(M[p]![i]!)) p = r;
		[M[i], M[p]] = [M[p]!, M[i]!];
		for (let r = 0; r < n; r++) {
			if (r === i) continue;
			const f = M[r]![i]! / M[i]![i]!;
			for (let c = i; c <= n; c++) M[r]![c]! -= f * M[i]![c]!;
		}
	}
	return M.map((row, i) => row[n]! / row[i]!);
}

const dot = (c: number[], t: number[]) => c.reduce((s, k, i) => s + k * t[i]!, 0);

export function project(p: Projection, x: number, y: number): { lat: number; lon: number } {
	const t = terms(x, y);
	let lon = dot(p.lonCoef, t);
	lon = ((((lon + 180) % 360) + 360) % 360) - 180;
	return { lat: Math.max(-89.9, Math.min(89.9, dot(p.latCoef, t))), lon };
}

export function haversineKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
	const R = 6371;
	const toRad = (d: number) => (d * Math.PI) / 180;
	const dLat = toRad(lat2 - lat1);
	const dLon = toRad(lon2 - lon1);
	const a = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
	return 2 * R * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

const median = (a: number[]) => {
	const s = [...a].sort((p, q) => p - q);
	return s[Math.floor(s.length / 2)] ?? 0;
};

/** Fit, then repeatedly drop references far off the fit (wrong stored coordinates). */
export function fitProjection(refs: Reference[], rounds = 6): Projection {
	let kept = refs;
	let proj: Projection = { latCoef: [], lonCoef: [], inliers: 0, medianErrorKm: 0 };
	for (let round = 0; round < rounds; round++) {
		const A = kept.map((r) => terms(r.x, r.y));
		proj = {
			latCoef: solve(
				A,
				kept.map((r) => r.lat)
			),
			lonCoef: solve(
				A,
				kept.map((r) => r.lon)
			),
			inliers: kept.length,
			medianErrorKm: 0
		};
		const err = (r: Reference) => {
			const p = project(proj, r.x, r.y);
			return haversineKm(p.lat, p.lon, r.lat, r.lon);
		};
		const errors = kept.map(err);
		const m = median(errors);
		proj.medianErrorKm = Math.round(m);
		// Keep points within 3x the median error (never tighter than 150 km).
		const limit = Math.max(150, 3 * m);
		kept = refs.filter((r) => err(r) <= limit);
	}
	return proj;
}
