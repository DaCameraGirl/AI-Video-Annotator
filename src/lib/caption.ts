// ---------------------------------------------------------------------------
// Caption QA — ported from DaCameraGirl/Warehouse-Caption-Checker so the Suite
// is finally "all in one": the annotator generates captions, and this checks
// them against Angela's approved terminology + present-tense rules.
//
// Rules (banned gender words, incorrect->correct terms, tense conversions) are
// taken verbatim from that repo's terminology.ts.
// ---------------------------------------------------------------------------

export const BANNED_WORDS = ['man', 'woman', 'guy', 'lady']

export const INCORRECT_TERMS: Record<string, string> = {
  person: 'worker',
  individual: 'worker',
  employee: 'worker',
  staff: 'worker',
  'conveyor belt': 'automatic conveyor belt',
  conveyor: 'automatic conveyor belt',
  phone: 'cell phone',
  'mobile phone': 'cell phone',
  smartphone: 'cell phone',
  computer: 'monitor',
  PC: 'monitor',
  laptop: 'monitor',
  shelves: 'tall metal shelving',
  shelf: 'tall metal shelving',
  shelving: 'tall metal shelving',
  robot: 'Automated Mobile Robot',
  AGV: 'Automated Mobile Robot',
  cart: 'utility cart',
  trolley: 'utility cart',
  box: 'cardboard box (fully built)',
  package: 'cardboard box (fully built)',
  background: 'bay',
  behind: 'bay',
}

export const TENSE_CONVERSIONS: Record<string, string> = {
  walked: 'walks',
  moved: 'moves',
  picked: 'picks',
  placed: 'places',
  carried: 'carries',
  lifted: 'lifts',
  dropped: 'drops',
  entered: 'enters',
  exited: 'exits',
  stood: 'stands',
  sat: 'sits',
  ran: 'runs',
  jumped: 'jumps',
  turned: 'turns',
  started: 'starts',
  stopped: 'stops',
  went: 'goes',
  came: 'comes',
  held: 'holds',
  bent: 'bends',
  was: 'is',
  were: 'are',
  had: 'has',
}

export type Severity = 'error' | 'warning'

export interface CaptionIssue {
  id: string
  severity: Severity
  rule: string
  message: string
}

export interface CaptionSuggestion {
  id: string
  wrong: string
  replacement: string
  message: string
}

export type Verdict = 'Pass' | 'Needs Minor Revision' | 'Needs Major Revision'

export interface CaptionResult {
  score: number
  verdict: Verdict
  issues: CaptionIssue[]
  suggestions: CaptionSuggestion[]
}

function validatePresentTense(text: string): CaptionIssue[] {
  const patterns = [
    /\b(walked|moved|picked|placed|carried|lifted|dropped|entered|exited)\b/gi,
    /\b(was|were|had)\b/gi,
  ]
  const issues: CaptionIssue[] = []
  patterns.forEach((pattern, idx) => {
    const matches = text.match(pattern)
    if (matches?.length) {
      issues.push({
        id: `tense-${idx}`,
        severity: 'warning',
        rule: 'present-tense',
        message: `Past tense found: ${[...new Set(matches.map((m) => m.toLowerCase()))].join(', ')}`,
      })
    }
  })
  return issues
}

function validateTerminology(text: string): {
  issues: CaptionIssue[]
  suggestions: CaptionSuggestion[]
} {
  const issues: CaptionIssue[] = []
  const suggestions: CaptionSuggestion[] = []

  for (const word of BANNED_WORDS) {
    if (new RegExp(`\\b${word}\\b`, 'i').test(text)) {
      issues.push({
        id: `banned-${word}`,
        severity: 'error',
        rule: 'banned-vocabulary',
        message: `Banned word "${word}". Use "male worker" or "female worker".`,
      })
    }
  }

  for (const [wrong, correct] of Object.entries(INCORRECT_TERMS)) {
    if (new RegExp(`\\b${escapeRe(wrong)}\\b`, 'i').test(text)) {
      suggestions.push({
        id: `replace-${wrong}`,
        wrong,
        replacement: correct,
        message: `Replace "${wrong}" with "${correct}"`,
      })
    }
  }

  return { issues, suggestions }
}

export function analyzeCaption(text: string): CaptionResult {
  const tenseIssues = validatePresentTense(text)
  const terminology = validateTerminology(text)
  const issues = [...tenseIssues, ...terminology.issues]
  const penalties = issues.reduce(
    (sum, i) => sum + (i.severity === 'error' ? 20 : 10),
    0,
  )
  const score = Math.max(0, 100 - penalties)
  const verdict: Verdict =
    score >= 85 ? 'Pass' : score >= 60 ? 'Needs Minor Revision' : 'Needs Major Revision'
  return { score, verdict, issues, suggestions: terminology.suggestions }
}

/** Apply tense + terminology fixes automatically. */
export function autoClean(text: string): string {
  let out = text
  for (const [wrong, correct] of Object.entries(TENSE_CONVERSIONS)) {
    out = out.replace(new RegExp(`\\b${escapeRe(wrong)}\\b`, 'gi'), correct)
  }
  for (const [wrong, correct] of Object.entries(INCORRECT_TERMS)) {
    out = out.replace(new RegExp(`\\b${escapeRe(wrong)}\\b`, 'gi'), correct)
  }
  return out
}

function escapeRe(s: string): string {
  return s.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
}
