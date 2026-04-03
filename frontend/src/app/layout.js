import { Plus_Jakarta_Sans } from 'next/font/google'
import { AuthProvider } from '@/lib/auth'
import './globals.css'

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  variable: '--font-sans',
  display: 'swap',
})

export const metadata = {
  title: 'Racha Team Platzi',
  description: 'Mantene tu racha de estudio en Platzi con tu equipo',
  appleWebApp: {
    capable: true,
    statusBarStyle: 'default',
    title: 'Racha',
  },
  formatDetection: { telephone: false },
}

export const viewport = {
  width: 'device-width',
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: 'cover',
  themeColor: '#fafbf8',
}

export default function RootLayout({ children }) {
  return (
    <html lang="es" className={jakarta.variable}>
      <head>
        <link rel="apple-touch-icon" href="/icons/icon-192.png" />
      </head>
      <body className="bg-background text-foreground font-sans">
        <AuthProvider>{children}</AuthProvider>
      </body>
    </html>
  )
}
