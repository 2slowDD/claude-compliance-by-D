// Host CPU benchmark for the CU worker container (read-only; runs ~2-4 s). Prints one JSON line.
const os = require('os');
const fs = require('fs');
function cpuLoop(n) { const t = process.hrtime.bigint(); let x = 0; for (let i = 0; i < n; i++) { x = (x * 31 + i) % 1000003; } return [Number(process.hrtime.bigint() - t) / 1e6, x]; }
function memLoop(mb) { const t = process.hrtime.bigint(); const b = Buffer.alloc(mb << 20, 1); let s = 0; for (let k = 0; k < 3; k++) for (let i = 0; i < b.length; i += 64) s += b[i]; return [Number(process.hrtime.bigint() - t) / 1e6, s]; }
cpuLoop(2e7); // warm-up
const runs = [];
for (let r = 0; r < 3; r++) runs.push(Math.round(cpuLoop(2e8)[0]));
const mem = Math.round(memLoop(256)[0]);
let model = '', steal = null;
try { model = (fs.readFileSync('/proc/cpuinfo', 'utf8').match(/model name\s*:\s*(.+)/) || [, ''])[1].trim(); } catch {}
try { const f = fs.readFileSync('/proc/stat', 'utf8').split('\n')[0].trim().split(/\s+/).slice(1).map(Number); const tot = f.reduce((a, b) => a + b, 0); steal = Math.round((f[7] / tot) * 10000) / 100; } catch {}
console.log(JSON.stringify({ host_bench: 1, cpu_loop_ms_min: Math.min(...runs), cpu_loop_ms: runs, mem_scan_ms: mem, nproc: os.cpus().length, model, steal_pct_since_boot: steal, load1: os.loadavg()[0], uptime_s: Math.round(os.uptime()), node: process.version }));
