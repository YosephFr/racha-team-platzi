import { defaultCache } from '@serwist/next/worker'
import { Serwist, NetworkOnly } from 'serwist'

const apiCacheOverride = [
  {
    matcher: ({ sameOrigin }) => !sameOrigin,
    handler: new NetworkOnly(),
  },
]

const serwist = new Serwist({
  precacheEntries: self.__SW_MANIFEST,
  skipWaiting: true,
  clientsClaim: true,
  navigationPreload: true,
  runtimeCaching: [...apiCacheOverride, ...defaultCache],
})

serwist.addEventListeners()
