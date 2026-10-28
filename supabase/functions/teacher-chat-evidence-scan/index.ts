import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const BUCKET = "teacher-chat-evidence-quarantine";
const MAX_BYTES = 20 * 1024 * 1024;
const ALLOWED_MIME = new Set(["image/jpeg", "image/png", "image/webp", "application/pdf"]);

function json(body: unknown, status = 200) {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8", "cache-control": "no-store" },
  });
}

function adminKey(env: typeof Deno.env = Deno.env): string | null {
  const modern = env.get("SUPABASE_SECRET_KEYS");
  if (modern) {
    try {
      const parsed = JSON.parse(modern) as Record<string, string>;
      if (typeof parsed.default === "string" && parsed.default.length > 0) return parsed.default;
    } catch { /* fall through to legacy server-only key */ }
  }
  return env.get("SUPABASE_SERVICE_ROLE_KEY") ?? null;
}

function matchesSignature(bytes: Uint8Array, mime: string): boolean {
  if (mime === "application/pdf") return bytes.length >= 5 && new TextDecoder().decode(bytes.slice(0, 5)) === "%PDF-";
  if (mime === "image/png") {
    const sig = [0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a];
    return bytes.length >= sig.length && sig.every((b, i) => bytes[i] === b);
  }
  if (mime === "image/jpeg") return bytes.length >= 3 && bytes[0] === 0xff && bytes[1] === 0xd8 && bytes[2] === 0xff;
  if (mime === "image/webp") {
    return bytes.length >= 12 &&
      new TextDecoder().decode(bytes.slice(0, 4)) === "RIFF" &&
      new TextDecoder().decode(bytes.slice(8, 12)) === "WEBP";
  }
  return false;
}

async function sha256Hex(bytes: Uint8Array): Promise<string> {
  const digest = await crypto.subtle.digest("SHA-256", new Uint8Array(bytes).buffer as ArrayBuffer);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
}

async function readBoundedResponseText(response: Response, maxBytes: number): Promise<string | null> {
  const reader = response.body?.getReader();
  if (!reader) return "";
  const chunks: Uint8Array[] = [];
  let total = 0;
  try {
    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      total += value.byteLength;
      if (total > maxBytes) {
        try { await reader.cancel(); } catch { /* response is already rejected */ }
        return null;
      }
      chunks.push(value);
    }
  } finally {
    reader.releaseLock();
  }
  const bytes = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder("utf-8", { fatal: true }).decode(bytes);
}

