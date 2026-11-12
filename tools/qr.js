// Minimal QR code encoder (byte mode, error correction level L, versions 1–10) — enough for a URL.
// Used by `node server.js --dev` to print a scannable code in the terminal. No dependencies.
'use strict';

// [ec codewords per block, [[blocks, data codewords per block], ...]] for level L
const EC_L = [null,
  [7, [[1, 19]]], [10, [[1, 34]]], [15, [[1, 55]]], [20, [[1, 80]]], [26, [[1, 108]]],
  [18, [[2, 68]]], [20, [[2, 78]]], [24, [[2, 97]]], [30, [[2, 116]]], [18, [[2, 68], [2, 69]]]];
const ALIGN = [null, [], [6, 18], [6, 22], [6, 26], [6, 30], [6, 34], [6, 22, 38], [6, 24, 42], [6, 26, 46], [6, 28, 50]];

// ---- GF(256) arithmetic and Reed–Solomon ----
const EXP = new Array(512), LOG = new Array(256);
for (let i = 0, x = 1; i < 255; i++) { EXP[i] = x; LOG[x] = i; x <<= 1; if (x & 256) x ^= 0x11d; }
for (let i = 255; i < 512; i++) EXP[i] = EXP[i - 255];
const mul = (a, b) => (a && b ? EXP[LOG[a] + LOG[b]] : 0);
function rsGenerator(n) {
  let g = [1];
  for (let i = 0; i < n; i++) {
    const next = new Array(g.length + 1).fill(0);
    for (let j = 0; j < g.length; j++) { next[j] ^= g[j]; next[j + 1] ^= mul(g[j], EXP[i]); }
    g = next;
  }
  return g;
}
function rsEncode(data, n) {
  const g = rsGenerator(n), r = data.concat(new Array(n).fill(0));
  for (let i = 0; i < data.length; i++) {
    const c = r[i];
    if (c) for (let j = 0; j < g.length; j++) r[i + j] ^= mul(g[j], c);
  }
  return r.slice(data.length);
}

// 15-bit format info (level L = 01, mask) and 18-bit version info, with their BCH error correction
function formatBits(mask) {
  const data = (0b01 << 3) | mask;
  let rem = data;
  for (let i = 0; i < 10; i++) rem = (rem << 1) ^ ((rem >> 9) * 0x537);
  return ((data << 10) | rem) ^ 0x5412;
}
function versionBits(ver) {
  let rem = ver;
  for (let i = 0; i < 12; i++) rem = (rem << 1) ^ ((rem >> 11) * 0x1f25);
  return (ver << 12) | rem;
}

