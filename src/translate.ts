import type { L10n, Lang } from './model';

const HAN = /[㐀-鿿豈-﫿]/;
export const hasChinese = (s: string) => HAN.test(s);

let toCn: ((s: string) => string) | null = null;

/** Turns Traditional Chinese into Simplified Chinese (Hong Kong spelling is understood too). */
export async function toSimplified(s: string) {
  if (!hasChinese(s)) return s;
  if (!toCn) {
    const OpenCC = await import('opencc-js/t2cn');
    toCn = OpenCC.Converter({ from: 'hk', to: 'cn' });
  }
  return toCn(s);
}

/**
 * Makes the stored two-language text for something the owner typed.
 * The other language is left empty; it is filled in by `translateText` afterwards.
 * If the typed text did not change, the previous translation is kept.
 */
export async function prepareText(input: string, prev?: L10n, manualOther?: string): Promise<L10n> {
  const text = (await toSimplified(input.trim())).trim();
  const src: Lang = hasChinese(text) || !text ? 'zh' : 'en';
  const other: Lang = src === 'zh' ? 'en' : 'zh';
  const typedOther = manualOther?.trim() ? await toSimplified(manualOther.trim()) : '';
  const out: L10n = { zh: '', en: '', src };
  out[src] = text;
  if (!text) return out;
  // manualOther: undefined = not touched, '' = cleared (translate again), text = typed by hand
  if (typedOther) out[other] = typedOther;
  else if (manualOther === undefined && prev && prev.src === src && prev[src] === text) out[other] = prev[other];
  return out;
}

export const needsTranslation = (t: L10n) => !!t[t.src] && !t[t.src === 'zh' ? 'en' : 'zh'];

const MAX_CHUNK = 450;

function chunks(text: string) {
  const parts: string[] = [];
  let cur = '';
  // split after sentence endings (written without look-behind so older iPhones can run it)
  for (const piece of text.match(/[^。！？!?.\n]*[。！？!?.\n]?/g) || [text]) {
    if (!piece) continue;
    if ((cur + piece).length > MAX_CHUNK && cur) {
      parts.push(cur);
      cur = '';
    }
    cur += piece;
    while (cur.length > MAX_CHUNK) {
      parts.push(cur.slice(0, MAX_CHUNK));
      cur = cur.slice(MAX_CHUNK);
    }
  }
  if (cur) parts.push(cur);
  return parts;
}

/** Free machine translation (MyMemory). Returns null when it is not reachable. */
export async function machineTranslate(text: string, from: Lang, to: Lang): Promise<string | null> {
  const code = (l: Lang) => (l === 'zh' ? 'zh-CN' : 'en-GB');
  const out: string[] = [];
  for (const part of chunks(text)) {
    const trimmed = part.trim();
    if (!trimmed) {
      out.push(part);
      continue;
    }
    const url =
      'https://api.mymemory.translated.net/get?q=' +
      encodeURIComponent(trimmed) +
      `&langpair=${code(from)}|${code(to)}`;
    try {
      const ctrl = new AbortController();
      const timer = setTimeout(() => ctrl.abort(), 10000);
      const res = await fetch(url, { signal: ctrl.signal });
      clearTimeout(timer);
      if (!res.ok) return null;
      const data = await res.json();
      const t: string | undefined = data?.responseData?.translatedText;
      if (Number(data?.responseStatus) !== 200 || !t || /MYMEMORY WARNING|QUERY LENGTH LIMIT/i.test(t)) return null;
      out.push(decodeEntities(t));
    } catch {
      return null;
    }
  }
  let result = out.join(to === 'en' ? ' ' : '').replace(/\s+\n/g, '\n').trim();
  if (to === 'zh') result = await toSimplified(result);
  return result;
}

function decodeEntities(s: string) {
  const el = document.createElement('textarea');
  el.innerHTML = s;
  return el.value;
}

/** Fills in the missing language. Returns null if translation failed (try again later). */
export async function translateText(t: L10n): Promise<L10n | null> {
  if (!needsTranslation(t)) return t;
  const other: Lang = t.src === 'zh' ? 'en' : 'zh';
  const res = await machineTranslate(t[t.src], t.src, other);
  if (res == null) return null;
  return { ...t, [other]: res };
}