export async function handleScanRequest(
  req: Request,
  overrides: { env?: typeof Deno.env; createClientImpl?: typeof createClient; fetchImpl?: typeof fetch } = {},
) {
  const env = overrides.env ?? Deno.env;
  const createClientImpl = overrides.createClientImpl ?? createClient;
  const fetchImpl = overrides.fetchImpl ?? fetch;
  if (req.method !== "POST") return json({ ok: false, error: "method_not_allowed" }, 405);

  const cronSecret = req.headers.get("x-lmu-cron-secret")?.trim() ?? "";
  if (!/^[a-f0-9]{64}$/i.test(cronSecret)) return json({ ok: false, error: "unauthorized" }, 401);

  const url = env.get("SUPABASE_URL");
  const key = adminKey(env);
  const scannerUrl = env.get("LMU_CONTENT_SCANNER_URL")?.trim() ?? "";
  const scannerToken = env.get("LMU_CONTENT_SCANNER_TOKEN") ?? "";
  if (!url || !key || !scannerUrl || !scannerToken) {
    console.error("[teacher-evidence-scan] server configuration missing");
    return json({ ok: false, error: "server_not_configured" }, 503);
  }

  let scanner: URL;
  try {
    scanner = new URL(scannerUrl);
    if (scanner.protocol !== "https:" || scanner.username || scanner.password || scanner.search || scanner.hash) {
      return json({ ok: false, error: "scanner_endpoint_must_be_https_base_url" }, 503);
    }
  } catch {
    return json({ ok: false, error: "scanner_endpoint_invalid" }, 503);
  }

  const supabase = createClientImpl(url, key, { global: { fetch: fetchImpl }, auth: { persistSession: false, autoRefreshToken: false } });
  const { data: authorized, error: authError } = await supabase.rpc("verify_lmu_retention_secret", { p_secret: cronSecret });
  if (authError || authorized !== true) {
    if (authError) console.error("[teacher-evidence-scan] scheduler authorization failed");
    return json({ ok: false, error: "forbidden" }, 403);
  }

  let body: { dryRun?: boolean } = {};
  try { body = await req.json(); } catch { /* use safe defaults */ }
  // Claims have a 10-minute lease; process one item per invocation so later items cannot age out while queued.
  const limit = 1;
  if (body.dryRun === true) {
    return json({ ok: false, error: "scanner_dry_run_not_supported" }, 400);
  }
  const claimToken = crypto.randomUUID();
  const { data: candidates, error: claimError } = await supabase.rpc(
    "claim_teacher_chat_evidence_scan_candidates",
    { p_limit: limit, p_claim_token: claimToken },
  );
  if (claimError) {
    console.error("[teacher-evidence-scan] candidate claim failed");
    return json({ ok: false, error: "claim_failed" }, 500);
  }
  const rows = Array.isArray(candidates) ? candidates : [];
  let passed = 0;
  let failed = 0;
  let deferred = 0;
  const outcomes: Array<{ id: string; outcome: string }> = [];

  for (const item of rows) {
    const id = String(item.evidence_id);
    const path = String(item.storage_path ?? "");
    const mime = String(item.mime_type ?? "");
    const expectedSize = Number(item.file_size_bytes);
    let verdict: "clean" | "malicious" | "invalid" | "unknown" = "unknown";
    let resultCode = "scanner_unavailable";
    let engine = "unknown";
    let engineVersion = "unknown";

    try {
      if (!ALLOWED_MIME.has(mime) || !path || !Number.isSafeInteger(expectedSize) || expectedSize < 1 || expectedSize > MAX_BYTES) {
        verdict = "invalid";
        resultCode = "metadata_invalid";
      } else {
        const { data: file, error: downloadError } = await supabase.storage.from(BUCKET).download(path);
        if (downloadError || !file) {
          resultCode = "quarantine_download_failed";
        } else if (file.size !== expectedSize || file.size > MAX_BYTES) {
          verdict = "invalid";
          resultCode = "stored_size_mismatch";
        } else {
          const bytes = new Uint8Array(await file.arrayBuffer());
          if (bytes.byteLength !== expectedSize || !matchesSignature(bytes, mime)) {
            verdict = "invalid";
            resultCode = "signature_mismatch";
          } else {
            const hash = await sha256Hex(bytes);
            const controller = new AbortController();
            const timeout = setTimeout(() => controller.abort(), 60_000);
            try {
              const response = await fetchImpl(new URL("scan", scanner.toString().endsWith("/") ? scanner : new URL(scanner.toString() + "/")), {
                method: "POST",
                redirect: "error",
                signal: controller.signal,
                headers: {
                  "authorization": `Bearer ${scannerToken}`,
                  "content-type": "application/octet-stream",
                  "x-lmu-content-type": mime,
                  "x-lmu-content-sha256": hash,
                  "x-lmu-job-id": crypto.randomUUID(),
                },
                body: bytes,
              });
              if (!response.ok) {
                resultCode = "scanner_http_error";
              } else {
                const responseText = await readBoundedResponseText(response, 4096);
                if (responseText === null) {
                  resultCode = "scanner_response_too_large";
                } else {
                  const result = JSON.parse(responseText) as {
                    verdict?: string; sha256?: string; engine?: string; version?: string; resultCode?: string;
                  };
                  engine = typeof result.engine === "string" ? result.engine.slice(0, 100) : "configured-scanner";
                  engineVersion = typeof result.version === "string" ? result.version.slice(0, 100) : "unknown";
                  if (result.sha256?.toLowerCase() !== hash) {
                    verdict = "unknown";
                    resultCode = "scanner_hash_mismatch";
                  } else if (result.verdict === "clean") {
                    verdict = "clean";
                    resultCode = "clean";
                  } else if (result.verdict === "malicious") {
                    verdict = "malicious";
                    resultCode = "malware_detected";
                  } else if (result.verdict === "invalid") {
                    verdict = "invalid";
                    resultCode = "content_invalid";
                  } else {
                    verdict = "unknown";
                    resultCode = "scanner_unknown_verdict";
                  }
                }
              }
            } finally {
              clearTimeout(timeout);
            }
          }
        }
      }
    } catch (error) {
      // Never log document bytes, filenames, tokens, scanner response bodies, or learner content.
      resultCode = error instanceof DOMException && error.name === "AbortError"
        ? "scanner_timeout"
        : "scan_processing_error";
    }

    const { data: finalStatus, error: completeError } = await supabase.rpc(
      "complete_teacher_chat_evidence_scan",
      {
        p_evidence_id: id,
        p_claim_token: claimToken,
        p_verdict: verdict,
        p_engine: engine,
        p_engine_version: engineVersion,
        p_result_code: resultCode,
      },
    );
    if (completeError) {
      console.error("[teacher-evidence-scan] result finalization failed", { evidenceId: id });
      deferred += 1; // Lease expiry permits a bounded retry; no file is made available.
      outcomes.push({ id, outcome: "finalization_deferred" });
      continue;
    }
    if (finalStatus === "scan_passed") passed += 1;
    else if (finalStatus === "scan_failed") failed += 1;
    else deferred += 1;
    outcomes.push({ id, outcome: String(finalStatus) });
  }

  console.log("[teacher-evidence-scan] run complete", { claimed: rows.length, passed, failed, deferred });
  return json({ ok: deferred === 0, candidates: rows.length, passed, failed, deferred, outcomes }, deferred === 0 ? 200 : 207);
}

if (import.meta.main) Deno.serve((req: Request) => handleScanRequest(req));
