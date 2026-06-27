import { describe, it, expect, vi, beforeEach } from "vitest"
import { render, screen } from "@testing-library/react"
import { storage } from "@shared/storage"
import { AddShortcutForm } from "../AddShortcutForm"

// Regression test for a bug where the scrollbar sat directly on the dialog's
// rounded card, visually clipping into the border-radius. The fix moved
// overflow onto an inner wrapper and clipped the rounded card itself.

describe("AddShortcutForm", () => {
  beforeEach(async () => {
    await storage.local.clear()
  })

  it("scrolls its inner content, not the rounded dialog card itself", async () => {
    render(
      <AddShortcutForm existingUrls={[]} onAdd={vi.fn()} onCancel={vi.fn()} />,
    )

    const dialog = await screen.findByRole("dialog")
    expect(dialog.style.overflow).toBe("hidden")

    const scrollArea = dialog.firstElementChild as HTMLElement
    expect(scrollArea).not.toBeNull()
    expect(scrollArea.style.overflowY).toBe("auto")
  })
})
