import type { MetadataRoute } from 'next'

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://mobilematch.dz'
  const now = new Date()

  return [
    { url: base,              lastModified: now, changeFrequency: 'daily',   priority: 1.0 },
    { url: `${base}/compare`, lastModified: now, changeFrequency: 'daily',   priority: 0.9 },
    { url: `${base}/recommend`, lastModified: now, changeFrequency: 'weekly', priority: 0.8 },
    { url: `${base}/saved`,   lastModified: now, changeFrequency: 'weekly',  priority: 0.6 },
    { url: `${base}/about`,   lastModified: now, changeFrequency: 'monthly', priority: 0.5 },
    { url: `${base}/login`,   lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
    { url: `${base}/register`,lastModified: now, changeFrequency: 'monthly', priority: 0.4 },
  ]
}
