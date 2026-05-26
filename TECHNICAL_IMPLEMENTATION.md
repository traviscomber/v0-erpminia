# MOTIL SEO/LLMO - Technical Implementation Checklist

## FILES TO CREATE

### 1. SEO Configuration
**File:** `lib/seo-config.ts`
- Centralized keywords, landing pages, metadata
- Export used in components & pages
- Single source of truth for SEO data

### 2. Landing Pages (5 new pages)

**File:** `app/soluciones/erp-produccion-mineria/page.tsx`
**File:** `app/soluciones/mantenimiento-ordenes-trabajo/page.tsx`
**File:** `app/soluciones/hse-compliance/page.tsx`
**File:** `app/soluciones/bodega-inventario/page.tsx`
**File:** `app/soluciones/reportes-analytics/page.tsx`

Each page:
- ~2,000-3,000 words
- Hero section with CTA
- Problem/solution sections
- ROI calculations
- Case studies
- FAQ schema
- Internal links (5-10)

### 3. Regional Pages (15 new pages)

**Template:** `app/soluciones/[region]/page.tsx`
**Regions:** Antofagasta, La Serena, Atacama, Magallanes, Araucania, Biobío, Los Lagos, Aysén, + 7 more

Each page:
- 1,500-2,000 words
- Local mining context
- Regional companies
- Local success stories
- Local contact info

### 4. Blog Hub & Articles (50+ articles)

**File:** `app/blog/page.tsx` - Blog homepage with filters
**File:** `app/blog/[slug]/page.tsx` - Individual blog post page

**50 Blog Article Templates:** `app/blog/posts/{slug}/page.tsx`
- Category system (MTTR, HSE, Compliance, Equipment, etc)
- Tag system for cross-linking
- Author bio + date
- Social media sharing
- Related posts
- Newsletter signup

### 5. AI Components

**File:** `components/ai/chat-widget.tsx` (500 lines)
- Always-on chat bubble
- Minimize/expand
- Message history
- Suggested prompts
- Lead capture form

**File:** `components/ai/search.tsx` (200 lines)
- Search input with suggestions
- AI-powered results
- Hybrid keyword + semantic search
- Result categories (docs, blog, pages)

**File:** `components/ai/document-analyzer.tsx` (300 lines)
- File upload interface
- Processing indicator
- Results display
- Export summary as PDF

### 6. AI Backend

**File:** `app/api/ai/chat/route.ts` (400 lines)
- OpenAI API integration
- System prompt with mining context
- Document retrieval from Supabase vector DB
- Rate limiting
- Conversation logging

**File:** `app/api/ai/search/route.ts` (200 lines)
- Semantic search via embeddings
- Hybrid keyword search
- Result ranking
- Analytics logging

**File:** `app/api/ai/document-intelligence/route.ts` (300 lines)
- Document upload handling
- PDF/text parsing
- Summary generation
- Recommendation engine

### 7. Schema & SEO

**File:** `app/sitemap.ts` - Dynamic XML sitemap
**File:** `app/robots.ts` - Robots.txt generation
**File:** `lib/schema-generator.ts` - Schema markup generation
**File:** `lib/metadata-generator.ts` - Dynamic metadata for all pages
**File:** `components/seo/structured-data.tsx` - Schema component wrapper

### 8. Analytics & Tracking

**File:** `lib/analytics.ts` (200 lines)
- GA4 event tracking
- Custom events for SEO actions:
  - Page views
  - CTA clicks
  - Form submissions
  - Chat interactions
  - Download clicks
  - Search queries

**File:** `app/api/analytics/seo-metrics/route.ts`
- Endpoint to fetch SEO performance data
- Used by internal dashboard

---

## IMPLEMENTATION PRIORITY (Week-by-Week)

### Week 1
**Priority: P0 (Critical)**
- [ ] SEO configuration (`lib/seo-config.ts`)
- [ ] Google Search Console verification
- [ ] Analytics setup (GA4, events)
- [ ] Sitemap.ts + Robots.ts
- [ ] Metadata generator

### Week 2-3
**Priority: P0 (Critical)**
- [ ] 5 Money pages creation
- [ ] 3 Regional page templates
- [ ] Schema markup implementation
- [ ] Blog homepage + first 5 articles

### Week 4-5
**Priority: P1 (High)**
- [ ] All 15 regional pages
- [ ] Blog posts (25+ total)
- [ ] AI chatbot widget
- [ ] AI search implementation

### Week 6-8
**Priority: P1 (High)**
- [ ] Remaining blog posts
- [ ] Document intelligence
- [ ] Content optimization
- [ ] Link building campaign

---

## CODE EXAMPLES

