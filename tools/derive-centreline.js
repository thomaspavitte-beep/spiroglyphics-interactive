// Derive the spiral centreline (line.svg) from a filled spiroglyphic (image.svg).
// Method: sample the filled outline, ray-cast from the centre at fine angular
// steps, take band midpoints, chain them across angles into the two arms of
// the double spiral, join at the centre, emit as one M/L path.
//
// usage: node derive-centreline.js <image.svg> <out-line.svg>
const fs = require("fs");

const [,, inFile, outFile] = process.argv;
const svg = fs.readFileSync(inFile, "utf8");
const d = svg.match(/\sd="([^"]+)"/)[1];
const vb = svg.match(/viewBox="([^"]+)"/)[1];

/* ---- parse filled path to polygon rings ---- */
function parseRings(d, K) {
  const tok = d.match(/[a-zA-Z]|-?(?:\d+\.?\d*|\.\d+)(?:e[-+]?\d+)?/g) || [];
  let i = 0, cmd = "", x = 0, y = 0, sx = 0, sy = 0, px = 0, py = 0;
  const rings = [];
  let ring = null;
  const num = () => parseFloat(tok[i++]);
  const emitCubic = (c1x, c1y, c2x, c2y, nx, ny) => {
    for (let k = 1; k <= K; k++) {
      const t = k / K, u = 1 - t;
      ring.push([
        u*u*u*x + 3*u*u*t*c1x + 3*u*t*t*c2x + t*t*t*nx,
        u*u*u*y + 3*u*u*t*c1y + 3*u*t*t*c2y + t*t*t*ny
      ]);
    }
    x = nx; y = ny;
  };
  const emitLine = (nx, ny) => { ring.push([nx, ny]); px = x; py = y; x = nx; y = ny; };
  while (i < tok.length) {
    if (/^[a-zA-Z]$/.test(tok[i])) cmd = tok[i++];
    const rl = cmd >= "a" ? 1 : 0;
    switch (cmd.toUpperCase()) {
      case "M": x = num()+rl*x; y = num()+rl*y; sx=x; sy=y; px=x; py=y;
        ring = [[x,y]]; rings.push(ring); cmd = rl ? "l" : "L"; break;
      case "L": emitLine(num()+rl*x, num()+rl*y); break;
      case "H": emitLine(num()+rl*x, y); break;
      case "V": emitLine(x, num()+rl*y); break;
      case "C": { const a=num()+rl*x,b=num()+rl*y,c=num()+rl*x,e=num()+rl*y;
        const nx=num()+rl*x, ny=num()+rl*y; const oc=c, oe=e;
        emitCubic(a,b,c,e,nx,ny); px=oc; py=oe; break; }
      case "S": { const a=2*x-px,b=2*y-py,c=num()+rl*x,e=num()+rl*y;
        const nx=num()+rl*x, ny=num()+rl*y; const oc=c, oe=e;
        emitCubic(a,b,c,e,nx,ny); px=oc; py=oe; break; }
      case "Z": emitLine(sx, sy); break;
      default: throw new Error("unsupported cmd " + cmd);
    }
  }
  return rings;
}

const rings = parseRings(d, 16);
let minX=1e9,minY=1e9,maxX=-1e9,maxY=-1e9;
for (const r of rings) for (const p of r) {
  if(p[0]<minX)minX=p[0]; if(p[0]>maxX)maxX=p[0];
  if(p[1]<minY)minY=p[1]; if(p[1]>maxY)maxY=p[1];
}
const cx=(minX+maxX)/2, cy=(minY+maxY)/2;

