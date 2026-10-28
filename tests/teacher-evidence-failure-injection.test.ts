import { assertEquals, assert } from "jsr:@std/assert@1";
import { handleScanRequest } from "../supabase/functions/teacher-chat-evidence-scan/index.ts";
import { handleRetentionRequest } from "../supabase/functions/teacher-chat-evidence-retention/index.ts";

const CRON = "a".repeat(64);
const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]);
const HASH = await (async () => {
  const digest = await crypto.subtle.digest("SHA-256", PNG);
  return Array.from(new Uint8Array(digest), (b) => b.toString(16).padStart(2, "0")).join("");
})();
const envForScan = {
  get(name: string) {
    return ({
      SUPABASE_URL: "https://supabase.invalid",
      SUPABASE_SERVICE_ROLE_KEY: "test-only-key",
      LMU_CONTENT_SCANNER_URL: "https://scanner.invalid/",
      LMU_CONTENT_SCANNER_TOKEN: "test-only-token",
    } as Record<string, string>)[name] ?? null;
  },
};
const envForRetention = {
  get(name: string) {
    return ({
      SUPABASE_URL: "https://supabase.invalid",
      SUPABASE_SERVICE_ROLE_KEY: "test-only-key",
    } as Record<string, string>)[name] ?? null;
  },
};
const request = (url: string, body: unknown = {}) => new Request(url, {
  method: "POST",
  headers: { "x-lmu-cron-secret": CRON, "content-type": "application/json" },
  body: JSON.stringify(body),
});

function scannerHarness(options: {
  downloadError?: boolean;
  bytes?: Uint8Array;
  scannerResponse?: Response;
  scannerThrows?: Error;
  completionError?: boolean;
  finalStatus?: string;
  attempt?: number;
} = {}) {
  const calls: Array<{ name: string; args?: Record<string, unknown> }> = [];
  let scannerCalls = 0;
  const client = {
    async rpc(name: string, args?: Record<string, unknown>) {
      calls.push({ name, args });
      if (name === "verify_lmu_retention_secret") return { data: true, error: null };
      if (name === "claim_teacher_chat_evidence_scan_candidates") return {
        data: [{
          evidence_id: "evidence-1", storage_path: "teacher/class/learner/file.png",
          mime_type: "image/png", file_size_bytes: (options.bytes ?? PNG).byteLength,
          attempt_number: options.attempt ?? 1,
        }], error: null,
      };
      if (name === "complete_teacher_chat_evidence_scan") {
        return options.completionError
          ? { data: null, error: { message: "injected completion failure" } }
          : { data: options.finalStatus ?? (args?.p_verdict === "clean" ? "scan_passed" : ["malicious", "invalid"].includes(String(args?.p_verdict)) ? "scan_failed" : "pending_scan"), error: null };
      }
      return { data: null, error: { message: "unexpected RPC " + name } };
    },
    storage: {
      from(bucket: string) {
        assertEquals(bucket, "teacher-chat-evidence-quarantine");
        return {
          async download(path: string) {
            assertEquals(path, "teacher/class/learner/file.png");
            if (options.downloadError) return { data: null, error: { message: "injected download failure" } };
            return { data: new Blob([(options.bytes ?? PNG).slice().buffer as ArrayBuffer], { type: "image/png" }), error: null };
          },
        };
      },
    },
  };
  const fetchImpl = async (_input: RequestInfo | URL, _init?: RequestInit) => {
    scannerCalls += 1;
    if (options.scannerThrows) throw options.scannerThrows;
    return options.scannerResponse ?? new Response(JSON.stringify({
      verdict: "clean", sha256: HASH, engine: "fixture", version: "1",
    }), { status: 200, headers: { "content-type": "application/json" } });
  };
  return {
    calls,
    scannerCalls: () => scannerCalls,
    run: (req = request("https://worker.invalid/")) => handleScanRequest(req, {
      env: envForScan as never,
      createClientImpl: (() => client) as never,
      fetchImpl,
    }),
  };
}

