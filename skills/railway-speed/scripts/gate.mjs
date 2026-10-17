// Railway host-speed GATE: bench the live host; while not FAST, redeploy the SAME build and bench again.
// Redeploys are PRODUCTION WRITES. Run only under the operator's explicit standing authorization for this gate
// (same build, <= config.max_redeploys_per_run per run, in-flight-scan guard passed). Everything else stays confirm-gated.
//
// Usage: node gate.mjs [--max-redeploys N] [--dry-run] [--wait-busy-min 10] [--note "text"]
// Exit: 0 FAST · 1 cap reached (no attempt satisfied) · 4 busy (a job stayed in flight) · 5 redeploy failed/mismatch · 2 tool error
import { spawnSync } from 'node:child_process';
import { readFileSync, writeFileSync, existsSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

const HERE = dirname(fileURLToPath(import.meta.url));
if (!existsSync(join(HERE, 'config.json'))) { console.error('config.json missing beside gate.mjs — copy config.example.json'); process.exit(2); }
const CFG = JSON.parse(readFileSync(join(HERE, 'config.json'), 'utf8'));
const argv = process.argv.slice(2);
const opt = (k, d) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : d; };
const MAX = Number(opt('--max-redeploys', CFG.max_redeploys_per_run ?? 3));
const DRY = argv.includes('--dry-run');
const WAIT_BUSY_MIN = Number(opt('--wait-busy-min', 10));
const NOTE = opt('--note', '');

const sleep = (ms) => Atomics.wait(new Int32Array(new SharedArrayBuffer(4)), 0, 0, ms);
const rw = (args, input) => spawnSync(['railway', ...args].join(' '), { cwd: CFG.linked_dir, input, encoding: 'utf8', shell: true, maxBuffer: 64 << 20 });
const log = (s) => { console.log(s); writeFileSync(CFG.gate_runs_md, (existsSync(CFG.gate_runs_md) ? readFileSync(CFG.gate_runs_md, 'utf8') : '# gate.mjs runs\n\n') + `${new Date().toISOString().slice(0, 19)}Z ${s}\n`); };

function tailRows(n) { const r = rw(['logs', '--service', CFG.service, '--json', '--lines', String(n)]); const rows = []; for (const l of (r.stdout || '').split(/\r?\n/)) { try { rows.push(JSON.parse(l)); } catch {} } return rows; }
// A job is in flight when the last `job_start` (one with a job_id) is later than the last `job.summary`.
function jobInFlight() { let s = null, e = null; for (const r of tailRows(400)) { if (r.event === 'job_start' && r.job_id) s = r.timestamp; if (r.event === 'job.summary') e = r.timestamp; } return !!(s && (!e || s > e)); }
function guard() { const until = Date.now() + WAIT_BUSY_MIN * 60_000; while (jobInFlight()) { if (Date.now() > until) { log(`ABORT busy — a job stayed in flight for ${WAIT_BUSY_MIN} min; no redeploy`); process.exit(4); } console.log('a job is in flight — waiting 30 s'); sleep(30_000); } }
function deployments() { const r = rw(['deployment', 'list', '--service', CFG.service]); return (r.stdout || '').split(/\r?\n/).map((l) => l.match(/([0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12})\s*\|\s*([A-Z]+)\s*\|\s*(\S+ \S+ \S+)/)).filter(Boolean).map((m) => ({ id: m[1], status: m[2], at: m[3] })); }
function bench(note) {
  const r = spawnSync(process.execPath, [join(HERE, 'bench-now.mjs'), '--note', note], { encoding: 'utf8', maxBuffer: 16 << 20 });
  const line = (r.stdout || '').split(/\r?\n/).find((l) => l.startsWith('host bench'));
  if (!line) { log('ABORT bench failed: ' + (r.stdout || '') + (r.stderr || '')); process.exit(2); }
  return { line, sample: JSON.parse(readFileSync(CFG.samples_json, 'utf8')).at(-1) };
}
function redeploy(prevId, prevCommit) {
  if (DRY) { log(`DRY-RUN — would run: railway redeploy -y --service ${CFG.service}`); return null; }
  const r = rw(['redeploy', '-y', '--service', CFG.service]);
  log(`redeploy issued (exit ${r.status}) ${((r.stdout || '') + (r.stderr || '')).replace(/\s+/g, ' ').slice(0, 200)}`);
  const until = Date.now() + 10 * 60_000; let cur = null;
  while (Date.now() < until) {
    sleep(15_000);
    cur = deployments().find((x) => x.id !== prevId) || null;
    if (cur && cur.status === 'SUCCESS') break;
    if (cur && /FAILED|CRASHED|REMOVED/.test(cur.status)) { log(`ABORT new deployment ${cur.id.slice(0, 8)} ${cur.status}`); process.exit(5); }
    console.log(`waiting: ${cur ? cur.id.slice(0, 8) + ' ' + cur.status : 'no new deployment row yet'}`);
  }
  if (!cur || cur.status !== 'SUCCESS') { log('ABORT redeploy did not reach SUCCESS in 10 min'); process.exit(5); }
  sleep(30_000); // warm-up
  const commit = tailRows(100).find((r) => r.event === 'startup.build_stamp')?.commit_short || '?';
  log(`new deployment ${cur.id.slice(0, 8)} SUCCESS ${cur.at}; build stamp ${commit}`);
  if (prevCommit && commit !== '?' && commit !== prevCommit) { log(`ABORT build changed across redeploy (${prevCommit} → ${commit}) — not a same-build redeploy`); process.exit(5); }
  return cur;
}

log(`--- gate run start${DRY ? ' (DRY-RUN)' : ''}: max ${MAX} redeploys${NOTE ? ' — ' + NOTE : ''}`);
const runRows = [];
let attempt = 0;
for (;;) {
  guard();
  const { line, sample } = bench(`gate attempt ${attempt}${DRY ? ' dry-run' : ''}${NOTE ? ' — ' + NOTE : ''}`);
  runRows.push({ attempt, dep: sample.deployment_id.slice(0, 8), bench: sample.bench_min_ms, load1: sample.load1, verdict: sample.verdict });
  log(line);
  if (sample.verdict === 'FAST') { log(`SATISFIED on attempt ${attempt}: FAST host (deployment ${sample.deployment_id.slice(0, 8)}, ${sample.bench_min_ms} ms; ${sample.rule})`); break; }
  if (attempt >= MAX) {
    const best = runRows.reduce((a, b) => (b.bench < a.bench ? b : a));
    log(`cap reached: ${MAX} redeploys, no attempt satisfied — staying on the last host ${sample.deployment_id.slice(0, 8)} (${sample.bench_min_ms} ms); best of this run was attempt ${best.attempt} (${best.dep}, ${best.bench} ms)${best.dep !== sample.deployment_id.slice(0, 8) ? ' — a redeploy cannot return to a specific box' : ''}. Retry due ≥ ${new Date(Date.now() + 24 * 3600e3).toISOString().slice(0, 16)}Z (24 h rule).`);
    break;
  }
  attempt += 1;
  if (!redeploy(sample.deployment_id, (sample.commit_short || '').split(' ')[0])) break; // dry-run stops after one bench
}
console.log('\n| attempt | deployment | CPU loop ms | load1 | verdict |\n|---|---|---:|---:|---|');
for (const r of runRows) console.log(`| ${r.attempt} | \`${r.dep}\` | ${r.bench} | ${r.load1} | ${r.verdict} |`);
process.exit(runRows.at(-1).verdict === 'FAST' ? 0 : DRY ? 0 : 1);
