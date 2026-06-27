import { useEffect, useLayoutEffect, useRef, useState } from "react"
import { createPortal } from "react-dom"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ArrowsClockwiseIcon,
  ArrowsDownUpIcon,
  ArrowsOutIcon,
  BookmarkSimpleIcon,
  ConfettiIcon,
  HandWavingIcon,
  HouseIcon,
  SpeakerHighIcon,
  TextAaIcon,
  ThumbsUpIcon,
  XCircleIcon,
} from "@phosphor-icons/react"

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
    icon: (
      <HandWavingIcon
        size={TOUR_ICON_SIZE}
        weight="fill"
        color={TOUR_ICON_COLOR}
      />
    ),
    title: "Welcome to your helper panel!",
    body: "Here you'll find quick buttons to help you browse. Let me show you each one!",
  },
  {
    target: "home",
    icon: (
      <HouseIcon size={TOUR_ICON_SIZE} weight="bold" color={TOUR_ICON_COLOR} />
    ),
    title: "Go Home",
    body: "This big button takes you back to your start page any time you get lost.",
  },
  {
    target: "back",
    icon: (
      <ArrowLeftIcon
        size={TOUR_ICON_SIZE}
        weight="bold"
        color={TOUR_ICON_COLOR}
      />
    ),
    title: "Go Back or Forward",
    body: "The Back button returns to the previous page. The Forward button goes forward again — just like flipping pages in a book.",
  },
  {
    target: "volume",
    icon: (
      <SpeakerHighIcon
        size={TOUR_ICON_SIZE}
        weight="bold"
        color={TOUR_ICON_COLOR}
      />
    ),
    title: "Control the Volume",
    body: "Use MORE and LESS to change how loud the sound is, or tap MUTE to silence it completely.",
  },
  {
    target: "scroll",
    icon: (
      <ArrowsDownUpIcon
        size={TOUR_ICON_SIZE}
        weight="bold"
        color={TOUR_ICON_COLOR}
      />
    ),
    title: "Move the Page Up or Down",
    body: "Use UP and DOWN to scroll through a long page. Tap BACK TO TOP to jump straight back to the beginning.",
  },
  {
    target: "zoom",
    icon: (
      <TextAaIcon size={TOUR_ICON_SIZE} weight="bold" color={TOUR_ICON_COLOR} />
    ),
    title: "Make Text Bigger",
    body: "Tap TEXT SIZE to make the writing on the page bigger. Tap it again to go back to normal size.",
  },
  {
    target: "fullscreen",
    icon: (
      <ArrowsOutIcon
        size={TOUR_ICON_SIZE}
        weight="bold"
        color={TOUR_ICON_COLOR}
      />
    ),
    title: "Full Screen",
    body: "FULLSCREEN makes the page fill the whole display — great for reading or watching videos. Tap SHRINK to bring everything back.",
  },
  {
    target: "refresh",
    icon: (
      <ArrowsClockwiseIcon
        size={TOUR_ICON_SIZE}
        weight="bold"
        color={TOUR_ICON_COLOR}
      />
    ),
    title: "Refresh the Page",
    body: "If a page looks wrong or stopped loading, tap REFRESH to reload it from scratch.",
  },
  {
    target: "save",
    icon: (
      <BookmarkSimpleIcon
        size={TOUR_ICON_SIZE}
        weight="bold"
        color={TOUR_ICON_COLOR}
      />
    ),
    title: "Save Pages You Like",
    body: "Found something interesting? Tap SAVE PAGE to keep it. Your caregiver will see all your saved pages.",
  },
  {
    target: "exit",
    icon: (
      <XCircleIcon
        size={TOUR_ICON_SIZE}
        weight="bold"
        color={TOUR_ICON_COLOR}
      />
    ),
    title: "Close the Page",
    body: "CLOSE PAGE closes the page you're on and takes you to the next one. If it's the last page open, it will close the browser.",
  },
  {
    target: null,
    icon: (
      <ConfettiIcon
        size={TOUR_ICON_SIZE}
        weight="fill"
        color={TOUR_ICON_COLOR}
      />
    ),
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

export function PanelWizard({
  onDone,
  onSkip,
}: {
  onDone: () => void
  onSkip: () => void
}) {
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