function retentionHarness(options: {
  removeErrors?: number;
  finalizeError?: boolean;
  finalizeValue?: boolean;
  missingPath?: boolean;
} = {}) {
  const calls: string[] = [];
  let removeCalls = 0;
  const client = {
    async rpc(name: string, _args?: Record<string, unknown>) {
      calls.push(name);
      if (name === "verify_lmu_retention_secret") return { data: true, error: null };
      if (name === "claim_teacher_chat_evidence_retention_candidates") return {
        data: [{
          evidence_id: "evidence-retention-1",
          storage_path: options.missingPath ? "" : "teacher/class/learner/file.png",
          delete_reason: "retention_due",
        }], error: null,
      };
      if (name === "release_teacher_chat_evidence_retention_claim") return { data: true, error: null };
      if (name === "finalize_teacher_chat_evidence_retention") {
        if (options.finalizeError) return { data: null, error: { message: "injected finalization failure" } };
        return { data: options.finalizeValue ?? true, error: null };
      }
      return { data: null, error: { message: "unexpected RPC " + name } };
    },
    storage: {
      from(bucket: string) {
        assertEquals(bucket, "teacher-chat-evidence-quarantine");
        return {
          async remove(paths: string[]) {
            removeCalls += 1;
            assertEquals(paths, ["teacher/class/learner/file.png"]);
            if (removeCalls <= (options.removeErrors ?? 0)) return { error: { message: "injected Storage deletion failure" } };
            return { error: null };
          },
        };
      },
    },
  };
  return {
    calls,
    removeCalls: () => removeCalls,
    run: () => handleRetentionRequest(request("https://worker.invalid/"), {
      env: envForRetention as never,
      createClientImpl: (() => client) as never,
    }),
  };
}

Deno.test("scanner timeout fails closed and finalizes as unknown/pending", async () => {
  const h = scannerHarness({ scannerThrows: new DOMException("injected timeout", "AbortError") });
  const response = await h.run();
  const body = await response.json();
  assertEquals(response.status, 207);
  assertEquals(body.passed, 0);
  assertEquals(body.deferred, 1);
  assertEquals(h.scannerCalls(), 1);
  const completion = h.calls.find((c) => c.name === "complete_teacher_chat_evidence_scan")!;
  assertEquals(completion.args?.p_verdict, "unknown");
  assertEquals(completion.args?.p_result_code, "scanner_timeout");
  assertEquals(completion.args?.p_engine, "unknown");
});

Deno.test("scanner malformed JSON response fails closed", async () => {
  const h = scannerHarness({ scannerResponse: new Response("{not-json", { status: 200 }) });
  const response = await h.run();
  const body = await response.json();
  assertEquals(response.status, 207);
  assertEquals(body.deferred, 1);
  const completion = h.calls.find((c) => c.name === "complete_teacher_chat_evidence_scan")!;
  assertEquals(completion.args?.p_verdict, "unknown");
  assertEquals(completion.args?.p_result_code, "scan_processing_error");
});

Deno.test("scanner oversized response fails closed without accepting verdict", async () => {
  const h = scannerHarness({ scannerResponse: new Response("x".repeat(5000), { status: 200 }) });
  const response = await h.run();
  const body = await response.json();
  assertEquals(response.status, 207);
  assertEquals(body.deferred, 1);
  const completion = h.calls.find((c) => c.name === "complete_teacher_chat_evidence_scan")!;
  assertEquals(completion.args?.p_verdict, "unknown");
  assertEquals(completion.args?.p_result_code, "scanner_response_too_large");
});

Deno.test("scanner hash mismatch is never accepted as clean", async () => {
  const h = scannerHarness({ scannerResponse: new Response(JSON.stringify({
    verdict: "clean", sha256: "0".repeat(64), engine: "fixture",
  }), { status: 200 }) });
  const response = await h.run();
  const body = await response.json();
  assertEquals(response.status, 207);
  assertEquals(body.deferred, 1);
  const completion = h.calls.find((c) => c.name === "complete_teacher_chat_evidence_scan")!;
  assertEquals(completion.args?.p_verdict, "unknown");
  assertEquals(completion.args?.p_result_code, "scanner_hash_mismatch");
});

