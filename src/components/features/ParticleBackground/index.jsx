import { useMemo } from 'react'
import './ParticleBackground.css'

const PARTICLE_COUNT = 22

/**
 * ParticleBackground
 *
 * Ambient floating diamond particles rendered in the app body,
 * behind the ContactsPanel card. Sits at z-index: 0; the sidebar
 * card (rendered after this in DOM order) naturally paints on top.
 *
 * All movement is CSS @keyframes — no canvas, no JS loop.
 * Values are generated once via useMemo (empty deps) so the array
 * never re-generates on re-renders.
 *
 * Color follows --color-neon-cyan automatically → theme-aware.
 */
function ParticleBackground() {
  const particles = useMemo(() => {
    return Array.from({ length: PARTICLE_COUNT }, (_, id) => {
      const size     = Math.random() * 8 + 6            // 6–14 px  (bigger)
      const left     = Math.random() * 100              // 0–100 %
      const duration = Math.random() * 14 + 15          // 15–29 s  (slower)
      // Negative delay staggers particles: they start at random points mid-flight
      const delay    = -(Math.random() * duration)

      // Visibility scales with size: 6 px → 15 %, 14 px → 35 %
      const mixPercent = Math.round(15 + ((size - 6) / 8) * 20)

      // Blur only on the smaller end of the new range (≤ 9 px)
      const blur = size <= 9

      return { id, size, left, duration, delay, mixPercent, blur }
    })
  }, [])

  return (
    <div className="particle-bg" aria-hidden="true">
      {particles.map((p) => (
        <span
          key={p.id}
          className="particle"
          style={{
            width:              `${p.size}px`,
            height:             `${p.size}px`,
            left:               `${p.left}%`,
            animationDuration:  `${p.duration}s`,
            animationDelay:     `${p.delay}s`,
            background: `color-mix(in oklch, var(--color-neon-cyan) ${p.mixPercent}%, transparent)`,
            ...(p.blur && { filter: 'blur(1px)' }),
          }}
        />
      ))}
    </div>
  )
}

export default ParticleBackground
