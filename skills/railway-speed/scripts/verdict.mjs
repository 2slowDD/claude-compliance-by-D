// Host-speed verdict, shared by bench-now.mjs (and testable on its own).
//
// 1. CPU-model rule first: a model string matching any entry of cfg.slow_cpu_models (case-insensitive substring)
//    is SLOW whatever the score. Default ["Icelake"]: the generic hypervisor string seen on rented cloud-burst
//    capacity, measured ~1.5–2.5× slower than the platform's own hardware for the life of the deployment.
// 2. Otherwise relative: with >= cfg.min_deployments_for_median distinct deployments sampled, FAST = at or below
//    the median of the per-deployment best scores ("the better half suffices"); with fewer, CALIBRATING.
export function verdictFor(benchMs, model, samples, cfg = {}) {
  const slowModels = cfg.slow_cpu_models ?? ['Icelake'];
  const hit = slowModels.find((m) => m && String(model || '').toLowerCase().includes(String(m).toLowerCase()));
  if (hit) return { verdict: 'SLOW', threshold_ms: null, rule: `CPU model matches "${hit}" (slow_cpu_models) ⇒ SLOW regardless of score` };
  const best = new Map();
  for (const s of samples) if (s.deployment_id) best.set(s.deployment_id, Math.min(best.get(s.deployment_id) ?? Infinity, s.bench_min_ms));
  const v = [...best.values()].sort((a, b) => a - b);
  const min = cfg.min_deployments_for_median ?? 4;
  if (v.length < min) return { verdict: 'CALIBRATING', threshold_ms: null, rule: `${v.length}/${min} deployments sampled` };
  const med = v.length % 2 ? v[(v.length - 1) / 2] : (v[v.length / 2 - 1] + v[v.length / 2]) / 2;
  return { verdict: benchMs <= med ? 'FAST' : 'SLOW', threshold_ms: med, rule: `median of ${v.length} deployments' best = ${med} ms` };
}