/* ---- bucket polygon edges by angle so each ray only tests nearby edges ---- */
const RAYS = 1440; // 0.25 deg
const buckets = Array.from({length: RAYS}, () => []);
const angIdx = (x,y) => {
  let a = Math.atan2(y-cy, x-cx);
  if (a < 0) a += 2*Math.PI;
  return Math.floor(a / (2*Math.PI) * RAYS) % RAYS;
};
for (const r of rings) {
  for (let j = 0; j < r.length; j++) {
    const p = r[j], q = r[(j+1) % r.length];
    let a = angIdx(p[0],p[1]), b = angIdx(q[0],q[1]);
    // edge spans a small angular range; register in all buckets it touches
    let span = (b - a + RAYS) % RAYS;
    if (span > RAYS/2) { [a,b] = [b,a]; span = RAYS - span; }
    for (let s = 0; s <= span; s++) buckets[(a+s) % RAYS].push([p,q]);
  }
}

function castRay(k) {
  const th = k/RAYS * 2*Math.PI;
  const dx = Math.cos(th), dy = Math.sin(th);
  const hits = [];
  for (const [p,q] of buckets[k]) {
    const ex=q[0]-p[0], ey=q[1]-p[1];
    const det = ex*dy - ey*dx;
    if (Math.abs(det) < 1e-12) continue;
    const fx = cx-p[0], fy = cy-p[1];
    const s = (fx*dy - fy*dx) / det;
    if (s < 0 || s >= 1) continue;
    const t = (ex*fy - ey*fx) / -det;
    if (t > 0.01) hits.push(t);
  }
  hits.sort((a,b)=>a-b);
  // parity: odd crossing count means the ray origin (spiral centre) is inside
  // ink — the central U-turn blob — so ink intervals start at hits[1]
  const start = hits.length % 2;
  const mids = [];
  for (let b = start; b+1 < hits.length; b += 2) mids.push((hits[b]+hits[b+1])/2);
  return mids; // ascending radius
}

const rayMids = [];
for (let k = 0; k < RAYS; k++) rayMids.push(castRay(k));
const allGaps = [];
for (const mids of rayMids)
  for (let m = 1; m < mids.length; m++) allGaps.push(mids[m]-mids[m-1]);
allGaps.sort((a,b)=>a-b);
const HALF_SPACING = allGaps[Math.floor(allGaps.length/2)];
const R_STOP = HALF_SPACING * 1.4; // stop tracking near the centre turn

/* ---- chain one arm from its outer tip inward ---- */
function nearest(mids, r, k, used) {
  // used: samples already claimed by the other arm — skip them, don't stop.
  // (The two tips sit side by side; without this the second walk hops onto
  // the first arm's track and retraces it.)
  let best = -1, bd = 1e9;
  for (let m = 0; m < mids.length; m++) {
    if (used && used.has(k + ":" + Math.round(mids[m]*4))) continue;
    const dd = Math.abs(mids[m] - r);
    if (dd < bd) { bd = dd; best = m; }
  }
  return bd < HALF_SPACING/2.5 ? mids[best] : null;
}
function walk(k0, r0, dir, used) {
  // follow the band inward; returns [{k(unwrapped float idx), r}]
  const chain = [{k: k0, r: r0}];
  let k = k0, r = r0, kk = k0;
  for (let step = 0; step < RAYS*30; step++) {
    k = ((k + dir) % RAYS + RAYS) % RAYS;
    kk += dir;
    const cand = nearest(rayMids[k], r, k, used);
    if (cand === null) break;
    r = cand;
    chain.push({k: kk, r});
    if (r < R_STOP) break;
  }
  return chain;
}

// From a seed, walk both ways. The long walk descends the arm; the short walk
// (if any) is the arm's outer head up to its true end — the seed is just the
// outermost SAMPLE, which can sit mid-band because the spiral centre is only
// approximately the bbox centre. If the "short" walk is also long, the walk
// hopped across the adjacent pen-line tips onto the other arm (Elvis-style)
// and we got both arms in one go.
function fullArm(k0, r0, used) {
  const dPlus = walk(k0, r0, +1, used);
  const dMinus = walk(k0, r0, -1, used);
  const long_ = dPlus.length >= dMinus.length ? dPlus : dMinus;
  const short_ = dPlus.length >= dMinus.length ? dMinus : dPlus;
  return {long: long_, short: short_};
}
const revsOf = ch => Math.abs(ch[ch.length-1].k - ch[0].k)/RAYS;

