// MV3 extension pages enforce a default CSP of "script-src 'self'", which
// blocks inline <script> tags. This must stay an external file (not inlined
// back into blocked.html) or this handler silently stops running.

const params = new URLSearchParams(location.search)
const url = params.get('url') || ''

document.getElementById('url-display').textContent = url || '(unknown page)'

document.getElementById('back-btn').addEventListener('click', () => {
  if (history.length > 1) history.back()
  else window.close()
})
