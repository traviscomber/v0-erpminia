# MOTIL - LLMO Integration Strategy

## AI CHATBOT - Implementation Guide

### System Prompt & Knowledge Base
```typescript
// lib/ai/mining-system-prompt.ts

export const MINING_SYSTEM_PROMPT = `You are Motil AI, an expert assistant for mining ERP systems in Chile.

Your knowledge areas:
1. Motil features (production, maintenance, HSE, inventory, reporting)
2. Mining industry practices (MTTR, MTBF, equipment management)
3. SERNAGEOMIN compliance requirements
4. HSE regulations (ISO 45001, ISO 14001)
5. Equipment management best practices
6. Regional mining context (Chile: copper, lithium, gold, molybdenum)

INTERACTION RULES:
- Be specific to mining operations (not generic ERP)
- Include ROI/metrics when relevant
- Ask clarifying questions to understand their situation
- Suggest Motil features that solve their problem
- Offer to connect with human specialist
- Speak Spanish only (Chile market)
- Be conversational but professional

QUALIFICATION RULES:
If user indicates pain point → Suggest relevant Motil feature
If user is interested → Offer demo booking
If user has budget questions → Provide pricing framework
If user is highly qualified → Suggest sales contact

KNOWLEDGE SOURCES:
- Motil documentation
- Mining best practices (ICMM standards)
- Case studies from Chilean mining operations
- SERNAGEOMIN regulations
- Regional mining context
`
```

### Chatbot Conversations - Example Flows

**Flow 1: MTTR Problem → Solution**
```
User: "Tenemos problemas con el MTTR. Nuestros equipos están fuera 
       de servicio demasiado tiempo."

Bot: "Entiendo. MTTR alto es uno de los mayores costos en minería. 
      En promedio, operaciones pierden $10-50K USD por hora de downtime.
      
      Rápidamente: ¿Actualmente tienes:
      1. Mantenimiento predictivo implementado?
      2. Datos de equipos centralizados?
      3. Tracking automático de tiempos de reparación?
      
      Responde para darte análisis específico de tu operación."

User: "Solo preventivo, todo en Excel"

Bot: "Diagnóstico: Falta visibilidad + optimización de mantenimiento.
      Con Motil, clientes similares lograron:
      • -25% MTTR (42h → 31h promedio)
      • -18% costos de mantenimiento
      • +22% disponibilidad de equipos
      
      ¿Cuántos equipos críticos tienes? Y ¿cuál es tu MTTR actual?
      Así te doy proyección de ROI para tu operación específica."
```

**Flow 2: SERNAGEOMIN Compliance**
```
User: "¿Cómo cumplir con SERNAGEOMIN sin perder tiempo?"

Bot: "SERNAGEOMIN requiere:
      ✓ Documentación de inspecciones
      ✓ Incident reporting en tiempo real
      ✓ Cumplimiento de 15+ regulaciones
      ✓ Auditoría trail de 7 años
      
      Con Motil HSE module:
      • Auto-generate compliance reports (5 min vs 2 days)
      • Real-time incident tracking
      • Digital document management
      • Auto-alerts for expiring certifications
      
      ¿Tu operación tiene HSE digital o aún manual?"
```

**Flow 3: Lead Qualification**
```
User: "¿Cuál es el costo de implementación?"

Bot: "Excelente pregunta. El pricing depende de:
      • Tamaño de operación (# equipos, usuarios, sitios)
      • Módulos necesarios (producción, mantención, HSE, bodega)
      • Nivel de customización
      
      Rápidamente: 
      - Operaciones pequeñas (1 sitio): $5K-15K/mes
      - Operaciones medianas (2-3 sitios): $15K-40K/mes
      - Operaciones grandes (5+ sitios): $40K+/mes
      
      ¿Cuántos sitios mineros tienes? Y ¿qué módulos serían prioritarios?"

User: "3 sitios, principalmente mantenimiento e inventario"

Bot: "Con 3 sitios + esos 2 módulos, estimas $20-30K/mes.
      
      El ROI típico:
      • Implementación: 12-16 semanas
      • Payback period: 4-6 meses (en MTTR savings)
      • Year 1 savings: $200K-400K
      
      ¿Te gustaría hablar con un especialista de minería 
      para análisis detallado de tu operación?"
```

