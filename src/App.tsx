import { useMemo, useState } from 'react'
import type { ChangeEvent, DragEvent } from 'react'
import {
  Clipboard,
  Copy,
  Eraser,
  FileText,
  ImagePlus,
  ListChecks,
  PanelTopOpen,
  Sparkles,
} from 'lucide-react'

type ImageSlotKey = 'input' | 'a' | 'b'
type RatingKey =
  | 'Overall Preference'
  | 'Instruction Following'
  | 'Correctness'
  | 'Visual Quality'
  | 'AI-Generated Appearance / Naturalness'

interface ImageSlot {
  label: string
  url: string
}

const ratingKeys: RatingKey[] = [
  'Overall Preference',
  'Instruction Following',
  'Correctness',
  'Visual Quality',
  'AI-Generated Appearance / Naturalness',
]

const ratingOptions = [
  'Response A is much better',
  'Response A is slightly better',
  'Tie / About the same',
  'Response B is slightly better',
  'Response B is much better',
]

const starterImages: Record<ImageSlotKey, ImageSlot> = {
  input: { label: 'Input', url: '' },
  a: { label: 'Response A', url: '' },
  b: { label: 'Response B', url: '' },
}

const starterRatings = Object.fromEntries(ratingKeys.map((key) => [key, ''])) as Record<
  RatingKey,
  string
>

const defectChips = [
  'changes the whole scene too much',
  'does not preserve the original subject',
  'adds extra objects that were not asked for',
  'misses one of the requested changes',
  'keeps the original layout closer',
  'looks less natural around the edit',
  'changes the camera angle or crop too much',
  'has stronger visual quality but is less faithful',
]

