// U-02: expired-state guard renders before anything else.
import { useEffect, useState } from "react"
import {
  ArrowLeftIcon,
  ArrowRightIcon,
  GearIcon,
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
  const [accountEmail, setAccountEmail] = useState("")
  const [showSettings, setShowSettings] = useState(false)
  const [showWizard, setShowWizard] = useState(false)
  const [showTour, setShowTour] = useState(false)
  const [showPinModal, setShowPinModal] = useState(false)
  const [isExpired, setIsExpired] = useState(false)
  const [ready, setReady] = useState(false)
  const [panelEnabled, setPanelEnabled] = useState(true)
  const [panelOpen, setPanelOpen] = useState(false)
  const [panelTourActive, setPanelTourActive] = useState(false)
  const [panelPosition, setPanelPosition] = useState<"left" | "right">("right")

  useEffect(() => {
    ;(async () => {
      try {
        const [config, sub] = await Promise.all([
          storage.local.get("config"),
          storage.local.get("subscription"),
        ])
        setSeniorName(config.seniorName)
        setCaregiverName(config.caregiverName)
        setPanelEnabled(config.panelEnabled !== false)
        setPanelPosition(config.panelPosition ?? "left")

        // U-02: expired guard — hide all content from the senior
        if (sub?.status === "expired") {
          setIsExpired(true)
          if (sub.email) setAccountEmail(sub.email)
          setReady(true)
          return
        }

        // O-01: show setup wizard on first install
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
      if (area !== "session") return
      if ("panelOpen" in changes) setPanelOpen(!!changes["panelOpen"]!.newValue)
      if ("panelTourActive" in changes)
        setPanelTourActive(!!changes["panelTourActive"]!.newValue)
      // Panel wizard finished — start the newtab senior tour now
      if (
        "seniorTourPending" in changes &&
        !!changes["seniorTourPending"]!.newValue
      )
        setShowTour(true)
    }
    chrome.storage.onChanged.addListener(onChange)
    return () => chrome.storage.onChanged.removeListener(onChange)
  }, [])

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

  // U-02: expired screen — senior sees "needs attention"; caregiver sees subscribe options
  if (ready && isExpired) {
    const emailParam = accountEmail
      ? `&checkout[custom][email]=${encodeURIComponent(accountEmail)}`
      : ""
    const storeSlug = import.meta.env.VITE_LEMON_SQUEEZY_STORE_ID ?? ""
    const monthlyId = import.meta.env.VITE_LEMON_SQUEEZY_MONTHLY_VARIANT_ID ?? ""
    const yearlyId = import.meta.env.VITE_LEMON_SQUEEZY_YEARLY_VARIANT_ID ?? ""
    const monthlyUrl = `https://${storeSlug}.lemonsqueezy.com/buy/${monthlyId}?${emailParam}`
    const yearlyUrl = `https://${storeSlug}.lemonsqueezy.com/buy/${yearlyId}?${emailParam}`

    return (
      <main
        style={{
          minHeight: "100vh",
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          padding: "2rem",
          background: "var(--color-bg)",
        }}
      >
        <div
          style={{
            textAlign: "center" as const,
            maxWidth: 520,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            gap: "1.5rem",
          }}
        >
          <GearIcon size={48} color="var(--color-text-muted)" />
          <div>
            <h1
              style={{
                fontSize: "1.5rem",
                fontWeight: 700,
                color: "var(--color-text)",
                margin: 0,
              }}
            >
              SeniorWeb needs attention
            </h1>
            <p
              style={{
                fontSize: "1rem",
                color: "var(--color-text-muted)",
                margin: "0.5rem 0 0",
                lineHeight: 1.6,
              }}
            >
              The free trial has ended. Please ask{" "}
              {caregiverName ? caregiverName : "your caregiver"} to subscribe
              to keep using SeniorWeb.
            </p>
          </div>

          {/* Subscribe options — visible only to the caregiver who knows what they mean */}
          {monthlyId && (
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                gap: "0.75rem",
                width: "100%",
                maxWidth: 360,
              }}
            >
              <a
                href={yearlyUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "block",
                  padding: "0.9rem 1.5rem",
                  background: "var(--color-accent)",
                  color: "#fff",
                  borderRadius: "var(--radius-md)",
                  fontWeight: 700,
                  fontSize: "1rem",
                  textDecoration: "none",
                  textAlign: "center" as const,
                }}
              >
                Subscribe — $39.99 / year
              </a>
              <a
                href={monthlyUrl}
                target="_blank"
                rel="noreferrer"
                style={{
                  display: "block",
                  padding: "0.75rem 1.5rem",
                  background: "transparent",
                  color: "var(--color-text-muted)",
                  border: "1.5px solid var(--color-surface-edge)",
                  borderRadius: "var(--radius-md)",
                  fontWeight: 600,
                  fontSize: "0.95rem",
                  textDecoration: "none",
                  textAlign: "center" as const,
                }}
              >
                Monthly — $4.99 / month
              </a>
            </div>
          )}
        </div>
      </main>
    )
  }

  // O-01: full-screen wizard (shown before anything else on first install)
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
            Please click the big button below to start browsing.
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
              "background 0.18s cubic-bezier(.22,.68,0,1.2), transform 0.18s cubic-bezier(.22,.68,0,1.2), box-shadow 0.18s",
          }}
          onMouseEnter={(e) => {
            e.currentTarget.style.background = "#6e2808"
            e.currentTarget.style.transform = "scale(1.04)"
            e.currentTarget.style.boxShadow = "0 10px 32px rgba(0,0,0,0.3)"
          }}
          onMouseLeave={(e) => {
            e.currentTarget.style.background = "var(--color-accent-strong)"
            e.currentTarget.style.transform = "scale(1)"
            e.currentTarget.style.boxShadow = "0 6px 24px rgba(0,0,0,0.22)"
          }}
        >
          Click here to start
        </button>
      </main>
    )
  }

  return (
    <>
      {/* A-02: fixed edit-mode banner */}
      {adminMode && (
        <AdminBanner
          onDone={exitAdminMode}
          onOpenSettings={() => setShowSettings(true)}
        />
      )}

      <main
        style={{
          maxWidth: "64rem",
          margin: "0 auto",
          padding: `${adminMode ? "4rem" : "3rem"} 2rem 4rem`,
          display: "flex",
          flexDirection: "column",
          gap: "2.5rem",
          transition: "padding-top 0.2s ease",
        }}
      >
        {/* N-06 — font recovery prompt */}
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

        {/* N-04 */}
        <SearchBar />

        {/* 3 most recently visited sites, deduped by hostname */}
        <RecentSites />

        {/* N-05 + A-03..A-06 */}
        <div className="sw-fade-up sw-stagger-4">
          <ShortcutGrid adminMode={adminMode} />
        </div>
      </main>

      {/* M-01..M-06 — Settings modal (admin-only) */}
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

      {/* Dark / light mode toggle — fixed bottom-left corner */}
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
          <LockSimpleIcon size={16} /> For carers
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

      {/* O-02 — Senior walkthrough */}
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
    </>
  )
}
