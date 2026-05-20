// app/layout.tsx — javari-news-compare
// CR AudioViz AI · EIN 39-3646201 · May 2026
import type { Metadata } from 'next'
export const dynamic = 'force-dynamic'
export const metadata: Metadata = {
  title: 'Javari News Compare',
  description: 'Compare how different outlets cover the same story — bias detection, source analysis.',
  openGraph: { title: 'Javari News Compare', description: 'Compare how different outlets cover the same story — bias detection, source analysis.', type: 'website' },
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <body style={{ margin: 0, padding: 0, fontFamily: 'system-ui,sans-serif', background: '#0a0a0f' }}>
        <div style={{ background: 'rgba(0,0,0,0.8)', padding: '0 20px', height: 60, display: 'flex', alignItems: 'center', justifyContent: 'space-between', position: 'fixed', top: 0, left: 0, right: 0, zIndex: 100 }}>
          <a href="https://craudiovizai.com" style={{ color: '#fff', textDecoration: 'none', fontWeight: 700, fontSize: 14, display: 'flex', alignItems: 'center', gap: 8 }}>
            <span>🔍</span>
            <span style={{ color: '#f59e0b' }}>Javari News Compare</span>
            <span style={{ color: '#374151', fontSize: 11 }}>· CR AudioViz AI · EIN 39-3646201</span>
          </a>
          <a href="https://craudiovizai.com/auth/signup" style={{ background: '#f59e0b', color: '#fff', borderRadius: 7, padding: '6px 16px', fontSize: 12, fontWeight: 700, textDecoration: 'none' }}>Start Free →</a>
        </div>
        {children}
      </body>
    </html>
  )
}
