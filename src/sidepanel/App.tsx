// Side panel UI — senior-optimised two-column tile layout with Phosphor icons.

import {
  useCallback,
  useEffect,
  useLayoutEffect,
  useRef,
  useState,
} from "react"
import { useFocusTrap } from "@shared/useFocusTrap"
import { createPortal } from "react-dom"
import Sortable from "sortablejs"
import {
  HouseIcon,
  ArrowCounterClockwiseIcon,
  ArrowDownIcon,
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowLineUpIcon,
  ArrowsClockwiseIcon,
  ArrowsDownUpIcon,
  ArrowsInIcon,
  ArrowsOutIcon,
  ArrowUpIcon,
  ConfettiIcon,
  HandWavingIcon,
  TextAaIcon,
  BookmarkSimpleIcon,
  ThumbsUpIcon,
  XCircleIcon,
  PencilSimpleIcon,
  EyeIcon,
  EyeSlashIcon,
  DotsSixVerticalIcon,
  SpeakerHighIcon,
  SpeakerLowIcon,
  SpeakerNoneIcon,
  SpeakerSlashIcon,
} from "@phosphor-icons/react"
import { storage } from "@shared/storage"
import { FloatingToast, useToast } from "@shared/toast"
import {
  FONT_SIZES,
  FONT_SIZE_LABELS,
  DEFAULT_PANEL_BUTTON_ORDER,
  DEFAULT_PANEL_BUTTONS,
} from "@shared/constants"
import type { FontSize, PanelButtonConfig } from "@shared/types"

// ── Icon map (Phosphor, weight="bold") ────────────────────────────────────────

const PHOSPHOR: Record<string, React.ReactNode> = {
  home:       <HouseIcon size={36} weight="bold" />,
  back:       <ArrowLeftIcon size={36} weight="bold" />,
  forward:    <ArrowRightIcon size={36} weight="bold" />,
  scrollTop:  <ArrowLineUpIcon size={36} weight="bold" />,
  zoom:       <TextAaIcon size={36} weight="bold" />,
  save:       <BookmarkSimpleIcon size={36} weight="bold" />,
  fullscreen: <ArrowsOutIcon size={36} weight="bold" />,
  refresh:    <ArrowsClockwiseIcon size={36} weight="bold" />,
  exit:       <XCircleIcon size={36} weight="bold" />,
}

// Smaller variants for the admin drag list
const PHOSPHOR_SM: Record<string, React.ReactNode> = {
  home:       <HouseIcon size={18} weight="bold" />,
  back:       <ArrowLeftIcon size={18} weight="bold" />,
  forward:    <ArrowRightIcon size={18} weight="bold" />,
  volume:     <SpeakerHighIcon size={18} weight="bold" />,
  scroll:     <ArrowsDownUpIcon size={18} weight="bold" />,
  scrollTop:  <ArrowLineUpIcon size={18} weight="bold" />,
  zoom:       <TextAaIcon size={18} weight="bold" />,
  save:       <BookmarkSimpleIcon size={18} weight="bold" />,
  fullscreen: <ArrowsOutIcon size={18} weight="bold" />,
  refresh:    <ArrowsClockwiseIcon size={18} weight="bold" />,
  exit:       <XCircleIcon size={18} weight="bold" />,
}

// ── Tile button ───────────────────────────────────────────────────────────────

interface TileProps {
  id: string
  label: string
  icon: React.ReactNode
  onClick: () => void
  disabled?: boolean
  variant?: "default" | "primary" | "danger"
  fullWidth?: boolean
  tourTarget?: string
  labelFontSize?: string
}

function Tile({
  id,
  label,
  icon,
  onClick,
  disabled = false,
  variant = "default",
  fullWidth = false,
  tourTarget,
  labelFontSize = "1.5rem",
}: TileProps) {
  const [hov, setHov] = useState(false)
  const [pressed, setPressed] = useState(false)

  const isPrimary = variant === "primary"
  const isDanger = variant === "danger"

  // Background logic
  let bg = "var(--sw-surface)"
  if (isPrimary)
    bg = hov ? "var(--sw-accent-btn-hover)" : "var(--sw-accent-btn)"
  else if (isDanger) bg = hov ? "var(--sw-danger-light)" : "var(--sw-surface)"
  else if (hov) bg = "var(--sw-accent-light)"

  // Text / icon colour
  let fg = "var(--sw-text-muted)"
  if (isPrimary) fg = "#fff"
  else if (isDanger) fg = hov ? "var(--sw-danger)" : "var(--sw-text-muted)"
  else if (hov) fg = "var(--sw-accent)"

  // Border
  let border = `1.5px solid ${hov && !isPrimary ? "var(--sw-accent-light)" : "var(--sw-surface-edge)"}`
  if (isPrimary) border = "none"
  if (isDanger && hov) border = `1.5px solid var(--sw-danger)`

  return (
    <button
      key={id}
      onClick={onClick}
      disabled={disabled}
      aria-label={label}
      data-panel-tour={tourTarget}
      onMouseEnter={() => {
        if (!disabled) setHov(true)
      }}
      onMouseLeave={() => {
        setHov(false)
        setPressed(false)
      }}
      onMouseDown={() => {
        if (!disabled) setPressed(true)
      }}
      onMouseUp={() => setPressed(false)}
      style={{
        gridColumn: fullWidth ? "span 2" : undefined,
        minWidth: 0,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.45rem",
        padding: fullWidth ? "1rem 1.25rem" : "1rem 0.5rem",
        minHeight: fullWidth ? 68 : 84,
        background: bg,
        border,
        borderRadius: "var(--sw-radius)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.38 : 1,
        color: fg,
        fontFamily: "inherit",
        transition:
          "background 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s",
        transform: pressed ? "scale(0.95)" : hov ? "scale(1.02)" : "scale(1)",
        boxShadow: isPrimary
          ? hov
            ? "0 6px 20px rgba(160, 74, 28, 0.45)"
            : "0 3px 10px rgba(194, 94, 42, 0.28)"
          : hov
            ? "var(--sw-shadow-md)"
            : "none",
      }}
    >
      {/* Icon */}
      <span
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          lineHeight: 0,
          flexDirection: fullWidth ? "row" : "column",
          gap: fullWidth ? "0.6rem" : 0,
        }}
      >
        {icon}

        {/* Inline label for full-width buttons */}
        {fullWidth && (
          <span
            style={{
              fontSize: labelFontSize,
              fontWeight: 700,
              letterSpacing: "0.01em",
              lineHeight: 1.2,
            }}
          >
            {label}
          </span>
        )}
      </span>

      {/* Label below icon for tile buttons */}
      {!fullWidth && (
        <span
          style={{
            fontSize: labelFontSize,
            fontWeight: 700,
            letterSpacing: "0.01em",
            lineHeight: 1.2,
            textAlign: "center",
            maxWidth: "100%",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {label}
        </span>
      )}
    </button>
  )
}

// ── Zoom size indicator dots ──────────────────────────────────────────────────

