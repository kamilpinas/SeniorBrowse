import { useRef } from "react"
import {
  SpeakerHighIcon,
  SpeakerLowIcon,
  SpeakerNoneIcon,
  SpeakerSlashIcon,
} from "@phosphor-icons/react"
import { SEGMENTS } from "./shared"
import { VolBtn } from "./VolBtn"

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

export function VolumeControlTile({ label, volume, onSet }: VolTileProps) {
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
        // Multi-row content (header, equaliser, two button rows) needs
        // ~2× the height of a simple tile — without this, content
        // overflows the row and overlaps neighbouring tiles.
        gridRow: "span 2",
        height: "100%",
        padding: "0.5rem 0.7rem 0.5rem",
        background: "var(--sw-surface)",
        border: "1.5px solid var(--sw-surface-edge)",
        borderRadius: "var(--sw-radius)",
        display: "flex",
        flexDirection: "column",
        justifyContent: "center",
        gap: "0.35rem",
        overflow: "hidden",
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
          data-tile-icon
          style={{
            display: "flex",
            alignItems: "center",
            gap: "0.45rem",
            color: "var(--sw-text-muted)",
            fontSize: "clamp(22px, 3vh, 36px)",
          }}
        >
          {speakerIcon(volume)}
          <span
            style={{
              fontSize: "clamp(1.1rem, 2vh, 1.5rem)",
              fontWeight: 700,
              color: "var(--sw-text-muted)",
            }}
          >
            {label}
          </span>
        </div>
        <span
          style={{
            fontSize: "clamp(1.05rem, 2vh, 1.5rem)",
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
          height: 20,
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
                transform: isFilled
                  ? "scaleY(1)"
                  : `scaleY(${(6 / maxH).toFixed(3)})`,
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
