// Senior walkthrough — spotlight tour over the real newtab elements.
// Instead of a centered modal with illustrations, each step focuses an actual
// DOM element on the page (greeting, search bar, shortcuts) using a
// box-shadow cutout. The spotlight slides smoothly between elements.

import { useEffect, useLayoutEffect, useRef, useState } from "react"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  ClockIcon,
  ClockCounterClockwiseIcon,
  ConfettiIcon,
  HandWavingIcon,
  MagnifyingGlassIcon,
  SmileyIcon,
  StarIcon,
  ThumbsUpIcon,
} from "@phosphor-icons/react"

interface Props {
  seniorName: string
  caregiverName: string
  onDone: () => void
}

// ── Constants ─────────────────────────────────────────────────────────────────

const PAD = 16 // extra space around the spotlit element (px)
const GAP = 16 // space between spotlight edge and tooltip card (px)
const CARD_W = 440 // tooltip card max-width (px)
const CARD_H_EST = 240 // estimated card height used for initial above/below decision

// ── Step definitions ──────────────────────────────────────────────────────────

interface TourStep {
  /** data-tour attribute value on the target element, or null for centred overlay */
  target: string | null
  icon: React.ReactNode
  title: (senior: string) => React.ReactNode
  body: (senior: string, caregiver: string) => React.ReactNode
}

const STEP_ICON_SIZE = 48
const STEP_ICON_COLOR = "var(--color-accent)"

/** Accent style applied to the senior's name wherever it appears. */
const nameGlow: React.CSSProperties = {
  color: "var(--color-accent)",
  fontWeight: 800,
}

/** Render the senior's name with glow, or nothing if name is empty. */
function SeniorName({ name }: { name: string }) {
  if (!name) return null
  return <span style={nameGlow}>{name}</span>
}

const STEPS: TourStep[] = [
  {
    target: null,
    icon: <HandWavingIcon size={STEP_ICON_SIZE} weight="fill" color={STEP_ICON_COLOR} />,
    title: (n) => n ? <>Hi, <SeniorName name={n} />!</> : "Hi!",
    body: () =>
      "Let me show you around. I'll highlight each part of your home page as we go.",
  },
  {
    target: "greeting",
    icon: <SmileyIcon size={STEP_ICON_SIZE} weight="fill" color={STEP_ICON_COLOR} />,
    title: () => "Your personal greeting",
    body: (n) => n
      ? <>Every time you open a new page, you'll see a friendly welcome message just for you, <SeniorName name={n} />.</>
      : "Every time you open a new page, you'll see a friendly welcome message just for you.",
  },
  {
    target: "clock",
    icon: <ClockIcon size={STEP_ICON_SIZE} weight="bold" color={STEP_ICON_COLOR} />,
    title: () => "Time and date",
    body: () =>
      "The clock shows you the current time, and the date pill below it tells you today's full date — always up to date.",
  },
  {
    target: "search",
    icon: <MagnifyingGlassIcon size={STEP_ICON_SIZE} weight="bold" color={STEP_ICON_COLOR} />,
    title: () => "Search the web",
    body: () =>
      "Type anything here — a question, a recipe, the news — then press the Search button or hit Enter.",
  },
  {
    target: "recent",
    icon: <ClockCounterClockwiseIcon size={STEP_ICON_SIZE} weight="bold" color={STEP_ICON_COLOR} />,
    title: () => "Pick up where you left off",
    body: () =>
      "The last websites you visited appear here automatically. Just click one to go straight back — no need to remember the address.",
  },
  {
    target: "shortcuts",
    icon: <StarIcon size={STEP_ICON_SIZE} weight="fill" color={STEP_ICON_COLOR} />,
    title: () => "Your favourite websites",
    body: (_s, c) =>
      `These big tiles take you straight to a website with one tap — no typing needed. ${c || "Your caregiver"} can add more tiles or change their size any time.`,
  },
  {
    target: null,
    icon: <ConfettiIcon size={STEP_ICON_SIZE} weight="fill" color={STEP_ICON_COLOR} />,
    title: (n) => n ? <>You're all set, <SeniorName name={n} />!</> : "You're all set!",
    body: (_s, c) =>
      `Happy browsing! If you ever get lost, just open a new page to come back here. ${c || "Your caregiver"} can always help.`,
  },
]

// ── Progress dots ─────────────────────────────────────────────────────────────

function Dots({ current, total }: { current: number; total: number }) {
  return (
    <div style={{ display: "flex", gap: 6, justifyContent: "center" }}>
      {Array.from({ length: total }, (_, i) => (
        <span
          key={i}
          style={{
            display: "inline-block",
            width: i === current ? 22 : 8,
            height: 8,
            borderRadius: 4,
            background:
              i === current
                ? "var(--color-accent)"
                : "var(--color-surface-edge)",
            transition: "width 0.2s ease, background 0.2s ease",
          }}
        />
      ))}
    </div>
  )
}

// ── Tour card ─────────────────────────────────────────────────────────────────

