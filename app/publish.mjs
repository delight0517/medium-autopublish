#!/usr/bin/env node
// 사용법:
//   node publish.mjs posts/글.md                 → dev.to 에 공개 발행
//   node publish.mjs posts/글.md --draft          → dev.to 에 초안으로만
//   node publish.mjs posts/글.md --medium         → dev.to 공개 + Medium 으로 Import(초안까지)
//   node publish.mjs posts/글.md --medium-publish  → dev.to 공개 + Medium Import + Medium 발행
//   ... --headed                                  → 브라우저 창을 보면서 진행(디버깅)
import fs from "node:fs";
import path from "node:path";
import matter from "gray-matter";
import { loadEnv } from "./lib/env.mjs";
import { publishToDevto } from "./lib/devto.mjs";
import { importStory } from "./lib/medium.mjs";

const args = process.argv.slice(2);
const file = args.find((a) => !a.startsWith("--"));
const has = (f) => args.includes(f);

if (!file) {
  console.error("글 파일을 지정하세요:  node publish.mjs posts/글.md [옵션]");
  process.exit(1);
}

const env = loadEnv();
const abs = path.resolve(env.root, file);
if (!fs.existsSync(abs)) {
  console.error("파일 없음:", abs);
  process.exit(1);
}

const { data: fm, content } = matter(fs.readFileSync(abs, "utf8"));

const title = fm.title || content.match(/^#\s+(.+)$/m)?.[1];
if (!title) {
  console.error("제목이 없습니다. 프론트매터에 title: 을 넣거나 본문 맨 위에 '# 제목' 을 쓰세요.");
  process.exit(1);
}

const wantMedium = has("--medium") || has("--medium-publish");
const devtoDraft = has("--draft") && !wantMedium; // Medium Import 하려면 dev.to 는 공개돼야 함

if (has("--draft") && wantMedium) {
  console.log("ℹ️  Medium Import 를 위해 dev.to 는 공개로 발행합니다 (--draft 무시).");
}

console.log(`\n📝  ${title}`);
console.log(`    ${abs}\n`);

// 1) dev.to
console.log("① dev.to 발행 중…");
const devto = await publishToDevto({
  apiKey: env.DEVTO_API_KEY,
  title,
  markdown: content.trim(),
  tags: fm.tags || [],
  published: !devtoDraft,
  canonicalUrl: fm.canonical_url,
  series: fm.series,
  coverImage: fm.cover_image,
});
console.log(`   ✓ ${devto.url}${devtoDraft ? "  (초안)" : ""}\n`);

if (!wantMedium) {
  console.log("완료. Medium 에도 올리려면 --medium 옵션을 붙이세요.");
  process.exit(0);
}

// 2) Medium Import
console.log("② Medium 으로 Import 중… (로그인 세션 사용)");
const doPublish = has("--medium-publish");
const result = await importStory({
  authDir: env.MEDIUM_AUTH_DIR,
  sourceUrl: devto.url,
  publish: doPublish,
  headed: has("--headed"),
});

if (result.published) {
  console.log(`   ✓ Medium 발행 완료: ${result.url}\n`);
} else {
  console.log(`   ✓ Medium 초안 생성: ${result.draftUrl}`);
  console.log("     내용 확인 후 Medium 에서 직접 'Publish' 를 누르세요.");
  console.log("     (자동 발행하려면 --medium-publish 옵션)\n");
}
