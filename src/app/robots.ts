import { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: '*',
      allow: '/',
      disallow: ['/api/', '/dashboard/', '/patients/'], // Protect private clinical routes from indexers
    },
    sitemap: 'https://qurosystems.com/sitemap.xml',
  };
}
