// Detector controls + overlay toggles + model status.

import { Settings as SettingsIcon, RefreshCw } from 'lucide-react'
import type { ModelStatus, Settings } from '../types'

export interface SettingsPanelProps {
  settings: Settings
  modelStatus: ModelStatus
  modelDetail: string
  onChange: (patch: Partial<Settings>) => void
  onRetry: () => void
}

const STATUS_COLOR: Record<ModelStatus, string> = {
  idle: 'bg-slate-500',
  loading: 'bg-amber-400',
  ready: 'bg-emerald-400',
  error: 'bg-rose-500',
}

export default function SettingsPanel(p: SettingsPanelProps) {
  const s = p.settings
  return (
    <section className="rounded-2xl border border-slate-700/70 bg-slate-900/40 p-5">
      <div className="mb-4 flex items-center gap-2">
        <SettingsIcon size={18} className="text-sky-400" />
        <h3 className="text-sm font-semibold tracking-wide text-slate-200">DETECTOR</h3>
      </div>

      <div className="mb-4 flex items-center gap-2 rounded-lg bg-slate-800/50 px-3 py-2">
        <span className={`h-2.5 w-2.5 rounded-full ${STATUS_COLOR[p.modelStatus]} ${p.modelStatus === 'loading' ? 'animate-pulse' : ''}`} />
        <span className="text-xs text-slate-300">{p.modelDetail || p.modelStatus}</span>
        {p.modelStatus === 'error' && (
          <button
            onClick={p.onRetry}
            className="ml-auto flex items-center gap-1 rounded bg-sky-600 px-2 py-1 text-xs hover:bg-sky-500"
          >
            <RefreshCw size={12} /> Retry
          </button>
        )}
      </div>

      <Slider
        label="Confidence threshold"
        hint="Higher = fewer, surer detections"
        value={s.confidence}
        min={0.2}
        max={0.9}
        step={0.05}
        display={`${Math.round(s.confidence * 100)}%`}
        onChange={(v) => p.onChange({ confidence: v })}
      />
      <Slider
        label="Detection interval"
        hint="Lower = smoother but heavier on CPU"
        value={s.detectEveryMs}
        min={80}
        max={600}
        step={20}
        display={`${s.detectEveryMs}ms`}
        onChange={(v) => p.onChange({ detectEveryMs: v })}
      />

      <div className="mt-4 space-y-1 border-t border-slate-700/60 pt-4">
        <Toggle
          label="Use warehouse terminology"
          checked={s.useWarehouseTerms}
          onChange={(v) => p.onChange({ useWarehouseTerms: v })}
        />
        <Toggle
          label="Estimate PPE (color guess)"
          checked={s.estimatePPE}
          onChange={(v) => p.onChange({ estimatePPE: v })}
        />
        <Toggle
          label="Show boxes"
          checked={s.showBoxes}
          onChange={(v) => p.onChange({ showBoxes: v })}
        />
        <Toggle
          label="Show zones"
          checked={s.showZones}
          onChange={(v) => p.onChange({ showZones: v })}
        />
        <Toggle
          label="Show track trails"
          checked={s.showTracks}
          onChange={(v) => p.onChange({ showTracks: v })}
        />
      </div>
    </section>
  )
}

function Slider(props: {
  label: string
  hint: string
  value: number
  min: number
  max: number
  step: number
  display: string
  onChange: (v: number) => void
}) {
  return (
    <div className="mb-4">
      <div className="mb-1 flex items-center justify-between text-sm">
        <span className="text-slate-300">{props.label}</span>
        <span className="font-mono text-xs text-sky-300">{props.display}</span>
      </div>
      <input
        type="range"
        min={props.min}
        max={props.max}
        step={props.step}
        value={props.value}
        onChange={(e) => props.onChange(parseFloat(e.target.value))}
        className="w-full"
      />
      <div className="mt-0.5 text-[11px] text-slate-500">{props.hint}</div>
    </div>
  )
}

function Toggle(props: { label: string; checked: boolean; onChange: (v: boolean) => void }) {
  return (
    <button
      onClick={() => props.onChange(!props.checked)}
      role="switch"
      aria-checked={props.checked}
      className="flex w-full items-center justify-between py-1.5 text-left text-sm text-slate-300"
    >
      <span>{props.label}</span>
      <span
        className={`relative h-5 w-9 shrink-0 rounded-full transition ${
          props.checked ? 'bg-sky-500' : 'bg-slate-700'
        }`}
      >
        <span
          className={`absolute top-0.5 h-4 w-4 rounded-full bg-white transition ${
            props.checked ? 'left-[18px]' : 'left-0.5'
          }`}
        />
      </span>
    </button>
  )
}
