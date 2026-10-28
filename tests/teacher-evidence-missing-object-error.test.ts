import { assertEquals, assert } from "jsr:@std/assert@1";
import { handleRetentionRequest } from "../supabase/functions/teacher-chat-evidence-retention/index.ts";

const CRON = "a".repeat(64);
const path = "fixture-only/worker-retry-after-absent-object.txt";
const env = {
  get(name: string) {
    return ({
      SUPABASE_URL: "https://supabase.invalid",
      SUPABASE_SERVICE_ROLE_KEY: "test-only-key",
    } as Record<string, string>)[name] ?? null;
  },
};
const request = () => new Request("https://worker.invalid/", {
  method: "POST",
  headers: { "x-lmu-cron-secret": CRON, "content-type": "application/json" },
  body: "{}",
});

Deno.test("worker fails closed when retry remove reports already-absent object as Storage error", async () => {
  let objectExists = true;
  let claimCount = 0;
  let removeCount = 0;
  let finalizeCount = 0;
  let releaseCount = 0;
  const finalizeTokens: string[] = [];
  const client = {
    async rpc(name: string, args?: Record<string, unknown>) {
      if (name === "verify_lmu_retention_secret") return { data: true, error: null };
      if (name === "claim_teacher_chat_evidence_retention_candidates") {
        claimCount += 1;
        return { data: [{
          evidence_id: "fixture-evidence",
          storage_path: path,
          delete_reason: "retention_due",
          claim_token: `fixture-worker-${claimCount}`,
        }], error: null };
      }
      if (name === "finalize_teacher_chat_evidence_retention") {
        finalizeCount += 1;
        finalizeTokens.push(String(args?.p_claim_token));
        if (finalizeCount === 1) return { data: null, error: { message: "injected metadata finalization failure" } };
        return { data: true, error: null };
      }
      if (name === "release_teacher_chat_evidence_retention_claim") {
        releaseCount += 1;
        return { data: true, error: null };
      }
      return { data: null, error: { message: `unexpected RPC ${name}` } };
    },
    storage: {
      from(bucket: string) {
        assertEquals(bucket, "teacher-chat-evidence-quarantine");
        return {
          async remove(paths: string[]) {
            assertEquals(paths, [path]);
            removeCount += 1;
            if (objectExists) {
              objectExists = false;
              return { error: null };
            }
            // Representative Storage API "object absent" error shape. This is injected, not a
            // claim about the real API; the separate local-Storage workflow probes that behavior.
            return { error: { name: "StorageApiError", message: "Object not found", status: 404, statusCode: "404", error: "not_found" } };
          },
        };
      },
    },
  };
  const run = () => handleRetentionRequest(request(), {
    env: env as never,
    createClientImpl: (() => client) as never,
  });

  const first = await run();
  const firstBody = await first.json();
  assertEquals(first.status, 207);
  assertEquals(firstBody.failures[0].stage, "metadata_finalize");
  assertEquals(objectExists, false);
  assertEquals(finalizeCount, 1);

  const second = await run();
  const secondBody = await second.json();
  assertEquals(second.status, 207);
  assertEquals(secondBody.failed, 1);
  assertEquals(secondBody.failures[0].stage, "storage_delete");
  assertEquals(removeCount, 2);
  assertEquals(finalizeCount, 1, "worker must not finalize metadata after an unclassified Storage error");
  assertEquals(releaseCount, 1, "worker releases claim after Storage error so retry can happen");
  assertEquals(finalizeTokens, ["fixture-worker-1"]);
  assertEquals(claimCount, 2);
});
