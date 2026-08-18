import type { MetadataRoute } from 'next';

const privatePaths = ['/dashboard/', '/api/', '/auth/', '/login', '/setup/', '/portal/', '/propuesta/', '/demo/'];

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      { userAgent: '*', allow: '/', disallow: privatePaths },
      { userAgent: ['GPTBot', 'ChatGPT-User', 'OAI-SearchBot', 'ClaudeBot', 'PerplexityBot'], allow: '/', disallow: privatePaths },
    ],
    sitemap: 'https://motil.app/sitemap.xml',
    host: 'https://motil.app',
  };
}
