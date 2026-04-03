export default function manifest() {
  return {
    name: 'Racha Team Platzi',
    short_name: 'Racha',
    description: 'Mantene tu racha de estudio en Platzi con tu equipo',
    start_url: '/',
    display: 'standalone',
    background_color: '#ffffff',
    theme_color: '#0ae98a',
    orientation: 'portrait-primary',
    categories: ['education', 'productivity'],
    lang: 'es',
    icons: [
      { src: '/icons/icon-192.png', sizes: '192x192', type: 'image/png', purpose: 'any maskable' },
      { src: '/icons/icon-512.png', sizes: '512x512', type: 'image/png', purpose: 'any maskable' },
    ],
  }
}
