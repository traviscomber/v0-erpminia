import { MetadataRoute } from 'next';

// Lightweight sitemap generator - no database queries needed
export default function sitemap(): MetadataRoute.Sitemap {
  const baseUrl = 'https://motil.app';
  const currentDate = new Date().toISOString().split('T')[0];

  // Public pages (crawlable, no auth required)
  const publicPages = [
    {
      url: baseUrl,
      lastModified: currentDate,
      changeFrequency: 'daily' as const,
      priority: 1.0,
    },
    {
      url: `${baseUrl}/pricing`,
      lastModified: currentDate,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/features`,
      lastModified: currentDate,
      changeFrequency: 'weekly' as const,
      priority: 0.9,
    },
    {
      url: `${baseUrl}/about`,
      lastModified: currentDate,
      changeFrequency: 'monthly' as const,
      priority: 0.7,
    },
    {
      url: `${baseUrl}/blog`,
      lastModified: currentDate,
      changeFrequency: 'daily' as const,
      priority: 0.8,
    },
    {
      url: `${baseUrl}/contact`,
      lastModified: currentDate,
      changeFrequency: 'monthly' as const,
      priority: 0.6,
    },
  ];

  // Money pages for mining industry (SEO optimized)
  const moneyPages = [
    { slug: 'erp-mineria-chile', name: 'ERP Minería Chile', priority: 1.0 },
    { slug: 'software-produccion-minera', name: 'Software Producción', priority: 0.95 },
    { slug: 'mantenimiento-equipos-mineros', name: 'Mantención Equipos', priority: 0.95 },
    { slug: 'hse-compliance-mineria', name: 'HSE Compliance', priority: 0.9 },
    { slug: 'bodega-inventario-minera', name: 'Bodega Inventario', priority: 0.9 },
    { slug: 'reportes-operacionales', name: 'Reportes Operacionales', priority: 0.85 },
  ];

  const moneyPageUrls = moneyPages.map((page) => ({
    url: `${baseUrl}/${page.slug}`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: page.priority,
  }));

  // Regional pages (Chile mining regions)
  const regions = [
    'antofagasta',
    'atacama',
    'coquimbo',
    'valparaiso',
    'metropolitana',
    'ohiggins',
    'maule',
    'biobio',
    'araucania',
    'los-lagos',
    'aysen',
    'magallanes',
    'arica-parinacota',
    'tarapaca',
    'los-rios',
  ];

  const regionalUrls = regions.map((region) => ({
    url: `${baseUrl}/mineria/${region}`,
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.75,
  }));

  // Industry verticals
  const verticals = [
    'cobre',
    'litio',
    'oro',
    'molibdeno',
    'zinc',
    'estano',
    'exploracion',
    'procesamiento',
    'exportacion',
    'ambiental',
  ];

  const verticalUrls = verticals.map((vertical) => ({
    url: `${baseUrl}/industrias/${vertical}`,
    lastModified: currentDate,
    changeFrequency: 'monthly' as const,
    priority: 0.8,
  }));

  // Blog categories (lightweight - just category pages, not individual posts yet)
  const blogCategories = [
    'mttr-optimization',
    'hse-compliance',
    'equipment-management',
    'sernageomin',
    'case-studies',
    'industry-news',
  ];

  const blogUrls = blogCategories.map((category) => ({
    url: `${baseUrl}/blog/categoria/${category}`,
    lastModified: currentDate,
    changeFrequency: 'weekly' as const,
    priority: 0.7,
  }));

  // Combine all URLs
  return [...publicPages, ...moneyPageUrls, ...regionalUrls, ...verticalUrls, ...blogUrls];
}
