import {
  ArrowDownIcon,
  ArrowLineUpIcon,
  ArrowsDownUpIcon,
  ArrowUpIcon,
} from "@phosphor-icons/react"
import { SEGMENTS } from "./shared"
import { VolBtn } from "./VolBtn"

interface ScrollTileProps {
  label: string
  scrollPct: number // 0–100
  onScrollBy: (dir: 1 | -1) => void
  onScrollTop: () => void
}

export function ScrollControlTile({
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
        // Same reasoning as VolumeControlTile — multi-row content
        // needs 2× a simple tile's height.
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
      {/* Header row — icon, label, position */}
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
          <ArrowsDownUpIcon size={22} weight="bold" />
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
