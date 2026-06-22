// Accessibility focus trap shared by every modal in the app (PIN entry,
// settings, onboarding). Exercised directly against a real DOM container
// rather than through any one modal, since the behavior is identical
// everywhere it's used.

import { describe, it, expect } from "vitest"
import { renderHook } from "@testing-library/react"
import { useFocusTrap } from "../useFocusTrap"

function setupContainer(html: string) {
  const container = document.createElement("div")
  container.innerHTML = html
  document.body.appendChild(container)
  return container
}

describe("useFocusTrap", () => {
  it("focuses the first focusable element on mount", () => {
    const container = setupContainer(
      `<button id="first">First</button><button id="second">Second</button>`,
    )
    renderHook(() => useFocusTrap({ current: container }))
    expect(document.activeElement?.id).toBe("first")
    container.remove()
  })

  it("does not move focus on mount when autoFocus is false", () => {
    const outside = document.createElement("button")
    outside.id = "outside"
    document.body.appendChild(outside)
    outside.focus()

    const container = setupContainer(`<button id="first">First</button>`)
    renderHook(() => useFocusTrap({ current: container }, { autoFocus: false }))
    expect(document.activeElement?.id).toBe("outside")

    container.remove()
    outside.remove()
  })

  it("wraps focus from the last element to the first on Tab", () => {
    const container = setupContainer(
      `<button id="first">First</button><button id="second">Second</button>`,
    )
    renderHook(() => useFocusTrap({ current: container }))

    container.querySelector<HTMLElement>("#second")!.focus()
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }),
    )

    expect(document.activeElement?.id).toBe("first")
    container.remove()
  })

  it("wraps focus from the first element to the last on Shift+Tab", () => {
    const container = setupContainer(
      `<button id="first">First</button><button id="second">Second</button>`,
    )
    renderHook(() => useFocusTrap({ current: container }))
    // Mount already focused #first.

    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", shiftKey: true, bubbles: true, cancelable: true }),
    )

    expect(document.activeElement?.id).toBe("second")
    container.remove()
  })

  it("does not move focus for a Tab press in the middle of the tab order", () => {
    const container = setupContainer(
      `<button id="first">First</button><button id="second">Second</button><button id="third">Third</button>`,
    )
    renderHook(() => useFocusTrap({ current: container }))

    container.querySelector<HTMLElement>("#second")!.focus()
    document.dispatchEvent(
      new KeyboardEvent("keydown", { key: "Tab", bubbles: true, cancelable: true }),
    )

    // Only edge wrapping is intercepted — the middle element keeps focus
    // since jsdom doesn't simulate native tab-order advancement.
    expect(document.activeElement?.id).toBe("second")
    container.remove()
  })

  it("ignores non-Tab key presses", () => {
    const container = setupContainer(
      `<button id="first">First</button><button id="second">Second</button>`,
    )
    renderHook(() => useFocusTrap({ current: container }))

    container.querySelector<HTMLElement>("#second")!.focus()
    document.dispatchEvent(new KeyboardEvent("keydown", { key: "Enter", bubbles: true }))

    expect(document.activeElement?.id).toBe("second")
    container.remove()
  })

  it("restores focus to the previously-focused element on unmount", () => {
    const outside = document.createElement("button")
    outside.id = "outside"
    document.body.appendChild(outside)
    outside.focus()

    const container = setupContainer(`<button id="first">First</button>`)
    const { unmount } = renderHook(() => useFocusTrap({ current: container }))
    expect(document.activeElement?.id).toBe("first")

    unmount()
    expect(document.activeElement?.id).toBe("outside")

    container.remove()
    outside.remove()
  })

  it("does not throw when the container has no focusable elements", () => {
    const container = setupContainer(`<div>no interactive children</div>`)
    expect(() => renderHook(() => useFocusTrap({ current: container }))).not.toThrow()
    expect(() =>
      document.dispatchEvent(new KeyboardEvent("keydown", { key: "Tab", bubbles: true })),
    ).not.toThrow()
    container.remove()
  })

  it("excludes disabled buttons and tabindex=-1 elements from the focusable set", () => {
    const container = setupContainer(`
      <button id="disabled-btn" disabled>Disabled</button>
      <div id="neg-tabindex" tabindex="-1">Not focusable</div>
      <button id="real">Real</button>
    `)
    renderHook(() => useFocusTrap({ current: container }))
    expect(document.activeElement?.id).toBe("real")
    container.remove()
  })
})
