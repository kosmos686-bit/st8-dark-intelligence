import type { Metadata, Viewport } from 'next'
import './globals.css'

export const metadata: Metadata = {
  title: 'ST8 Dark Intelligence',
  description: 'AI-операционная платформа для dark store сетей',
  manifest: '/manifest.json',
}

export const viewport: Viewport = {
  themeColor: '#0A0F1A',
  width: 'device-width',
  initialScale: 1,
}

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ru">
      <body>{children}</body>
    </html>
  )
}
