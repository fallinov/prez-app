export default defineNuxtPlugin(() => {
  if (!import.meta.client) return

  const errors: string[] = []
  let overlay: HTMLDivElement | null = null

  function timestamp() {
    return new Date().toLocaleTimeString('fr-CH')
  }

  function addError(msg: string) {
    errors.push(`[${timestamp()}] ${msg}`)
    updateBadge()
  }

  // Badge flottant (nombre d'erreurs)
  let badge: HTMLDivElement | null = null

  function createBadge() {
    badge = document.createElement('div')
    badge.id = 'debug-badge'
    Object.assign(badge.style, {
      position: 'fixed',
      bottom: '12px',
      right: '12px',
      zIndex: '99999',
      background: '#dc2626',
      color: '#fff',
      borderRadius: '50%',
      width: '40px',
      height: '40px',
      display: 'none',
      alignItems: 'center',
      justifyContent: 'center',
      fontSize: '16px',
      fontWeight: 'bold',
      fontFamily: 'system-ui, sans-serif',
      cursor: 'pointer',
      boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
      userSelect: 'none',
      WebkitTapHighlightColor: 'transparent'
    })
    badge.addEventListener('click', toggleOverlay)
    document.body.appendChild(badge)
  }

  function updateBadge() {
    if (!badge) createBadge()
    if (badge && errors.length > 0) {
      badge.textContent = String(errors.length)
      badge.style.display = 'flex'
    }
  }

  function toggleOverlay() {
    if (overlay) {
      overlay.remove()
      overlay = null
      return
    }

    overlay = document.createElement('div')
    Object.assign(overlay.style, {
      position: 'fixed',
      inset: '0',
      zIndex: '100000',
      background: 'rgba(0,0,0,0.85)',
      color: '#f1f5f9',
      fontFamily: 'ui-monospace, monospace',
      fontSize: '13px',
      display: 'flex',
      flexDirection: 'column',
      padding: '12px',
      paddingTop: 'max(env(safe-area-inset-top, 12px), 12px)'
    })

    // Header
    const header = document.createElement('div')
    Object.assign(header.style, {
      display: 'flex',
      gap: '8px',
      marginBottom: '8px',
      flexShrink: '0'
    })

    const copyBtn = document.createElement('button')
    copyBtn.textContent = 'Copier'
    Object.assign(copyBtn.style, {
      flex: '1',
      padding: '10px',
      background: '#059669',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '15px',
      fontWeight: '600',
      cursor: 'pointer'
    })
    copyBtn.addEventListener('click', () => {
      navigator.clipboard.writeText(errors.join('\n')).then(() => {
        copyBtn.textContent = 'Copié !'
        setTimeout(() => { copyBtn.textContent = 'Copier' }, 1500)
      })
    })

    const clearBtn = document.createElement('button')
    clearBtn.textContent = 'Vider'
    Object.assign(clearBtn.style, {
      padding: '10px 16px',
      background: '#475569',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '15px',
      cursor: 'pointer'
    })
    clearBtn.addEventListener('click', () => {
      errors.length = 0
      updateBadge()
      if (badge) badge.style.display = 'none'
      if (overlay) { overlay.remove(); overlay = null }
    })

    const closeBtn = document.createElement('button')
    closeBtn.textContent = '✕'
    Object.assign(closeBtn.style, {
      padding: '10px 14px',
      background: '#334155',
      color: '#fff',
      border: 'none',
      borderRadius: '8px',
      fontSize: '15px',
      cursor: 'pointer'
    })
    closeBtn.addEventListener('click', toggleOverlay)

    header.append(copyBtn, clearBtn, closeBtn)

    // Error list
    const list = document.createElement('pre')
    list.textContent = errors.join('\n\n') || 'Aucune erreur'
    Object.assign(list.style, {
      flex: '1',
      overflow: 'auto',
      whiteSpace: 'pre-wrap',
      wordBreak: 'break-word',
      margin: '0',
      lineHeight: '1.5',
      WebkitOverflowScrolling: 'touch'
    })

    overlay.append(header, list)
    document.body.appendChild(overlay)
  }

  // Capture: window.onerror
  window.addEventListener('error', (e) => {
    addError(`ERROR: ${e.message}\n  at ${e.filename}:${e.lineno}:${e.colno}`)
  })

  // Capture: unhandled promise rejections
  window.addEventListener('unhandledrejection', (e) => {
    const reason = e.reason instanceof Error
      ? `${e.reason.message}\n  ${e.reason.stack?.split('\n')[1]?.trim() || ''}`
      : String(e.reason)
    addError(`PROMISE: ${reason}`)
  })

  // Capture: console.error
  const originalError = console.error
  console.error = (...args: any[]) => {
    addError(`console.error: ${args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')}`)
    originalError.apply(console, args)
  }

  // Capture: console.warn
  const originalWarn = console.warn
  console.warn = (...args: any[]) => {
    addError(`console.warn: ${args.map(a => typeof a === 'object' ? JSON.stringify(a, null, 2) : String(a)).join(' ')}`)
    originalWarn.apply(console, args)
  }
})
