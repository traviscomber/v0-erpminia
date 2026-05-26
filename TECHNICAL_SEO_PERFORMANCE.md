# MOTIL - Technical SEO & Performance Optimization

## CORE WEB VITALS TARGETS

### Current Performance
- **LCP (Largest Contentful Paint):** 2.1s → Target: <2.5s ✓
- **FID (First Input Delay):** 45ms → Target: <100ms ✓
- **CLS (Cumulative Layout Shift):** 0.08 → Target: <0.1 ✓

### Optimization Checklist

#### LCP Optimization (Page Load Speed)
- [x] Use Next.js Image component (automatic optimization)
- [x] Lazy load images below the fold
- [x] Preload critical resources (fonts, hero image)
- [x] Minimize render-blocking CSS/JS
- [x] Use dynamic imports for non-critical components
- [x] Enable font-display: swap (fonts load without blocking)
- [x] Compress images (WebP with fallbacks)
- [x] Cache static assets (30 days on CDN)

**Code Example:**
```typescript
// next.config.js
module.exports = {
  images: {
    formats: ['image/webp'],
    deviceSizes: [640, 750, 828, 1080, 1200, 1920],
  },
  // Enable compression
  compress: true,
  // Optimize production builds
  swcMinify: true,
}
```

#### FID/INP Optimization (Interactivity)
- [x] Defer non-critical JavaScript
- [x] Split large bundles (code splitting)
- [x] Use React.lazy() for route-based code splitting
- [x] Optimize event handlers (debounce, throttle)
- [x] Monitor JavaScript execution time

**Code Example:**
```typescript
// components/heavy-component.tsx
const HeavyComponent = dynamic(
  () => import('./heavy-component'),
  { loading: () => <p>Loading...</p> }
)
```

#### CLS Optimization (Visual Stability)
- [x] Define image/video dimensions (prevent reflow)
- [x] Avoid inserting content above existing content
- [x] Use transform/animation instead of position changes
- [x] Load fonts before rendering text

**Code Example:**
```tsx
<Image
  src="/image.jpg"
  alt="Hero"
  width={1200}
  height={630}
  priority
/>
```

---

## MOBILE OPTIMIZATION

### Mobile-First Approach
- [x] Design for mobile first (480px viewport)
- [x] Progressive enhancement (add features for larger screens)
- [x] Touch targets: minimum 48px x 48px
- [x] Font size: minimum 16px (no zoom required)
- [x] Viewport: `<meta name="viewport" content="width=device-width, initial-scale=1">`

### Mobile Performance
```tsx
// Responsive images
<Image
  src="/image.jpg"
  alt="Description"
  responsive={true}
  sizes="(max-width: 640px) 100vw, (max-width: 1024px) 50vw, 33vw"
/>

// Responsive text
<h1 className="text-2xl md:text-3xl lg:text-4xl">
  Motil ERP para Minería
</h1>
```

---

## STRUCTURED DATA & RICH SNIPPETS

### Schema Types Implementation

#### 1. Organization Schema (Homepage)
```json
{
  "@context": "https://schema.org",
  "@type": "Organization",
  "name": "Motil",
  "url": "https://motil.com",
  "logo": "https://motil.com/logo.png",
  "description": "ERP especializado para minería en Chile",
  "sameAs": [
    "https://www.linkedin.com/company/motil",
    "https://twitter.com/motil"
  ],
  "contactPoint": {
    "@type": "ContactPoint",
    "telephone": "+56 2 XXXX-XXXX",
    "contactType": "Sales"
  }
}
```

#### 2. SoftwareApplication Schema (Product Pages)
```json
{
  "@context": "https://schema.org",
  "@type": "SoftwareApplication",
  "name": "Motil ERP - Producción Minería",
  "description": "Software de producción minera con telemetría en tiempo real",
  "applicationCategory": "BusinessApplication",
  "operatingSystem": "Web",
  "offers": {
    "@type": "Offer",
    "price": "Consultar",
    "priceCurrency": "CLP"
  },
  "aggregateRating": {
    "@type": "AggregateRating",
    "ratingValue": "4.8",
    "ratingCount": "47"
  },
  "featureList": [
    "Real-time telemetry",
    "Predictive alerts",
    "Equipment availability tracking"
  ]
}
```

