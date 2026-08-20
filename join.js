// Founding Members signup flow: a guided, one-question-at-a-time application
// with a live "spots remaining" counter and a numbered member-card payoff.
;(() => {
  // Same env detection as the homepage: dev/file:// talks to the local Rails,
  // production is same-origin behind nginx.
  const API_BASE =
    location.protocol === 'file:' || location.hostname === 'localhost'
      ? 'http://localhost:3020'
      : ''
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches
  const isEmail = (v) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v)

  const beats = Array.from(document.querySelectorAll('.join-beat'))
  const beatByName = (n) => document.querySelector(`.join-beat[data-beat="${n}"]`)
  const flowOrder = ['invite', 'benefits', 'apply']
  const mainEl = document.querySelector('main.join')

  // Gallery-style transition: the outgoing panel slides out and fades while the
  // incoming one slides in from the opposite side, and the container's height
  // eases between the two so nothing jumps. Falls back to an instant swap when
  // motion is reduced or the Web Animations API isn't available.
  function swap(container, outEl, inEl, forward, after) {
    const canAnimate = !reduce && container && outEl && typeof outEl.animate === 'function'
    if (!canAnimate) {
      if (outEl) outEl.hidden = true
      inEl.hidden = false
      if (after) after()
      return
    }
    const dur = 560
    const base = { duration: dur, fill: 'forwards' }
    const startH = container.offsetHeight
    inEl.hidden = false
    const endH = inEl.offsetHeight // measured before we lift both out of flow
    container.style.position = 'relative'
    container.style.overflow = 'hidden'
    container.style.height = startH + 'px'
    const stack = (el) => {
      el.style.position = 'absolute'
      el.style.top = '0'
      el.style.left = '0'
      el.style.width = '100%'
    }
    stack(outEl)
    stack(inEl)
    const sign = forward ? 1 : -1
    const anims = [
      // Outgoing: drift slightly the "wrong" way (anticipation), settle, then
      // accelerate off to the opposite side while fading out.
      outEl.animate([
        { transform: 'translateX(0)', opacity: 1, offset: 0, easing: 'cubic-bezier(0.34, 0, 0.2, 1)' },
        { transform: `translateX(${sign * 15}px)`, opacity: 1, offset: 0.32, easing: 'cubic-bezier(0.55, 0, 0.3, 1)' },
        { transform: `translateX(${-sign * 66}px)`, opacity: 0, offset: 1 }
      ], base),
      // Incoming: hold a beat while the outgoing anticipates, then glide in and fade up.
      inEl.animate([
        { transform: `translateX(${sign * 42}px)`, opacity: 0, offset: 0 },
        { transform: `translateX(${sign * 42}px)`, opacity: 0, offset: 0.34, easing: 'cubic-bezier(0.21, 0.68, 0.32, 1)' },
        { transform: 'translateX(0)', opacity: 1, offset: 1 }
      ], base),
      container.animate([{ height: startH + 'px' }, { height: endH + 'px' }],
        { duration: dur, fill: 'forwards', easing: 'cubic-bezier(0.5, 0, 0.2, 1)' })
    ]
    Promise.all(anims.map((a) => a.finished)).then(() => {
      anims.forEach((a) => a.cancel())
      outEl.hidden = true
      for (const el of [outEl, inEl]) {
        el.style.position = el.style.top = el.style.left = el.style.width = ''
      }
      container.style.position = container.style.overflow = container.style.height = ''
      if (after) after()
    })
  }

  // Show one beat, sliding the current one out and the next one in.
  function showBeat(name, forward = true) {
    const target = beatByName(name)
    const current = beats.find((b) => !b.hidden)
    if (!target || target === current) return
    target.classList.add('is-active')
    if (current) current.classList.remove('is-active')
    window.scrollTo({ top: 0, behavior: reduce ? 'auto' : 'smooth' })
    swap(mainEl, current, target, forward)
  }

  document.querySelectorAll('[data-next]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const i = flowOrder.indexOf(btn.closest('.join-beat').dataset.beat)
      if (i >= 0 && i < flowOrder.length - 1) showBeat(flowOrder[i + 1], true)
    })
  )
  document.querySelectorAll('[data-prev]').forEach((btn) =>
    btn.addEventListener('click', () => {
      const i = flowOrder.indexOf(btn.closest('.join-beat').dataset.beat)
      if (i > 0) showBeat(flowOrder[i - 1], false)
    })
  )

  // ── Application: one step at a time ──────────────────────────
  const form = document.querySelector('.join-form')
  const steps = form ? Array.from(form.querySelectorAll('.join-step')) : []
  const progress = document.querySelector('[data-progress]')
  let stepIdx = 0

  function renderProgress() {
    if (!progress) return
    progress.innerHTML = steps
      .map((_, i) => `<span class="join-dot${i <= stepIdx ? ' is-on' : ''}"></span>`)
      .join('')
  }

  function showStep(i, forward = true) {
    const current = steps[stepIdx]
    const target = steps[i]
    if (!target) return
    stepIdx = i
    renderProgress()
    const focusIn = () =>
      setTimeout(() => target.querySelector('input, textarea')?.focus(), reduce ? 0 : 40)
    // Initial render (or no actual move): just show the step, no transition.
    if (!current || current === target || current.hidden) {
      steps.forEach((s, idx) => {
        s.hidden = idx !== i
        s.classList.toggle('is-active', idx === i)
      })
      focusIn()
      return
    }
    target.classList.add('is-active')
    current.classList.remove('is-active')
    swap(form, current, target, forward, focusIn)
  }

  function validateStep(step) {
    const field = step.querySelector('input, textarea')
    const err = step.querySelector('.join-error')
    const val = (field?.value || '').trim()
    let msg = ''
    if (field?.name === 'name' && !val) msg = 'A name (or nickname) helps us say hi.'
    else if (field?.name === 'email') {
      if (!val) msg = "We'll need the Gmail you'd connect."
      else if (!isEmail(val)) msg = "That doesn't look like an email address."
    } else if (field?.name === 'reason' && !val) msg = 'A sentence or two is all we need.'
    if (err) {
      err.textContent = msg
      err.hidden = !msg
    }
    return !msg
  }

  form?.querySelectorAll('[data-step-next]').forEach((btn) =>
    btn.addEventListener('click', () => {
      if (validateStep(steps[stepIdx])) showStep(stepIdx + 1, true)
    })
  )

  // Back: step within the form, or out to the benefits beat from the first step.
  form?.querySelectorAll('[data-step-back]').forEach((btn) =>
    btn.addEventListener('click', () => {
      if (stepIdx === 0) showBeat('benefits', false)
      else showStep(stepIdx - 1, false)
    })
  )

  // Enter advances a step; inside the textarea it stays a newline.
  form?.addEventListener('keydown', (e) => {
    if (e.key !== 'Enter') return
    const field = steps[stepIdx]?.querySelector('input, textarea')
    if (field?.tagName === 'TEXTAREA') return
    e.preventDefault()
    if (stepIdx === steps.length - 1) form.requestSubmit()
    else if (validateStep(steps[stepIdx])) showStep(stepIdx + 1)
  })

  form?.addEventListener('submit', async (e) => {
    e.preventDefault()
    if (!validateStep(steps[stepIdx])) return
    const btn = form.querySelector('[data-submit]')
    if (btn) btn.disabled = true
    const d = new FormData(form)
    const get = (k) => (d.get(k) || '').toString().trim()
    // "What do you use today" is a checklist + an optional free-text other.
    const tools = d.getAll('tool').map(String)
    const other = get('current_tool_other')
    if (other) tools.push(other)
    try {
      const res = await fetch(`${API_BASE}/api/v1/signups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: get('name'),
          email: get('email'),
          current_tool: tools.join(', '),
          reason: get('reason'),
          founding: true,
          website: (d.get('website') || '').toString()
        })
      })
      const body = await res.json().catch(() => ({}))
      if (!res.ok || !body.ok) throw new Error('bad')
      revealCard(body.number, get('name'))
    } catch {
      const err = steps[stepIdx].querySelector('.join-error')
      if (err) {
        err.textContent = 'Something went wrong sending that. Mind trying again?'
        err.hidden = false
      }
      if (btn) btn.disabled = false
    }
  })

  function revealCard(number, name) {
    const numEl = document.querySelector('[data-number]')
    const nameEl = document.querySelector('[data-card-name]')
    if (numEl) numEl.textContent = number ? `№ ${String(number).padStart(3, '0')}` : 'Founding Member'
    if (nameEl) nameEl.textContent = name || ''
    showBeat('done')
    const card = document.querySelector('[data-card]')
    if (card) {
      card.classList.remove('is-stamped')
      if (reduce) card.classList.add('is-stamped')
      else requestAnimationFrame(() => requestAnimationFrame(() => card.classList.add('is-stamped')))
    }
  }

  // ── Live counter + full-house gate ───────────────────────────
  const counterEl = document.querySelector('[data-counter]')
  async function loadCounter() {
    try {
      const res = await fetch(`${API_BASE}/api/v1/signups_count`)
      const { remaining, cap } = await res.json()
      if (typeof remaining !== 'number') throw new Error('shape')
      if (remaining <= 0) {
        showBeat('full')
      } else if (counterEl) {
        counterEl.textContent = `${remaining} of ${cap} founding spots left`
        counterEl.classList.add('is-live')
      }
    } catch {
      if (counterEl) counterEl.textContent = 'Limited founding spots'
    }
  }

  // ── Full-house waitlist (email only) ─────────────────────────
  const waitForm = document.querySelector('.join-waitlist')
  waitForm?.addEventListener('submit', async (e) => {
    e.preventDefault()
    const btn = waitForm.querySelector('button[type="submit"]')
    const err = waitForm.querySelector('.join-error')
    const email = (waitForm.querySelector('input[name="email"]')?.value || '').trim()
    if (!isEmail(email)) {
      if (err) {
        err.textContent = 'Please enter a valid email.'
        err.hidden = false
      }
      return
    }
    if (btn) btn.disabled = true
    try {
      const res = await fetch(`${API_BASE}/api/v1/signups`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          email,
          founding: false,
          website: waitForm.querySelector('input[name="website"]')?.value || ''
        })
      })
      if (!res.ok) throw new Error('bad')
      waitForm.innerHTML = "<p class=\"cta-note\">Lovely — we'll be in touch the moment a spot opens.</p>"
    } catch {
      if (err) {
        err.textContent = "Hmm, that didn't go through. Try again in a moment?"
        err.hidden = false
      }
      if (btn) btn.disabled = false
    }
  })

  // ── Share the invite (last step) ─────────────────────────────
  const copyBtn = document.querySelector('[data-share-copy]')
  const shareInput = document.querySelector('[data-share-link]')
  copyBtn?.addEventListener('click', async () => {
    const url = shareInput?.value || 'https://www.lumeli.ai/join'
    // Prefer the native share sheet on touch devices; copy elsewhere.
    if (navigator.share && matchMedia('(pointer: coarse)').matches) {
      try {
        await navigator.share({ title: 'Lumeli', text: 'Calm productivity for macOS', url })
        return
      } catch {
        /* user dismissed — fall through to copy */
      }
    }
    try {
      await navigator.clipboard.writeText(url)
      const original = copyBtn.textContent
      copyBtn.textContent = 'Copied!'
      setTimeout(() => {
        copyBtn.textContent = original
      }, 1800)
    } catch {
      shareInput?.select() // fallback: select so the user can copy manually
    }
  })

  // Footer year
  const yearEl = document.getElementById('copyright-year')
  if (yearEl) yearEl.textContent = String(new Date().getFullYear())

  showStep(0)
  loadCounter()
})()