### Chatbot Widget Component
```typescript
// components/ai/chat-widget.tsx
'use client'

import { useChat } from '@ai-sdk/react'
import { useState } from 'react'
import { Send, X, Minimize2, Maximize2 } from 'lucide-react'

export function ChatWidget() {
  const [isOpen, setIsOpen] = useState(false)
  const [isMinimized, setIsMinimized] = useState(false)
  const { messages, input, handleInputChange, handleSubmit } = useChat({
    api: '/api/ai/chat',
    system: MINING_SYSTEM_PROMPT,
  })

  return (
    <>
      {/* Chat Bubble Button */}
      {!isOpen && (
        <button
          onClick={() => setIsOpen(true)}
          className="fixed bottom-6 right-6 w-14 h-14 bg-primary rounded-full shadow-lg hover:scale-110 transition-transform flex items-center justify-center z-50"
        >
          💬
        </button>
      )}

      {/* Chat Window */}
      {isOpen && (
        <div className={`fixed bottom-6 right-6 w-96 bg-white rounded-lg shadow-xl flex flex-col z-50 transition-all ${
          isMinimized ? 'h-14' : 'h-[600px]'
        }`}>
          {/* Header */}
          <div className="bg-primary text-white p-4 rounded-t-lg flex justify-between items-center">
            <h3 className="font-semibold">Motil AI - Asesor Minería</h3>
            <div className="flex gap-2">
              <button onClick={() => setIsMinimized(!isMinimized)}>
                {isMinimized ? <Maximize2 size={18} /> : <Minimize2 size={18} />}
              </button>
              <button onClick={() => setIsOpen(false)}>
                <X size={18} />
              </button>
            </div>
          </div>

          {!isMinimized && (
            <>
              {/* Messages */}
              <div className="flex-1 overflow-y-auto p-4 space-y-4">
                {messages.length === 0 && (
                  <div className="text-center text-gray-500 mt-8">
                    <p className="font-semibold mb-4">¿Cómo podemos ayudarte?</p>
                    <div className="space-y-2">
                      <button className="block w-full text-left p-3 bg-gray-100 rounded hover:bg-gray-200 text-sm">
                        "Cómo reducir MTTR"
                      </button>
                      <button className="block w-full text-left p-3 bg-gray-100 rounded hover:bg-gray-200 text-sm">
                        "Cumplir SERNAGEOMIN"
                      </button>
                      <button className="block w-full text-left p-3 bg-gray-100 rounded hover:bg-gray-200 text-sm">
                        "Ver demo en vivo"
                      </button>
                    </div>
                  </div>
                )}
                {messages.map((msg) => (
                  <div
                    key={msg.id}
                    className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}
                  >
                    <div
                      className={`max-w-xs px-4 py-2 rounded-lg ${
                        msg.role === 'user'
                          ? 'bg-primary text-white rounded-br-none'
                          : 'bg-gray-100 text-gray-900 rounded-bl-none'
                      }`}
                    >
                      {msg.content}
                    </div>
                  </div>
                ))}
              </div>

              {/* Input */}
              <form onSubmit={handleSubmit} className="border-t p-4 flex gap-2">
                <input
                  type="text"
                  value={input}
                  onChange={handleInputChange}
                  placeholder="Pregunta sobre ERP minería..."
                  className="flex-1 border rounded px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-primary"
                />
                <button
                  type="submit"
                  className="bg-primary text-white px-4 py-2 rounded hover:bg-primary/90 transition-colors"
                >
                  <Send size={18} />
                </button>
              </form>
            </>
          )}
        </div>
      )}
    </>
  )
}
```

### API Backend
```typescript
// app/api/ai/chat/route.ts
import { openai } from '@ai-sdk/openai'
import { streamText } from 'ai'
import { MINING_SYSTEM_PROMPT } from '@/lib/ai/mining-system-prompt'

export const runtime = 'nodejs'
export const maxDuration = 60

export async function POST(req: Request) {
  const { messages } = await req.json()

  // Rate limiting
  const ip = req.headers.get('x-forwarded-for') || 'unknown'
  // TODO: Check rate limit in Redis

  const result = streamText({
    model: openai('gpt-4-turbo'),
    system: MINING_SYSTEM_PROMPT,
    messages,
    temperature: 0.7,
    maxTokens: 500,
  })

  // Log conversation for analytics
  console.log('[AI Chat]', { ip, messageCount: messages.length })

  return result.toDataStreamResponse()
}
```

---

## AI SEMANTIC SEARCH