function ZoomTile({
  label,
  currentSize,
  onClick,
  disabled,
}: {
  label: string
  currentSize: FontSize
  onClick: () => void
  disabled: boolean
}) {
  const [hov, setHov] = useState(false)
  const [pressed, setPressed] = useState(false)
  const sizeIdx = FONT_SIZES.indexOf(currentSize)

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      aria-label={`${label}: ${FONT_SIZE_LABELS[currentSize]}`}
      data-panel-tour="zoom"
      onMouseEnter={() => {
        if (!disabled) setHov(true)
      }}
      onMouseLeave={() => {
        setHov(false)
        setPressed(false)
      }}
      onMouseDown={() => {
        if (!disabled) setPressed(true)
      }}
      onMouseUp={() => setPressed(false)}
      style={{
        minWidth: 0,
        width: "100%",
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.45rem",
        padding: "1rem 0.5rem",
        minHeight: 84,
        background: hov ? "var(--sw-accent-light)" : "var(--sw-surface)",
        border: `1.5px solid ${hov ? "var(--sw-accent-light)" : "var(--sw-surface-edge)"}`,
        borderRadius: "var(--sw-radius)",
        cursor: disabled ? "default" : "pointer",
        opacity: disabled ? 0.38 : 1,
        color: hov ? "var(--sw-accent)" : "var(--sw-text-muted)",
        fontFamily: "inherit",
        transition:
          "background 0.15s, color 0.15s, border-color 0.15s, box-shadow 0.15s",
        transform: pressed ? "scale(0.95)" : hov ? "scale(1.02)" : "scale(1)",
        boxShadow: hov ? "var(--sw-shadow-md)" : "none",
      }}
    >
      <TextAaIcon size={36} weight="bold" />

      {/* Step dots */}
      <div style={{ display: "flex", gap: 4, alignItems: "center" }}>
        {FONT_SIZES.map((_, i) => (
          <div
            key={i}
            style={{
              width: i === sizeIdx ? 8 : 5,
              height: i === sizeIdx ? 8 : 5,
              borderRadius: "50%",
              background:
                i <= sizeIdx ? "currentColor" : "var(--sw-surface-edge)",
              transition: "background 0.15s, width 0.15s, height 0.15s",
            }}
          />
        ))}
      </div>

      <span
        style={{
          fontSize: "1.5rem",
          fontWeight: 700,
          letterSpacing: "0.01em",
          lineHeight: 1.2,
          textAlign: "center",
        }}
      >
        {label}
      </span>
    </button>
  )
}

// ── Volume control tile ───────────────────────────────────────────────────────

const SEGMENTS = 10
const VOL_STEP = 0.1

function speakerIcon(vol: number) {
  if (vol === 0) return <SpeakerSlashIcon size={22} weight="bold" />
  if (vol <= 0.35) return <SpeakerNoneIcon size={22} weight="bold" />
  if (vol <= 0.65) return <SpeakerLowIcon size={22} weight="bold" />
  return <SpeakerHighIcon size={22} weight="bold" />
}

// Bar heights rise left-to-right like an equaliser (8 px → 30 px).
function barHeight(idx: number): number {
  return Math.round(8 + (idx / (SEGMENTS - 1)) * 22)
}

interface VolTileProps {
  label: string
  volume: number // 0.0 – 1.0
  onSet: (v: number) => void
}

function VolumeControlTile({ label, volume, onSet }: VolTileProps) {
  const preVolRef = useRef(1.0) // remembers level before muting
  const filled = Math.round(volume * SEGMENTS)
  const pct = Math.round(volume * 100)
  const atMin = volume <= 0
  const atMax = volume >= 1
  const muted = volume === 0

  const dec = () => {
    if (!atMin) onSet(parseFloat(Math.max(0, volume - VOL_STEP).toFixed(1)))
  }
  const inc = () => {
    if (!atMax) onSet(parseFloat(Math.min(1, volume + VOL_STEP).toFixed(1)))
  }
  const toggleMute = () => {
    if (muted) {
      onSet(preVolRef.current > 0 ? preVolRef.current : 0.5)
    } else {
      preVolRef.current = volume
      onSet(0)
    }
  }

  return (
    <div
      data-panel-tour="volume"
      style={{
        gridColumn: "span 2",
        padding: "0.85rem 0.9rem 0.75rem",
        background: "var(--sw-surface)",
        border: "1.5px solid var(--sw-surface-edge)",
        borderRadius: "var(--sw-radius)",
        display: "flex",
        flexDirection: "column",
        gap: "0.65rem",
      }}
    >
      {/* Header row — icon, label, percentage */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.45rem",
            color: "var(--sw-text-muted)",
          }}
        >
          {speakerIcon(volume)}
          <span
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--sw-text-muted)",
            }}
          >
            {label}
          </span>
        </div>
        <span
          style={{
            fontSize: "1.05rem",
            fontWeight: 800,
            color: muted ? "var(--sw-accent)" : "var(--sw-text)",
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.02em",
            minWidth: 44,
            textAlign: "right",
          }}
        >
          {muted ? "Muted" : `${pct}%`}
        </span>
      </div>

      {/* Equaliser bar — uses scaleY (GPU-composited) instead of height (layout) */}
      <div
        style={{
          display: "flex",
          gap: 3,
          alignItems: "flex-end",
          height: 32,
          padding: "0 2px",
          overflow: "hidden",
        }}
      >
        {Array.from({ length: SEGMENTS }, (_, i) => {
          const maxH = barHeight(i)
          const isFilled = i < filled
          return (
            <div
              key={i}
              style={{
                flex: 1,
                height: maxH,
                borderRadius: 3,
                background: isFilled
                  ? `hsl(${22 + i * 4}, 72%, ${46 - i * 1.5}%)`
                  : "var(--sw-surface-edge)",
                transformOrigin: "bottom",
                transform: isFilled ? "scaleY(1)" : `scaleY(${(6 / maxH).toFixed(3)})`,
                transition:
                  "transform 0.12s cubic-bezier(0.22,1,0.36,1), background 0.15s",
              }}
            />
          )
        })}
      </div>

      {/* − Less / + More */}
      <div style={{ display: "flex", gap: 6 }}>
        <VolBtn icon="−" label="LESS" onClick={dec} disabled={atMin} />
        <VolBtn icon="+" label="MORE" onClick={inc} disabled={atMax} />
      </div>

      {/* Mute / Unmute */}
      <VolBtn
        icon={speakerIcon(volume)}
        label={muted ? "UNMUTE" : "MUTE"}
        onClick={toggleMute}
        disabled={false}
        fullWidth
        accent={muted}
      />
    </div>
  )
}

interface VolBtnProps {
  icon: React.ReactNode
  label: string
  onClick: () => void
  disabled: boolean
  fullWidth?: boolean
  accent?: boolean // active/on state (e.g. Mute engaged)
}

function VolBtn({
  icon,
  label,
  onClick,
  disabled,
  fullWidth = false,
  accent = false,
}: VolBtnProps) {
  const [hov, setHov] = useState(false)
  const [press, setPress] = useState(false)

  const bg = accent
    ? "var(--sw-accent-xlight)"
    : hov
      ? "var(--sw-accent-light)"
      : "var(--sw-bg)"
  const col = disabled
    ? "var(--sw-surface-edge-mid)"
    : accent || hov
      ? "var(--sw-accent)"
      : "var(--sw-text-muted)"
  const border = `1.5px solid ${accent || hov ? "var(--sw-accent-light)" : "var(--sw-surface-edge)"}`

  return (
    <button
      onClick={onClick}
      disabled={disabled}
      onMouseEnter={() => {
        if (!disabled) setHov(true)
      }}
      onMouseLeave={() => {
        setHov(false)
        setPress(false)
      }}
      onMouseDown={() => {
        if (!disabled) setPress(true)
      }}
      onMouseUp={() => setPress(false)}
      style={{
        flex: fullWidth ? undefined : 1,
        width: fullWidth ? "100%" : undefined,
        height: 42,
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        gap: "0.38rem",
        fontFamily: "inherit",
        background: bg,
        color: col,
        border,
        borderRadius: "var(--sw-radius-sm)",
        cursor: disabled ? "default" : "pointer",
        transition:
          "background 0.12s, color 0.12s, border-color 0.12s, transform 0.1s",
        transform: press ? "scale(0.94)" : "scale(1)",
        lineHeight: 1,
      }}
    >
      <span
        style={{
          display: "flex",
          alignItems: "center",
          lineHeight: 1,
          fontSize: "1.5rem",
        }}
      >
        {icon}
      </span>
      <span style={{ fontSize: "1.5rem", fontWeight: 700 }}>{label}</span>
    </button>
  )
}

