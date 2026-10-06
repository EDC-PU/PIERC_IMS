import type { MetadataRoute } from 'next';

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: ['/', '/login', '/register'],
        disallow: ['/dashboard/', '/api/'],
      },
      {
        userAgent: ['GPTBot', 'ChatGPT-User', 'ClaudeBot', 'PerplexityBot', 'Google-Extended', 'Applebot-Extended'],
        allow: ['/', '/login', '/register'],
        disallow: ['/dashboard/', '/api/'],
      },
    ],
    sitemap: 'https://portal.pierc.org/sitemap.xml',
    host: 'https://portal.pierc.org',
  };
}
