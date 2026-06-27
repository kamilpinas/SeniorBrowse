import { useEffect, useState } from "react"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  HandWavingIcon,
  ListIcon,
  LockSimpleIcon,
  MoonIcon,
  SunIcon,
} from "@phosphor-icons/react"
import { storage } from "@shared/storage"
import { WelcomeBanner } from "./components/WelcomeBanner"
import { Clock } from "./components/Clock"
import { SearchBar } from "./components/SearchBar"
import { ShortcutGrid } from "./components/ShortcutGrid"
import { RecentSites } from "./components/RecentSites"
import { FontSizeRecovery } from "./components/FontSizeRecovery"
import { AdminBanner } from "./components/AdminBanner"
import { AdminPinModal } from "./components/AdminPinModal"
import { SettingsModal } from "./components/SettingsModal"
import { OnboardingWizard } from "./components/OnboardingWizard"
import { SeniorWalkthrough } from "./components/SeniorWalkthrough"
import { useFontSize } from "./hooks/useFontSize"
import { useAdminMode } from "./hooks/useAdminMode"
import { useTheme } from "./hooks/useTheme"

export function App() {
  const { showRecoveryPrompt, dismissRecovery, revertToDefault } = useFontSize()
  const { adminMode, enterAdminMode, exitAdminMode } = useAdminMode()
  const { theme, toggleTheme } = useTheme()

  const [seniorName, setSeniorName] = useState("")
  const [caregiverName, setCaregiverName] = useState("")
  const [showSettings, setShowSettings] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [ready, setReady] = useState(false)
  const [panelEnabled, setPanelEnabled] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelTourActive, setPanelTourActive] = useState(false)
  const [panelPosition, setPanelPosition] = useState<"left" | "right">("right")

  useEffect(() => {
    ;(async () => {
      try {
        const config = await storage.local.get("config")
        setSeniorName(config.seniorName)
        setCaregiverName(config.caregiverName)
        setPanelEnabled(config.panelEnabled !== false)
        setPanelPosition(config.panelPosition ?? "left")

        // show setup wizard on first install
        if (!config.onboardingDone) {
          setShowWizard(true)
        }
      } catch {
        /* ignore — fall through to normal render */
      }
      setReady(true)
    })()
  }, [])

  // Track panel open state, tour flags from session storage
  useEffect(() => {
    chrome.storage.session
      .get(["panelOpen", "panelTourActive", "seniorTourPending"])
      .then((data) => {
        const d = data as {
          panelOpen?: boolean
          panelTourActive?: boolean
          seniorTourPending?: boolean
        }
        setPanelOpen(!!d.panelOpen)
        setPanelTourActive(!!d.panelTourActive)
        if (d.seniorTourPending) setShowTour(true)
      })
      .catch(() => {})

    const onChange = (
      changes: Record<string, chrome.storage.StorageChange>,
      area: string,
    ) => {
      if (area === "session") {
        if ("panelOpen" in changes) {
          const isOpen = !!changes["panelOpen"]!.newValue
          setPanelOpen(isOpen)
          // If the panel just closed, the tour can't still be running —
          // clear the scrim immediately without waiting for the SW broadcast.
          if (!isOpen) setPanelTourActive(false)
        }
        if ("panelTourActive" in changes)
          setPanelTourActive(!!changes["panelTourActive"]!.newValue)
        // Panel wizard finished — start the newtab senior tour now
        if (
          "seniorTourPending" in changes &&
          !!changes["seniorTourPending"]!.newValue
        )
          setShowTour(true)
      }
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

  // Settings is admin-only — if admin mode exits from elsewhere (e.g. the
  // side panel's "Done" button), close the modal here too so it can't be
  // left open with no way back into admin mode.
  useEffect(() => {
    if (!adminMode) setShowSettings(false)
  }, [adminMode])

  // Re-read names after wizard completes (names may have just been set)
  const handleWizardComplete = async () => {
    const config = await storage.local.get("config").catch(() => null)
    if (config) {
      setSeniorName(config.seniorName)
      setCaregiverName(config.caregiverName)
    }
    setShowWizard(false)
    setReady(true)
  }

  // full-screen wizard (shown before anything else on first install)
  if (showWizard) {
    return <OnboardingWizard onComplete={handleWizardComplete} />
  }

  if (!ready) return null

  // Panel-closed gate — shown when the panel is enabled but not yet open.
  // Covers the whole screen so seniors are guided to open it first.
  if (panelEnabled && !panelOpen) {
    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          gap: "2rem",
          padding: "2rem",
          background: "var(--color-bg)",
          textAlign: "center",
        }}
      >
        <HandWavingIcon size={80} weight="fill" color="var(--color-accent)" />

        <div
          style={{ display: "flex", flexDirection: "column", gap: "0.75rem" }}
        >
          <h1
            style={{
              fontSize: "clamp(2rem, 5vw, 3rem)",
              fontWeight: 800,
              color: "var(--color-text)",
              margin: 0,
              lineHeight: 1.15,
            }}
          >
            {seniorName ? (
              <>
                Hi,{" "}
                <span style={{ color: "var(--color-accent)", fontWeight: 800 }}>
                  {seniorName}
                </span>
                !
              </>
            ) : (
              "Hello!"
            )}
          </h1>
          <p
            style={{
              fontSize: "1.2rem",
              color: "var(--color-text-muted)",
              margin: 0,
              maxWidth: 360,
              lineHeight: 1.6,
            }}
          >
            Your helper panel is closed. Click the button below to open it.
          </p>
        </div>

        <button
          type="button"
          onClick={() => {
            chrome.runtime
              .sendMessage({ type: "OPEN_SIDE_PANEL" })
              .catch(() => {})
          }}
          style={{
            fontSize: "1.5rem",
            fontWeight: 800,
            fontFamily: "inherit",
            padding: "1.25rem 3.5rem",
            borderRadius: "var(--radius-xl)",
            background: "var(--color-accent-strong)",
            color: "#fff",
            border: "none",
            cursor: "pointer",
            boxShadow: "0 6px 24px rgba(0,0,0,0.22)",
            transition:
              "background 0.18s cubic-bezier(0.22,1,0.36,1), transform 0.18s cubic-bezier(0.22,1,0.36,1), box-shadow 0.18s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "var(--color-accent-strong)"
            e.currentTarget.style.transform = "scale(1.04)"
            e.currentTarget.style.boxShadow = "0 10px 32px rgba(0,0,0,0.3)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--color-accent-strong)"
            e.currentTarget.style.transform = "scale(1)"
            e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.22)"
          }}
        >
          Open your helper panel
        </button>
      </main>
    )
  }

  return (
    <div style={{ display: "flex", flexDirection: "column", height: "100%" }}>
      {/* fixed edit-mode banner */}
      {adminMode && (
        <AdminBanner
          onDone={exitAdminMode}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      <main
        style={{
          flex: 1,
          minHeight: 0,
          maxWidth: "64rem",
          margin: "0 auto",
          width: "100%",
          // Admin banner is ~52px tall and fixed at top. We need its full
          // height PLUS breathing room before the greeting — otherwise the
          // welcome heading sits glued to the banner's bottom edge.
          padding: adminMode
            ? "clamp(5rem,8vh,6.5rem) clamp(1rem,2vw,2rem) clamp(0.5rem,1vh,1rem)"
            : "clamp(1.5rem,2.5vh,2.5rem) clamp(1rem,2vw,2rem) clamp(0.5rem,1vh,1rem)",
          display: "flex",
          flexDirection: "column",
          gap: "clamp(0.6rem,1.4vh,1.5rem)",
        }}
      >
        {/* font recovery prompt */}
        {showRecoveryPrompt && (
          <FontSizeRecovery
            seniorName={seniorName}
            onKeep={dismissRecovery}
            onRevert={revertToDefault}
          />
        )}

        {/* Greeting + Clock */}
        <div
          style={{
            display: "flex",
            justifyContent: "space-between",
            alignItems: "flex-end",
            gap: "2rem",
            flexWrap: "wrap",
          }}
        >
          <WelcomeBanner />
          <Clock />
        </div>

        <SearchBar />

        {/* 3 most recently visited sites, deduped by hostname */}
        <RecentSites />

        <div
          className="sw-fade-up sw-stagger-4"
          style={{
            flex: 1,
            minHeight: 0,
            overflowY: "auto",
            // Tiles lift translateY(-3px) on hover and cast a shadow that
            // extends past their bounds — without this padding, the
            // overflow:auto wrapper clips the top edge and the shadow
            // appears cut off.
            padding: "4px 4px 8px",
          }}
        >
          <ShortcutGrid adminMode={adminMode} />
        </div>
      </main>

      {/* Settings modal (admin-only) */}
      {showSettings && (
        <SettingsModal
          onClose={() => setShowSettings(false)}
          onStartSeniorTour={() => {
            setShowSettings(false)
            setShowTour(true)
          }}
        />
      )}

      {/* Panel button removed — panel is always-open by design.
          If closed, the gate screen above handles re-opening. */}

      {/* Dark / light mode toggle — fixed bottom-left, caregiver-only.
          Hidden from seniors to prevent accidental theme changes. */}
      {adminMode && (
        <button
          type="button"
          title={
            theme === "dark" ? "Switch to light mode" : "Switch to dark mode"
          }
          onClick={toggleTheme}
          style={{
            position: "fixed",
            bottom: "1.25rem",
            left: "1.25rem",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.5rem 0.9rem",
            background: "var(--color-surface)",
            border: "1.5px solid var(--color-surface-edge)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-soft)",
            fontSize: "0.85rem",
            fontWeight: 600,
            fontFamily: "inherit",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            transition:
              "background 0.18s cubic-bezier(.4,0,.2,1), color 0.18s cubic-bezier(.4,0,.2,1), border-color 0.18s cubic-bezier(.4,0,.2,1)",
          }}
          onMouseEnter={(e) => {
            const b = e.currentTarget
            b.style.background = "var(--color-bg)"
            b.style.color = "var(--color-text)"
          }}
          onMouseLeave={(e) => {
            const b = e.currentTarget
            b.style.background = "var(--color-surface)"
            b.style.color = "var(--color-text-muted)"
          }}
        >
          {theme === "dark" ? <SunIcon size={16} /> : <MoonIcon size={16} />}
          {theme === "dark" ? "Light mode" : "Dark mode"}
        </button>
      )}

      {/* Caregiver settings button — visible in the bottom-right corner.
          Hidden when already in admin mode (the banner handles that). */}
      {!adminMode && (
        <button
          type="button"
          title="Caregiver settings"
          onClick={() => setShowPinModal(true)}
          style={{
            position: "fixed",
            bottom: "1.25rem",
            right: "1.25rem",
            zIndex: 200,
            display: "flex",
            alignItems: "center",
            gap: "0.4rem",
            padding: "0.5rem 0.9rem",
            background: "var(--color-surface)",
            border: "1.5px solid var(--color-surface-edge)",
            borderRadius: "var(--radius-md)",
            boxShadow: "var(--shadow-soft)",
            fontSize: "0.85rem",
            fontWeight: 600,
            fontFamily: "inherit",
            color: "var(--color-text-muted)",
            cursor: "pointer",
            transition:
              "background 0.18s cubic-bezier(.4,0,.2,1), color 0.18s cubic-bezier(.4,0,.2,1), border-color 0.18s cubic-bezier(.4,0,.2,1)",
          }}
          onMouseEnter={(e) => {
            const b = e.currentTarget
            b.style.background = "var(--color-bg)"
            b.style.color = "var(--color-text)"
          }}
          onMouseLeave={(e) => {
            const b = e.currentTarget
            b.style.background = "var(--color-surface)"
            b.style.color = "var(--color-text-muted)"
          }}
        >
          <LockSimpleIcon size={16} /> Edit mode
        </button>
      )}

      {/* PIN entry modal */}
      {showPinModal && (
        <AdminPinModal
          onSuccess={() => {
            setShowPinModal(false)
            enterAdminMode()
          }}
          onCancel={() => setShowPinModal(false)}
        />
      )}

      {/* Senior walkthrough */}
      {showTour && (
        <SeniorWalkthrough
          seniorName={seniorName}
          caregiverName={caregiverName}
          onDone={() => {
            setShowTour(false)
            chrome.storage.session
              .set({ seniorTourPending: false })
              .catch(() => {})
          }}
        />
      )}

      {/* Panel tour scrim — shown while the side-panel spotlight wizard is running.
          Dims the newtab so the senior's attention goes to the panel. */}
      {panelTourActive && (
        <div
          style={{
            position: "fixed",
            inset: 0,
            zIndex: 10100,
            background: "rgba(42,38,32,0.85)",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            textAlign: "center",
          }}
        >
          {/* Centred message */}
          <div
            style={{
              display: "flex",
              flexDirection: "column",
              alignItems: "center",
              gap: "1.1rem",
              padding: "2rem",
            }}
          >
            <ListIcon size={56} color="#fff" />
            <p
              style={{
                margin: 0,
                fontSize: "1.6rem",
                fontWeight: 800,
                color: "#fff",
                maxWidth: 350,
                lineHeight: 1.35,
              }}
            >
              Look at your helper panel!
            </p>
            <p
              style={{
                margin: 0,
                fontSize: "1rem",
                color: "rgba(255,255,255,0.7)",
                maxWidth: 300,
                lineHeight: 1.6,
              }}
            >
              Your guide is showing there right now.
            </p>
          </div>

          {/* Big bouncing arrow pointing at the side panel */}
          <div
            className={
              panelPosition === "right"
                ? "sw-panel-arrow-r"
                : "sw-panel-arrow-l"
            }
            style={{
              position: "absolute",
              top: "50%",
              ...(panelPosition === "right"
                ? { right: "1.75rem" }
                : { left: "1.75rem" }),
              color: "#fff",
              lineHeight: 1,
              userSelect: "none",
              pointerEvents: "none",
              filter:
                "drop-shadow(0 0 30px rgba(194,94,42,0.9)) drop-shadow(0 0 60px rgba(194,94,42,0.5))",
            }}
          >
            {panelPosition === "right" ? (
              <ArrowRightIcon size={224} weight="bold" />
            ) : (
              <ArrowLeftIcon size={224} weight="bold" />
            )}
          </div>
        </div>
      )}
    </div>
  )
}
