// Lumeli marketing site — mockup scaling + gentle scroll reveals.

// Scale each fixed-width mockup stage to fit its responsive viewport.
const DESIGN_WIDTH = 880
for (const viewport of document.querySelectorAll('.mock-viewport')) {
  const stage = viewport.querySelector('.mock-stage')
  if (!stage) continue
  // A stage may declare its own design width via data-dw; denser views use a
  // wider canvas so the app's real px sizes stay in proportion.
  const dw = Number(viewport.dataset.dw) || DESIGN_WIDTH
  const scale = () => {
    stage.style.transform = `scale(${viewport.clientWidth / dw})`
  }
  scale()
  new ResizeObserver(scale).observe(viewport)
}

// Fade-up reveals — skipped entirely for reduced-motion users.
const fadeUps = document.querySelectorAll('.fade-up, .fade-in, .pop-in')
if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  fadeUps.forEach((el) => el.classList.add('in'))
} else {
  const observer = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (entry.isIntersecting) {
          entry.target.classList.add('in')
          observer.unobserve(entry.target)
        }
      }
    },
    { threshold: 0.15 }
  )
  fadeUps.forEach((el) => observer.observe(el))
}

// Copyright year stays current without an annual edit.
const yearEl = document.getElementById('copyright-year')
if (yearEl) yearEl.textContent = String(new Date().getFullYear())

// Storybook bird: scroll position drives the four-frame flip-book. The
// sequence runs as the bird rises through the lower half of the viewport
// and stops on the final frame.
const bird = document.querySelector('.why-bird')
if (bird && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  // Scroll only TRIGGERS the flip-book; playback runs on its own clock so
  // every frame gets its moment regardless of scroll speed.
  const FRAME_MS = 850
  const birdObserver = new IntersectionObserver(
    (entries) => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue
        birdObserver.disconnect()
        let frame = 0
        const tick = setInterval(() => {
          frame++
          bird.dataset.frame = String(frame)
          if (frame >= 3) clearInterval(tick)
        }, FRAME_MS)
      }
    },
    { threshold: 1 } // fully visible before the story begins
  )
  birdObserver.observe(bird)
} else if (bird) {
  bird.dataset.frame = '3'
}

// Before/After: pin the stage and crossfade the scenes with scroll.
const baWrap = document.querySelector('.beforeafter')
const baBlocks = baWrap ? baWrap.querySelectorAll('.ba-block') : []
if (baWrap && baBlocks.length === 2 && !window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
  baWrap.classList.add('enhanced')
  const baStage = baWrap.querySelector('.ba-sticky')
  let baProg = 0
  const baApply = () => {
    // captured scroll: 300px hold on Before, the dissolve, then a matching
    // 300px hold on After before the page releases
    const t = Math.min(1, Math.max(0, (baProg - 0.294) / 0.412))
    baBlocks[0].style.opacity = String(1 - t)
    baBlocks[1].style.opacity = String(t)
  }
  baApply()
  window.addEventListener(
    'wheel',
    (e) => {
      const rect = baStage.getBoundingClientRect()
      const anchor = Math.max(24, (window.innerHeight - rect.height) / 2)
      const down = e.deltaY > 0
      const engaged = down
        ? rect.top <= anchor + 40 && rect.bottom > 200 && baProg < 1
        : rect.top >= anchor - 40 && rect.top < window.innerHeight - 100 && baProg > 0
      if (!engaged) return
      e.preventDefault()
      // keep the stage glued to its resting spot while the dissolve runs
      if (Math.abs(rect.top - anchor) > 2) window.scrollBy(0, rect.top - anchor)
      baProg = Math.min(1, Math.max(0, baProg + e.deltaY / 1020))
      baApply()
    },
    { passive: false }
  )
  // touch devices have no wheel events — fall back to a position-driven fade
  if (window.matchMedia('(pointer: coarse)').matches) {
    const baTouchScroll = () => {
      const rect = baStage.getBoundingClientRect()
      const vh = window.innerHeight
      baProg = Math.min(1, Math.max(0, (vh * 0.7 - rect.top) / (vh * 0.4)))
      baApply()
    }
    baTouchScroll()
    window.addEventListener('scroll', baTouchScroll, { passive: true })
  }
}

// --- Early-access form + analytics beacon ---------------------------------
const API_BASE =
  location.protocol === 'file:' || location.hostname === 'localhost'
    ? 'http://localhost:3020'
    : ''

const ctaForm = document.querySelector('.cta-form')
if (ctaForm) {
  ctaForm.addEventListener('submit', async (event) => {
    event.preventDefault()
    const emailInput = ctaForm.querySelector('input[name="email"]')
    const button = ctaForm.querySelector('button[type="submit"]')
    let note = ctaForm.querySelector('.cta-note')
    if (!note) {
      note = document.createElement('p')
      note.className = 'cta-note'
      ctaForm.appendChild(note)
    }
    button.disabled = true
    try {
      const res = await fetch(`${API_BASE}/api/v1/signups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email: emailInput.value.trim(),
          website: ctaForm.querySelector('input[name="website"]')?.value || '',
        }),
      })
      if (!res.ok) throw new Error('bad status')
      ctaForm.querySelector('.cta-row').hidden = true
      note.textContent = 'Lovely \u2014 you\u2019re on the list. We\u2019ll be in touch soon.'
    } catch {
      note.textContent = 'Hmm, that didn\u2019t go through. Mind trying again in a moment?'
      button.disabled = false
    }
  })
}

// Cookieless visit beacon — one ping per page load, nothing identifying.
;(() => {
  const qs = new URLSearchParams(location.search)
  const body = JSON.stringify({
    path: location.pathname,
    referrer: document.referrer || '',
    utm_source: qs.get('utm_source') || '',
  })
  const url = `${API_BASE}/api/v1/visits`
  if (navigator.sendBeacon) {
    navigator.sendBeacon(url, new Blob([body], { type: 'application/json' }))
  } else {
    fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body, keepalive: true })
  }
})()
