import { assert, assertEquals } from "jsr:@std/assert@1";
import { createClient } from "npm:@supabase/supabase-js@2";

Deno.test("Supabase JS Storage remove succeeds when the object is already absent", async () => {
  const apiUrl = Deno.env.get("API_URL");
  const serviceRoleKey = Deno.env.get("SERVICE_ROLE_KEY");
  assert(apiUrl, "local Supabase API_URL must be set by supabase status");
  assert(serviceRoleKey, "local Supabase SERVICE_ROLE_KEY must be set by supabase status");

  const client = createClient(apiUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const bucket = "lmu-missing-object-sdk-test";
  const path = "fixture-only/repeated-delete-probe.txt";
  const fixture = new Blob(["LMU disposable local storage fixture only"], { type: "text/plain" });

  const created = await client.storage.createBucket(bucket, { public: false });
  assertEquals(created.error, null, `create test bucket: ${created.error?.message ?? ""}`);

  try {
    const uploaded = await client.storage.from(bucket).upload(path, fixture);
    assertEquals(uploaded.error, null, `upload fixture: ${uploaded.error?.message ?? ""}`);

    const first = await client.storage.from(bucket).remove([path]);
    assertEquals(first.error, null, `first remove: ${first.error?.message ?? ""}`);

    const second = await client.storage.from(bucket).remove([path]);
    assertEquals(
      second.error,
      null,
      `second remove of absent object should be successful in this tested local Storage version; got ${second.error?.name ?? "error"}: ${second.error?.message ?? ""}`,
    );
    assertEquals(second.data?.length, 0, "repeated deletion should not report a removed object");
  } finally {
    await client.storage.deleteBucket(bucket);
  }
});
