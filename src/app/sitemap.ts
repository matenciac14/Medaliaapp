import type { MetadataRoute } from 'next'
import { prisma } from '@/lib/db/prisma'

const BASE_URL = 'https://medaliq.com'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const staticPages: MetadataRoute.Sitemap = [
    { url: BASE_URL,                    lastModified: new Date(), changeFrequency: 'weekly',  priority: 1.0 },
    { url: `${BASE_URL}/coaches`,       lastModified: new Date(), changeFrequency: 'daily',   priority: 0.8 },
    { url: `${BASE_URL}/login`,         lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/register`,      lastModified: new Date(), changeFrequency: 'monthly', priority: 0.5 },
    { url: `${BASE_URL}/terminos`,      lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.2 },
    { url: `${BASE_URL}/privacidad`,    lastModified: new Date(), changeFrequency: 'yearly',  priority: 0.2 },
  ]

  let coachPages: MetadataRoute.Sitemap = []
  try {
    const profiles = await prisma.coachProfile.findMany({
      select: { slug: true, updatedAt: true },
      where: { slug: { not: '' } },
    })
    coachPages = profiles.map((p) => ({
      url: `${BASE_URL}/p/${p.slug}`,
      lastModified: p.updatedAt,
      changeFrequency: 'weekly' as const,
      priority: 0.7,
    }))
  } catch {
    // Si hay error de DB en build time, continuar sin páginas dinámicas
  }

  return [...staticPages, ...coachPages]
}
