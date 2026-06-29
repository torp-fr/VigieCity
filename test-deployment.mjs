const BASE_URL = "https://app.vigiecity.fr";
const PROJECT_URL = "https://xfhkngecpbvmlstjymfy.supabase.co";

let passed = 0, failed = 0;

async function test(name, fn) {
  try {
    await fn();
    console.log("✅ " + name);
    passed++;
  } catch (err) {
    console.error("❌ " + name + ": " + err.message);
    failed++;
  }
}

console.log("\n🧪 VigieCity App Deployment Test Suite\n");

await test("App accessible (app.vigiecity.fr)", async () => {
  const res = await fetch(BASE_URL, { redirect: "follow" });
  if (!res.ok) throw new Error("Status " + res.status);
});

await test("Platform route /platform/epci-tarification", async () => {
  const res = await fetch(BASE_URL + "/platform/epci-tarification", { redirect: "manual" });
  if (res.status !== 200 && res.status !== 302) throw new Error("Status " + res.status);
});

await test("Platform route /platform/support/tariff-calculator", async () => {
  const res = await fetch(BASE_URL + "/platform/support/tariff-calculator", { redirect: "manual" });
  if (res.status !== 200 && res.status !== 302) throw new Error("Status " + res.status);
});

await test("Supabase accessible", async () => {
  const res = await fetch(PROJECT_URL + "/rest/v1/", { headers: { apikey: "test" } });
  if (res.status >= 500) throw new Error("Supabase error: " + res.status);
});

await test("No hardcoded JWT secrets", async () => {
  const res = await fetch(BASE_URL, { redirect: "follow" });
  const html = await res.text();
  if (html.includes("eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9")) {
    throw new Error("Found JWT in response");
  }
});

console.log("\n" + "=".repeat(50));
console.log("Results: " + passed + " passed, " + failed + " failed");
console.log("=".repeat(50) + "\n");

if (failed === 0) {
  console.log("✨ All tests passed! Ready for manual testing at https://app.vigiecity.fr\n");
}
