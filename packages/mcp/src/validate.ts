import { NOT_BUILT, OPTION_REQUIRES, RULES, SERVER_MODE_RULES } from './rules.js'
import type { BstCorpus, FeatureEntry } from './types.js'

/** One thing the validator noticed. */
export interface Finding {
  level: 'error' | 'warning' | 'info'
  /** The flag or option the finding is about. */
  subject: string
  /** What is wrong. */
  message: string
  /** What to change. */
  fix: string
}

/** A prop's value as read from the input, plus how it was determined. */
interface Resolved {
  explicit: boolean | undefined
  effective: boolean | undefined
}

/** The validator's verdict. */
export interface ValidationReport {
  ok: boolean
  /** Props detected in the input. */
  detected: string[]
  findings: Finding[]
}

/**
 * Reads a flag's default from its §12 "Default" cell. Many are plain
 * `true`/`false`; some are prose ("follows `enableRowActions`"), which we treat
 * as unknown rather than guessing.
 */
function defaultOf(feature: FeatureEntry | undefined): boolean | undefined {
  const raw = feature?.default?.trim().toLowerCase()
  if (raw === 'true') return true
  if (raw === 'false') return false
  return undefined
}

/**
 * Detects which props appear in a snippet and whether each is explicitly off.
 *
 * Deliberately lexical, not a parser: the input is usually a JSX fragment or a
 * partial options object pasted out of context, which no parser would accept.
 * Being lexical means the validator can be wrong about *values* in exotic code
 * (`enableEditing={someVar}`), so anything it can't read confidently is left
 * `undefined` and reported as unknown rather than asserted.
 */
export function detectProps(source: string, known: string[]): Map<string, Resolved> {
  const found = new Map<string, Resolved>()

  for (const prop of known) {
    if (prop.includes('.')) continue // `meta.*` props are per-column, not grid props
    // Word-boundary match, but not when it's part of a longer identifier.
    const present = new RegExp(`(?<![\\w$])${prop}(?![\\w$])`).test(source)
    if (!present) continue

    // Explicitly falsy: `flag={false}`, `flag: false`, `flag = false`.
    const off = new RegExp(`(?<![\\w$])${prop}\\s*(?:=\\s*\\{\\s*false\\s*\\}|[:=]\\s*false)`).test(source)
    // Explicitly truthy: bare JSX attribute, `={true}`, `: true`, or an object/value.
    const on = new RegExp(
      `(?<![\\w$])${prop}\\s*(?:=\\s*\\{\\s*(?:true|\\{|\\[)|[:=]\\s*(?:true|\\{|\\[)|[/>\\s]|$)`,
    ).test(source)

    const explicit = off ? false : on ? true : undefined
    found.set(prop, { explicit, effective: explicit })
  }
  return found
}

/**
 * Checks a Bst-Table configuration against the flag-dependency rules.
 *
 * @param corpus the generated knowledge base (for defaults and coverage)
 * @param source the config as code or JSON text
 * @param config an already-parsed props object, when the caller has one
 */