interface CardProps {
  step: TourStep
  stepIndex: number
  totalSteps: number
  seniorName: string
  caregiverName: string
  isFirst: boolean
  isLast: boolean
  onBack: () => void
  onNext: () => void
  onSkip: () => void
  /**
   * Which side of the card the arrow appears on.
   * 'top'    → tooltip is BELOW the element; arrow points up
   * 'bottom' → tooltip is ABOVE the element; arrow points down
   * undefined → no arrow (centred card)
   */
  arrowSide?: "top" | "bottom"
  /** Horizontal offset of the arrow tip from the card's left edge (px) */
  arrowLeft?: number
  cardRef?: React.Ref<HTMLDivElement>
  style?: React.CSSProperties
}

function TourCard({
  step,
  stepIndex,
  totalSteps,
  seniorName,
  caregiverName,
  isFirst,
  isLast,
  onBack,
  onNext,
  onSkip,
  arrowSide,
  arrowLeft,
  cardRef,
  style,
}: CardProps) {
  // CSS-triangle arrow connecting card to the spotlit element
  const arrowEl =
    arrowSide != null && arrowLeft != null ? (
      <div
        aria-hidden="true"
        style={{
          position: "absolute",
          left: Math.max(14, Math.min(arrowLeft, CARD_W - 40)),
          width: 0,
          height: 0,
          borderLeft: "12px solid transparent",
          borderRight: "12px solid transparent",
          // top arrow: solid border is on the BOTTOM so it points up
          ...(arrowSide === "top"
            ? { top: -12, borderBottom: "12px solid var(--color-bg)" }
            : { bottom: -12, borderTop: "12px solid var(--color-bg)" }),
        }}
      />
    ) : null

  return (
    <div
      ref={cardRef}
      style={{
        position: "relative",
        background: "var(--color-bg)",
        border: "1.5px solid var(--color-surface-edge)",
        borderRadius: "var(--radius-lg)",
        padding: "1.75rem",
        boxShadow: "0 8px 40px rgba(42,38,32,0.3)",
        display: "flex",
        flexDirection: "column",
        gap: "1.25rem",
        textAlign: "center",
        ...style,
      }}
    >
      {arrowEl}

      <Dots current={stepIndex} total={totalSteps} />

      <div>
        <div
          style={{ display: "flex", justifyContent: "center", marginBottom: "0.5rem" }}
        >
          {step.icon}
        </div>
        <h2
          style={{
            fontSize: "1.4rem",
            fontWeight: 800,
            color: "var(--color-text)",
            margin: "0 0 0.5rem",
            lineHeight: 1.25,
          }}
        >
          {step.title(seniorName)}
        </h2>
        <p
          style={{
            fontSize: "1.05rem",
            color: "var(--color-text-muted)",
            margin: 0,
            lineHeight: 1.65,
          }}
        >
          {step.body(seniorName, caregiverName)}
        </p>
      </div>

      <div
        style={{
          display: "flex",
          gap: "0.6rem",
          justifyContent: "center",
          flexWrap: "wrap",
        }}
      >
        {isFirst && (
          <button
            onClick={onSkip}
            style={{
              padding: "0.7rem 1.2rem",
              background: "transparent",
              color: "var(--color-text-subtle)",
              border: "1.5px solid var(--color-surface-edge)",
              borderRadius: "var(--radius-md)",
              fontSize: "1rem",
              fontWeight: 600,
              cursor: "pointer",
            }}
          >
            Skip
          </button>
        )}
        {!isFirst && (
          <button
            onClick={onBack}
            style={{
              padding: "0.7rem 1.2rem",
              background: "transparent",
              color: "var(--color-text-muted)",
              border: "1.5px solid var(--color-surface-edge)",
              borderRadius: "var(--radius-md)",
              fontSize: "1.05rem",
              fontWeight: 600,
              cursor: "pointer",
              display: "flex",
              alignItems: "center",
              gap: "0.35rem",
            }}
          >
            <ArrowLeftIcon size={16} /> Back
          </button>
        )}
        <button
          onClick={onNext}
          style={{
            padding: "0.7rem 2rem",
            background: "var(--color-accent)",
            color: "#fff",
            border: "none",
            borderRadius: "var(--radius-md)",
            fontSize: "1.05rem",
            fontWeight: 700,
            cursor: "pointer",
            minWidth: 140,
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            gap: "0.4rem",
          }}
        >
          {isLast ? (
            <>
              Got it! <ThumbsUpIcon size={18} weight="fill" />
            </>
          ) : (
            <>
              Next <ArrowRightIcon size={16} />
            </>
          )}
        </button>
      </div>
    </div>
  )
}

// ── Walkthrough ───────────────────────────────────────────────────────────────

