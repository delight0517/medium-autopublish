// dev.to (DEV Community) 발행 - 공식 API 사용
// 문서: https://developers.forem.com/api/v1#tag/articles/operation/createArticle

const API = "https://dev.to/api/articles";

/**
 * @param {object} opts
 * @param {string} opts.apiKey
 * @param {string} opts.title
 * @param {string} opts.markdown  프론트매터를 제외한 본문
 * @param {string[]} [opts.tags]  최대 4개, 소문자/영숫자
 * @param {boolean} [opts.published]  true=바로 공개, false=초안
 * @param {string} [opts.canonicalUrl]
 * @param {string} [opts.series]
 * @param {string} [opts.coverImage]
 * @returns {Promise<{id:number,url:string,slug:string}>}
 */
export async function publishToDevto(opts) {
  const {
    apiKey,
    title,
    markdown,
    tags = [],
    published = false,
    canonicalUrl,
    series,
    coverImage,
  } = opts;

  if (!apiKey) throw new Error("DEVTO_API_KEY 가 없습니다 (.env 확인).");
  if (!title) throw new Error("글 제목(title)이 없습니다.");

  const cleanTags = tags
    .map((t) => String(t).toLowerCase().replace(/[^a-z0-9]/g, ""))
    .filter(Boolean)
    .slice(0, 4);

  const body = {
    article: {
      title,
      body_markdown: markdown,
      published,
      tags: cleanTags,
      ...(canonicalUrl ? { canonical_url: canonicalUrl } : {}),
      ...(series ? { series } : {}),
      ...(coverImage ? { main_image: coverImage } : {}),
    },
  };

  const res = await fetch(API, {
    method: "POST",
    headers: {
      "api-key": apiKey,
      "content-type": "application/json",
      accept: "application/vnd.forem.api-v1+json",
    },
    body: JSON.stringify(body),
  });

  const text = await res.text();
  let data;
  try {
    data = JSON.parse(text);
  } catch {
    data = { raw: text };
  }

  if (!res.ok) {
    throw new Error(
      `dev.to 발행 실패 (HTTP ${res.status}): ${data.error || data.raw || text}`
    );
  }

  return { id: data.id, url: data.url, slug: data.slug };
}
