// The folded-in Caption Checker (from Warehouse-Caption-Checker). Generates a
// caption from the current frame's detections, then QAs any caption against the
// approved warehouse terminology + present-tense rules.

import { useState } from 'react'
import { Wand2, CheckCircle2, Sparkles, AlertCircle } from 'lucide-react'
import type { AnalysisSnapshot } from '../types'
import { captionFor } from '../lib/warehouse'
import { analyzeCaption, autoClean } from '../lib/caption'
import type { CaptionResult } from '../lib/caption'

export interface CaptionPanelProps {
  snap: AnalysisSnapshot | null
}

const VERDICT_STYLE: Record<string, string> = {
  Pass: 'bg-emerald-500/15 text-emerald-300 border-emerald-500/40',
  'Needs Minor Revision': 'bg-amber-500/15 text-amber-300 border-amber-500/40',
  'Needs Major Revision': 'bg-rose-500/15 text-rose-300 border-rose-500/40',
}

export default function CaptionPanel({ snap }: CaptionPanelProps) {
  const [text, setText] = useState('')
  const [result, setResult] = useState<CaptionResult | null>(null)

  function generate() {
    const labels = (snap?.liveLabels ?? []).map((l) => l.label)
    const caption = captionFor(labels)
    setText(caption)
    setResult(analyzeCaption(caption))
  }

  return (
    <section className="rounded-2xl border border-slate-700/70 bg-slate-900/40 p-5">
      <div className="mb-3 flex items-center gap-2">
        <Sparkles size={18} className="text-pink-400" />
        <h3 className="text-sm font-semibold tracking-wide text-slate-200">
          CAPTION QA
        </h3>
        <span className="ml-auto text-[11px] text-slate-500">
          checks your approved terms
        </span>
      </div>

      <textarea
        value={text}
        onChange={(e) => setText(e.target.value)}
        rows={3}
        placeholder="Write or generate a caption, then check it against warehouse terminology…"
        className="w-full resize-none rounded-lg border border-slate-700 bg-slate-950/60 p-3 text-sm text-slate-100 outline-none focus:border-sky-500"
      />

      <div className="mt-2 flex flex-wrap gap-2">
        <button
          onClick={generate}
          disabled={!snap?.liveLabels.length}
          className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-medium hover:bg-slate-600 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <Wand2 size={14} /> Generate from frame
        </button>
        <button
          onClick={() => setResult(analyzeCaption(text))}
          disabled={!text.trim()}
          className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold hover:bg-sky-500 disabled:cursor-not-allowed disabled:opacity-40"
        >
          <CheckCircle2 size={14} /> Check
        </button>
        <button
          onClick={() => {
            const cleaned = autoClean(text)
            setText(cleaned)
            setResult(analyzeCaption(cleaned))
          }}
          disabled={!text.trim()}
          className="flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-1.5 text-sm hover:border-slate-400 disabled:cursor-not-allowed disabled:opacity-40"
        >
          Auto-clean
        </button>
      </div>

      {result && (
        <div className="mt-4 space-y-2">
          <div className="flex items-center gap-3">
            <span className="text-3xl font-bold text-slate-100">{result.score}</span>
            <span className="text-xs text-slate-500">/ 100</span>
            <span
              className={`ml-auto rounded-full border px-3 py-1 text-xs font-semibold ${
                VERDICT_STYLE[result.verdict]
              }`}
            >
              {result.verdict}
            </span>
          </div>
          {result.issues.map((i) => (
            <div
              key={i.id}
              className="flex items-start gap-2 rounded-lg bg-slate-800/50 px-3 py-2 text-xs"
            >
              <AlertCircle
                size={13}
                className={`mt-0.5 shrink-0 ${i.severity === 'error' ? 'text-rose-400' : 'text-amber-400'}`}
              />
              <span className="text-slate-300">{i.message}</span>
            </div>
          ))}
          {result.suggestions.map((sug) => (
            <div
              key={sug.id}
              className="rounded-lg bg-slate-800/30 px-3 py-2 text-xs text-slate-400"
            >
              💡 {sug.message}
            </div>
          ))}
          {result.issues.length === 0 && result.suggestions.length === 0 && (
            <div className="rounded-lg bg-emerald-500/10 px-3 py-2 text-xs text-emerald-300">
              Clean — matches approved terminology and present-tense style.
            </div>
          )}
        </div>
      )}
    </section>
  )
}