// ── Scroll control tile ───────────────────────────────────────────────────────

interface ScrollTileProps {
  label: string
  scrollPct: number // 0–100
  onScrollBy: (dir: 1 | -1) => void
  onScrollTop: () => void
}

function ScrollControlTile({
  label,
  scrollPct,
  onScrollBy,
  onScrollTop,
}: ScrollTileProps) {
  const filled = Math.round((scrollPct / 100) * SEGMENTS)
  const atTop = scrollPct <= 0
  const atBot = scrollPct >= 100
  const posLabel =
    scrollPct <= 0 ? "Top" : scrollPct >= 100 ? "Bottom" : `${scrollPct}%`

  return (
    <div
      data-panel-tour="scroll"
      style={{
        gridColumn: "span 2",
        padding: "0.85rem 0.9rem 0.75rem",
        background: "var(--sw-surface)",
        border: "1.5px solid var(--sw-surface-edge)",
        borderRadius: "var(--sw-radius)",
        display: "flex",
        flexDirection: "column",
        gap: "0.65rem",
      }}
    >
      {/* Header row — icon, label, position */}
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "space-between",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.45rem",
            color: "var(--sw-text-muted)",
          }}
        >
          <ArrowsDownUpIcon size={22} weight="bold" />
          <span
            style={{
              fontSize: "1.5rem",
              fontWeight: 700,
              color: "var(--sw-text-muted)",
            }}
          >
            {label}
          </span>
        </div>
        <span
          style={{
            fontSize: "1.05rem",
            fontWeight: 800,
            color: atTop || atBot ? "var(--sw-accent)" : "var(--sw-text-muted)",
            fontVariantNumeric: "tabular-nums",
            letterSpacing: "-0.02em",
            minWidth: 56,
            textAlign: "right",
          }}
        >
          {posLabel}
        </span>
      </div>

      {/* Segmented progress bar — filled left→right shows how far down */}
      <div
        style={{
          display: "flex",
          gap: 3,
          alignItems: "center",
          height: 12,
          padding: "0 2px",
        }}
      >
        {Array.from({ length: SEGMENTS }, (_, i) => (
          <div
            key={i}
            style={{
              flex: 1,
              height: 8,
              borderRadius: 3,
              background:
                i < filled
                  ? `hsl(${210 + i * 5}, 68%, ${52 - i * 1.5}%)`
                  : "var(--sw-surface-edge)",
              transition: "background 0.15s",
            }}
          />
        ))}
      </div>

      {/* ↑ Up / ↓ Down */}
      <div style={{ display: "flex", gap: 6 }}>
        <VolBtn
          icon={<ArrowUpIcon size={15} weight="bold" />}
          label="UP"
          onClick={() => onScrollBy(-1)}
          disabled={atTop}
        />
        <VolBtn
          icon={<ArrowDownIcon size={15} weight="bold" />}
          label="DOWN"
          onClick={() => onScrollBy(1)}
          disabled={atBot}
        />
      </div>

      {/* Back to Top */}
      <VolBtn
        icon={<ArrowLineUpIcon size={15} weight="bold" />}
        label="BACK TO TOP"
        onClick={onScrollTop}
        disabled={atTop}
        fullWidth
      />
    </div>
  )
}

// SaveToast removed — FloatingToast (shared) is used instead.

// ── Admin drag row ────────────────────────────────────────────────────────────

interface AdminRowProps {
  id: string
  cfg: PanelButtonConfig
  isPrimary: boolean
  onLabelChange: (id: string, label: string) => void
  onVisibilityToggle: (id: string) => void
}

function AdminRow({
  id,
  cfg,
  isPrimary,
  onLabelChange,
  onVisibilityToggle,
}: AdminRowProps) {
  const [editing, setEditing] = useState(false)
  const [draft, setDraft] = useState(cfg.label)

  const commit = () => {
    const val = draft.trim() || cfg.label
    setDraft(val)
    onLabelChange(id, val)
    setEditing(false)
  }

  return (
    <div
      data-id={id}
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "8px 10px",
        background: cfg.visible ? "var(--sw-surface)" : "rgba(0,0,0,0.03)",
        border: "1.5px solid var(--sw-surface-edge)",
        borderRadius: "var(--sw-radius-sm)",
        opacity: cfg.visible ? 1 : 0.5,
        cursor: "grab",
      }}
    >
      <span
        style={{
          color: "var(--sw-text-subtle)",
          flexShrink: 0,
          display: "flex",
          alignItems: "center",
        }}
      >
        <DotsSixVerticalIcon size={16} weight="bold" />
      </span>

      <span
        style={{
          flexShrink: 0,
          color: isPrimary ? "var(--sw-accent)" : "var(--sw-text-muted)",
          display: "flex",
          alignItems: "center",
        }}
      >
        {PHOSPHOR_SM[id]}
      </span>

      {editing ? (
        <input
          value={draft}
          autoFocus
          onChange={(e) => setDraft(e.target.value)}
          onBlur={commit}
          onKeyDown={(e) => {
            if (e.key === "Enter") commit()
            if (e.key === "Escape") setEditing(false)
          }}
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: 600,
            minWidth: 0,
            border: "1.5px solid var(--sw-accent)",
            borderRadius: 5,
            padding: "2px 6px",
            outline: "none",
            background: "var(--sw-bg)",
            color: "var(--sw-text-muted)",
            fontFamily: "inherit",
          }}
        />
      ) : (
        <span
          style={{
            flex: 1,
            fontSize: 13,
            fontWeight: 600,
            color: "var(--sw-text-muted)",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
            minWidth: 0,
          }}
        >
          {cfg.label}
        </span>
      )}

      <button
        onClick={() => {
          setDraft(cfg.label)
          setEditing(true)
        }}
        title="Edit label"
        style={iconBtnStyle}
      >
        <PencilSimpleIcon size={14} weight="bold" />
      </button>

      <button
        onClick={() => onVisibilityToggle(id)}
        title={cfg.visible ? "Hide" : "Show"}
        style={iconBtnStyle}
      >
        {cfg.visible ? (
          <EyeIcon size={14} weight="bold" />
        ) : (
          <EyeSlashIcon size={14} weight="bold" />
        )}
      </button>
    </div>
  )
}

const iconBtnStyle: React.CSSProperties = {
  background: "none",
  border: "none",
  padding: 4,
  cursor: "pointer",
  color: "var(--sw-text-muted)",
  display: "flex",
  alignItems: "center",
  borderRadius: 4,
  flexShrink: 0,
}

// ── Panel spotlight tour ──────────────────────────────────────────────────────

const PANEL_PAD = 10 // extra padding around spotlit element (px)
const PANEL_GAP = 12 // gap between spotlight edge and tooltip card (px)
const PANEL_CARD_W = 254 // card width (fits ~300px panel with 24px total margin)
const PANEL_CARD_H_EST = 200 // initial estimate before we measure the real card

