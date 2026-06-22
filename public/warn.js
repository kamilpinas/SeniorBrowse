// MV3 extension pages enforce a default CSP of "script-src 'self'", which
// blocks inline <script> tags. This must stay an external file (not inlined
// back into warn.html) or these handlers silently stop running.

const params = new URLSearchParams(location.search)
const rawUrl = params.get('url') || ''

// Only http(s) may be navigated to. This page is web-accessible to any
// site (see manifest web_accessible_resources), so `url` is untrusted
// input — without this check a crafted link could pass a javascript: or
// data: URI and run code in the extension's origin once "continue" is
// clicked.
function isSafeNavigationUrl(value) {
  try {
    const parsed = new URL(value, location.href)
    return parsed.protocol === 'http:' || parsed.protocol === 'https:'
  } catch {
    return false
  }
}

const url = isSafeNavigationUrl(rawUrl) ? rawUrl : ''

document.getElementById('url-display').textContent = url || '(unknown page)'
if (!url) document.getElementById('proceed-btn').disabled = true

document.getElementById('back-btn').addEventListener('click', () => {
  if (history.length > 1) history.back()
  else window.close()
})

document.getElementById('proceed-btn').addEventListener('click', async () => {
  if (!url) return
  const btn = document.getElementById('proceed-btn')
  btn.disabled = true
  btn.textContent = 'Opening…'

  try {
    await chrome.runtime.sendMessage({ type: 'BYPASS_URL', payload: { url } })
  } catch {
    // Service worker may already know; proceed regardless.
  }

  location.href = url
})