### Example 1: Landing Page Component Structure
```tsx
// app/soluciones/erp-produccion-mineria/page.tsx
import { Metadata } from 'next'
import ProductionLanding from '@/components/landings/production-landing'
import { SEO_KEYWORDS } from '@/lib/seo-config'

export const metadata: Metadata = {
  title: 'ERP Producción Minería | Software Telemetría Tiempo Real',
  description: 'Plataforma de producción minera con sensores en tiempo real...',
  keywords: ['ERP minería', 'software producción', 'telemetría'],
}

export default function ProductionPage() {
  return (
    <>
      <ProductionLanding />
      <schema.json>
        {generateProductSchema({
          title: metadata.title,
          description: metadata.description,
          url: '/soluciones/erp-produccion-mineria'
        })}
      </schema.json>
    </>
  )
}
```

### Example 2: Blog Post Template
```tsx
// app/blog/[slug]/page.tsx
import { Metadata } from 'next'
import BlogPostComponent from '@/components/blog/blog-post'
import { getBlogPost } from '@/lib/blog-service'

export async function generateMetadata({ params }): Promise<Metadata> {
  const post = await getBlogPost(params.slug)
  return {
    title: post.title + ' | Motil Blog',
    description: post.excerpt,
    authors: [{ name: post.author }],
    publishedTime: post.publishedAt,
    keywords: post.keywords,
  }
}

export async function generateStaticParams() {
  const posts = await getAllBlogPosts()
  return posts.map(post => ({ slug: post.slug }))
}

export default async function BlogPostPage({ params }) {
  const post = await getBlogPost(params.slug)
  return <BlogPostComponent post={post} />
}
```

### Example 3: AI Chatbot
```tsx
// components/ai/chat-widget.tsx
'use client'
import { useChat } from '@ai-sdk/react'
import { useState } from 'react'

export function ChatWidget() {
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/ai/chat',
    system: `You are Motil AI, an expert in mining ERP systems...`,
  })

  return (
    <div className="fixed bottom-4 right-4 w-96 h-600 bg-white rounded-lg shadow-lg">
      <div className="flex flex-col h-full">
        <div className="flex-1 overflow-y-auto p-4 space-y-4">
          {messages.map(msg => (
            <div key={msg.id} className={msg.role === 'user' ? 'text-right' : ''}>
              {msg.content}
            </div>
          ))}
        </div>
        <form onSubmit={handleSubmit} className="p-4 border-t">
          <input
            value={input}
            onChange={handleInputChange}
            placeholder="Pregunta sobre ERP minería..."
            className="w-full p-2 border rounded"
          />
        </form>
      </div>
    </div>
  )
}
```

---

## DEPENDENCIES TO ADD

```json
{
  "dependencies": {
    "@ai-sdk/react": "^3.0.0",
    "@vercel/analytics": "^1.1.0",
    "lucide-react": "^0.292.0",
    "next-sitemap": "^1.0.0"
  },
  "devDependencies": {
    "@types/node": "^20.0.0"
  }
}
```

Install with:
```bash
pnpm add @ai-sdk/react @vercel/analytics lucide-react
```

---

## DEPLOYMENT STEPS

1. **Local Development**
   ```bash
   npm run dev
   # Test landing pages at http://localhost:3000/soluciones/*
   # Test blog at http://localhost:3000/blog
   ```

2. **Staging**
   ```bash
   npm run build
   npm run start
   # Verify all pages + sitemap generation
   ```

3. **Production**
   ```bash
   vercel deploy --prod
   # Monitor GSC for indexing
   # Check Core Web Vitals
   ```

---

## SUCCESS METRICS (Track Weekly)

**Week 1-2:**
- [ ] All landing pages indexed (GSC)
- [ ] Sitemap generated + submitted
- [ ] Schema markup validated
- [ ] GA4 events firing

**Week 3-4:**
- [ ] Blog posts indexed
- [ ] Organic traffic: 100+ daily visits
- [ ] CTAs getting clicks
- [ ] Forms getting submissions

**Week 5-8:**
- [ ] 30+ keywords tracking
- [ ] 5+ Top 20 rankings
- [ ] 1K+ organic monthly visits
- [ ] 50+ lead forms filled
- [ ] Chatbot getting 20+ daily conversations

**Week 9-12:**
- [ ] 30+ Top 3 rankings
- [ ] 10K+ organic monthly visits
- [ ] 200+ monthly leads
- [ ] 50%+ qualified lead rate
- [ ] Chatbot: 500+ monthly conversations

---

## MAINTENANCE (Ongoing)

**Weekly:**
- Monitor GSC for new errors
- Check top keywords performance
- Publish 2 blog posts

**Monthly:**
- Full SEO audit (tools: Ahrefs/SEMrush)
- Update Google Business Profile
- Analyze backlink profile
- Optimize underperforming pages

**Quarterly:**
- Comprehensive keyword research refresh
- Competitor analysis
- Content audit
- ROI analysis