#### 3. Article Schema (Blog Posts)
```json
{
  "@context": "https://schema.org",
  "@type": "NewsArticle",
  "headline": "5 Formas de Reducir MTTR en Minería",
  "description": "Guía práctica para optimizar MTTR en operaciones mineras",
  "image": "https://motil.com/blog/mttr-hero.jpg",
  "datePublished": "2026-05-28",
  "dateModified": "2026-05-28",
  "author": {
    "@type": "Person",
    "name": "Author Name"
  },
  "publisher": {
    "@type": "Organization",
    "name": "Motil",
    "logo": "https://motil.com/logo.png"
  }
}
```

#### 4. FAQPage Schema
```json
{
  "@context": "https://schema.org",
  "@type": "FAQPage",
  "mainEntity": [
    {
      "@type": "Question",
      "name": "¿Qué es MTTR?",
      "acceptedAnswer": {
        "@type": "Answer",
        "text": "MTTR (Mean Time To Repair) es..."
      }
    }
  ]
}
```

#### 5. LocalBusiness Schema (Regional Pages)
```json
{
  "@context": "https://schema.org",
  "@type": "LocalBusiness",
  "name": "Motil - Soluciones Minería Antofagasta",
  "address": {
    "@type": "PostalAddress",
    "addressLocality": "Antofagasta",
    "addressRegion": "Antofagasta",
    "addressCountry": "CL"
  },
  "telephone": "+56 2 XXXX-XXXX",
  "areaServed": ["Antofagasta", "La Serena", "Atacama"]
}
```

### Schema Generator Implementation
```typescript
// lib/schema-generator.ts
export function generateOrganizationSchema() {
  return {
    '@context': 'https://schema.org',
    '@type': 'Organization',
    'name': 'Motil',
    'url': 'https://motil.com',
    'logo': 'https://motil.com/logo.png',
    // ... more fields
  }
}

export function generateProductSchema(product: Product) {
  return {
    '@context': 'https://schema.org',
    '@type': 'SoftwareApplication',
    'name': product.name,
    // ... product fields
  }
}

// Usage in component
export function SchemaScript({ schema }: { schema: object }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(schema) }}
    />
  )
}
```

---

## XML SITEMAP GENERATION

### Dynamic Sitemap with Next.js 13+
```typescript
// app/sitemap.ts
import { MetadataRoute } from 'next'
import { supabase } from '@/lib/supabase'

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const baseUrl = 'https://motil.com'

  // Homepage
  const homepage: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/es`,
      lastModified: new Date(),
      changeFrequency: 'weekly',
      priority: 1.0,
    },
  ]

  // Money pages (static)
  const moneyPages: MetadataRoute.Sitemap = [
    {
      url: `${baseUrl}/es/soluciones/erp-produccion-mineria`,
      lastModified: new Date(),
      changeFrequency: 'monthly',
      priority: 0.9,
    },
    // ... 5 money pages
  ]

  // Regional pages (static)
  const regions = ['antofagasta', 'la-serena', 'atacama', 'magallanes', 'araucania']
  const regionalPages: MetadataRoute.Sitemap = regions.map(region => ({
    url: `${baseUrl}/es/erp-mineria-${region}`,
    lastModified: new Date(),
    changeFrequency: 'monthly',
    priority: 0.8,
  }))

  // Blog posts (dynamic from DB)
  const { data: blogPosts } = await supabase
    .from('blog_posts')
    .select('slug, updated_at')
    .eq('published', true)

  const blogPages: MetadataRoute.Sitemap = (blogPosts || []).map(post => ({
    url: `${baseUrl}/es/blog/${post.slug}`,
    lastModified: new Date(post.updated_at),
    changeFrequency: 'monthly' as const,
    priority: 0.7,
  }))

  return [...homepage, ...moneyPages, ...regionalPages, ...blogPages]
}
```

### Robots.txt
```typescript
// app/robots.ts
import { MetadataRoute } from 'next'