interface PanelTourStep {
  target: string | null // data-panel-tour attribute value, or null = centred card
  icon: React.ReactNode
  title: string
  body: string
}

const TOUR_ICON_SIZE = 36
const TOUR_ICON_COLOR = "var(--sw-accent)"

const PANEL_TOUR_STEPS: PanelTourStep[] = [
  {
    target: null,
    icon: <HandWavingIcon size={TOUR_ICON_SIZE} weight="fill" color={TOUR_ICON_COLOR} />,
    title: "Welcome to your helper panel!",
    body: "Here you'll find quick buttons to help you browse. Let me show you each one!",
  },
  {
    target: "home",
    icon: <HouseIcon size={TOUR_ICON_SIZE} weight="bold" color={TOUR_ICON_COLOR} />,
    title: "Go Home",
    body: "This big button takes you back to your start page any time you get lost.",
  },
  {
    target: "back",
    icon: <ArrowLeftIcon size={TOUR_ICON_SIZE} weight="bold" color={TOUR_ICON_COLOR} />,
    title: "Go Back or Forward",
    body: "The Back button returns to the previous page. The Forward button goes forward again — just like flipping pages in a book.",
  },
  {
    target: "volume",
    icon: <SpeakerHighIcon size={TOUR_ICON_SIZE} weight="bold" color={TOUR_ICON_COLOR} />,
    title: "Control the Volume",
    body: "Use MORE and LESS to change how loud the sound is, or tap MUTE to silence it completely.",
  },
  {
    target: "scroll",
    icon: <ArrowsDownUpIcon size={TOUR_ICON_SIZE} weight="bold" color={TOUR_ICON_COLOR} />,
    title: "Move the Page Up or Down",
    body: "Use UP and DOWN to scroll through a long page. Tap BACK TO TOP to jump straight back to the beginning.",
  },
  {
    target: "zoom",
    icon: <TextAaIcon size={TOUR_ICON_SIZE} weight="bold" color={TOUR_ICON_COLOR} />,
    title: "Make Text Bigger",
    body: "Tap TEXT SIZE to make the writing on the page bigger. Tap it again to go back to normal size.",
  },
  {
    target: "fullscreen",
    icon: <ArrowsOutIcon size={TOUR_ICON_SIZE} weight="bold" color={TOUR_ICON_COLOR} />,
    title: "Full Screen",
    body: "FULLSCREEN makes the page fill the whole display — great for reading or watching videos. Tap SHRINK to bring everything back.",
  },
  {
    target: "refresh",
    icon: <ArrowsClockwiseIcon size={TOUR_ICON_SIZE} weight="bold" color={TOUR_ICON_COLOR} />,
    title: "Refresh the Page",
    body: "If a page looks wrong or stopped loading, tap REFRESH to reload it from scratch.",
  },
  {
    target: "save",
    icon: <BookmarkSimpleIcon size={TOUR_ICON_SIZE} weight="bold" color={TOUR_ICON_COLOR} />,
    title: "Save Pages You Like",
    body: "Found something interesting? Tap SAVE PAGE to keep it. Your caregiver will see all your saved pages.",
  },
  {
    target: "exit",
    icon: <XCircleIcon size={TOUR_ICON_SIZE} weight="bold" color={TOUR_ICON_COLOR} />,
    title: "Close the Page",
    body: "CLOSE PAGE closes the page you're on and takes you to the next one. If it's the last page open, it will close the browser.",
  },
  {
    target: null,
    icon: <ConfettiIcon size={TOUR_ICON_SIZE} weight="fill" color={TOUR_ICON_COLOR} />,
    title: "You're all set!",
    body: "Tap any button to start browsing. Your caregiver can always help if you need anything.",
  },
]

// ── Tooltip card ──────────────────────────────────────────────────────────────

interface PanelCardProps {
  step: PanelTourStep
  stepIndex: number
  total: number
  isFirst: boolean
  isLast: boolean
  onBack: () => void
  onNext: () => void
  onSkip: () => void
  /** Arrow direction: 'top' = arrow points up (card is below element). */
  arrowSide?: "top" | "bottom"
  /** Arrow tip x offset from the card's left edge (px). */
  arrowLeft?: number
  cardRef?: React.Ref<HTMLDivElement>
  style?: React.CSSProperties
}