function encode(text) {
  const bytes = [...Buffer.from(text, 'utf8')];
  let ver = 1;
  for (; ver <= 10; ver++) {
    const cap = EC_L[ver][1].reduce((a, [b, d]) => a + b * d, 0);
    const bits = 4 + (ver < 10 ? 8 : 16) + bytes.length * 8;
    if (bits <= cap * 8) break;
  }
  if (ver > 10) throw new Error('text too long for this QR encoder');
  const [ecLen, groups] = EC_L[ver];
  const dataCap = groups.reduce((a, [b, d]) => a + b * d, 0);

  // ---- data bits ----
  const bits = [];
  const put = (v, n) => { for (let i = n - 1; i >= 0; i--) bits.push((v >> i) & 1); };
  put(0b0100, 4); put(bytes.length, ver < 10 ? 8 : 16); bytes.forEach(b => put(b, 8));
  put(0, Math.min(4, dataCap * 8 - bits.length));
  while (bits.length % 8) bits.push(0);
  const data = [];
  for (let i = 0; i < bits.length; i += 8) data.push(parseInt(bits.slice(i, i + 8).join(''), 2));
  for (let pad = 0; data.length < dataCap; pad++) data.push(pad % 2 ? 0x11 : 0xec);

  // ---- blocks, error correction, interleaving ----
  const blocks = [];
  let off = 0;
  for (const [count, size] of groups) for (let i = 0; i < count; i++) { const d = data.slice(off, off + size); off += size; blocks.push({ d, e: rsEncode(d, ecLen) }); }
  const final = [];
  const maxD = Math.max(...blocks.map(b => b.d.length));
  for (let i = 0; i < maxD; i++) for (const b of blocks) if (i < b.d.length) final.push(b.d[i]);
  for (let i = 0; i < ecLen; i++) for (const b of blocks) final.push(b.e[i]);

  // ---- matrix ----
  const N = ver * 4 + 17;
  const M = Array.from({ length: N }, () => new Array(N).fill(null)); // null = free
  const set = (r, c, v) => { if (r >= 0 && r < N && c >= 0 && c < N) M[r][c] = v ? 1 : 0; };
  const finder = (r, c) => {
    for (let i = -1; i <= 7; i++) for (let j = -1; j <= 7; j++) {
      const inside = i >= 0 && i <= 6 && j >= 0 && j <= 6;
      const dark = inside && (i === 0 || i === 6 || j === 0 || j === 6 || (i >= 2 && i <= 4 && j >= 2 && j <= 4));
      set(r + i, c + j, dark);
    }
  };
  finder(0, 0); finder(0, N - 7); finder(N - 7, 0);
  for (let i = 8; i < N - 8; i++) { if (M[6][i] === null) set(6, i, i % 2 === 0); if (M[i][6] === null) set(i, 6, i % 2 === 0); }
  const al = ALIGN[ver], last = al.length - 1;
  for (let a = 0; a <= last; a++) for (let b = 0; b <= last; b++) {
    if ((a === 0 && b === 0) || (a === 0 && b === last) || (a === last && b === 0)) continue; // would sit on a finder
    const r = al[a], c = al[b];
    for (let i = -2; i <= 2; i++) for (let j = -2; j <= 2; j++) set(r + i, c + j, Math.max(Math.abs(i), Math.abs(j)) !== 1);
  }
  set(N - 8, 8, 1); // dark module
  // reserve format areas
  const fmtCells = [];
  for (let i = 0; i < 9; i++) { if (i !== 6) { fmtCells.push([8, i]); fmtCells.push([i, 8]); } }
  for (let i = 0; i < 8; i++) { fmtCells.push([8, N - 1 - i]); fmtCells.push([N - 1 - i, 8]); }
  for (const [r, c] of fmtCells) if (M[r][c] === null) M[r][c] = 0;
  // version info (v7+)
  if (ver >= 7) {
    const v = versionBits(ver);
    for (let i = 0; i < 18; i++) { const b = (v >> i) & 1, r = Math.floor(i / 3), c = N - 11 + (i % 3); set(r, c, b); set(c, r, b); }
  }
  const reserved = M.map(row => row.map(v => v !== null));

  // ---- place data (zig-zag), mask 0: (r + c) % 2 === 0 ----
  const dataBits = [];
  for (const byte of final) for (let i = 7; i >= 0; i--) dataBits.push((byte >> i) & 1);
  let k = 0, up = true;
  for (let col = N - 1; col > 0; col -= 2) {
    if (col === 6) col--;
    for (let n = 0; n < N; n++) {
      const r = up ? N - 1 - n : n;
      for (const c of [col, col - 1]) {
        if (reserved[r][c]) continue;
        let b = k < dataBits.length ? dataBits[k++] : 0;
        if ((r + c) % 2 === 0) b ^= 1;
        M[r][c] = b;
      }
    }
    up = !up;
  }
  // ---- format info: level L, mask 0 ----
  const fmt = formatBits(0), bit = i => (fmt >> i) & 1;
  for (let i = 0; i <= 5; i++) M[i][8] = bit(i);          // first copy, around the top-left finder
  M[7][8] = bit(6); M[8][8] = bit(7); M[8][7] = bit(8);
  for (let i = 9; i < 15; i++) M[8][14 - i] = bit(i);
  for (let i = 0; i < 8; i++) M[8][N - 1 - i] = bit(i);   // second copy, split top-right / bottom-left
  for (let i = 8; i < 15; i++) M[N - 15 + i][8] = bit(i);
  M[N - 8][8] = 1;                                         // the dark module
  return M;
}

// Terminal art: two rows per character, black on white, with a quiet zone.
function toTerminal(text) {
  const M = encode(text), q = 2, N = M.length + q * 2;
  const at = (r, c) => (r >= q && r < N - q && c >= q && c < N - q ? M[r - q][c - q] : 0);
  let out = '';
  for (let r = 0; r < N; r += 2) {
    out += '  \x1b[30;47m';
    for (let c = 0; c < N; c++) { const t = at(r, c), b = at(r + 1, c); out += t && b ? '█' : t ? '▀' : b ? '▄' : ' '; }
    out += '\x1b[0m\n';
  }
  return out;
}

module.exports = { encode, toTerminal };
