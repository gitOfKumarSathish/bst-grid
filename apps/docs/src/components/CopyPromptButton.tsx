import React from 'react'
import useBaseUrl from '@docusaurus/useBaseUrl'
import prompt from '@site/scripts/prompt.json'

/**
 * "Copy agent prompt" — puts the whole Bst-Table briefing on the clipboard so a
 * developer can paste it into any AI chat and get real API instead of a
 * confident guess from some other grid library.
 *
 * The text is imported at build time from `scripts/prompt.json`, which
 * `dump-corpus.mjs` renders with `buildAgentPrompt(corpus)` — the same function
 * behind the `bst://prompt` MCP resource and `npx @bloomskill/table-mcp prompt`.
 * So the button, the MCP server and the docs can never disagree about the API,
 * and the text is in the server-rendered bundle rather than fetched at runtime.
 */

type Props = {
  /** Docusaurus button modifier — `primary` on the landing hero, `secondary` inline. */
  variant?: 'primary' | 'secondary'
  /** Show the byte size + raw-file link under the button. */
  showMeta?: boolean
}

const PROMPT_TEXT: string = (prompt as { prompt: string }).prompt
const PROMPT_VERSION: string = (prompt as { version: string }).version

/** Pre-async-clipboard path: select a detached textarea and let the browser copy it. */
function copyViaTextarea(text: string): boolean {
  try {
    const area = document.createElement('textarea')
    area.value = text
    area.setAttribute('readonly', '')
    area.style.position = 'fixed'
    area.style.opacity = '0'
    document.body.appendChild(area)
    area.select()
    const ok = document.execCommand('copy')
    document.body.removeChild(area)
    return ok
  } catch {
    return false
  }
}

/**
 * `navigator.clipboard` needs a secure context, so it is missing outright when
 * the docs are served over plain http (a LAN preview) — hence the textarea
 * fallback.
 *
 * The race matters as much as the fallback: `writeText` does not always reject
 * when it can't copy. Behind a permission prompt, or with the document
 * unfocused, it can stay **pending forever** — which left the button showing
 * "Copy agent prompt" with no feedback at all, and never reached the fallback
 * either. Timing it out means the caller always gets a definite answer.
 */
async function copy(text: string): Promise<boolean> {
  if (navigator.clipboard?.writeText) {
    try {
      const wrote = await Promise.race([
        navigator.clipboard.writeText(text).then(() => true),
        new Promise<boolean>((resolve) => setTimeout(() => resolve(false), 1200)),
      ])
      if (wrote) return true
    } catch {
      /* rejected — fall through to the legacy path */
    }
  }
  return copyViaTextarea(text)
}

export default function CopyPromptButton({ variant = 'primary', showMeta = true }: Props) {
  const [state, setState] = React.useState<'idle' | 'copied' | 'failed'>('idle')
  // Respects the site's baseUrl (`/bst-grid/`), so the raw link survives a move.
  const rawHref = useBaseUrl('/prompt.txt')

  // Reset the label a moment after the click, so repeat copies still give feedback.
  React.useEffect(() => {
    if (state === 'idle') return
    const timer = setTimeout(() => setState('idle'), 2200)
    return () => clearTimeout(timer)
  }, [state])

  const label =
    state === 'copied' ? '✓ Copied — paste it into your AI chat'
    : state === 'failed' ? 'Copy failed — open prompt.txt instead'
    : 'Copy agent prompt'

  return (
    <span
      style={{
        display: 'inline-flex',
        flexDirection: 'column',
        gap: '0.35rem',
        verticalAlign: 'top',
        // Inline in MDX prose the button gets no paragraph margin, so the meta
        // line ends up touching the next paragraph.
        marginBottom: '0.75rem',
      }}
    >
      <button
        type="button"
        className={`button button--${variant} button--lg`}
        onClick={() => { void copy(PROMPT_TEXT).then((ok) => setState(ok ? 'copied' : 'failed')) }}
        aria-live="polite"
      >
        {label}
      </button>
      {showMeta ? (
        <small style={{ opacity: 0.7 }}>
          v{PROMPT_VERSION} · {Math.round(PROMPT_TEXT.length / 1024)} KB ·{' '}
          <a href={rawHref}>view raw</a>
        </small>
      ) : null}
    </span>
  )
}