function PanelTourCard({
  step,
  stepIndex,
  total,
  isFirst,
  isLast,
  onBack,
  onNext,
  onSkip,
  arrowSide,
  arrowLeft,
  cardRef,
  style,
}: PanelCardProps) {
  const arrowEl =
    arrowSide != null && arrowLeft != null ? (
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: Math.max(14, Math.min(arrowLeft, PANEL_CARD_W - 40)),
          width: 0,
          height: 0,
          borderLeft: "12px solid transparent",
          borderRight: "12px solid transparent",
          ...(arrowSide === "top"
            ? { top: -12, borderBottom: "12px solid var(--sw-bg)" }
            : { bottom: -12, borderTop: "12px solid var(--sw-bg)" }),
        }}
      />
    ) : null

  return (
    <div
      ref={cardRef}
      style={{
        position: "relative",
        background: "var(--sw-bg)",
        border: "1.5px solid var(--sw-surface-edge)",
        borderRadius: "var(--sw-radius)",
        padding: "1.1rem",
        boxShadow: "0 8px 32px rgba(42,38,32,0.45)",
        display: "flex",
        flexDirection: "column",
        gap: "0.85rem",
        textAlign: "center",
        ...style,
      }}
    >
      {arrowEl}

      {/* Progress dots */}
      <div style={{ display: "flex", gap: 5, justifyContent: "center" }}>
        {Array.from({ length: total }, (_, i) => (
          <div
            key={i}
            style={{
              height: 6,
              width: i === stepIndex ? 20 : 6,
              borderRadius: 3,
              background:
                i === stepIndex ? "var(--sw-accent)" : "var(--sw-surface-edge)",
              transition: "width 0.2s ease, background 0.2s ease",
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div>
        <div
          style={{
            display: "flex",
            justifyContent: "center",
            marginBottom: "0.4rem",
          }}
        >
          {step.icon}
        </div>
        <h2
          style={{
            margin: "0 0 0.35rem",
            fontSize: "1rem",
            fontWeight: 800,
            color: "var(--sw-text)",
            lineHeight: 1.25,
          }}
        >
          {step.title}
        </h2>
        <p
          style={{
            margin: 0,
            fontSize: "0.875rem",
            color: "var(--sw-text-muted)",
            lineHeight: 1.6,
          }}
        >
          {step.body}
        </p>
      </div>

      {/* Buttons */}
      <div style={{ display: "flex", gap: "0.4rem" }}>
        {isFirst && (
          <button
            type="button"
            onClick={onSkip}
            style={{
              padding: "0.55rem 0.8rem",
              background: "transparent",
              color: "var(--sw-text-subtle)",
              border: "1.5px solid var(--sw-surface-edge)",
              borderRadius: "var(--sw-radius-sm)",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              flexShrink: 0,
            }}
          >
            Skip
          </button>
        )}
        {!isFirst && (
          <button
            type="button"
            onClick={onBack}
            style={{
              padding: "0.55rem 0.8rem",
              background: "transparent",
              color: "var(--sw-text-muted)",
              border: "1.5px solid var(--sw-surface-edge)",
              borderRadius: "var(--sw-radius-sm)",
              fontSize: "0.875rem",
              fontWeight: 600,
              cursor: "pointer",
              fontFamily: "inherit",
              flexShrink: 0,
              display: "flex",
              alignItems: "center",
              gap: "0.3rem",
            }}
          >
            <ArrowLeftIcon size={14} /> Back
          </button>
        )}
        <button
          type="button"
          onClick={onNext}
          style={{
            flex: 1,
            padding: "0.55rem 0.8rem",
            background: "var(--sw-accent-btn)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--sw-radius-sm)",
            fontSize: "0.875rem",
            fontWeight: 700,
            cursor: "pointer",
            fontFamily: "inherit",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.35rem",
          }}
        >
          {isLast ? (
            <>
              <span>Got it!</span> <ThumbsUpIcon size={14} weight="fill" />
            </>
          ) : (
            <>
              <span>Next</span> <ArrowRightIcon size={14} />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ── Panel wizard — spotlight overlay via createPortal ─────────────────────────

function PanelWizard({ onDone, onSkip }: { onDone: () => void; onSkip: () => void }) {
  const [step, setStep] = useState(0)
  const [spotRect, setSpotRect] = useState<DOMRect | null>(null)
  const [cardH, setCardH] = useState(PANEL_CARD_H_EST)
  const cardRef = useRef<HTMLDivElement>(null)

  const current = PANEL_TOUR_STEPS[step]!
  const isFirst = step === 0
  const isLast = step === PANEL_TOUR_STEPS.length - 1

  // Signal the newtab page to show its "look at the panel" scrim
  useEffect(() => {
    chrome.storage.session.set({ panelTourActive: true }).catch(() => {})
    return () => {
      chrome.storage.session.set({ panelTourActive: false }).catch(() => {})
    }
  }, [])

  // Measure target element position before the browser paints
  useLayoutEffect(() => {
    if (!current.target) {
      setSpotRect(null)
      return
    }
    const el = document.querySelector<HTMLElement>(
      `[data-panel-tour="${current.target}"]`,
    )
    setSpotRect(el ? el.getBoundingClientRect() : null)
  }, [step, current.target])

  // Measure the rendered card height so we can decide above/below placement
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (cardRef.current) setCardH(cardRef.current.offsetHeight)
    })
    return () => cancelAnimationFrame(id)
  }, [step])

  const goNext = () => (isLast ? onDone() : setStep((s) => s + 1))
  const goBack = () => setStep((s) => s - 1)

  // ── Mode A: centred card (intro / outro — no specific target) ──────────────
  if (!spotRect) {
    return createPortal(
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10200,
          background: "rgba(42,38,32,0.78)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "1rem",
        }}
      >
        <PanelTourCard
          cardRef={cardRef}
          step={current}
          stepIndex={step}
          total={PANEL_TOUR_STEPS.length}
          isFirst={isFirst}
          isLast={isLast}
          onBack={goBack}
          onNext={goNext}
          onSkip={onSkip}
          style={{ width: "100%", maxWidth: PANEL_CARD_W }}
        />
      </div>,
      document.body,
    )
  }

  // ── Mode B: spotlight over a real panel element ────────────────────────────

  const sTop = spotRect.top - PANEL_PAD
  const sLeft = spotRect.left - PANEL_PAD
  const sW = spotRect.width + PANEL_PAD * 2
  const sH = spotRect.height + PANEL_PAD * 2

  const spaceBelow = window.innerHeight - (sTop + sH)
  const showAbove = spaceBelow < cardH + PANEL_GAP + 24

  const tooltipTop = showAbove
    ? sTop - PANEL_GAP - cardH
    : sTop + sH + PANEL_GAP

  const panelW = window.innerWidth
  const tooltipLeft = Math.max(
    8,
    Math.min(sLeft + sW / 2 - PANEL_CARD_W / 2, panelW - PANEL_CARD_W - 8),
  )
  const arrowLeft = sLeft + sW / 2 - tooltipLeft - 12

  return createPortal(
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10200,
        pointerEvents: "none",
      }}
    >
      {/* Full-screen click blocker — prevents accidental tile presses */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "auto" }} />

      {/* Spotlight cutout — box-shadow creates the dark veil, the div's bounds
          punch the transparent hole right over the target element */}
      <div
        style={{
          position: "absolute",
          top: sTop,
          left: sLeft,
          width: sW,
          height: sH,
          boxShadow: "0 0 0 9999px rgba(42,38,32,0.78)",
          borderRadius: 12,
          border: "2.5px solid rgba(194,94,42,0.65)",
          pointerEvents: "none",
          transition:
            "top    0.38s cubic-bezier(.4,0,.2,1)," +
            "left   0.38s cubic-bezier(.4,0,.2,1)," +
            "width  0.38s cubic-bezier(.4,0,.2,1)," +
            "height 0.38s cubic-bezier(.4,0,.2,1)",
        }}
      />

      {/* Tooltip card — slides alongside the spotlight */}
      <PanelTourCard
        cardRef={cardRef}
        step={current}
        stepIndex={step}
        total={PANEL_TOUR_STEPS.length}
        isFirst={isFirst}
        isLast={isLast}
        onBack={goBack}
        onNext={goNext}
        onSkip={onSkip}
        arrowSide={showAbove ? "bottom" : "top"}
        arrowLeft={arrowLeft}
        style={{
          position: "absolute",
          top: tooltipTop,
          left: tooltipLeft,
          width: PANEL_CARD_W,
          maxWidth: "calc(100vw - 16px)",
          pointerEvents: "auto",
          transition:
            "top  0.38s cubic-bezier(.4,0,.2,1)," +
            "left 0.38s cubic-bezier(.4,0,.2,1)",
        }}
      />
    </div>,
    document.body,
  )
}

// ── Close-browser confirmation dialog ────────────────────────────────────────
// C-01: uses --sw-* tokens (sidepanel namespace).
// C-04: focus trap so Tab can't escape; Cancel is first → default focus target.

function CloseBrowserConfirm({
  onConfirm,
  onCancel,
}: {
  onConfirm: () => void
  onCancel: () => void
}) {
  const ref = useRef<HTMLDivElement>(null)
  useFocusTrap(ref)

  return (
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10300,
        background: "rgba(42,38,32,0.72)",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        padding: "1.5rem",
      }}
    >
      <div
        ref={ref}
        role="dialog"
        aria-modal="true"
        aria-labelledby="close-confirm-title"
        style={{
          background: "var(--sw-surface-raised)",
          border: "1.5px solid var(--sw-surface-edge)",
          borderRadius: "var(--sw-radius-lg)",
          padding: "1.75rem 1.5rem",
          width: "100%",
          maxWidth: 280,
          display: "flex",
          flexDirection: "column",
          gap: "1.25rem",
          textAlign: "center",
        }}
      >
        <p
          id="close-confirm-title"
          style={{
            margin: 0,
            fontSize: "1.05rem",
            fontWeight: 700,
            color: "var(--sw-text)",
            lineHeight: 1.4,
          }}
        >
          Close the whole browser?
        </p>
        <p
          style={{
            margin: 0,
            fontSize: "0.875rem",
            color: "var(--sw-text-muted)",
            lineHeight: 1.5,
          }}
        >
          This will close Chrome completely.
        </p>
        {/* Cancel first in DOM — receives auto-focus, safe default */}
        <div style={{ display: "flex", flexDirection: "column", gap: "0.6rem" }}>
          <button
            type="button"
            onClick={onCancel}
            style={{
              padding: "0.65rem",
              background: "transparent",
              color: "var(--sw-text-muted)",
              border: "1.5px solid var(--sw-surface-edge)",
              borderRadius: "var(--sw-radius)",
              fontWeight: 600,
              fontSize: "0.9rem",
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            Cancel
          </button>
          <button
            type="button"
            onClick={onConfirm}
            style={{
              padding: "0.75rem",
              background: "var(--sw-danger)",
              color: "#fff",
              border: "none",
              borderRadius: "var(--sw-radius)",
              fontWeight: 700,
              fontSize: "0.95rem",
              fontFamily: "inherit",
              cursor: "pointer",
            }}
          >
            Yes, close browser
          </button>
        </div>
      </div>
    </div>
  )
}

