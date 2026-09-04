---
name: medium-autopublish
description: >-
  Set up and run a pipeline that publishes one Markdown file to dev.to via the
  official API and then imports it into Medium. Use for requests like
  "auto-publish my post to Medium", "build a blog auto-publishing system",
  "publish to dev.to via API", "cross-post automation", "medium autopublish".
  Korean triggers: "미디엄에 자동으로 올려줘", "글 자동발행 시스템 만들어줘",
  "dev.to 에 API 로 발행", "블로그 크로스포스팅 자동화". This skill already knows
  that Medium stopped issuing new Integration Tokens in 2023 and that Medium's
  /p/import endpoint hard-blocks automation via Cloudflare.
---

# medium-autopublish

## Facts that save you hours

1. **Medium's official publishing API is dead.** Medium stopped issuing new
   Integration Tokens in 2023. The "Integration tokens" section is gone from
   settings. Only people who already hold a token can still use it.
   → Never tell the user to "generate a token in settings". That menu no longer exists.
2. **The working path is dev.to.** dev.to (Forem) has a live REST API.
   Publish to dev.to, then use Medium's "Import a story" to pull that URL in.
   Medium sets the canonical URL back to dev.to, so there is no SEO duplication.
3. **Medium `/p/import` hard-blocks automation.** Playwright (headless or headed)
   hits a Cloudflare "Sorry, you have been blocked" wall, and repeated automated
   requests can get the IP temporarily blocked. Treat the Medium import step as
   **best-effort**; when it fails, give the user a 20-second manual procedure.
   Do not attempt to bypass CAPTCHA / bot detection.

## What's in `app/`

A ready-to-run Node project.

| File | Role |
|---|---|
| `app/publish.mjs` | Main CLI. Markdown → dev.to (+ optional Medium) |
| `app/lib/devto.mjs` | dev.to REST publish (`POST /api/articles`, header `api-key`) |
| `app/lib/medium.mjs` | Medium import via a logged-in Playwright session (fails if Cloudflare blocks) |
| `app/login.mjs` | One-time Medium login → saves session to `.auth/` (auto-detected, no terminal input) |
| `app/setup-devto.mjs` | Detect dev.to login → auto-generate an API key → write it to `.env` |

## Setup

```bash
cd app
npm install
npx playwright install chromium
cp .env.example .env
```

### dev.to API key
Run `node setup-devto.mjs`. A browser window opens; the user logs in with
GitHub/Google. The script generates a key named `medium-autopublish` and writes
it to `DEVTO_API_KEY=` in `.env`.
- The key appears as **plain text** inside `<p class="ff-monospace">` on the
  settings page (not a readonly input).
- If a key with that name already exists, reuse it. Revoke any duplicates.

### Medium login
Run `node login.mjs`. A browser window opens; the user logs in normally. The
script confirms via the `sid` cookie plus `/me` resolving to the profile, then
saves the session to `.auth/`.
- **Do not** mistake Cloudflare cookies (`__cfruid` etc.) for a login. The real
  session cookie is `sid`.

## Usage

```bash
node publish.mjs posts/post.md                 # dev.to public only
node publish.mjs posts/post.md --draft          # dev.to draft only
node publish.mjs posts/post.md --medium         # dev.to public + Medium draft import
node publish.mjs posts/post.md --medium-publish  # + publish on Medium too
node publish.mjs posts/post.md --medium --headed
```

Post format: see `app/posts/example.md`. Front matter `title`, `tags` (max 4,
lowercase alphanumeric).

## When the Medium import is blocked (common)

Check `.auth/last-error.png`. If it says "you have been blocked", automation
cannot do it. Tell the user:

> dev.to is published: `<url>`
> Medium's automated import is blocked — do it manually (20 seconds):
> 1. Open https://medium.com/p/import (while logged in)
> 2. Paste the dev.to URL → Import
> 3. Review, then Publish

If an IP block is suspected, retry after a few hours, or run the import through
the user's real Chrome (a browser extension your Claude setup provides), which
usually passes.

## Safety

- Never perform the password / OAuth login yourself. Open the window; the user logs in.
- `--medium-publish` publishes publicly for real. Use `--medium` (draft only)
  the first few times.
- `.env` and `.auth/` must never be committed (already in `.gitignore`).

## 한국어 요약

- **미디엄 공식 API는 죽었다.** 2023년부터 신규 Integration Token 발급 중단, 설정
  메뉴 자체가 사라짐. "설정에서 토큰 발급하세요" 안내 금지.
- **우회로 = dev.to.** dev.to는 공식 REST API가 살아있음 → dev.to 발행 후 Medium
  "Import a story"로 가져오기. canonical이 dev.to로 잡혀 SEO 중복 없음.
- **Medium `/p/import`은 Cloudflare로 자동화를 하드블록.** Playwright는 막힌다.
  Medium import는 best-effort로 취급하고, 막히면 사용자에게 수동 20초 절차 안내.
  CAPTCHA/봇차단 우회 시도 금지.
- `app/` 에 그대로 돌아가는 Node 프로젝트. `setup-devto.mjs`(키 자동발급),
  `login.mjs`(미디엄 세션 저장), `publish.mjs`(발행). 로그인은 창만 띄우고 사용자가 직접.
