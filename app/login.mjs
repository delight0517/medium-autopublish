#!/usr/bin/env node
// 최초 1회: 크롬 창이 뜨면 Medium 에 로그인만 하면 됨.
// 로그인이 감지되면 세션을 .auth/ 에 저장하고 자동으로 닫힌다. (터미널 입력 불필요)
import { loadEnv } from "./lib/env.mjs";
import { openContext } from "./lib/medium.mjs";

const env = loadEnv();
const ctx = await openContext(env.MEDIUM_AUTH_DIR, { headed: true });
const page = ctx.pages()[0] || (await ctx.newPage());
await page.goto("https://medium.com/m/signin");

console.log("\n크롬 창에서 Medium 에 로그인하세요. (평소 쓰던 방식 그대로)");
console.log("로그인이 감지되면 이 창은 자동으로 닫힙니다…\n");

const deadline = Date.now() + 10 * 60 * 1000; // 10분 제한
let ok = false;
let checks = 0;
while (Date.now() < deadline) {
  await page.waitForTimeout(4000);
  try {
    const cookies = await ctx.cookies("https://medium.com");
    // 'sid' 가 Medium 의 실제 로그인 세션 쿠키 (Cloudflare 쿠키와 혼동 금지)
    const hasSid = cookies.some((c) => c.name === "sid" && c.value.length > 20);
    if (!hasSid) continue;

    // 이중 확인: /me 가 프로필로 열리면 로그인된 것
    await page.goto("https://medium.com/me", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(2000);
    const url = page.url();
    if (/medium\.com\/@|\/me\/|\/me$/.test(url) && !/signin/.test(url)) {
      ok = true;
      break;
    }
  } catch {}
  if (++checks % 5 === 0) console.log("  …아직 로그인 대기 중");
}

await ctx.close();
if (ok) {
  console.log("✓ 로그인 세션 저장 완료 →", env.MEDIUM_AUTH_DIR);
  process.exit(0);
} else {
  console.log("✗ 10분 안에 로그인이 확인되지 않았습니다. 다시 실행해 주세요.");
  process.exit(1);
}