### Search Component
```typescript
// components/ai/search.tsx
'use client'

import { useState } from 'react'
import { Search } from 'lucide-react'

export function AISearch() {
  const [query, setQuery] = useState('')
  const [results, setResults] = useState([])
  const [isLoading, setIsLoading] = useState(false)

  const handleSearch = async (e: React.FormEvent) => {
    e.preventDefault()
    setIsLoading(true)

    const response = await fetch('/api/ai/search', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ query }),
    })

    const data = await response.json()
    setResults(data.results)
    setIsLoading(false)
  }

  return (
    <div className="w-full">
      <form onSubmit={handleSearch} className="relative">
        <Search className="absolute left-3 top-3 text-gray-400" />
        <input
          type="text"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Buscar: 'reducir MTTR', 'SERNAGEOMIN', 'disponibilidad equipos'..."
          className="w-full pl-10 pr-4 py-3 border rounded-lg focus:ring-2 focus:ring-primary"
        />
      </form>

      {/* Results */}
      <div className="mt-4 space-y-4">
        {results.map((result) => (
          <div key={result.id} className="border rounded-lg p-4 hover:bg-gray-50">
            <div className="flex justify-between items-start">
              <div>
                <h4 className="font-semibold text-primary">{result.title}</h4>
                <p className="text-sm text-gray-600 mt-1">{result.excerpt}</p>
              </div>
              <span className="text-xs bg-gray-100 px-2 py-1 rounded">
                {result.type} • {result.relevance}%
              </span>
            </div>
            <a href={result.url} className="text-sm text-blue-600 mt-2 inline-block">
              Leer más →
            </a>
          </div>
        ))}
      </div>
    </div>
  )
}
```

### Search API
```typescript
// app/api/ai/search/route.ts
import { openai } from '@ai-sdk/openai'
import { embed } from 'ai'
import { supabase } from '@/lib/supabase'

export async function POST(req: Request) {
  const { query } = await req.json()

  // Generate embedding for query
  const { embedding } = await embed({
    model: openai.embedding('text-embedding-3-small'),
    value: query,
  })

  // Semantic search in Supabase vector DB
  const { data } = await supabase.rpc('search_motil_content', {
    query_embedding: embedding,
    similarity_threshold: 0.7,
    max_results: 10,
  })

  return Response.json({ results: data })
}
```

---

## DOCUMENT INTELLIGENCE

```typescript
// components/ai/document-analyzer.tsx
'use client'

import { useState } from 'react'
import { Upload } from 'lucide-react'

export function DocumentAnalyzer() {
  const [file, setFile] = useState<File | null>(null)
  const [analysis, setAnalysis] = useState(null)
  const [isLoading, setIsLoading] = useState(false)

  const handleUpload = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!file) return

    const formData = new FormData()
    formData.append('file', file)

    setIsLoading(true)
    const response = await fetch('/api/ai/document-intelligence', {
      method: 'POST',
      body: formData,
    })

    const data = await response.json()
    setAnalysis(data)
    setIsLoading(false)
  }

  return (
    <div className="max-w-2xl mx-auto p-6">
      <h2 className="text-2xl font-bold mb-6">Analizador de Documentos</h2>

      {/* Upload */}
      <form onSubmit={handleUpload} className="border-2 border-dashed rounded-lg p-8 text-center">
        <Upload className="mx-auto mb-4 text-gray-400" size={32} />
        <p className="font-semibold mb-2">Sube tu reporte SERNAGEOMIN</p>
        <p className="text-sm text-gray-600 mb-4">PDF, Word, o texto</p>
        <input
          type="file"
          onChange={(e) => setFile(e.target.files?.[0] || null)}
          className="hidden"
          id="file-upload"
        />
        <label htmlFor="file-upload" className="cursor-pointer text-blue-600">
          Seleccionar archivo
        </label>
      </form>

      {/* Results */}
      {analysis && (
        <div className="mt-8 space-y-6">
          <div className="bg-blue-50 border border-blue-200 rounded p-4">
            <h3 className="font-semibold text-blue-900">Resumen</h3>
            <p className="text-blue-800 mt-2">{analysis.summary}</p>
          </div>

          <div className="bg-red-50 border border-red-200 rounded p-4">
            <h3 className="font-semibold text-red-900">Hallazgos Críticos ({analysis.critical_findings.length})</h3>
            <ul className="text-red-800 mt-2 space-y-1">
              {analysis.critical_findings.map((finding, i) => (
                <li key={i}>• {finding}</li>
              ))}
            </ul>
          </div>

          <div className="bg-yellow-50 border border-yellow-200 rounded p-4">
            <h3 className="font-semibold text-yellow-900">Recomendaciones Motil</h3>
            <ul className="text-yellow-800 mt-2 space-y-1">
              {analysis.recommendations.map((rec, i) => (
                <li key={i}>• {rec}</li>
              ))}
            </ul>
          </div>

          <button className="w-full bg-primary text-white py-3 rounded font-semibold">
            Descargar Análisis en PDF
          </button>
        </div>
      )}
    </div>
  )
}
```

---

## DEPLOYMENT CHECKLIST

- [ ] OpenAI API key configured
- [ ] Supabase vector embeddings set up
- [ ] Chat widget integrated on homepage
- [ ] Search integrated on all landing pages
- [ ] Document intelligence deployed
- [ ] Rate limiting configured
- [ ] Analytics events logging
- [ ] User feedback collection (thumbs up/down)
- [ ] Fallback to human support
- [ ] Monitor API costs
