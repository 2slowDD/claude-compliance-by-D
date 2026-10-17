// Bench the LIVE Railway worker container's host and append the sample to the record (read-only on Railway).
// Usage:  node bench-now.mjs [--note "text"]
// Config: config.json beside this file (see config.example.json). Needs the Railway CLI logged in; the project
// link is per-directory, so commands run from config.linked_dir.
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
const cfgPath = existsSync(join(HERE, 'config.json')) ? join(HERE, 'config.json') : null;
if (!cfgPath) { console.error('config.json missing beside bench-now.mjs — copy config.example.json and fill it in'); process.exit(2); }
const CFG = JSON.parse(readFileSync(cfgPath, 'utf8'));
const noteIdx = process.argv.indexOf('--note');
const note = noteIdx > 0 ? process.argv[noteIdx + 1] : '';

// `railway` may be an npm shim (railway.cmd) ⇒ needs the shell; one command STRING (no args array) avoids DEP0190.
const rw = (args, input) => spawnSync(['railway', ...args].join(' '), { cwd: CFG.linked_dir, input, encoding: 'utf8', shell: true, maxBuffer: 64 << 20 });

// Verdict rule: no fixed bar. With >= min_deployments_for_median distinct deployments sampled, FAST = at or below the
// median of the per-deployment best scores ("the better half suffices"); with fewer, CALIBRATING.
function verdictFor(benchMs, samples) {
  const best = new Map();
  for (const s of samples) if (s.deployment_id) best.set(s.deployment_id, Math.min(best.get(s.deployment_id) ?? Infinity, s.bench_min_ms));
  const v = [...best.values()].sort((a, b) => a - b);
  const min = CFG.min_deployments_for_median ?? 4;
  if (v.length < min) return { verdict: 'CALIBRATING', threshold_ms: null, rule: `${v.length}/${min} deployments sampled` };
  const med = v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
  return { verdict: benchMs <= med ? 'FAST' : 'SLOW', threshold_ms: med, rule: `median of ${v.length} deployments' best = ${med} ms` };
}

// 1. current deployment (newest SUCCESS/BUILDING/DEPLOYING row)
const dl = rw(['deployment', 'list', '--service', CFG.service]);
const depLine = (dl.stdout || '').split(/\r?\n/).find((l) => /\|\s*(SUCCESS|BUILDING|DEPLOYING)\s*\|/.test(l)) || '';
const deployment_id = (depLine.match(/[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}/) || [''])[0];
const deployment_status = (depLine.match(/\|\s*([A-Z]+)\s*\|/) || ['', ''])[1];
const deployed_at = (depLine.match(/\|\s*(\d{4}-\d{2}-\d{2} \d{2}:\d{2}:\d{2} [+-]\d{2}:\d{2})/) || ['', ''])[1];

// 2. build stamp from the live tail; falls back to an earlier sample of the same deployment (same id ⇒ same build)
let commit_short = '';
const lg = rw(['logs', '--service', CFG.service, '--json', '--lines', '300']);
for (const l of (lg.stdout || '').split(/\r?\n/)) { try { const j = JSON.parse(l); if (j.event === 'startup.build_stamp') commit_short = j.commit_short; } catch {} }
const arr = existsSync(CFG.samples_json) ? JSON.parse(readFileSync(CFG.samples_json, 'utf8')) : [];
if (!commit_short && deployment_id) { const prev = arr.filter((s) => s.deployment_id === deployment_id && s.commit_short).pop(); if (prev) commit_short = prev.commit_short.split(' ')[0]; }

// 3. bench via ssh stdin (inline `node -e` quoting breaks through the ssh relay)
const bench = rw(['ssh', '--service', CFG.service, '--', 'node', '-'], readFileSync(join(HERE, 'hostbench.js'), 'utf8'));
const line = (bench.stdout || '').split(/\r?\n/).find((l) => l.includes('"host_bench"'));
if (!line) { console.error('bench failed:\n' + (bench.stdout || '') + (bench.stderr || '')); process.exit(2); }
const b = JSON.parse(line);

const vd = verdictFor(b.cpu_loop_ms_min, arr.concat([{ deployment_id, bench_min_ms: b.cpu_loop_ms_min }]));
const sample = {
  ts: new Date().toISOString(), deployment_id, deployment_status, deployed_at, commit_short,
  bench_min_ms: b.cpu_loop_ms_min, bench_runs_ms: b.cpu_loop_ms, mem_scan_ms: b.mem_scan_ms,
  load1: Math.round(b.load1 * 10) / 10, nproc: b.nproc, model: b.model, steal_pct: b.steal_pct_since_boot,
  verdict: vd.verdict, threshold_ms: vd.threshold_ms, rule: vd.rule, note,
  capture_ms_per_kpx: null, // filled by hand from a real scan's unchanged-code capture clocks (calibration pair)
};

// 4. append (machine record + human table)
arr.push(sample);
writeFileSync(CFG.samples_json, JSON.stringify(arr, null, 1) + '\n');
const row = `| ${sample.ts.slice(0, 16).replace('T', ' ')} | \`${deployment_id.slice(0, 8) || '?'}\` | \`${commit_short || '?'}\` | **${sample.bench_min_ms}** | ${sample.load1} / ${sample.nproc} | ${sample.model.replace('Intel Xeon Processor ', '')} | **${sample.verdict}** | ${note} |\n`;
writeFileSync(CFG.log_md, (existsSync(CFG.log_md) ? readFileSync(CFG.log_md, 'utf8') : '# Railway host speed log\n\n| when (UTC) | deployment | build | CPU loop ms | load / cores | CPU | verdict | note |\n|---|---|---|---:|---|---|---|---|\n') + row);

console.log(`host bench — deploy ${deployment_id.slice(0, 8)} (${commit_short}, ${deployment_status} ${deployed_at}): CPU loop ${sample.bench_min_ms} ms (runs ${b.cpu_loop_ms.join('/')}), load ${sample.load1} on ${b.nproc} cores, ${b.model} ⇒ ${sample.verdict} (${vd.rule}; slow ref ${CFG.slow_ref_ms} ms)`);