export default function App() {
  const [taskText, setTaskText] = useState('')
  const [prompt, setPrompt] = useState('')
  const [images, setImages] = useState<Record<ImageSlotKey, ImageSlot>>(starterImages)
  const [ratings, setRatings] = useState<Record<RatingKey, string>>(starterRatings)
  const [winnerNotes, setWinnerNotes] = useState('')
  const [loserNotes, setLoserNotes] = useState('')
  const [tradeoffNotes, setTradeoffNotes] = useState('')
  const [justification, setJustification] = useState('')
  const [activePreview, setActivePreview] = useState<ImageSlot | null>(null)
  const [copied, setCopied] = useState('')

  const checklist = useMemo(() => makeChecklist(prompt), [prompt])
  const winner = getWinner(ratings['Overall Preference'])
  const loser = winner === 'A' ? 'B' : winner === 'B' ? 'A' : ''

  function setSlotUrl(slot: ImageSlotKey, url: string) {
    setImages((current) => ({
      ...current,
      [slot]: { ...current[slot], url },
    }))
  }

  function clearSlot(slot: ImageSlotKey) {
    setSlotUrl(slot, '')
  }

  function onDrop(slot: ImageSlotKey, event: DragEvent<HTMLLabelElement>) {
    event.preventDefault()
    const file = event.dataTransfer.files[0]
    const url = event.dataTransfer.getData('text/uri-list') || event.dataTransfer.getData('text/plain')
    if (file?.type.startsWith('image/')) {
      setSlotUrl(slot, URL.createObjectURL(file))
      return
    }
    if (url) setSlotUrl(slot, url.trim())
  }

  function onPickFile(slot: ImageSlotKey, event: ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file?.type.startsWith('image/')) {
      setSlotUrl(slot, URL.createObjectURL(file))
    }
  }

  function parseTask() {
    const text = taskText.trim()
    if (!text) return

    const promptMatch = text.match(
      /Prompt\s*([\s\S]*?)(?:Input Image|Input\s|Response A|response a|reesponse a|respomse a|response b|$)/i,
    )
    setPrompt(cleanTaskPrompt(promptMatch?.[1] || text))

    const urls = [...text.matchAll(/https:\/\/storage\.googleapis\.com\/[^\s,]+/g)].map(
      (match) => match[0],
    )

    if (urls[0]) setSlotUrl('input', urls[0])
    if (urls[1]) setSlotUrl('a', urls[1])
    if (urls[2]) setSlotUrl('b', urls[2])
  }

  function setRating(key: RatingKey, value: string) {
    setRatings((current) => ({ ...current, [key]: value }))
  }

  function draftJustification() {
    const pickedWinner = getWinner(ratings['Overall Preference'])
    if (!pickedWinner) {
      setJustification('Pick an overall preference first.')
      return
    }

    const pickedLoser = pickedWinner === 'A' ? 'B' : 'A'
    const strength = ratings['Overall Preference'].includes('much') ? 'much better' : 'better'
    const lines = [
      `Response ${pickedWinner} is ${strength} than Response ${pickedLoser}.`,
    ]

    if (winnerNotes.trim()) {
      lines.push(`Response ${pickedWinner} ${sentence(winnerNotes)}`)
    } else {
      lines.push(
        `Response ${pickedWinner} follows the requested changes more closely while staying more faithful to the input image.`,
      )
    }

    if (loserNotes.trim()) {
      lines.push(`Response ${pickedLoser} ${sentence(loserNotes)}`)
    }

    if (tradeoffNotes.trim()) {
      lines.push(sentence(tradeoffNotes))
    }

    setJustification(removeEmDashes(lines.join(' ')))
  }

  function clearAll() {
    setTaskText('')
    setPrompt('')
    setImages(starterImages)
    setRatings(starterRatings)
    setWinnerNotes('')
    setLoserNotes('')
    setTradeoffNotes('')
    setJustification('')
    setCopied('')
  }

  async function copyText(value: string, label: string) {
    if (!value.trim()) return
    await navigator.clipboard.writeText(value)
    setCopied(label)
    window.setTimeout(() => setCopied(''), 1800)
  }

  function copyRatings() {
    const ratingText = ratingKeys
      .map((key) => `${key}: ${ratings[key] || 'Not selected'}`)
      .join('\n')
    copyText(ratingText, 'ratings')
  }

  function addChip(note: string) {
    setLoserNotes((current) => (current.trim() ? `${current}, ${note}` : note))
  }

  return (
    <div className="min-h-screen bg-[#f7f2e9] text-[#171412]">
      <header className="border-b border-[#ddd1bf] bg-[#fffaf2]/90 backdrop-blur">
        <div className="mx-auto flex max-w-[1500px] items-center gap-3 px-4 py-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#7b1f2f] text-white">
            <ListChecks size={21} />
          </div>
          <div>
            <h1 className="text-lg font-black leading-tight">Hydra evaluator</h1>
            <p className="text-xs font-semibold text-[#6f665d]">Fast image response scoring</p>
          </div>
          <div className="ml-auto flex items-center gap-2">
            <button className="tool-button" onClick={copyRatings} type="button">
              <Clipboard size={16} />
              Copy ratings
            </button>
            <button className="tool-button danger" onClick={clearAll} type="button">
              <Eraser size={16} />
              Clear
            </button>
          </div>
        </div>
      </header>

      <main className="mx-auto grid max-w-[1500px] grid-cols-1 gap-4 px-4 py-4 xl:grid-cols-[390px_1fr]">
        <section className="surface space-y-3 p-4">
          <div className="section-heading">
            <FileText size={18} />
            <h2>Task text</h2>
          </div>
          <textarea
            className="input-area min-h-36"
            placeholder="Paste the full Hydra task here."
            value={taskText}
            onChange={(event) => setTaskText(event.target.value)}
          />
          <button className="primary-button w-full" onClick={parseTask} type="button">
            <PanelTopOpen size={18} />
            Pull prompt and links
          </button>

          <label className="block space-y-2">
            <span className="label-text">Prompt</span>
            <textarea
              className="input-area min-h-28"
              value={prompt}
              onChange={(event) => setPrompt(event.target.value)}
              placeholder="Prompt goes here."
            />
          </label>

          <div className="rounded-lg border border-[#e2d6c6] bg-[#fffaf2] p-3">
            <div className="mb-2 flex items-center gap-2 text-sm font-black">
              <Sparkles size={16} />
              Checklist
            </div>
            <ul className="space-y-2 text-sm text-[#5f574f]">
              {checklist.length ? (
                checklist.map((item) => <li key={item}>{item}</li>)
              ) : (
                <li>Add a prompt to split the requested edits.</li>
              )}
            </ul>
          </div>
        </section>

        <section className="grid grid-cols-1 gap-3 lg:grid-cols-3">
          {(['input', 'a', 'b'] as ImageSlotKey[]).map((slot) => (
            <ImageCard
              key={slot}
              image={images[slot]}
              slot={slot}
              onDrop={onDrop}
              onPickFile={onPickFile}
              onUrl={setSlotUrl}
              onClear={clearSlot}
              onPreview={setActivePreview}
            />
          ))}
        </section>

        <section className="surface p-4 xl:col-span-2">
          <div className="mb-3 flex items-center justify-between gap-3">
            <div className="section-heading">
              <ListChecks size={18} />
              <h2>Ratings</h2>
            </div>
            {copied && <span className="rounded-full bg-[#0d5c63]/10 px-3 py-1 text-xs font-bold text-[#0d5c63]">Copied {copied}</span>}
          </div>

          <div className="space-y-3">
            {ratingKeys.map((key) => (
              <div key={key} className="rating-row">
                <div className="text-sm font-black">{key}</div>
                <div className="grid grid-cols-1 gap-2 md:grid-cols-5">
                  {ratingOptions.map((option) => (
                    <button
                      key={option}
                      className={ratings[key] === option ? 'rating-button active' : 'rating-button'}
                      onClick={() => setRating(key, option)}
                      type="button"
                    >
                      {option}
                    </button>
                  ))}
                </div>
              </div>
            ))}
          </div>
        </section>

        <section className="surface p-4 xl:col-span-2">
          <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
            <div className="section-heading">
              <Sparkles size={18} />
              <h2>Justification</h2>
            </div>
            <div className="flex flex-wrap gap-2">
              <button className="primary-button" onClick={draftJustification} type="button">
                Draft
              </button>
              <button
                className="tool-button"
                onClick={() => copyText(justification, 'justification')}
                type="button"
              >
                <Copy size={16} />
                Copy
              </button>
            </div>
          </div>

          <div className="grid grid-cols-1 gap-3 lg:grid-cols-3">
            <label className="space-y-2">
              <span className="label-text">What Response {winner || 'A/B'} does right</span>
              <textarea
                className="input-area min-h-28"
                value={winnerNotes}
                onChange={(event) => setWinnerNotes(event.target.value)}
                placeholder="keeps the original subject and makes the requested edits"
              />
            </label>
            <label className="space-y-2">
              <span className="label-text">What Response {loser || 'A/B'} gets wrong</span>
              <textarea
                className="input-area min-h-28"
                value={loserNotes}
                onChange={(event) => setLoserNotes(event.target.value)}
                placeholder="changes the whole scene or misses a requested detail"
              />
            </label>
            <label className="space-y-2">
              <span className="label-text">Tradeoff or shared issue</span>
              <textarea
                className="input-area min-h-28"
                value={tradeoffNotes}
                onChange={(event) => setTradeoffNotes(event.target.value)}
                placeholder="both responses have the same issue"
              />
            </label>
          </div>

          <div className="mt-3 flex flex-wrap gap-2">
            {defectChips.map((chip) => (
              <button key={chip} className="chip" onClick={() => addChip(chip)} type="button">
                {chip}
              </button>
            ))}
          </div>

          <textarea
            className="input-area mt-4 min-h-28"
            value={justification}
            onChange={(event) => setJustification(removeEmDashes(event.target.value))}
            placeholder="Response A is better than Response B..."
          />
        </section>
      </main>

      {activePreview && (
        <button className="preview-backdrop" onClick={() => setActivePreview(null)} type="button">
          <img src={activePreview.url} alt={`${activePreview.label} expanded`} />
        </button>
      )}
    </div>
  )
}

