// Lumeli marketing site — mockup scaling + gentle scroll reveals.

// Scale each fixed-880px mockup stage to fit its responsive viewport.
const DESIGN_WIDTH = 880
for (const viewport of document.querySelectorAll('.mock-viewport')) {
  const stage = viewport.querySelector('.mock-stage')
  if (!stage) continue
  const scale = () => {
    stage.style.transform = `scale(${viewport.clientWidth / DESIGN_WIDTH})`
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
  const setFrame = () => {
    const rect = bird.getBoundingClientRect()
    const vh = window.innerHeight
    // starts only once the bird is FULLY in view (bottom edge on screen),
    // then plays across the next ~30% of the viewport's scroll
    const progress = Math.min(1, Math.max(0, (vh - rect.bottom) / (vh * 0.3)))
    const frame = Math.min(3, Math.floor(progress * 4))
    if (bird.dataset.frame !== String(frame)) bird.dataset.frame = String(frame)
  }
  setFrame()
  window.addEventListener('scroll', setFrame, { passive: true })
  window.addEventListener('resize', setFrame, { passive: true })
} else if (bird) {
  bird.dataset.frame = '3'
}
