/**
 * Dependency-free rich-text helpers for the `richText` cell type. Stored value is
 * **sanitized HTML**; read mode shows a **plain-text preview** (`htmlToText`), edit
 * mode is a `contentEditable` surface whose output is run through `sanitizeHtml`
 * (an allow-list, so no script/style/handlers survive) on commit — no DOMPurify.
 */

const ALLOWED = new Set([
  'B', 'STRONG', 'I', 'EM', 'U', 'S', 'STRIKE', 'P', 'DIV', 'BR',
  'UL', 'OL', 'LI', 'A', 'H1', 'H2', 'H3', 'BLOCKQUOTE', 'CODE', 'PRE',
])
// Tags dropped whole — their text content must NOT leak into the output.
const DROP = new Set([
  'SCRIPT', 'STYLE', 'NOSCRIPT', 'IFRAME', 'OBJECT', 'EMBED', 'TEMPLATE',
  'HEAD', 'META', 'LINK', 'TITLE', 'SVG', 'MATH',
])

export function escapeHtml(s: string): string {
  return String(s)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;')
}

function safeUrl(url: string | null): boolean {
  if (!url) return false
  const u = url.trim().toLowerCase()
  return !u.startsWith('javascript:') && !u.startsWith('data:') && !u.startsWith('vbscript:')
}

/** Strip tags → readable one-line text (SSR-safe; used for the read preview + copy). */
export function htmlToText(html: unknown): string {
  if (html == null) return ''
  return String(html)
    .replace(/<br\s*\/?>/gi, ' ')
    .replace(/<\/(p|div|li|h[1-6]|blockquote|tr)>/gi, ' ')
    .replace(/<[^>]+>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/\s+/g, ' ')
    .trim()
}

function sanitizeNode(node: Node): string {
  let out = ''
  node.childNodes.forEach((child) => {
    if (child.nodeType === 3) {
      out += escapeHtml(child.textContent ?? '')
    } else if (child.nodeType === 1) {
      const el = child as Element
      const tag = el.tagName
      if (DROP.has(tag)) return // drop the element and all its content
      const inner = sanitizeNode(el)
      if (!ALLOWED.has(tag)) {
        out += inner // unwrap a disallowed element, keep its sanitized content
      } else if (tag === 'BR') {
        out += '<br>'
      } else if (tag === 'A') {
        const href = el.getAttribute('href')
        out += safeUrl(href)
          ? `<a href="${escapeHtml(href as string)}" rel="noopener noreferrer" target="_blank">${inner}</a>`
          : inner
      } else {
        out += `<${tag.toLowerCase()}>${inner}</${tag.toLowerCase()}>`
      }
    }
  })
  return out
}

/**
 * Allow-list HTML sanitizer: keeps only formatting tags (no attributes except a
 * safe `href`), escaping everything else. Uses `DOMParser`; on the server (no
 * DOM) it degrades to escaped plain text.
 */
export function sanitizeHtml(html: unknown): string {
  const s = html == null ? '' : String(html)
  if (typeof DOMParser === 'undefined') return escapeHtml(htmlToText(s))
  const doc = new DOMParser().parseFromString(s, 'text/html')
  return sanitizeNode(doc.body)
}

/** True when the rich text has no visible content. */
export function isRichTextEmpty(html: unknown): boolean {
  return htmlToText(html) === ''
}
