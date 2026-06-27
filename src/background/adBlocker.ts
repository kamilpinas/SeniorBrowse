// Toggle the static ad-blocking rule set via declarativeNetRequest.
// The rule set "ad_block_rules" is declared in manifest.json with enabled:false.

const RULESET_ID = 'ad_block_rules'

export async function updateAdBlocking(enable: boolean): Promise<void> {
  try {
    await chrome.declarativeNetRequest.updateEnabledRulesets({
      enableRulesetIds: enable ? [RULESET_ID] : [],
      disableRulesetIds: enable ? [] : [RULESET_ID],
    })
    console.info('[SeniorBrowse] ad blocking', enable ? 'enabled' : 'disabled')
  } catch (err) {
    // Fails gracefully in dev (no extension context) or when already in desired state.
    console.warn('[SeniorBrowse] updateAdBlocking failed:', err)
  }
}
