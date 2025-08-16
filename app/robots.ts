import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/admin/', '/evaluation/'],
    },
    sitemap: 'https://oilpainting.app/sitemap.xml',
  }
}