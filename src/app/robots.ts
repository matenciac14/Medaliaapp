import type { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/coaches', '/p/', '/login', '/register', '/terminos', '/privacidad', '/llms.txt'],
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
      // AI crawlers — allow indexing for AI search (ChatGPT, Perplexity, Google AI Overviews)
      { userAgent: 'GPTBot', allow: ['/', '/coaches', '/p/'] },
      { userAgent: 'ChatGPT-User', allow: ['/', '/coaches', '/p/'] },
      { userAgent: 'PerplexityBot', allow: ['/', '/coaches', '/p/'] },
      { userAgent: 'Google-Extended', allow: ['/', '/coaches', '/p/'] },
      { userAgent: 'Amazonbot', allow: ['/', '/coaches', '/p/'] },
      { userAgent: 'anthropic-ai', allow: ['/', '/coaches', '/p/'] },
      { userAgent: 'ClaudeBot', allow: ['/', '/coaches', '/p/'] },
      { userAgent: 'cohere-ai', allow: ['/', '/coaches', '/p/'] },
    ],
    sitemap: 'https://medaliq.com/sitemap.xml',
  }
}
