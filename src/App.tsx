import { useCallback, useEffect, useRef, useState } from 'react'
import type { ObjectDetection } from '@tensorflow-models/coco-ssd'
import {
  Upload,
  Download,
  FileJson,
  Trash2,
  Code2,
  ShieldCheck,
  Boxes,
  Heart,
} from 'lucide-react'
import type {
  AnalysisSnapshot,
  BBox,
  ModelStatus,
  Settings,
  Zone,
  ZoneTypeKey,
} from './types'
import { DEFAULT_SETTINGS, ZONE_TYPES } from './types'
import { loadModel } from './ml/loadModel'
import {
  buildJsonReport,
  buildTextReport,
  downloadFile,
  type ReportInput,
} from './lib/exporter'
import {
  deleteProject,
  listProjects,
  saveProject,
  type ProjectRecord,
} from './lib/db'
import VideoPlayer from './components/VideoPlayer'
import SettingsPanel from './components/SettingsPanel'
import ZoneEditor from './components/ZoneEditor'
import Heatmap from './components/Heatmap'
import MetricsDashboard from './components/MetricsDashboard'
import Timeline from './components/Timeline'
import CaptionPanel from './components/CaptionPanel'

export default function App() {
  const [model, setModel] = useState<ObjectDetection | null>(null)
  const [modelStatus, setModelStatus] = useState<ModelStatus>('idle')
  const [modelDetail, setModelDetail] = useState('')
  const [videoUrl, setVideoUrl] = useState('')
  const [fileName, setFileName] = useState('')
  const [duration, setDuration] = useState(0)
  const [settings, setSettings] = useState<Settings>(DEFAULT_SETTINGS)
  const [zones, setZones] = useState<Zone[]>([])
  const [drawMode, setDrawMode] = useState(false)
  const [pendingType, setPendingType] = useState<ZoneTypeKey>('restricted')
  const [resetKey, setResetKey] = useState(0)
  const [snap, setSnap] = useState<AnalysisSnapshot | null>(null)
  const [projects, setProjects] = useState<ProjectRecord[]>([])
  const zoneId = useRef(1)
  const prevUrl = useRef('')

  const startModel = useCallback(() => {
    loadModel((status, detail) => {
      setModelStatus(status)
      if (detail) setModelDetail(detail)
    })
      .then(setModel)
      .catch(() => {})
  }, [])

  const refreshProjects = useCallback(() => {
    listProjects().then(setProjects).catch(() => {})
  }, [])

  useEffect(() => {
    startModel()
    refreshProjects()
  }, [startModel, refreshProjects])

  const onPickFile = useCallback((file: File | undefined) => {
    if (!file || !file.type.startsWith('video/')) return
    if (prevUrl.current) URL.revokeObjectURL(prevUrl.current)
    const url = URL.createObjectURL(file)
    prevUrl.current = url
    setVideoUrl(url)
    setFileName(file.name)
    setSnap(null)
    setDuration(0)
    setResetKey((k) => k + 1)
  }, [])

  const onCreateZone = useCallback(
    (rect: BBox) => {
      setZones((prev) => {
        const count = prev.filter((z) => z.type === pendingType).length + 1
        return [
          ...prev,
          {
            id: zoneId.current++,
            type: pendingType,
            name: `${ZONE_TYPES[pendingType].name} ${count}`,
            rect,
          },
        ]
      })
    },
    [pendingType],
  )

  const saveLayout = useCallback(async () => {
    const name = window.prompt('Name this layout', fileName || 'Warehouse layout')
    if (!name) return
    await saveProject({ name, createdAt: Date.now(), zones, settings })
    refreshProjects()
  }, [fileName, zones, settings, refreshProjects])

  const loadLayout = useCallback(
    (id: number) => {
      const p = projects.find((x) => x.id === id)
      if (!p) return
      setZones(p.zones)
      setSettings(p.settings)
      zoneId.current = p.zones.reduce((m, z) => Math.max(m, z.id), 0) + 1
    },
    [projects],
  )

  const removeLayout = useCallback(
    async (id: number) => {
      await deleteProject(id)
      refreshProjects()
    },
    [refreshProjects],
  )

  const buildReport = useCallback((): ReportInput | null => {
    if (!snap) return null
    return {
      fileName,
      durationSec: duration,
      modelInfo: modelDetail || 'COCO-SSD lite_mobilenet_v2',
      settings,
      metrics: snap.metrics,
      tracks: snap.tracks,
      events: snap.events,
      zones,
    }
  }, [snap, fileName, duration, modelDetail, settings, zones])

  const exportText = () => {
    const r = buildReport()
    if (r) downloadFile(`warehouse_analysis_${stamp()}.txt`, buildTextReport(r), 'text/plain')
  }
  const exportJson = () => {
    const r = buildReport()
    if (r) downloadFile(`warehouse_analysis_${stamp()}.json`, buildJsonReport(r), 'application/json')
  }

  return (
    <div className="min-h-screen bg-[#0b0d12] text-slate-100">
      <Header />

      <main className="mx-auto max-w-[1440px] px-4 pb-20 pt-6">
        {!videoUrl ? (
          <UploadScreen onPick={onPickFile} status={modelStatus} detail={modelDetail} />
        ) : (
          <>
            <div className="grid grid-cols-1 gap-6 xl:grid-cols-4">
              <div className="space-y-4 xl:col-span-3">
                <VideoPlayer
                  videoUrl={videoUrl}
                  model={model}
                  settings={settings}
                  zones={zones}
                  drawMode={drawMode}
                  resetKey={resetKey}
                  onCreateZone={onCreateZone}
                  onSnapshot={setSnap}
                  onDuration={setDuration}
                />

                <div className="flex flex-wrap items-center gap-2 rounded-2xl border border-slate-700/70 bg-slate-900/40 p-3">
                  <span className="mr-1 truncate text-xs text-slate-400">{fileName}</span>
                  <button
                    onClick={exportText}
                    disabled={!snap}
                    className="flex items-center gap-1.5 rounded-lg bg-sky-600 px-3 py-1.5 text-sm font-semibold hover:bg-sky-500 disabled:opacity-40"
                  >
                    <Download size={14} /> Report (.txt)
                  </button>
                  <button
                    onClick={exportJson}
                    disabled={!snap}
                    className="flex items-center gap-1.5 rounded-lg bg-slate-700 px-3 py-1.5 text-sm font-medium hover:bg-slate-600 disabled:opacity-40"
                  >
                    <FileJson size={14} /> Data (.json)
                  </button>
                  <button
                    onClick={() => {
                      setResetKey((k) => k + 1)
                      setSnap(null)
                    }}
                    className="flex items-center gap-1.5 rounded-lg border border-slate-600 px-3 py-1.5 text-sm hover:border-slate-400"
                  >
                    <Trash2 size={14} /> Reset analysis
                  </button>
                  <label className="ml-auto cursor-pointer rounded-lg border border-slate-600 px-3 py-1.5 text-sm hover:border-slate-400">
                    Change video
                    <input
                      type="file"
                      accept="video/*"
                      className="hidden"
                      onChange={(e) => onPickFile(e.target.files?.[0])}
                    />
                  </label>
                </div>

                <MetricsDashboard snap={snap} />
              </div>

              <div className="space-y-4 xl:col-span-1">
                <SettingsPanel
                  settings={settings}
                  modelStatus={modelStatus}
                  modelDetail={modelDetail}
                  onChange={(patch) => setSettings((s) => ({ ...s, ...patch }))}
                  onRetry={startModel}
                />
                <ZoneEditor
                  zones={zones}
                  events={snap?.events ?? []}
                  drawMode={drawMode}
                  pendingType={pendingType}
                  hasVideo={!!videoUrl}
                  savedProjects={projects}
                  onPendingType={setPendingType}
                  onToggleDraw={() => setDrawMode((d) => !d)}
                  onDelete={(id) => setZones((z) => z.filter((x) => x.id !== id))}
                  onClear={() => setZones([])}
                  onSaveLayout={saveLayout}
                  onLoadLayout={loadLayout}
                  onDeleteLayout={removeLayout}
                />
                <Heatmap
                  enabled={settings.showHeatmap}
                  onToggle={() => setSettings((s) => ({ ...s, showHeatmap: !s.showHeatmap }))}
                />
              </div>
            </div>

            <div className="mt-6 space-y-6">
              <Timeline snap={snap} />
              <CaptionPanel snap={snap} />
            </div>
          </>
        )}
      </main>
      <Footer />
    </div>
  )
}

