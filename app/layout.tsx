import './globals.css'
import type { Metadata } from 'next'
export const metadata: Metadata = {
  title: 'ThunderPost',
  description: 'Local-first, login-free Thunder/Postman style client',
  manifest: '/manifest.webmanifest',
  themeColor: '#0EA5E9',
}
export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (<html lang="es"><body>{children}</body></html>)
}
