// services/websiteInfoService.js (ESM)
// Minimal dependency approach: Node 18+ global fetch + cheerio for parsing
// Install: npm i cheerio

import * as cheerio from 'cheerio';
import { URL } from 'node:url';

const DEFAULT_UA =
  'Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/121.0 Safari/537.36';

function toAbsoluteUrl(base, maybeRelative) {
  try {
    if (!maybeRelative) return null;
    return new URL(maybeRelative, base).toString();
  } catch {
    return null;
  }
}

async function fetchText(url, { timeoutMs = 12000, userAgent = DEFAULT_UA } = {}) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), timeoutMs);
  try {
    const res = await fetch(url, {
      redirect: 'follow',
      signal: controller.signal,
      headers: {
        'user-agent': userAgent,
        'accept': 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
        'accept-language': 'en-US,en;q=0.8'
      }
    });
    const contentType = res.headers.get('content-type') || '';
    const text = await res.text();
    return { status: res.status, ok: res.ok, contentType, text, finalUrl: res.url };
  } finally {
    clearTimeout(timer);
  }
}

function extractMeta($, baseUrl) {
  const get = (sel) => $(sel).attr('content') || $(sel).attr('href') || null;
  const title = ($('meta[property="og:title"]').attr('content') || $('title').first().text() || '').trim() || null;
  const description = (
    $('meta[property="og:description"]').attr('content') ||
    $('meta[name="description"]').attr('content') ||
    ''
  ).trim() || null;

  const ogImage = get('meta[property="og:image"]');
  const ogUrl = get('meta[property="og:url"]');
  const canonical = $('link[rel="canonical"]').attr('href') || null;
  const siteName = $('meta[property="og:site_name"]').attr('content') || null;
  const lang = $('html').attr('lang') || $('meta[http-equiv="content-language"]').attr('content') || null;

  // Favicons (try best candidates)
  const iconHrefs = [
    $('link[rel~="icon"]').attr('href'),
    $('link[rel="shortcut icon"]').attr('href'),
    '/favicon.ico'
  ].filter(Boolean);
  const favicon = toAbsoluteUrl(baseUrl, iconHrefs[0]);

  const images = [];
  $('img').each((_, el) => {
    const src = $(el).attr('src');
    const alt = ($(el).attr('alt') || '').trim();
    const abs = toAbsoluteUrl(baseUrl, src);
    if (abs) images.push({ src: abs, alt });
  });

  const headings = [];
  for (const h of ['h1','h2','h3']) {
    $(h).each((_, el) => {
      const text = $(el).text().trim();
      if (text) headings.push({ tag: h, text });
    });
  }

  const links = [];
  $('a[href]').each((_, el) => {
    const href = $(el).attr('href');
    const text = $(el).text().trim().replace(/\s+/g, ' ');
    const abs = toAbsoluteUrl(baseUrl, href);
    if (abs) links.push({ href: abs, text });
  });

  // Basic text metrics
  const visibleText = $('body').text().replace(/\s+/g, ' ').trim();
  const wordCount = visibleText ? visibleText.split(' ').filter(Boolean).length : 0;

  return {
    title,
    description,
    canonical: canonical ? toAbsoluteUrl(baseUrl, canonical) : null,
    url: ogUrl ? toAbsoluteUrl(baseUrl, ogUrl) : baseUrl,
    siteName,
    lang,
    favicon,
    og: {
      title: $('meta[property="og:title"]').attr('content') || null,
      description: $('meta[property="og:description"]').attr('content') || null,
      type: $('meta[property="og:type"]').attr('content') || null,
      image: ogImage ? toAbsoluteUrl(baseUrl, ogImage) : null
    },
    headings,
    images,
    links,
    metrics: {
      wordCount,
    }
  };
}

function extractJsonLd($) {
  const items = [];
  $('script[type="application/ld+json"]').each((_, el) => {
    const raw = $(el).contents().text();
    try {
      const parsed = JSON.parse(raw);
      if (Array.isArray(parsed)) items.push(...parsed);
      else items.push(parsed);
    } catch { /* ignore invalid JSON-LD */ }
  });
  return items;
}

export async function getWebsiteInfo(rawUrl, opts = {}) {
  if (!rawUrl) throw new Error('URL is required');
  let urlStr = rawUrl.trim();
  if (!/^https?:\/\//i.test(urlStr)) urlStr = 'https://' + urlStr; // default to https

  const { status, ok, contentType, text, finalUrl } = await fetchText(urlStr, opts);
  if (!ok) {
    return { ok, status, error: `Request failed with status ${status}`, url: finalUrl || urlStr };
  }
  if (!/text\/html|application\/(xhtml\+xml|xml)/i.test(contentType)) {
    return { ok: false, status, error: `Unsupported content-type: ${contentType}`, url: finalUrl || urlStr };
  }

  const $ = cheerio.load(text);
  const meta = extractMeta($, finalUrl || urlStr);
  const jsonLd = extractJsonLd($);

  return {
    ok: true,
    status,
    contentType,
    url: finalUrl || urlStr,
    ...meta,
    structuredData: jsonLd
  };
}

// Optional: light-weight health check for your service
export async function probe(url) {
  try {
    const res = await fetch(url, { method: 'HEAD' });
    return { ok: res.ok, status: res.status, url: res.url };
  } catch (e) {
    return { ok: false, error: String(e) };
  }
}

// Example direct run (for quick manual test)
// node --experimental-modules services/websiteInfoService.js
// (or just import into a small script)
if (process.argv[1] === new URL(import.meta.url).pathname) {
  const testUrl = process.argv[2] || 'https://example.com';
  getWebsiteInfo(testUrl).then((r) => {
    console.log(JSON.stringify(r, null, 2));
  }).catch((e) => {
    console.error(e);
    process.exit(1);
  });
}