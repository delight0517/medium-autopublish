// Medium 자동화 - 공식 API가 폐지되어 로그인된 브라우저 세션으로 동작한다.
// login.mjs 로 최초 1회 로그인해두면 .auth/ 에 세션이 저장된다.
import fs from "node:fs";
import path from "node:path";
import { chromium } from "playwright";

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 " +
  "(KHTML, like Gecko) Chrome/128.0.0.0 Safari/537.36";

export async function openContext(authDir, { headed = false } = {}) {
  fs.mkdirSync(authDir, { recursive: true });
  return chromium.launchPersistentContext(authDir, {
    headless: !headed,
    userAgent: UA,
    viewport: { width: 1280, height: 900 },
    args: ["--disable-blink-features=AutomationControlled"],
  });
}

async function assertLoggedIn(page) {
  await page.goto("https://medium.com/me/stories/drafts", {
    waitUntil: "domcontentloaded",
  });
  await page.waitForTimeout(1500);
  if (/\/m\/signin|\/signin/.test(page.url())) {
    throw new Error(
      "Medium 로그인 세션이 없습니다. 먼저 `npm run login` 을 실행해 로그인하세요."
    );
  }
}

/**
 * dev.to(또는 아무 공개 URL)의 글을 Medium 으로 Import.
 * @returns {Promise<{draftUrl:string, published:boolean, url:string}>}
 */
export async function importStory({
  authDir,
  sourceUrl,
  publish = false,
  headed = true, // Medium /p/import 는 Cloudflare 보호가 걸려 headless 가 막힌다
}) {
  const ctx = await openContext(authDir, { headed });
  const page = ctx.pages()[0] || (await ctx.newPage());
  try {
    await assertLoggedIn(page);

    // 세션을 데운 뒤 import 페이지로
    await page.goto("https://medium.com/", { waitUntil: "domcontentloaded" });
    await page.waitForTimeout(1500);
    await page.goto("https://medium.com/p/import", {
      waitUntil: "domcontentloaded",
    });

    // Cloudflare 챌린지가 뜨면 사람이 통과할 때까지 대기 (headed)
    for (let i = 0; i < 40; i++) {
      const t = await page.title().catch(() => "");
      if (!/attention required|just a moment|cloudflare/i.test(t)) break;
      if (i === 0)
        console.log("   ⏳ Cloudflare 확인 화면 — 열린 창에서 체크박스를 눌러주세요…");
      await page.waitForTimeout(3000);
    }
    await page.waitForTimeout(1500);

    const input = page
      .locator(
        'input[placeholder*="link" i], input[placeholder*="url" i], input[placeholder*="story" i], input[type="url"], input[type="text"]'
      )
      .first();
    await input.waitFor({ timeout: 30000 });
    await input.fill(sourceUrl);

    const importBtn = page
      .getByRole("button", { name: /^import/i })
      .or(page.locator('button:has-text("Import")'))
      .first();
    await importBtn.click();

    // Import 처리 후 에디터로 이동
    await page.waitForURL(/medium\.com\/p\/[a-z0-9]+\/edit|\/edit$/, {
      timeout: 60000,
    });
    await page.waitForTimeout(2500);
    const draftUrl = page.url().replace(/\/edit.*$/, "");

    if (!publish) {
      return { draftUrl, published: false, url: draftUrl };
    }

    // 발행
    const publishBtn = page
      .getByRole("button", { name: /^publish/i })
      .or(page.locator('button[data-action="show-prepublish"]'))
      .first();
    await publishBtn.click();
    await page.waitForTimeout(2000);

    const publishNow = page
      .getByRole("button", { name: /publish now/i })
      .or(page.locator('button[data-action="publish"]'))
      .first();
    await publishNow.click();

    await page.waitForTimeout(5000);
    const finalUrl = page.url().replace(/\/edit.*$/, "");
    return { draftUrl, published: true, url: finalUrl };
  } catch (err) {
    try {
      const shot = path.join(authDir, "last-error.png");
      await page.screenshot({ path: shot, fullPage: true });
      err.message += `\n(스크린샷 저장: ${shot})`;
    } catch {}
    throw err;
  } finally {
    await ctx.close();
  }
}
