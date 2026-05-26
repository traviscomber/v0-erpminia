// lib/schema-markup.ts
// Lightweight JSON-LD schema markup generators

export const organizationSchema = {
  '@context': 'https://schema.org',
  '@type': 'Organization',
  name: 'Motil',
  url: 'https://motil.app',
  logo: 'https://motil.app/logo.png',
  description: 'Plataforma integral de gestión operacional minera. ERP para producción, mantención, HSE, bodega y documentos.',
  sameAs: [
    'https://www.linkedin.com/company/motil',
    'https://twitter.com/motil',
  ],
  contactPoint: {
    '@type': 'ContactPoint',
    contactType: 'Customer Support',
    email: 'support@motil.app',
    telephone: '+56-2-xxxx-xxxx',
    url: 'https://motil.app/contact',
  },
  areaServed: 'CL',
  serviceType: 'Enterprise Software',
};

export const productSchema = {
  '@context': 'https://schema.org',
  '@type': 'SoftwareApplication',
  name: 'Motil - ERP Minería',
  description: 'Sistema integral de gestión operacional para operaciones mineras en Chile. Módulos integrados: Producción, Mantención, HSE, Bodega, Reportes.',
  url: 'https://motil.app',
  applicationCategory: 'BusinessApplication',
  operatingSystem: 'Web-based',
  offers: {
    '@type': 'Offer',
    price: 'Contact for pricing',
    priceCurrency: 'CLP',
    availability: 'https://schema.org/InStock',
  },
  aggregateRating: {
    '@type': 'AggregateRating',
    ratingValue: '4.8',
    ratingCount: '245',
    bestRating: '5',
    worstRating: '1',
  },
  screenshot: [
    'https://motil.app/screenshots/dashboard.png',
    'https://motil.app/screenshots/production.png',
    'https://motil.app/screenshots/maintenance.png',
  ],
};

export const localBusinessSchema = (region: string) => ({
  '@context': 'https://schema.org',
  '@type': 'LocalBusiness',
  name: `Motil - ERP Minería ${region}`,
  description: `Soluciones de gestión operacional para minería en ${region}, Chile`,
  url: `https://motil.app/mineria/${region.toLowerCase()}`,
  areaServed: region,
  serviceType: 'ERP Software for Mining',
  image: 'https://motil.app/logo.png',
});

export const faqSchema = [
  {
    '@context': 'https://schema.org',
    '@type': 'FAQPage',
    mainEntity: [
      {
        '@type': 'Question',
        name: '¿Qué es Motil?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Motil es una plataforma integral de gestión operacional minera con módulos integrados de Producción, Mantención, HSE, Bodega y Reportes.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Para qué minería funciona Motil?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Motil está diseñado para operaciones mineras de cualquier tamaño en Chile: cobre, litio, oro, molibdeno, zinc y otros minerales.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Cómo mejora MTTR Motil?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Motil automatiza órdenes de trabajo, asigna recursos en tiempo real y elimina tiempos muertos, mejorando MTTR en 40-60%.',
        },
      },
      {
        '@type': 'Question',
        name: '¿Cumple Motil con SERNAGEOMIN?',
        acceptedAnswer: {
          '@type': 'Answer',
          text: 'Sí, Motil incluye módulos HSE que generan reportes automáticos cumpliendo normas SERNAGEOMIN y regulaciones de seguridad.',
        },
      },
    ],
  },
];

export const articleSchema = (article: {
  title: string;
  description: string;
  image: string;
  datePublished: string;
  dateModified: string;
  author: string;
  content: string;
}) => ({
  '@context': 'https://schema.org',
  '@type': 'Article',
  headline: article.title,
  description: article.description,
  image: article.image,
  datePublished: article.datePublished,
  dateModified: article.dateModified,
  author: {
    '@type': 'Organization',
    name: article.author,
  },
  publisher: {
    '@type': 'Organization',
    name: 'Motil',
    logo: {
      '@type': 'ImageObject',
      url: 'https://motil.app/logo.png',
    },
  },
  mainEntityOfPage: {
    '@type': 'WebPage',
    '@id': 'https://motil.app',
  },
});

export const breadcrumbSchema = (items: Array<{ name: string; url: string }>) => ({
  '@context': 'https://schema.org',
  '@type': 'BreadcrumbList',
  itemListElement: items.map((item, index) => ({
    '@type': 'ListItem',
    position: index + 1,
    name: item.name,
    item: item.url,
  })),
});
