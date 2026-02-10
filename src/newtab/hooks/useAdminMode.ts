// A-01 / A-02: Read admin mode from session storage and keep it live via
// chrome.runtime.onMessage (ADMIN_MODE_CHANGED from background).

import { useEffect, useState } from "react"
import { storage } from "@shared/storage"

export function useAdminMode() {
  // Start false — storage read below will set the real initial value.
  // (Previously `true`, which caused an admin-banner flash on every page load.)
  const [adminMode, setAdminMode] = useState(false)

  useEffect(() => {
    // Seed from storage on mount.
    storage.session
      .get("adminModeActive")
      .then(setAdminMode)
      .catch(() => {})

    if (typeof chrome === "undefined" || !chrome.runtime?.onMessage) return

    const handler = (msg: unknown) => {
      if (
        typeof msg === "object" &&
        msg !== null &&
        "type" in msg &&
        (msg as { type: string }).type === "ADMIN_MODE_CHANGED"
      ) {
        const m = msg as { type: string; payload: { active: boolean } }
        setAdminMode(m.payload.active)
      }
    }

    chrome.runtime.onMessage.addListener(handler)
    return () => chrome.runtime.onMessage.removeListener(handler)
  }, [])

  /** Send SET_ADMIN_MODE to background so all tabs stay in sync. */
  const setMode = async (active: boolean) => {
    setAdminMode(active)
    if (typeof chrome !== "undefined" && chrome.runtime?.sendMessage) {
      try {
        await chrome.runtime.sendMessage({
          type: "SET_ADMIN_MODE",
          payload: { active },
        })
      } catch {
        /* dev env — store locally so the UI still reflects the change */
        await storage.session.set("adminModeActive", active).catch(() => {})
      }
    }
  }

  /** Enter admin/caregiver mode. Called after PIN is verified. */
  const enterAdminMode = () => setMode(true)

  /** Exit admin/caregiver mode. Called by the Done banner button. */
  const exitAdminMode = () => setMode(false)

  return { adminMode, enterAdminMode, exitAdminMode }
}