export function validateConfig(
  corpus: BstCorpus,
  source: string,
  config?: Record<string, unknown>,
): ValidationReport {
  const knownFlags = corpus.features.map((f) => f.flag)
  const featureByFlag = new Map(corpus.features.map((f) => [f.flag, f]))

  const resolved = config ? fromConfigObject(config, knownFlags) : detectProps(source, knownFlags)

  // Fill in defaults for flags the input never mentions, so "chrome without
  // behaviour" is judged against what the grid will actually do.
  const effective = (flag: string): boolean | undefined => {
    const seen = resolved.get(flag)
    if (seen?.effective !== undefined) return seen.effective
    if (seen) return defaultOf(featureByFlag.get(flag)) // present but value unreadable
    return defaultOf(featureByFlag.get(flag))
  }

  const findings: Finding[] = []
  const mentioned = [...resolved.keys()]

  // 1. Unknown props — the most common hallucination, and the cheapest to catch.
  for (const prop of unknownProps(source, corpus)) {
    findings.push({
      level: 'error',
      subject: prop,
      message: `\`${prop}\` is not a Bst-Table option.`,
      fix: `Call \`bst_get_feature()\` for the full registry, or \`bst_search_docs({ query: "${prop}" })\` to find the real name.`,
    })
  }

  // 2. Capabilities that do not exist. Checked against the raw text so a request
  //    phrased in a comment or a prop name is caught either way.
  for (const gap of NOT_BUILT) {
    if (!gap.match.test(source)) continue
    const leaf = corpus.requirements.find((r) => r.id === gap.requirement)
    findings.push({
      level: 'error',
      subject: gap.requirement,
      message: `${gap.requirement} (${leaf?.title ?? 'capability'}) is ${leaf?.status === 'partial' ? 'only partially built' : 'NOT built'} in Bst-Table v${corpus.version}.`,
      fix: gap.instead,
    })
  }

  // 3. Flag relationships.
  for (const flag of mentioned) {
    const rule = RULES[flag]
    if (!rule) continue
    if (effective(flag) === false) continue // explicitly off — its deps don't matter

    for (const required of rule.requires ?? []) {
      if (effective(required) === false) {
        findings.push({
          level: 'error',
          subject: flag,
          message: `\`${flag}\` has no effect while \`${required}\` is off.`,
          fix: `Remove \`${required}={false}\`, or drop \`${flag}\`. ${chromeNote(flag)}`,
        })
      } else if (effective(required) === undefined) {
        findings.push({
          level: 'warning',
          subject: flag,
          message: `\`${flag}\` needs \`${required}\`, whose value could not be determined.`,
          fix: `Set \`${required}\` explicitly so the dependency is obvious.`,
        })
      }
    }

    for (const implied of rule.implies ?? []) {
      findings.push({
        level: 'info',
        subject: flag,
        message: `\`${flag}\` implies \`${implied}\` — you don't need to set it separately.`,
        fix: `No change needed.`,
      })
    }

    for (const option of rule.needsOptions ?? []) {
      const names = option.name.split(/\s+or\s+/)
      const supplied = names.some((n) => new RegExp(`(?<![\\w$])${n.split('.')[0]}(?![\\w$])`).test(source))
      if (!supplied) {
        findings.push({
          level: 'warning',
          subject: flag,
          message: `\`${flag}\` is on but \`${option.name}\` is not supplied — ${option.why}.`,
          fix: `Add \`${option.name}\` to the grid props.`,
        })
      }
    }

    for (const conflict of rule.conflictsWith ?? []) {
      if (effective(conflict.flag) === true) {
        findings.push({
          level: 'warning',
          subject: flag,
          message: `\`${flag}\` and \`${conflict.flag}\` interact: ${conflict.why}.`,
          fix: `Keep only the one you want, or accept that ${conflict.why}.`,
        })
      }
    }
  }

  // 4. Options that are inert without their flag.
  for (const [option, requirement] of Object.entries(OPTION_REQUIRES)) {
    const present = new RegExp(`(?<![\\w$])${option}(?![\\w$])`).test(source)
    if (!present) continue
    if (effective(requirement.flag) === false) {
      findings.push({
        level: 'error',
        subject: option,
        message: `\`${option}\` is ignored while \`${requirement.flag}\` is off — ${requirement.why}.`,
        fix: `Set \`${requirement.flag}\`, or remove \`${option}\`.`,
      })
    } else if (effective(requirement.flag) === undefined && !resolved.has(requirement.flag)) {
      findings.push({
        level: 'warning',
        subject: option,
        message: `\`${option}\` requires \`${requirement.flag}\`, which is not set — ${requirement.why}.`,
        fix: `Add \`${requirement.flag}\`.`,
      })
    }
  }

  // 5. Server mode.
  for (const rule of SERVER_MODE_RULES) {
    if (!new RegExp(`(?<![\\w$])${rule.when}(?![\\w$])`).test(source)) continue
    const satisfied = rule.needs.some((n) => new RegExp(`(?<![\\w$])${n}(?![\\w$])`).test(source))
    if (!satisfied) {
      findings.push({
        level: 'error',
        subject: rule.when,
        message: `\`${rule.when}\` is set but neither ${rule.needs.map((n) => `\`${n}\``).join(' nor ')} is — ${rule.why}.`,
        fix: `Add \`rowCount={total}\` (or \`pageCount\`). \`useBstDataSource(source).tableProps\` supplies both for you.`,
      })
    }
  }

  // 6. Editing needs stable row identity — the single most common broken grid.
  if (effective('enableEditing') === true || effective('enableRowSelection') === true) {
    if (!/(?<![\w$])getRowId(?![\w$])/.test(source)) {
      findings.push({
        level: 'error',
        subject: 'getRowId',
        message: `Editing/selection is on but \`getRowId\` is missing. Writes target rows by id, never by index, so edits land on the wrong row once the grid is sorted or filtered.`,
        fix: `Add \`getRowId={(row) => row.id}\`.`,
      })
    }
  }

  return {
    ok: !findings.some((f) => f.level === 'error'),
    detected: mentioned.sort(),
    findings: dedupe(findings),
  }
}

/** Reads flags off a pre-parsed props object. */
function fromConfigObject(config: Record<string, unknown>, known: string[]): Map<string, Resolved> {
  const out = new Map<string, Resolved>()
  for (const [key, value] of Object.entries(config)) {
    if (!known.includes(key)) continue
    const explicit = typeof value === 'boolean' ? value : value == null ? undefined : true
    out.set(key, { explicit, effective: explicit })
  }
  return out
}

/**
 * Finds `enable*`/`show*` props in the input that Bst-Table doesn't have.
 * Scoped to that naming convention so ordinary React props aren't flagged.
 */
function unknownProps(source: string, corpus: BstCorpus): string[] {
  const known = new Set(corpus.features.map((f) => f.flag))
  const out = new Set<string>()
  for (const match of source.matchAll(/(?<![\w$])((?:enable|show)[A-Z][\w$]*)/g)) {
    const name = match[1]
    if (name && !known.has(name)) out.add(name)
  }
  return [...out]
}

/** Collapses identical findings (a flag can be reached by more than one path). */
function dedupe(findings: Finding[]): Finding[] {
  const seen = new Set<string>()
  const order = { error: 0, warning: 1, info: 2 }
  return findings
    .filter((f) => {
      const key = `${f.level}:${f.subject}:${f.message}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
    .sort((a, b) => order[a.level] - order[b.level] || a.subject.localeCompare(b.subject))
}

/** Reminds the agent of the §12 layering rule when the offender is chrome. */
function chromeNote(flag: string): string {
  return flag.startsWith('show')
    ? 'Chrome (`show*`) never implies behaviour (`enable*`) — you must set both.'
    : ''
}