export function SeniorWalkthrough({
  seniorName,
  caregiverName,
  onDone,
}: Props) {
  const [step, setStep] = useState(0)
  const [spotRect, setSpotRect] = useState<DOMRect | null>(null)
  const [cardH, setCardH] = useState(CARD_H_EST)
  const cardRef = useRef<HTMLDivElement>(null)

  const current = STEPS[step]!
  const isFirst = step === 0
  const isLast = step === STEPS.length - 1

  // Measure the target element's position whenever the step changes.
  // useLayoutEffect fires before the browser paints, so the spotlight
  // appears in the right place on the very first frame.
  useLayoutEffect(() => {
    if (!current.target) {
      setSpotRect(null)
      return
    }
    const el = document.querySelector<HTMLElement>(
      `[data-tour="${current.target}"]`,
    )
    setSpotRect(el ? el.getBoundingClientRect() : null)
  }, [step, current.target])

  // Measure the card height after the DOM settles so we can decide whether
  // to place the tooltip above or below the spotlit element.
  useEffect(() => {
    const id = requestAnimationFrame(() => {
      if (cardRef.current) setCardH(cardRef.current.offsetHeight)
    })
    return () => cancelAnimationFrame(id)
  }, [step])

  const goNext = () => (isLast ? onDone() : setStep((s) => s + 1))
  const goBack = () => setStep((s) => s - 1)

  // ── Mode A: centred overlay (intro / outro steps) ─────────────────────────
  if (!spotRect) {
    return (
      <div
        style={{
          position: "fixed",
          inset: 0,
          zIndex: 10200,
          background: "rgba(42,38,32,0.72)",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
        }}
      >
        <TourCard
          cardRef={cardRef}
          step={current}
          stepIndex={step}
          totalSteps={STEPS.length}
          seniorName={seniorName}
          caregiverName={caregiverName}
          isFirst={isFirst}
          isLast={isLast}
          onBack={goBack}
          onNext={goNext}
          onSkip={onDone}
          style={{ width: "100%", maxWidth: 460 }}
        />
      </div>
    )
  }

  // ── Mode B: spotlight over a real page element ────────────────────────────

  // Spotlight bounds (element rect + padding on each side)
  const sTop = spotRect.top - PAD
  const sLeft = spotRect.left - PAD
  const sW = spotRect.width + PAD * 2
  const sH = spotRect.height + PAD * 2

  // Decide whether to put the tooltip below or above.
  // "Above" when there isn't enough room below the spotlight.
  const spaceBelow = window.innerHeight - (sTop + sH)
  const showAbove = spaceBelow < cardH + GAP + 24

  const tooltipTop = showAbove
    ? sTop - GAP - cardH // card sits above the spotlight
    : sTop + sH + GAP // card sits below the spotlight

  // Horizontally centre the card on the spotlight, clamped to viewport edges
  const tooltipLeft = Math.max(
    16,
    Math.min(sLeft + sW / 2 - CARD_W / 2, window.innerWidth - CARD_W - 16),
  )

  // Arrow tip should point at the horizontal centre of the spotlight.
  // arrowLeft is relative to the card's left edge.
  const arrowLeft = sLeft + sW / 2 - tooltipLeft - 12 // 12 = half arrow base

  return (
    // Wrapper: pointer-events none so content behind is technically "reachable"
    // by the CSS engine, but the full-screen blocker div absorbs all clicks.
    <div
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 10200,
        pointerEvents: "none",
      }}
    >
      {/* ── Full-screen click blocker ──────────────────────────────────────── */}
      {/* Prevents accidental navigation while the tour is running. */}
      <div style={{ position: "absolute", inset: 0, pointerEvents: "auto" }} />

      {/* ── Spotlight ring ─────────────────────────────────────────────────── */}
      {/* The huge box-shadow creates the dark overlay everywhere EXCEPT where  */}
      {/* this div sits, which is positioned exactly over the target element.   */}
      <div
        style={{
          position: "absolute",
          top: sTop,
          left: sLeft,
          width: sW,
          height: sH,
          boxShadow: "0 0 0 9999px rgba(42,38,32,0.72)",
          borderRadius: 14,
          border: "2.5px solid rgba(194,94,42,0.65)",
          pointerEvents: "none",
          // Smooth slide between elements when the user presses Next/Back
          transition:
            "top    0.38s cubic-bezier(.4,0,.2,1)," +
            "left   0.38s cubic-bezier(.4,0,.2,1)," +
            "width  0.38s cubic-bezier(.4,0,.2,1)," +
            "height 0.38s cubic-bezier(.4,0,.2,1)",
        }}
      />

      {/* ── Tooltip card ───────────────────────────────────────────────────── */}
      <TourCard
        cardRef={cardRef}
        step={current}
        stepIndex={step}
        totalSteps={STEPS.length}
        seniorName={seniorName}
        caregiverName={caregiverName}
        isFirst={isFirst}
        isLast={isLast}
        onBack={goBack}
        onNext={goNext}
        onSkip={onDone}
        arrowSide={showAbove ? "bottom" : "top"}
        arrowLeft={arrowLeft}
        style={{
          position: "absolute",
          top: tooltipTop,
          left: tooltipLeft,
          width: CARD_W,
          maxWidth: "calc(100vw - 32px)",
          pointerEvents: "auto",
          // Tooltip also slides smoothly as the user moves through steps
          transition:
            "top  0.38s cubic-bezier(.4,0,.2,1)," +
            "left 0.38s cubic-bezier(.4,0,.2,1)",
        }}
      />
    </div>
  )
}