function ImageCard(props: {
  image: ImageSlot
  slot: ImageSlotKey
  onDrop: (slot: ImageSlotKey, event: DragEvent<HTMLLabelElement>) => void
  onPickFile: (slot: ImageSlotKey, event: ChangeEvent<HTMLInputElement>) => void
  onUrl: (slot: ImageSlotKey, url: string) => void
  onClear: (slot: ImageSlotKey) => void
  onPreview: (image: ImageSlot) => void
}) {
  return (
    <article className="surface overflow-hidden">
      <header className="flex items-center justify-between border-b border-[#ddd1bf] px-3 py-2">
        <h2 className="text-sm font-black">{props.image.label}</h2>
        <button className="mini-button" onClick={() => props.onClear(props.slot)} type="button">
          Clear
        </button>
      </header>

      <label
        className="image-drop"
        onDragOver={(event) => event.preventDefault()}
        onDrop={(event) => props.onDrop(props.slot, event)}
      >
        {props.image.url ? (
          <img
            src={props.image.url}
            alt={`${props.image.label} preview`}
            onDoubleClick={() => props.onPreview(props.image)}
          />
        ) : (
          <span>
            <ImagePlus size={26} />
            Drop image
          </span>
        )}
        <input
          type="file"
          accept="image/*"
          className="hidden"
          onChange={(event) => props.onPickFile(props.slot, event)}
        />
      </label>

      <input
        className="url-input"
        value={props.image.url}
        onChange={(event) => props.onUrl(props.slot, event.target.value)}
        placeholder={`${props.image.label} URL`}
      />
    </article>
  )
}

function makeChecklist(prompt: string) {
  if (!prompt.trim()) return []

  return prompt
    .replace(/\b(?:Then|Finally|Also|And)\b/gi, '.')
    .replace(/\d+\.\s*/g, '. ')
    .split(/[.;]/)
    .map((item) => item.trim())
    .filter((item) => item.length > 12)
    .slice(0, 8)
}

function cleanTaskPrompt(value: string) {
  return value.replace(/^[:\s]+/, '').trim()
}

function getWinner(overall: string) {
  if (overall.includes('Response A')) return 'A'
  if (overall.includes('Response B')) return 'B'
  return ''
}

function sentence(value: string) {
  const cleaned = removeEmDashes(value).trim().replace(/\s+/g, ' ')
  if (!cleaned) return ''
  return /[.!?]$/.test(cleaned) ? cleaned : `${cleaned}.`
}

function removeEmDashes(value: string) {
  return value.replace(/[\u2013\u2014]/g, ',')
}