Deno.test("scanner explicit malicious verdict is finalized as failure, not passed", async () => {
  const h = scannerHarness({ scannerResponse: new Response(JSON.stringify({
    verdict: "malicious", sha256: HASH, engine: "fixture",
  }), { status: 200 }) });
  const response = await h.run();
  const body = await response.json();
  assertEquals(response.status, 200);
  assertEquals(body.failed, 1);
  const completion = h.calls.find((c) => c.name === "complete_teacher_chat_evidence_scan")!;
  assertEquals(completion.args?.p_verdict, "malicious");
  assertEquals(completion.args?.p_result_code, "malware_detected");
});

Deno.test("invalid file signature is rejected before calling external scanner", async () => {
  const h = scannerHarness({ bytes: new Uint8Array([1, 2, 3, 4, 5, 6, 7, 8]) });
  const response = await h.run();
  const body = await response.json();
  assertEquals(response.status, 200);
  assertEquals(body.failed, 1);
  assertEquals(h.scannerCalls(), 0);
  const completion = h.calls.find((c) => c.name === "complete_teacher_chat_evidence_scan")!;
  assertEquals(completion.args?.p_verdict, "invalid");
  assertEquals(completion.args?.p_result_code, "signature_mismatch");
});

Deno.test("scanner finalization failure reports deferred and never marks passed", async () => {
  const h = scannerHarness({ completionError: true });
  const response = await h.run();
  const body = await response.json();
  assertEquals(response.status, 207);
  assertEquals(body.deferred, 1);
  assertEquals(body.outcomes[0].outcome, "finalization_deferred");
});

Deno.test("retention Storage deletion failure releases claim and does not finalize", async () => {
  const h = retentionHarness({ removeErrors: 1 });
  const response = await h.run();
  const body = await response.json();
  assertEquals(response.status, 207);
  assertEquals(body.failed, 1);
  assertEquals(body.failures[0].stage, "storage_delete");
  assert(h.calls.includes("release_teacher_chat_evidence_retention_claim"));
  assert(!h.calls.includes("finalize_teacher_chat_evidence_retention"));
});

Deno.test("retention retry can succeed after injected Storage failure", async () => {
  let removeCalls = 0;
  const calls: string[] = [];
  const client = {
    async rpc(name: string) {
      calls.push(name);
      if (name === "verify_lmu_retention_secret") return { data: true, error: null };
      if (name === "claim_teacher_chat_evidence_retention_candidates") return { data: [{
        evidence_id: "retry-evidence", storage_path: "teacher/class/learner/retry.png", delete_reason: "retention_due",
      }], error: null };
      if (name === "release_teacher_chat_evidence_retention_claim") return { data: true, error: null };
      if (name === "finalize_teacher_chat_evidence_retention") return { data: true, error: null };
      return { data: null, error: { message: "unexpected RPC" } };
    },
    storage: { from() { return { async remove() {
      removeCalls += 1;
      return removeCalls === 1 ? { error: { message: "first delete fails" } } : { error: null };
    } }; } },
  };
  const run = () => handleRetentionRequest(request("https://worker.invalid/"), {
    env: envForRetention as never, createClientImpl: (() => client) as never,
  });
  const first = await run();
  assertEquals(first.status, 207);
  assert(calls.includes("release_teacher_chat_evidence_retention_claim"));
  calls.length = 0;
  const second = await run();
  const body = await second.json();
  assertEquals(second.status, 200);
  assertEquals(body.deleted, 1);
  assert(calls.includes("finalize_teacher_chat_evidence_retention"));
  assertEquals(removeCalls, 2);
});

Deno.test("retention finalization failure preserves retry path and reports failure", async () => {
  const h = retentionHarness({ finalizeError: true });
  const response = await h.run();
  const body = await response.json();
  assertEquals(response.status, 207);
  assertEquals(body.failed, 1);
  assertEquals(body.failures[0].stage, "metadata_finalize");
  assert(!h.calls.includes("release_teacher_chat_evidence_retention_claim"));
  assert(h.calls.includes("finalize_teacher_chat_evidence_retention"));
});

