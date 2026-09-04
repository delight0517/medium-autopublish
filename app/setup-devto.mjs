#!/usr/bin/env node
// dev.to 로그인 창을 띄우고, 로그인이 감지되면
// API 키를 자동 생성해서 .env 에 저장한다.
// 이 창의 프로필은 .auth/ 에 저장되므로 다음부터는 로그인/비번이 유지된다.
import fs from "node:fs";
import path from "node:path";
import { loadEnv } from "./lib/env.mjs";
import { openContext } from "./lib/medium.mjs";

const env = loadEnv();
const ctx = await openContext(env.MEDIUM_AUTH_DIR, { headed: true });
const page = ctx.pages()[0] || (await ctx.newPage());

await page.goto("https://dev.to/enter?state=new-user");
console.log("\n크롬 창에서 dev.to 에 로그인하세요 (GitHub / Google 버튼 권장).");
console.log("로그인이 감지되면 API 키를 자동 발급합니다…\n");

// 1) 로그인 대기
const deadline = Date.now() + 10 * 60 * 1000;
let loggedIn = false;
while (Date.now() < deadline) {
  await page.waitForTimeout(4000);
  try {
    const cookies = await ctx.cookies("https://dev.to");
    const has = cookies.some(
      (c) =>
        (c.name === "remember_user_token" ||
          c.name === "_DEV_Community_session") &&
        c.value.length > 20
    );
    if (!has) continue;
    await page.goto("https://dev.to/dashboard", {
      waitUntil: "domcontentloaded",
    });
    await page.waitForTimeout(2000);
    if (!/\/enter/.test(page.url())) {
      loggedIn = true;
      break;
    }
  } catch {}
}
if (!loggedIn) {
  console.log("✗ 로그인이 확인되지 않았습니다. 다시 실행해 주세요.");
  await ctx.close();
  process.exit(1);
}
console.log("✓ dev.to 로그인 확인. API 키 발급 중…");

// 2) API 키 생성
await page.goto("https://dev.to/settings/extensions", {
  waitUntil: "domcontentloaded",
});
await page.waitForTimeout(2000);

let key = "";
try {
  // 이미 medium-autopublish 키가 있으면 재사용
  const existing = await page
    .$$eval("#api details", (els) =>
      els
        .filter((d) => d.querySelector("summary")?.textContent?.trim() === "medium-autopublish")
        .map((d) => d.querySelector(".ff-monospace")?.textContent?.trim())
        .filter(Boolean)
    )
    .catch(() => []);
  if (existing[0]) {
    key = existing[0];
  } else {
    const nameInput = page.locator("#api_secret_description").first();
    await nameInput.waitFor({ timeout: 15000 });
    await nameInput.fill("medium-autopublish");
    await page
      .getByRole("button", { name: /generate api key/i })
      .first()
      .click();
    await page.waitForTimeout(4000);
    key =
      (await page
        .locator('#api details:has(summary:text-is("medium-autopublish")) .ff-monospace')
        .first()
        .textContent()
        .catch(() => ""))?.trim() || "";
  }
} catch (e) {
  const shot = path.join(env.MEDIUM_AUTH_DIR, "devto-error.png");
  await page.screenshot({ path: shot, fullPage: true }).catch(() => {});
  console.log("자동 발급 실패:", e.message, "\n스크린샷:", shot);
}

if (key) {
  const envFile = path.join(env.root, ".env");
  let body = fs.existsSync(envFile) ? fs.readFileSync(envFile, "utf8") : "";
  if (/^DEVTO_API_KEY=.*$/m.test(body)) {
    body = body.replace(/^DEVTO_API_KEY=.*$/m, `DEVTO_API_KEY=${key}`);
  } else {
    body += `\nDEVTO_API_KEY=${key}\n`;
  }
  fs.writeFileSync(envFile, body);
  console.log(`✓ API 키를 .env 에 저장했습니다 (${key.slice(0, 6)}…).`);
} else {
  console.log(
    "키를 자동으로 못 읽었습니다. 열린 창의 'DEV Community API Keys' 에서\n" +
      "생성된 키를 복사해 .env 의 DEVTO_API_KEY= 뒤에 붙여넣어 주세요."
  );
}

await page.waitForTimeout(1500);
await ctx.close();
console.log("완료.");
