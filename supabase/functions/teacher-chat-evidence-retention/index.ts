import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "teacher-chat-evidence-quarantine";

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function adminKey(): string | null {
  const modern = Deno.env.get("SUPABASE_SECRET_KEYS");
  if (modern) {
    try {
      const parsed = JSON.parse(modern) as Record<string, string>;
      if (typeof parsed.default === "string" && parsed.default.length > 0) return parsed.default;
    } catch { /* fall through to legacy server-only key */ }
  }
  return Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? null;
}

Deno.serve(async (req: Request) => {
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);
  const cronSecret = req.headers.get("x-lmu-cron-secret")?.trim() ?? "";
  if (!/^[a-f0-9]{64}$/i.test(cronSecret)) return json({ ok: false, error: "unauthorized" }, 401);

  const url = Deno.env.get("SUPABASE_URL");
  const key = adminKey();
  if (!url || !key) {
    console.error("[teacher-evidence-retention] Supabase admin environment unavailable");
    return json({ ok: false, error: "server_not_configured" }, 503);
  }

  const supabase = createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authorized, error: authError } = await supabase.rpc("verify_lmu_retention_secret", { p_secret: cronSecret });
  if (authError || authorized !== true) {
    if (authError) console.error("[teacher-evidence-retention] scheduler authorization failed");
    return json({ ok: false, error: "forbidden" }, 403);
  }

  let body: { limit?: number; dryRun?: boolean } = {};
  try { body = await req.json(); } catch { /* use safe defaults */ }
  const requestedLimit = Number(body.limit ?? 100);
  const limit = Math.max(1, Math.min(Number.isFinite(requestedLimit) ? Math.trunc(requestedLimit) : 100, 500));
  if (body.dryRun === true) {
    const { data: count, error } = await supabase.rpc("count_due_teacher_chat_evidence_retention_candidates");
    if (error) {
      console.error("[teacher-evidence-retention] dry-run count failed");
      return json({ ok: false, error: "dry_run_count_failed" }, 500);
    }
    return json({ ok: true, dryRun: true, due: Number(count ?? 0), limit, deleted: 0, failed: 0 });
  }

  const claimToken = crypto.randomUUID();
  const { data: candidates, error: claimError } = await supabase.rpc(
    "claim_teacher_chat_evidence_retention_candidates",
    { p_limit: limit, p_claim_token: claimToken },
  );
  if (claimError) {
    console.error("[teacher-evidence-retention] candidate claim failed");
    return json({ ok: false, error: "claim_failed" }, 500);
  }

  const rows = Array.isArray(candidates) ? candidates : [];
  let deleted = 0;
  let failed = 0;
  const failures: Array<{ evidenceId: string; stage: string }> = [];

  for (const item of rows) {
    const evidenceId = String(item.evidence_id);
    const storagePath = String(item.storage_path ?? "");
    const reason = String(item.delete_reason ?? "retention_due");
    if (!storagePath) {
      failed += 1;
      failures.push({ evidenceId, stage: "missing_storage_path" });
      await supabase.rpc("release_teacher_chat_evidence_retention_claim", {
        p_evidence_id: evidenceId, p_claim_token: claimToken,
      });
      continue;
    }

    // Repeated remove is deliberately idempotent: an already-missing object can still be finalized.
    const { error: storageError } = await supabase.storage.from(BUCKET).remove([storagePath]);
    if (storageError) {
      failed += 1;
      failures.push({ evidenceId, stage: "storage_delete" });
      console.error("[teacher-evidence-retention] storage deletion failed", { evidenceId });
      await supabase.rpc("release_teacher_chat_evidence_retention_claim", {
        p_evidence_id: evidenceId, p_claim_token: claimToken,
      });
      continue;
    }

    const { data: finalized, error: finalizeError } = await supabase.rpc(
      "finalize_teacher_chat_evidence_retention",
      {
        p_evidence_id: evidenceId,
        p_storage_path: storagePath,
        p_claim_token: claimToken,
        p_reason: reason,
      },
    );
    if (finalizeError || finalized !== true) {
      failed += 1;
      failures.push({ evidenceId, stage: "metadata_finalize" });
      console.error("[teacher-evidence-retention] metadata finalization failed", { evidenceId });
      // Claim lease expires after 10 minutes if finalization itself failed; next run safely retries.
      continue;
    }
    deleted += 1;
  }

  console.log("[teacher-evidence-retention] run complete", { claimed: rows.length, deleted, failed });
  return json({ ok: failed === 0, candidates: rows.length, deleted, failed, failures }, failed === 0 ? 200 : 207);
});