Deno.test("retention dry run never removes objects", async () => {
  let removeCalled = false;
  const client = {
    async rpc(name: string) {
      if (name === "verify_lmu_retention_secret") return { data: true, error: null };
      if (name === "count_due_teacher_chat_evidence_retention_candidates") return { data: 3, error: null };
      return { data: null, error: { message: "unexpected RPC" } };
    },
    storage: { from() { return { async remove() { removeCalled = true; return { error: null }; } }; } },
  };
  const response = await handleRetentionRequest(request("https://worker.invalid/", { dryRun: true }), {
    env: envForRetention as never, createClientImpl: (() => client) as never,
  });
  const body = await response.json();
  assertEquals(response.status, 200);
  assertEquals(body.dryRun, true);
  assertEquals(body.due, 3);
  assertEquals(body.deleted, 0);
  assertEquals(removeCalled, false);
});


Deno.test("Storage delete succeeds, metadata finalization fails, retry safely finalizes an already-missing object", async () => {
  const path = "teacher/class/learner/finalize-retry.png";
  let objectExists = true;
  let removeCalls = 0;
  let claimCalls = 0;
  let finalizeCalls = 0;
  const finalizeTokens: string[] = [];
  const claimTokens: string[] = [];
  const deleteExistedBefore: boolean[] = [];
  const deletePaths: string[] = [];
  const rpcCalls: string[] = [];
  const client = {
    async rpc(name: string, args?: Record<string, unknown>) {
      rpcCalls.push(name);
      if (name === "verify_lmu_retention_secret") return { data: true, error: null };
      if (name === "claim_teacher_chat_evidence_retention_candidates") {
        claimCalls += 1;
        claimTokens.push(String(args?.p_claim_token));
        // Model lease expiry/reclaim after the first worker crashes at metadata finalization.
        return { data: [{
          evidence_id: "retry-after-finalize-failure",
          storage_path: path,
          delete_reason: "retention_due",
          claim_token: claimCalls === 1 ? "worker-token-1" : "worker-token-2",
          attempt_number: claimCalls,
        }], error: null };
      }
      if (name === "finalize_teacher_chat_evidence_retention") {
        finalizeCalls += 1;
        finalizeTokens.push(String(args?.p_claim_token));
        if (finalizeCalls === 1) {
          // Simulate RPC/transaction failure after Storage has already deleted the object.
          return { data: null, error: { message: "injected metadata transaction failure" } };
        }
        return { data: true, error: null };
      }
      if (name === "release_teacher_chat_evidence_retention_claim") return { data: true, error: null };
      return { data: null, error: { message: "unexpected RPC " + name } };
    },
    storage: {
      from(bucket: string) {
        assertEquals(bucket, "teacher-chat-evidence-quarantine");
        return {
          async remove(paths: string[]) {
            removeCalls += 1;
            deletePaths.push(...paths);
            assertEquals(paths, [path]);
            deleteExistedBefore.push(objectExists);
            // Model idempotent delete semantics: removing an already-absent object is successful.
            objectExists = false;
            return { error: null };
          },
        };
      },
    },
  };
  const run = () => handleRetentionRequest(request("https://worker.invalid/"), {
    env: envForRetention as never,
    createClientImpl: (() => client) as never,
  });

  const first = await run();
  const firstBody = await first.json();
  assertEquals(first.status, 207);
  assertEquals(firstBody.failed, 1);
  assertEquals(firstBody.failures[0].stage, "metadata_finalize");
  assertEquals(objectExists, false, "Storage deletion succeeded before metadata finalization failed");
  assertEquals(finalizeCalls, 1);
  assertEquals(rpcCalls.filter((name) => name === "release_teacher_chat_evidence_retention_claim").length, 0,
    "failed finalization must retain the lease until expiry rather than releasing early");

  // The next invocation represents a worker after lease expiry. Storage removal is repeated for
  // the exact same path; metadata finalization then succeeds using the new claim token.
  const second = await run();
  const secondBody = await second.json();
  assertEquals(second.status, 200);
  assertEquals(secondBody.deleted, 1);
  assertEquals(secondBody.failed, 0);
  assertEquals(objectExists, false);
  assertEquals(removeCalls, 2);
  assertEquals(deletePaths, [path, path]);
  assertEquals(deleteExistedBefore, [true, false]);
  assertEquals(finalizeCalls, 2);
  assertEquals(finalizeTokens, claimTokens);
  assertEquals(new Set(claimTokens).size, 2, "each worker invocation uses a fresh claim token");
  assertEquals(claimCalls, 2);
});