// ── App ───────────────────────────────────────────────────────────────────────

export function App() {
  const [fontIdx, setFontIdx] = useState(0)
  const [volume, setVolume] = useState(1.0)
  const [scrollPct, setScrollPct] = useState(0)
  const [isFullscreen, setIsFullscreen] = useState(false)
  const [isLastTab, setIsLastTab] = useState(false)
  const [showCloseConfirm, setShowCloseConfirm] = useState(false)
  const { toast, showToast } = useToast()
  const [adminMode, setAdminMode] = useState(false)
  const [showPanelWizard, setShowPanelWizard] = useState(false)
  const [btnOrder, setBtnOrder] = useState([...DEFAULT_PANEL_BUTTON_ORDER])
  const [btnCfgs, setBtnCfgs] = useState<Record<string, PanelButtonConfig>>({
    ...DEFAULT_PANEL_BUTTONS,
  })

  const caregiverName = useRef("")
  const listRef = useRef<HTMLDivElement>(null)
  const sortableRef = useRef<Sortable | null>(null)
  // Once the panel wizard is dismissed (skip or complete) we never show it
  // again in this session — even if a concurrent config write fires onChanged
  // before panelWizardDone:true has landed in storage.
  const panelWizardDismissed = useRef(false)

  // ── Load ──────────────────────────────────────────────────────────────────
  useEffect(() => {
    ;(async () => {
      try {
        const [session, config, isAdmin] = await Promise.all([
          storage.session.get("currentFontSize"),
          storage.local.get("config"),
          storage.session.get("adminModeActive"),
        ])
        caregiverName.current = config.caregiverName?.trim() ?? ""
        setAdminMode(!!isAdmin)
        // Only show panel wizard AFTER the newtab onboarding is done.
        // panelWizardDone guards against showing it a second time.
        if (config.onboardingDone && !config.panelWizardDone && !panelWizardDismissed.current)
          setShowPanelWizard(true)
        const savedOrder = config.panelButtonOrder?.length
          ? config.panelButtonOrder
          : [...DEFAULT_PANEL_BUTTON_ORDER]
        // Append any newly-added default buttons missing from the stored order
        const savedSet = new Set(savedOrder)
        const newIds = DEFAULT_PANEL_BUTTON_ORDER.filter(
          (id) => !savedSet.has(id),
        )
        setBtnOrder(newIds.length ? [...savedOrder, ...newIds] : savedOrder)
        setBtnCfgs({ ...DEFAULT_PANEL_BUTTONS, ...config.panelButtons })
        const active: FontSize = (session ?? config.defaultFontSize) as FontSize
        const idx = FONT_SIZES.indexOf(active)
        setFontIdx(idx >= 0 ? idx : 0)
      } catch {
        /* use defaults */
      }
    })()
  }, [])

  // ── Sync fullscreen state with the real window state ─────────────────────
  // Reads chrome.windows so the button icon stays accurate even when the user
  // presses F11 or Escape directly (without using the panel button).
  useEffect(() => {
    const sync = () => {
      chrome.windows.getCurrent((win) => {
        setIsFullscreen(win.state === "fullscreen")
      })
    }
    sync() // initialise on mount
    chrome.tabs.onActivated.addListener(sync)
    return () => chrome.tabs.onActivated.removeListener(sync)
  }, [])

  // ── Track whether this is the only tab left in the window ────────────────
  // Two-step: (1) get the active tab via lastFocusedWindow to extract its
  // windowId without relying on any "current window" context, then (2) count
  // all tabs with that exact windowId. This avoids every sidepanel ambiguity.
  useEffect(() => {
    const update = () => {
      chrome.tabs.query(
        { active: true, lastFocusedWindow: true },
        ([activeTab]) => {
          if (chrome.runtime.lastError || !activeTab?.windowId) {
            setIsLastTab(false)
            return
          }
          chrome.tabs.query(
            { windowId: activeTab.windowId },
            (tabs) => {
              if (chrome.runtime.lastError) return
              setIsLastTab(tabs.length <= 1)
            },
          )
        },
      )
    }
    update()
    chrome.tabs.onCreated.addListener(update)
    chrome.tabs.onRemoved.addListener(update)
    chrome.tabs.onActivated.addListener(update)
    return () => {
      chrome.tabs.onCreated.removeListener(update)
      chrome.tabs.onRemoved.removeListener(update)
      chrome.tabs.onActivated.removeListener(update)
    }
  }, [])

  // ── Admin mode broadcast ──────────────────────────────────────────────────
  useEffect(() => {
    const handler = (msg: unknown) => {
      if (!msg || typeof msg !== "object" || !("type" in msg)) return
      const m = msg as { type: string; payload?: { active: boolean } }
      if (m.type === "ADMIN_MODE_CHANGED" && m.payload != null) {
        setAdminMode(m.payload.active)
      }
    }
    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [])

  // ── Watch for newtab onboarding completing while panel is already open ────
  // Needed because the panel may be open before the user finishes the wizard.
  useEffect(() => {
    const handler = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== "local" || !("config" in changes)) return
      const cfg = changes["config"]?.newValue as
        | { onboardingDone?: boolean; panelWizardDone?: boolean }
        | undefined
      if (cfg?.onboardingDone && !cfg?.panelWizardDone && !panelWizardDismissed.current) {
        setShowPanelWizard(true)
      }
    }
    chrome.storage.onChanged.addListener(handler)
    return () => chrome.storage.onChanged.removeListener(handler)
  }, [])

  // ── Dark theme — apply on load, keep in sync across tabs ────────────────
  useEffect(() => {
    storage.local
      .get("config")
      .then((cfg) => {
        const t = cfg.theme ?? "light"
        if (t === "dark") document.documentElement.classList.add("dark")
        else document.documentElement.classList.remove("dark")
      })
      .catch(() => {})

    const onThemeChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area !== "local" || !("config" in changes)) return
      const next = (
        changes["config"]?.newValue as { theme?: string } | undefined
      )?.theme
      if (next === "dark") document.documentElement.classList.add("dark")
      else if (next === "light")
        document.documentElement.classList.remove("dark")
    }
    chrome.storage.onChanged.addListener(onThemeChange)
    return () => chrome.storage.onChanged.removeListener(onThemeChange)
  }, [])

  // ── SortableJS ───────────────────────────────────────────────────────────
  useEffect(() => {
    if (!adminMode || !listRef.current) {
      sortableRef.current?.destroy()
      sortableRef.current = null
      return
    }
    sortableRef.current = Sortable.create(listRef.current, {
      animation: 120,
      dataIdAttr: "data-id",
      onEnd: () => {
        const order = sortableRef.current!.toArray()
        setBtnOrder(order)
        void storage.local.update("config", { panelButtonOrder: order })
      },
    })
    return () => {
      sortableRef.current?.destroy()
      sortableRef.current = null
    }
  }, [adminMode])

  // ── Tab helper ───────────────────────────────────────────────────────────
  const getTab = useCallback(async () => {
    const [tab] = await chrome.tabs.query({ active: true, currentWindow: true })
    return tab ?? null
  }, [])

  // ── Handlers ─────────────────────────────────────────────────────────────
  const handleHome = useCallback(async () => {
    const tab = await getTab()
    if (tab?.id != null)
      await chrome.tabs.update(tab.id, {
        url: chrome.runtime.getURL("newtab/index.html"),
      })
  }, [getTab])

  const handleBack = useCallback(async () => {
    const tab = await getTab()
    if (tab?.id == null) return
    const urlBefore = tab.url
    await (chrome.tabs as unknown as { goBack(id: number): Promise<void> })
      .goBack(tab.id)
      .catch(() => {})
    // Give Chrome a moment to start navigating, then check if anything moved.
    // If the URL is unchanged the tab was already at the beginning of its history.
    setTimeout(async () => {
      const after = await getTab()
      if (after?.url === urlBefore) showToast("Nothing to go back to", "error")
    }, 400)
  }, [getTab, showToast])

  const handleForward = useCallback(async () => {
    const tab = await getTab()
    if (tab?.id == null) return
    const urlBefore = tab.url
    await (chrome.tabs as unknown as { goForward(id: number): Promise<void> })
      .goForward(tab.id)
      .catch(() => {})
    setTimeout(async () => {
      const after = await getTab()
      if (after?.url === urlBefore) showToast("Nothing to go forward to", "error")
    }, 400)
  }, [getTab, showToast])

  const handleScrollTop = useCallback(async () => {
    const tab = await getTab()
    if (tab?.id != null) {
      chrome.tabs
        .sendMessage(tab.id, {
          type: "TAB_COMMAND",
          payload: { command: "scrollTop" },
        })
        .catch(() => {})
      setScrollPct(0) // optimistic — scroll to top resets position to 0
    }
  }, [getTab])

  const handleSetVolume = useCallback(
    async (level: number) => {
      setVolume(level)
      const tab = await getTab()
      if (tab?.id != null)
        chrome.tabs
          .sendMessage(tab.id, {
            type: "TAB_COMMAND",
            payload: { command: "setVolume", level },
          })
          .catch(() => {})
    },
    [getTab],
  )

  const handleScrollBy = useCallback(
    async (dir: 1 | -1) => {
      const tab = await getTab()
      if (tab?.id == null) return
      chrome.tabs.sendMessage(
        tab.id,
        { type: "TAB_COMMAND", payload: { command: "scrollBy", delta: dir } },
        (resp: { ok?: boolean; scrollPct?: number } | undefined) => {
          if (chrome.runtime.lastError) return
          if (resp != null && typeof resp.scrollPct === "number")
            setScrollPct(resp.scrollPct)
        },
      )
    },
    [getTab],
  )

  const refreshScrollPos = useCallback(async () => {
    const tab = await getTab()
    if (tab?.id == null) return
    chrome.tabs.sendMessage(
      tab.id,
      { type: "TAB_COMMAND", payload: { command: "getScrollPos" } },
      (resp: { ok?: boolean; scrollPct?: number } | undefined) => {
        if (chrome.runtime.lastError) return
        if (resp != null && typeof resp.scrollPct === "number")
          setScrollPct(resp.scrollPct)
      },
    )
  }, [getTab])

  const FONT_ZOOM: Record<FontSize, number> = {
    normal: 1,
    large: 1.25,
    xlarge: 1.5,
  }

  const handleZoom = useCallback(async () => {
    const nextIdx = (fontIdx + 1) % FONT_SIZES.length
    const next: FontSize = FONT_SIZES[nextIdx] ?? "normal"
    setFontIdx(nextIdx)
    await storage.session.set("currentFontSize", next)
    const tab = await getTab()
    if (tab?.id != null)
      await chrome.tabs.setZoom(tab.id, FONT_ZOOM[next]).catch(() => {})
  }, [fontIdx, getTab])

  const handleSave = useCallback(async () => {
    const tab = await getTab()
    if (!tab) return
    const url = tab.url ?? "",
      title = tab.title ?? url
    if (!url.startsWith("http")) {
      showToast(
        "This page can't be saved. Try saving a website you're visiting.",
        "error",
      )
      return
    }
    const links = await storage.local.get("savedLinks")
    const existIdx = links.findIndex((l) => l.url === url)
    const entry = {
      id:
        existIdx >= 0
          ? (links[existIdx]?.id ?? crypto.randomUUID())
          : crypto.randomUUID(),
      url,
      title,
      savedAt: new Date().toISOString(),
    }
    const next =
      existIdx >= 0
        ? links.map((l, i) => (i === existIdx ? entry : l))
        : [...links, entry]
    await storage.local.set("savedLinks", next)
    // Log the save event so it appears in the caregiver's Activity Log (B-06).
    chrome.runtime
      .sendMessage({ type: "LOG_ACTIVITY", payload: { url, title, type: "save" } })
      .catch(() => {})
    showToast(
      `Saved! ${caregiverName.current || "Your caregiver"} will see this.`,
    )
  }, [getTab])

  const handleExit = useCallback(async () => {
    if (isLastTab) {
      // Closing the last tab shuts down the whole browser — require confirmation.
      setShowCloseConfirm(true)
      return
    }
    const tab = await getTab()
    if (tab?.id != null) await chrome.tabs.remove(tab.id)
  }, [getTab, isLastTab])

  // chrome.windows.update is the programmatic F11 equivalent — works on every
  // page including the new tab (chrome-extension:// pages block executeScript).
  const handleFullscreen = useCallback(async () => {
    const win = await chrome.windows.getCurrent()
    if (!win.id) return
    const entering = win.state !== "fullscreen"
    await chrome.windows.update(win.id, {
      state: entering ? "fullscreen" : "normal",
    })
    setIsFullscreen(entering)
  }, [])

  const handleRefresh = useCallback(async () => {
    const tab = await getTab()
    if (tab?.id != null) chrome.tabs.reload(tab.id)
  }, [getTab])

  // ── Admin mode ───────────────────────────────────────────────────────────
  // Admin mode is entered from the newtab settings page (shared PIN).
  // The SW broadcasts ADMIN_MODE_CHANGED and the listener above updates state.
  // exitAdmin is still needed for the "Done" button inside the panel.
  const exitAdmin = useCallback(() => {
    setAdminMode(false)
    chrome.runtime
      .sendMessage({ type: "SET_ADMIN_MODE", payload: { active: false } })
      .catch(() => {})
  }, [])

  const handleLabelChange = useCallback((id: string, label: string) => {
    setBtnCfgs((prev) => {
      const base = prev[id] ??
        DEFAULT_PANEL_BUTTONS[id] ?? { label, visible: true }
      const next = { ...prev, [id]: { ...base, label } }
      void storage.local.update("config", { panelButtons: next })
      return next
    })
  }, [])

  const handleVisibility = useCallback((id: string) => {
    setBtnCfgs((prev) => {
      const cur = prev[id] ??
        DEFAULT_PANEL_BUTTONS[id] ?? { label: id, visible: true }
      const visCount = Object.values(prev).filter((c) => c.visible).length
      if (cur.visible && visCount <= 1) return prev
      const next = { ...prev, [id]: { ...cur, visible: !cur.visible } }
      void storage.local.update("config", { panelButtons: next })
      return next
    })
  }, [])

  // ── Derived ──────────────────────────────────────────────────────────────
  const currentSize: FontSize = FONT_SIZES[fontIdx] ?? "normal"

  const visible = (id: string) => btnCfgs[id]?.visible ?? true
  const label = (id: string, fallback: string) => btnCfgs[id]?.label ?? fallback

  const handlers: Record<string, () => void> = {
    home:       handleHome,
    back:       handleBack,
    forward:    handleForward,
    scrollTop:  handleScrollTop,
    zoom:       handleZoom,
    save:       handleSave,
    fullscreen: handleFullscreen,
    refresh:    handleRefresh,
    exit:       handleExit,
  }

  // ── Scroll position sync (must be after refreshScrollPos is declared) ────
  useEffect(() => {
    void refreshScrollPos()
  }, [refreshScrollPos])

  useEffect(() => {
    const onActivated = () => {
      void refreshScrollPos()
    }
    chrome.tabs.onActivated.addListener(onActivated)
    return () => chrome.tabs.onActivated.removeListener(onActivated)
  }, [refreshScrollPos])

  // `scroll` and `volume` are rendered as special tiles — not in handlers

  // Mid buttons (no home, no exit) in stored order, visible only
  const midIds = btnOrder.filter(
    (id) => id !== "home" && id !== "exit" && visible(id),
  )

  // ── Render ────────────────────────────────────────────────────────────────
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        height: "100vh",
        background: "var(--sw-bg)",
      }}
    >
      {/* Edit-mode banner */}
      {adminMode && (
        <div
          style={{
            padding: "10px 14px",
            flexShrink: 0,
            background: "var(--sw-accent-btn)",
            color: "#fff",
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            fontSize: 13,
            fontWeight: 700,
          }}
        >
          <span>Edit mode — rearrange shortcuts</span>
          <div style={{ display: "flex", gap: 6 }}>
            <button
              onClick={() => {
                exitAdmin()
                setShowPanelWizard(true)
              }}
              title="Restart the panel tour"
              style={{
                background: "rgba(255,255,255,0.22)",
                border: "none",
                color: "inherit",
                borderRadius: 6,
                padding: "4px 10px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "inherit",
                display: "flex",
                alignItems: "center",
                gap: 4,
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.32)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.22)"
              }}
            >
              <ArrowCounterClockwiseIcon size={12} weight="bold" /> Tour
            </button>
            <button
              onClick={exitAdmin}
              style={{
                background: "rgba(255,255,255,0.22)",
                border: "none",
                color: "inherit",
                borderRadius: 6,
                padding: "4px 12px",
                cursor: "pointer",
                fontSize: 12,
                fontWeight: 700,
                fontFamily: "inherit",
              }}
              onMouseEnter={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.32)"
              }}
              onMouseLeave={(e) => {
                e.currentTarget.style.background = "rgba(255,255,255,0.22)"
              }}
            >
              Done
            </button>
          </div>
        </div>
      )}

      {/* Scrollable area */}
      <div
        style={{
          flex: 1,
          overflowY: "auto",
          padding: "12px 10px",
          display: "flex",
          flexDirection: "column",
          gap: 0,
        }}
      >
        {adminMode ? (
          /* ── Admin drag list ── */
          <div
            ref={listRef}
            style={{ display: "flex", flexDirection: "column", gap: 4 }}
          >
            {btnOrder.map((id) => (
              <AdminRow
                key={id}
                id={id}
                cfg={
                  btnCfgs[id] ??
                  DEFAULT_PANEL_BUTTONS[id] ?? { label: id, visible: true }
                }
                isPrimary={id === "home"}
                onLabelChange={handleLabelChange}
                onVisibilityToggle={handleVisibility}
              />
            ))}
          </div>
        ) : (
          /* ── Normal tile grid ── */
          <div
            style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) minmax(0,1fr)", gap: 8 }}
          >
            {/* Home — full-width primary */}
            {visible("home") && (
              <Tile
                id="home"
                label={label("home", "HOME")}
                icon={<HouseIcon size={28} weight="bold" />}
                onClick={handleHome}
                variant="primary"
                fullWidth
                tourTarget="home"
              />
            )}

            {/* Mid buttons fill the 2-col grid */}
            {midIds.map((id) => {
              if (id === "zoom") {
                return (
                  <ZoomTile
                    key={id}
                    label={label("zoom", "TEXT SIZE")}
                    currentSize={currentSize}
                    onClick={handleZoom}
                    disabled={false}
                  />
                )
              }
              if (id === "volume") {
                return (
                  <VolumeControlTile
                    key={id}
                    label={label("volume", "VOLUME")}
                    volume={volume}
                    onSet={handleSetVolume}
                  />
                )
              }
              if (id === "scroll") {
                return (
                  <ScrollControlTile
                    key={id}
                    label={label("scroll", "MOVE PAGE")}
                    scrollPct={scrollPct}
                    onScrollBy={handleScrollBy}
                    onScrollTop={handleScrollTop}
                  />
                )
              }
              if (id === "fullscreen") {
                return (
                  <Tile
                    key={id}
                    id={id}
                    label={isFullscreen ? "SHRINK" : label("fullscreen", "FULLSCREEN")}
                    labelFontSize="1.4rem"
                    icon={
                      isFullscreen ? (
                        <ArrowsInIcon size={28} weight="bold" />
                      ) : (
                        <ArrowsOutIcon size={28} weight="bold" />
                      )
                    }
                    onClick={handleFullscreen}
                    variant={isFullscreen ? "primary" : "default"}
                    tourTarget={id}
                  />
                )
              }
              return (
                <Tile
                  key={id}
                  id={id}
                  label={label(id, id)}
                  icon={PHOSPHOR[id]}
                  onClick={handlers[id] ?? (() => {})}
                  tourTarget={id}
                />
              )
            })}

            {/* Spacer row to push exit to bottom */}
            <div style={{ gridColumn: "span 2", flex: 1 }} />

            {/* Exit — full-width danger at bottom */}
            {visible("exit") && (
              <Tile
                id="exit"
                label={label(
                  "exit",
                  isLastTab ? "CLOSE BROWSER" : "CLOSE PAGE",
                )}
                icon={<XCircleIcon size={28} weight="bold" />}
                onClick={handleExit}
                variant="danger"
                fullWidth
                tourTarget="exit"
              />
            )}
          </div>
        )}
      </div>

      {/* Close-browser confirmation — only shown when closing the last tab */}
      {showCloseConfirm && (
        <CloseBrowserConfirm
          onConfirm={async () => {
            setShowCloseConfirm(false)
            const tab = await getTab()
            if (tab?.id != null) await chrome.tabs.remove(tab.id)
          }}
          onCancel={() => setShowCloseConfirm(false)}
        />
      )}

      {/* Floating toast — sits above everything */}
      <FloatingToast toast={toast} />

      {/* Panel spotlight wizard — portal-rendered so it overlays the real tiles */}
      {showPanelWizard && (
        <PanelWizard
          onDone={() => {
            panelWizardDismissed.current = true
            setShowPanelWizard(false)
            void storage.local.update("config", { panelWizardDone: true })
            // Hand off to the newtab — start the senior walkthrough there next.
            chrome.storage.session
              .set({ seniorTourPending: true })
              .catch(() => {})
          }}
          onSkip={() => {
            // Dismissed early — mark done and still hand off to the homescreen
            // senior walkthrough so it always runs regardless of skip/complete.
            panelWizardDismissed.current = true
            setShowPanelWizard(false)
            void storage.local.update("config", { panelWizardDone: true })
            chrome.storage.session
              .set({ seniorTourPending: true })
              .catch(() => {})
          }}
        />
      )}
    </div>
  )
}
