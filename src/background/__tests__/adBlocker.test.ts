import { describe, it, expect, beforeEach } from "vitest"
import { installChromeMock, type ChromeMock } from "../../__tests__/helpers/chromeMock"
import { updateAdBlocking } from "../adBlocker"

describe("updateAdBlocking", () => {
  let mock: ChromeMock

  beforeEach(() => {
    mock = installChromeMock()
  })

  it("enables the ad-block ruleset when enable=true", async () => {
    await updateAdBlocking(true)
    expect(mock.declarativeNetRequest.updateEnabledRulesets).toHaveBeenCalledWith({
      enableRulesetIds: ["ad_block_rules"],
      disableRulesetIds: [],
    })
  })

  it("disables the ad-block ruleset when enable=false", async () => {
    await updateAdBlocking(false)
    expect(mock.declarativeNetRequest.updateEnabledRulesets).toHaveBeenCalledWith({
      enableRulesetIds: [],
      disableRulesetIds: ["ad_block_rules"],
    })
  })

  it("does not throw when declarativeNetRequest.updateEnabledRulesets rejects", async () => {
    mock.declarativeNetRequest.updateEnabledRulesets.mockRejectedValueOnce(
      new Error("not supported"),
    )
    await expect(updateAdBlocking(true)).resolves.toBeUndefined()
  })

  it("does not throw when chrome.declarativeNetRequest is entirely unavailable", async () => {
    // Some Chromium forks don't implement declarativeNetRequest at all.
    delete (globalThis.chrome as Partial<typeof chrome>).declarativeNetRequest
    await expect(updateAdBlocking(true)).resolves.toBeUndefined()
  })
})