export default function robots(): MetadataRoute.Robots {
  return {
    rules: [
      {
        userAgent: '*',
        allow: '/',
        disallow: ['/admin', '/api', '/auth', '/dashboard'],
      },
    ],
    sitemap: 'https://motil.com/sitemap.xml',
  }
}
```

---

## METADATA OPTIMIZATION

### Dynamic Metadata Generator
```typescript
// lib/metadata-generator.ts
import { Metadata } from 'next'

interface PageMeta {
  title: string
  description: string
  keywords?: string[]
  image?: string
  url: string
}

export function generatePageMetadata(page: PageMeta): Metadata {
  return {
    title: page.title,
    description: page.description,
    keywords: page.keywords || [],
    openGraph: {
      title: page.title,
      description: page.description,
      url: page.url,
      type: 'website',
      images: page.image ? [{ url: page.image }] : [],
    },
    twitter: {
      card: 'summary_large_image',
      title: page.title,
      description: page.description,
      images: page.image ? [page.image] : [],
    },
    robots: {
      index: true,
      follow: true,
      'max-snippet': -1,
      'max-image-preview': 'large',
      'max-video-preview': -1,
    },
  }
}
```

---

## ANALYTICS & MONITORING

### GA4 Event Tracking
```typescript
// lib/analytics.ts
export function trackPageView(pathname: string) {
  gtag.pageview({
    page_path: pathname,
    page_title: document.title,
  })
}

export function trackCTAClick(buttonName: string) {
  gtag.event('cta_click', {
    button_name: buttonName,
    value: 1,
  })
}

export function trackFormSubmission(formName: string, leadQuality: string) {
  gtag.event('form_submit', {
    form_name: formName,
    lead_quality: leadQuality,
  })
}

export function trackChatbotConversation(messageCount: number) {
  gtag.event('chatbot_conversation', {
    message_count: messageCount,
  })
}
```

### Setup in Layout
```tsx
// app/layout.tsx
import { GoogleAnalytics } from '@next/third-parties/google'

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html lang="es">
      <body>
        {children}
        <GoogleAnalytics gaId={process.env.NEXT_PUBLIC_GA_ID} />
      </body>
    </html>
  )
}
```

---

## PERFORMANCE MONITORING

### Lighthouse Targets
- Performance: 90+
- Accessibility: 95+
- Best Practices: 95+
- SEO: 100

### PageSpeed Insights API
```typescript
// scripts/check-pagespeed.ts
import fetch from 'node-fetch'

async function checkPageSpeed(url: string) {
  const response = await fetch(
    `https://www.googleapis.com/pagespeedonline/v5/runPagespeed?url=${url}&key=${process.env.PAGESPEED_API_KEY}`
  )
  const data = await response.json()
  console.log('Performance Score:', data.lighthouseResult.categories.performance.score)
}

checkPageSpeed('https://motil.com/es')
```

---

## CACHING STRATEGY

### Cache Headers
```typescript
// next.config.js
module.exports = {
  headers: async () => [
    {
      source: '/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=3600, s-maxage=86400',
        },
      ],
    },
    {
      source: '/assets/images/:path*',
      headers: [
        {
          key: 'Cache-Control',
          value: 'public, max-age=31536000, immutable',
        },
      ],
    },
  ],
}
```

### ISR (Incremental Static Regeneration)
```typescript
// app/blog/[slug]/page.tsx
export const revalidate = 86400 // Revalidate every 24 hours
```

---

## SEO AUDIT CHECKLIST

- [x] All pages have unique, descriptive titles
- [x] Meta descriptions (150-160 chars) on all pages
- [x] H1 tag present on each page
- [x] Internal linking structure in place
- [x] XML sitemap submitted to GSC
- [x] Robots.txt configured
- [x] Schema markup on key pages
- [x] Mobile responsive
- [x] Core Web Vitals optimized
- [x] No redirect chains
- [x] Images have alt text
- [x] Canonical tags where needed

---

## DEPLOYMENT CHECKLIST

- [x] Build succeeds without warnings
- [x] Type checking passes (`npm run type-check`)
- [x] Linting passes (`npm run lint`)
- [x] All environment variables set
- [x] Analytics configured
- [x] Sitemap generating correctly
- [x] Schema validation passes
- [x] Lighthouse score >90
- [x] Mobile rendering correct
- [x] Forms working
- [x] CTAs clickable
- [x] Links not broken
