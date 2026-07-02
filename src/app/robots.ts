import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/coaches', '/p/', '/login', '/register', '/terminos', '/privacidad'],
        disallow: [
          '/api/',
          '/admin/',
          '/coach/',
          '/dashboard/',
          '/plan/',
          '/log/',
          '/checkin/',
          '/nutrition/',
          '/progress/',
          '/gym/',
          '/onboarding/',
          '/pending/',
          '/select-role/',
        ],
      },
    ],
    sitemap: 'https://medaliq.com/sitemap.xml',
  }
}
