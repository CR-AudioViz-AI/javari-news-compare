// app/page.tsx — javari-news-compare
// Javari News Compare — Media Analysis
// CR AudioViz AI · EIN 39-3646201 · May 2026
'use client'
import { useState, useRef } from 'react'

const getFeatures = () => [
  { e: '⚡', t: 'AI-Powered', d: 'Powered by Javari AI — the same engine behind all CR AudioViz AI apps' },
  { e: '🔐', t: 'Your Data', d: 'Everything you create belongs to you. No lock-in, no expiration.' },
  { e: '💳', t: '50 Free Credits', d: 'Start free. Credits never expire. Pay only for what you use.' },
  { e: '🔗', t: 'Ecosystem', d: 'One account connects to all 150+ Javari apps across the platform.' },
]

export default function Page() {
  const features = getFeatures()
  const [email, setEmail] = useState('')
  const inputRef = useRef(null)

  return (
    <div style={{ minHeight: '100vh', background: '#0a0a0f', color: '#e2e8f0', fontFamily: 'system-ui, sans-serif' }}>
      <div style={{ height: 60 }} />
      <section style={{ textAlign: 'center', padding: '64px 24px 40px', maxWidth: 700, margin: '0 auto' }}>
        <div style={{ fontSize: 56, marginBottom: 16 }}>🔍</div>
        <h1 style={{ fontSize: 'clamp(28px,4vw,44px)', fontWeight: 800, margin: '0 0 16px', letterSpacing: '-0.03em' }}>
          <span style={{ color: '#f59e0b' }}>Javari News Compare</span>
        </h1>
        <p style={{ fontSize: 18, color: '#9ca3af', maxWidth: 520, margin: '0 auto 32px', lineHeight: 1.65 }}>Compare how different outlets cover the same story — bias detection, source analysis.</p>
        <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
          <a href="https://craudiovizai.com/auth/signup"
            style={{ background: '#f59e0b', color: '#fff', borderRadius: 10, padding: '13px 28px', fontSize: 15, fontWeight: 700, textDecoration: 'none', display: 'inline-block' }}>
            Start Free →
          </a>
          <a href="https://craudiovizai.com"
            style={{ background: 'rgba(255,255,255,0.06)', color: '#e2e8f0', borderRadius: 10, padding: '13px 28px', fontSize: 15, fontWeight: 600, textDecoration: 'none', display: 'inline-block' }}>
            View Platform
          </a>
        </div>
      </section>
      <section style={{ maxWidth: 800, margin: '0 auto', padding: '0 20px 60px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(180px,1fr))', gap: 16 }}>
        {features.map(f => (
          <div key={f.t} style={{ background: '#111118', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 14, padding: '20px 16px' }}>
            <div style={{ fontSize: 28, marginBottom: 8 }}>{f.e}</div>
            <div style={{ fontWeight: 700, fontSize: 14, color: '#e2e8f0', marginBottom: 4 }}>{f.t}</div>
            <div style={{ fontSize: 13, color: '#6b7280', lineHeight: 1.5 }}>{f.d}</div>
          </div>
        ))}
      </section>
      <footer style={{ background: '#050609', borderTop: '1px solid rgba(255,255,255,0.04)', padding: '20px 24px', textAlign: 'center' }}>
        <p style={{ color: '#374151', fontSize: 11, margin: 0 }}>
          © 2026 CR AudioViz AI, LLC — EIN: 39-3646201 · Fort Myers, Florida ·
          <a href="https://craudiovizai.com/auth/signup" style={{ color: '#f59e0b', textDecoration: 'none', marginLeft: 4 }}>Sign Up Free</a>
        </p>
      </footer>
    </div>
  )
}