let tipK = 0, tipR = 0;
for (let k = 0; k < RAYS; k++) {
  const mids = rayMids[k];
  if (mids.length && mids[mids.length-1] > tipR) { tipR = mids[mids.length-1]; tipK = k; }
}
const wA = fullArm(tipK, tipR, null);
let armA, armB;
if (revsOf(wA.short) > 2) {
  // both directions went deep: short = the whole other arm (adjacent tips)
  armA = wA.long;
  armB = wA.short;
  console.log("adjacent-tip layout: both arms from one seed");
} else {
  // short = arm A's outer head; stitch head + descent into the full arm
  armA = wA.short.slice(1).reverse().concat(wA.long);
  const usedA = new Set(armA.map(c => (((c.k % RAYS)+RAYS)%RAYS) + ":" + Math.round(c.r*4)));
  let tipK2 = -1, tipR2 = 0;
  for (let k = 0; k < RAYS; k++) {
    for (const m of rayMids[k]) {
      if (usedA.has(k + ":" + Math.round(m*4))) continue;
      if (m > tipR2) { tipR2 = m; tipK2 = k; }
    }
  }
  const wB = fullArm(tipK2, tipR2, usedA);
  armB = wB.short.slice(1).reverse().concat(wB.long);
  console.log("separate-tip layout: armA head", wA.short.length, "| armB seed ray", tipK2, "head", wB.short.length);
}
console.log("half-spacing:", HALF_SPACING.toFixed(2),
  "| armA:", armA.length, "samples, revs", revsOf(armA).toFixed(1),
  "| armB:", armB.length, "revs", revsOf(armB).toFixed(1));

/* ---- smooth radii and emit: armA outer->inner, centre join, armB inner->outer ---- */
function smooth(chain, w) {
  const out = chain.map((c,i) => {
    let s = 0, n = 0;
    for (let j = Math.max(0,i-w); j <= Math.min(chain.length-1,i+w); j++) { s += chain[j].r; n++; }
    return {k: c.k, r: s/n};
  });
  return out;
}
const A = smooth(armA, 3), B = smooth(armB, 3).reverse(); // B now inner->outer
const toXY = c => {
  const th = (c.k % RAYS) / RAYS * 2*Math.PI;
  return [cx + c.r*Math.cos(th), cy + c.r*Math.sin(th)];
};
// decimate to ~every 4th ray step (1 deg) and build the polyline
const pts = [];
for (let i = 0; i < A.length; i += 4) pts.push(toXY(A[i]));
pts.push(toXY(A[A.length-1]));
// centre join: straight through between the two inner endpoints (short)
pts.push([cx, cy]);
pts.push(toXY(B[0]));
for (let i = 4; i < B.length; i += 4) pts.push(toXY(B[i]));
pts.push(toXY(B[B.length-1]));

let path = "M" + pts[0][0].toFixed(2) + "," + pts[0][1].toFixed(2);
for (let i = 1; i < pts.length; i++)
  path += "L" + pts[i][0].toFixed(2) + "," + pts[i][1].toFixed(2);

const out = '<?xml version="1.0" encoding="UTF-8"?>\n' +
  '<svg xmlns="http://www.w3.org/2000/svg" viewBox="' + vb + '">\n' +
  '  <!-- centreline derived from image.svg by ray-cast band-midpoint tracing -->\n' +
  '  <path d="' + path + '" fill="none" stroke="#231f20" stroke-width="' +
  (HALF_SPACING*2*0.5).toFixed(1) + '"/>\n</svg>\n';
fs.writeFileSync(outFile, out);
console.log("wrote", outFile, "points:", pts.length,
  "| suggested pen width:", (HALF_SPACING*1.12).toFixed(1));
