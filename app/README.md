# medium-autopublish

Markdown 글 한 개 → **dev.to 자동 발행** → **Medium 자동 Import** 파이프라인.

## 왜 이런 구조인가

Medium 은 2023년부터 **신규 Integration Token 발급을 중단**했다. 공식 API 로
글을 올리는 길은 (예전 토큰이 없는 이상) 막혀 있다. 대신:

1. **dev.to** 는 공식 API 가 살아있다 → 여기에 API 로 발행
2. Medium 의 **Import a story** 로 그 URL 을 가져온다 (로그인된 브라우저로 자동화)
3. Medium 이 원문(canonical)을 dev.to 로 잡아줘서 SEO 중복 문제도 없음

## 설치 (최초 1회)

```bash
cd medium-autopublish
npm install
npx playwright install chromium
cp .env.example .env
```

`.env` 를 열어 `DEVTO_API_KEY` 를 채운다.
발급: https://dev.to/settings/extensions → **DEV Community API Keys** → 이름 적고 Generate → 복사.

그다음 Medium 로그인 세션을 저장한다 (크롬 창이 뜸, 평소처럼 로그인 후 터미널에서 Enter):

```bash
npm run login
```

## 사용

```bash
# dev.to 에만 공개 발행
node publish.mjs posts/내글.md

# dev.to 초안으로만
node publish.mjs posts/내글.md --draft

# dev.to 공개 + Medium 으로 Import (Medium 은 초안 상태, 직접 눈으로 확인 후 발행)
node publish.mjs posts/내글.md --medium

# dev.to 공개 + Medium Import + Medium 발행까지 자동
node publish.mjs posts/내글.md --medium-publish

# 브라우저 창 보면서 (문제 생길 때 디버깅)
node publish.mjs posts/내글.md --medium --headed
```

## 글 형식

`posts/example.md` 참고. 프론트매터에 `title`, `tags`(최대 4개) 정도면 충분.

## 주의

- Medium 은 화면 구조를 종종 바꾼다. Import/발행이 실패하면 `.auth/last-error.png`
  스크린샷이 남으니 그걸 보고 `lib/medium.mjs` 의 선택자를 손보면 된다.
- `--medium-publish` 는 실제로 공개 발행한다. 처음 몇 번은 `--medium` (초안까지)만 쓰고
  결과를 확인하는 걸 권장.
- `.env` 와 `.auth/` 는 `.gitignore` 에 있음. 커밋 금지.
