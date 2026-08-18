import type { MetadataRoute } from 'next';

export default function sitemap(): MetadataRoute.Sitemap {
  const base = 'https://motil.app';
  const now = new Date();
  const moduleSlugs = ['produccion', 'mantenimiento', 'inventario', 'compras', 'finanzas', 'rrhh', 'sostenibilidad', 'legal'];

  return [
    { url: base, lastModified: now, changeFrequency: 'weekly', priority: 1 },
    { url: `${base}/mineria-chile`, lastModified: now, changeFrequency: 'monthly', priority: 0.9 },
    ...moduleSlugs.map((slug) => ({
      url: `${base}/modulos/${slug}`,
      lastModified: now,
      changeFrequency: 'monthly' as const,
      priority: 0.8,
    })),
  ];
}