function Header() {
  return (
    <header className="sticky top-0 z-10 border-b border-slate-800 bg-[#0b0d12]/90 backdrop-blur">
      <div className="mx-auto flex max-w-[1440px] items-center gap-3 px-4 py-3">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-sky-500 to-cyan-400 text-slate-950">
          <Boxes size={20} />
        </div>
        <div>
          <h1 className="text-base font-bold leading-tight">AI Video Annotator Suite</h1>
          <p className="text-[11px] text-slate-400">
            On-device warehouse video analysis
          </p>
        </div>
        <span className="ml-3 hidden items-center gap-1 rounded-full border border-emerald-500/40 bg-emerald-500/10 px-2.5 py-1 text-[11px] text-emerald-300 sm:flex">
          <ShieldCheck size={12} /> 100% local · nothing uploaded
        </span>
        <a
          href="https://github.com/DaCameraGirl/AI-Video-Annotator"
          target="_blank"
          rel="noreferrer"
          className="ml-auto flex items-center gap-1.5 rounded-lg border border-slate-700 px-3 py-1.5 text-sm text-slate-300 hover:border-slate-500"
        >
          <Code2 size={15} /> <span className="hidden sm:inline">Source</span>
        </a>
      </div>
    </header>
  )
}

function UploadScreen(props: {
  onPick: (f: File | undefined) => void
  status: ModelStatus
  detail: string
}) {
  return (
    <div className="mx-auto max-w-3xl pt-10 text-center">
      <h2 className="text-3xl font-bold text-slate-100 sm:text-4xl">
        Turn warehouse footage into structured data
      </h2>
      <p className="mx-auto mt-3 max-w-2xl text-slate-400">
        Upload a clip and the detector runs right here in your browser — bounding
        boxes, object tracking, virtual-fence zones, dwell times, an activity
        heatmap, and a report. Your video never leaves your device.
      </p>

      <label
        onDragOver={(e) => e.preventDefault()}
        onDrop={(e) => {
          e.preventDefault()
          props.onPick(e.dataTransfer.files?.[0])
        }}
        className="mt-8 flex cursor-pointer flex-col items-center justify-center rounded-2xl border-2 border-dashed border-slate-700 bg-slate-900/40 px-8 py-14 transition hover:border-sky-500 hover:bg-slate-900/70"
      >
        <Upload size={40} className="mb-4 text-sky-400" />
        <span className="text-lg font-semibold">Drop a video here, or click to choose</span>
        <span className="mt-1 text-sm text-slate-500">MP4, WebM, MOV — anything your browser plays</span>
        <input
          type="file"
          accept="video/*"
          className="hidden"
          onChange={(e) => props.onPick(e.target.files?.[0])}
        />
      </label>

      <div className="mt-4 text-xs text-slate-500">
        Detector:{' '}
        <span className={props.status === 'ready' ? 'text-emerald-400' : 'text-amber-400'}>
          {props.detail || props.status}
        </span>
      </div>

      <div className="mt-8 grid grid-cols-1 gap-3 text-left sm:grid-cols-3">
        <Blurb title="Your terminology">
          Generic detections are relabeled with your approved warehouse terms —
          worker, forklift, pallet jack, tall metal shelving.
        </Blurb>
        <Blurb title="Honest about AI">
          Real COCO-SSD detections only. PPE (vests) is a clearly-tagged color
          estimate, never a faked detection.
        </Blurb>
        <Blurb title="All in one">
          Object detection and the warehouse caption checker, together at last.
        </Blurb>
      </div>
    </div>
  )
}

function Blurb({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-4">
      <div className="mb-1 text-sm font-semibold text-sky-300">{title}</div>
      <p className="text-xs leading-relaxed text-slate-400">{children}</p>
    </div>
  )
}

function Footer() {
  return (
    <footer className="border-t border-slate-800 py-6 text-center text-xs text-slate-500">
      <span className="inline-flex items-center gap-1">
        Built by Angela Hudson · DaCameraGirl <Heart size={11} className="text-pink-400" />
      </span>
    </footer>
  )
}

function stamp(): string {
  return new Date().toISOString().replace(/[:.]/g, '-').slice(0, 19)
}
