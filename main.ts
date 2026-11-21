import { mkdirSync, readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
const I = process.env.MAKEFUN_INPUT_DIR ?? '/input', O = process.env.MAKEFUN_OUTPUT_DIR ?? '/output';
const T = ' 4d!)*./        &&&&&&&%&&&%&&& &&&             @AA@            %"              !!$!';
const B = {
  0x10: (a, b) => a + b, 0x11: (a, b) => a - b, 0x12: Math.imul,
  0x18: (a, b) => a & b, 0x19: (a, b) => a | b, 0x1a: (a, b) => a ^ b,
  0x1c: (a, b) => a << (b & 31), 0x1d: (a, b) => a >> (b & 31), 0x1e: (a, b) => a >>> (b & 31),
  0x20: (a, b) => a === b ? 1 : 0, 0x21: (a, b) => a < b ? 1 : 0,
  0x22: (a, b) => (a >>> 0) < (b >>> 0) ? 1 : 0,
};
function run(P, inp) {
  const S = new Int32Array(256), C = new Int32Array(64), M = new Int32Array(256);
  const out: number[] = [];
  let pc = 0, sp = 0, csp = 0, steps = 0, ip = 0;
  const trap = c => [Buffer.from(out), c];
  while (true) {
    if (steps >= 1000000) return trap(10);
    if (pc < 0 || pc >= P.length) return trap(9);
    const op = P[pc];
    if (op > 0x53 || (op > 7 && op < 0x10) || (op > 0x22 && op < 0x30) || (op > 0x34 && op < 0x40) || (op > 0x41 && op < 0x50)) return trap(5);
    const v = T.charCodeAt(op) - 32, np = v & 3, nq = (v >> 2) & 3, il = v >> 4;
    if (il && pc + il >= P.length) return trap(9);
    steps++;
    if (sp < np) return trap(2);
    if (sp - np + nq > 256) return trap(3);
    const f = B[op];
    if (f) { const b = S[--sp]; S[sp - 1] = f(S[sp - 1], b) | 0; pc++; continue; }
    let a = 0, b = 0;
    const u16 = op >= 0x30 && op <= 0x33 ? P[pc + 1] | (P[pc + 2] << 8) : 0;
    const s16 = (u16 << 16) >> 16;
    switch (op) {
      case 0x00: return trap(0);
      case 0x01: S[sp++] = (P[pc + 1] << 24) >> 24; pc += 2; break;
      case 0x02: S[sp++] = P[pc + 1] | (P[pc + 2] << 8) | (P[pc + 3] << 16) | (P[pc + 4] << 24); pc += 5; break;
      case 0x03: sp--; pc++; break;
      case 0x04: S[sp] = S[sp - 1]; sp++; pc++; break;
      case 0x05: { const t = S[sp - 1]; S[sp - 1] = S[sp - 2]; S[sp - 2] = t; pc++; break; }
      case 0x06: S[sp] = S[sp - 2]; sp++; pc++; break;
      case 0x07: { const t = S[sp - 3]; S[sp - 3] = S[sp - 2]; S[sp - 2] = S[sp - 1]; S[sp - 1] = t; pc++; break; }
      case 0x13: b = S[--sp]; a = S[sp - 1]; if (b === 0) return trap(4); S[sp - 1] = (a / b) | 0; pc++; break;
      case 0x14: b = S[--sp]; a = S[sp - 1]; if (b === 0) return trap(4); S[sp - 1] = (a % b) | 0; pc++; break;
      case 0x15: b = S[--sp]; a = S[sp - 1]; if (b === 0) return trap(4); S[sp - 1] = ((a >>> 0) / (b >>> 0)) | 0; pc++; break;
      case 0x16: b = S[--sp]; a = S[sp - 1]; if (b === 0) return trap(4); S[sp - 1] = ((a >>> 0) % (b >>> 0)) | 0; pc++; break;
      case 0x17: S[sp - 1] = (-S[sp - 1]) | 0; pc++; break;
      case 0x1b: S[sp - 1] = ~S[sp - 1]; pc++; break;
      case 0x30: pc = pc + 3 + s16; break;
      case 0x31: b = S[--sp]; pc = b === 0 ? pc + 3 + s16 : pc + 3; break;
      case 0x32: b = S[--sp]; pc = b !== 0 ? pc + 3 + s16 : pc + 3; break;
      case 0x33: if (csp >= 64) return trap(7); C[csp++] = pc + 3; pc = u16; break;
      case 0x34: if (csp < 1) return trap(8); pc = C[--csp]; break;
      case 0x40: a = S[sp - 1]; if (a < 0 || a > 255) return trap(6); S[sp - 1] = M[a]; pc++; break;
      case 0x41: a = S[--sp]; b = S[--sp]; if (a < 0 || a > 255) return trap(6); M[a] = b; pc++; break;
      case 0x50: { const s = String(S[--sp]); if (out.length + s.length > 65536) return trap(11); for (let i = 0; i < s.length; i++) out.push(s.charCodeAt(i)); pc++; break; }
      case 0x51: if (out.length + 1 > 65536) return trap(11); out.push(S[--sp] & 255); pc++; break;
      case 0x52: S[sp++] = ip < inp.length ? inp[ip++] : -1; pc++; break;
      case 0x53: return trap(S[--sp] & 255);
      default: return trap(5);
    }
  }
}
for (const id of readdirSync(I).sort()) {
  const p = readFileSync(join(I, id, 'program.bin'));
  const n = readFileSync(join(I, id, 'input.bin'));
  const [o, e] = run(new Uint8Array(p), new Uint8Array(n));
  mkdirSync(join(O, id), { recursive: true });
  writeFileSync(join(O, id, 'stdout.bin'), o);
  writeFileSync(join(O, id, 'exit.txt'), String(e) + '\n');
}
