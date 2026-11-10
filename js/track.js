// The road as a curved, hilly centre-line. All gameplay runs in "track space":
//   s   = distance along the road (what used to be z),
//   lat = sideways offset from the centre (+ = runner's left),
//   y   = height above the road surface.
// pos() maps track space to world space for rendering.
import * as THREE from 'three';

const STEP = 1, TAIL = 280;
const clamp = (v, a, b) => Math.max(a, Math.min(b, v));

export class Track {
  constructor(level) {
    const segs = [];
    let s0 = 0;
    for (const sg of level.segments) { segs.push({ half: 6, ...sg, s0 }); s0 += sg.len; }
    this.finish = s0;
    const last = segs[segs.length - 1];
    segs.push({ len: TAIL, s0, half: last.half, zone: last.zone === 'bridge' ? 'city' : last.zone, surface: last.surface === 'bridge' ? 'asphalt' : last.surface, tail: true });
    this.segs = segs;
    const n = this.n = Math.ceil((s0 + TAIL) / STEP) + 2;
    this.X = new Float32Array(n); this.Z = new Float32Array(n); this.TH = new Float32Array(n);
    this.H = new Float32Array(n); this.HALF = new Float32Array(n); this.SEG = new Uint8Array(n);
    const raw = new Float32Array(n);
    let x = 0, z = 0, th = 0, k = 0;
    for (let i = 0; i < n; i++) {
      const s = i * STEP;
      while (k < segs.length - 1 && s >= segs[k].s0 + segs[k].len) k++;
      const sg = segs[k], t = clamp((s - sg.s0) / sg.len, 0, 1), sn = Math.sin(Math.PI * t);
      this.X[i] = x; this.Z[i] = z; this.TH[i] = th; this.SEG[i] = k;
      let h = 0;
      if (sg.hill) h = sg.hill * sn * sn * (sg.bumps ? 0.55 + 0.45 * Math.sin(2 * Math.PI * sg.bumps * t - Math.PI / 2) : 1);
      if (sg.surface === 'soil') h += 0.13 * sn * Math.sin(s * 0.9) * Math.sin(s * 0.37); // ruts
      this.H[i] = h;
      raw[i] = sg.half;
      const kappa = sg.turn ? (sg.turn * Math.PI / 180) / sg.len * (Math.PI / 2) * sn : 0; // smooth in/out
      th += kappa * STEP; x += Math.sin(th) * STEP; z += Math.cos(th) * STEP;
    }
    const W = 14; // ease road-width changes
    for (let i = 0; i < n; i++) {
      let sum = 0, c = 0;
      for (let j = Math.max(0, i - W); j <= Math.min(n - 1, i + W); j++) { sum += raw[j]; c++; }
      this.HALF[i] = sum / c;
    }
    this._v = new THREE.Vector3();
  }

  _f(s) { return clamp(s / STEP, 0, this.n - 1.0001); }
  _lerp(A, s) { const f = this._f(s), i = f | 0; return A[i] + (A[i + 1] - A[i]) * (f - i); }
  th(s) { return this._lerp(this.TH, s); }
  h(s) { return s < 0 ? 0 : this._lerp(this.H, s); }
  half(s) { return this._lerp(this.HALF, s); }
  seg(s) { return this.segs[this.SEG[this._f(s) | 0]]; }
  zone(s) { return this.seg(s).zone; }

  // world position of (s, lat, y) → out (Vector3)
  pos(s, lat = 0, y = 0, out = this._v) {
    let x, z, th, h;
    const end = (this.n - 1) * STEP;
    if (s < 0) { th = this.TH[0]; x = this.X[0] + Math.sin(th) * s; z = this.Z[0] + Math.cos(th) * s; h = 0; }
    else if (s > end) { const i = this.n - 1; th = this.TH[i]; x = this.X[i] + Math.sin(th) * (s - end); z = this.Z[i] + Math.cos(th) * (s - end); h = this.H[i]; }
    else { th = this.th(s); x = this._lerp(this.X, s); z = this._lerp(this.Z, s); h = this._lerp(this.H, s); }
    return out.set(x + Math.cos(th) * lat, h + y, z - Math.sin(th) * lat);
  }

  // put an Object3D at track coords, facing along the road (+ optional extra yaw)
  place(obj, s, lat = 0, y = 0, yaw = 0) {
    this.pos(s, lat, y, obj.position);
    obj.rotation.y = this.th(Math.max(0, s)) + yaw;
    return obj;
  }
}
