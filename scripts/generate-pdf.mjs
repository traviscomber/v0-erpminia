#!/usr/bin/env node

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';
import { marked } from 'marked';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Read the markdown file
const mdPath = path.join(__dirname, '../MVP_ROADMAP_5_MONTHS.md');
const markdown = fs.readFileSync(mdPath, 'utf-8');

// Convert markdown to HTML
const html = marked(markdown);

// Create HTML document with styling
const htmlDocument = `
<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>n3uralia ERP mining - MVP Roadmap 5 Meses</title>
    <style>
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }
        
        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, 'Helvetica Neue', Arial, sans-serif;
            line-height: 1.6;
            color: #1a1a1a;
            background: white;
            padding: 40px;
            max-width: 900px;
            margin: 0 auto;
        }
        
        h1 {
            font-size: 2.5em;
            margin-top: 0;
            margin-bottom: 0.5em;
            color: #0a0a0a;
            border-bottom: 3px solid #2563eb;
            padding-bottom: 15px;
        }
        
        h2 {
            font-size: 1.8em;
            margin-top: 1.5em;
            margin-bottom: 0.5em;
            color: #1e40af;
            border-left: 4px solid #2563eb;
            padding-left: 15px;
        }
        
        h3 {
            font-size: 1.3em;
            margin-top: 1.2em;
            margin-bottom: 0.4em;
            color: #1e40af;
        }
        
        h4 {
            font-size: 1.1em;
            margin-top: 1em;
            margin-bottom: 0.3em;
            color: #2563eb;
        }
        
        p {
            margin-bottom: 1em;
            text-align: justify;
        }
        
        ul, ol {
            margin-left: 2em;
            margin-bottom: 1em;
        }
        
        li {
            margin-bottom: 0.5em;
        }
        
        code {
            background-color: #f3f4f6;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.95em;
        }
        
        pre {
            background-color: #1f2937;
            color: #f3f4f6;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            margin-bottom: 1em;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
            line-height: 1.4;
        }
        
        pre code {
            background-color: transparent;
            padding: 0;
            color: inherit;
        }
        
        table {
            width: 100%;
            border-collapse: collapse;
            margin-bottom: 1.5em;
        }
        
        th {
            background-color: #2563eb;
            color: white;
            padding: 12px;
            text-align: left;
            font-weight: 600;
        }
        
        td {
            border: 1px solid #d1d5db;
            padding: 10px 12px;
        }
        
        tr:nth-child(even) {
            background-color: #f9fafb;
        }
        
        blockquote {
            border-left: 4px solid #2563eb;
            padding-left: 15px;
            margin-left: 0;
            margin-bottom: 1em;
            font-style: italic;
            color: #4b5563;
        }
        
        strong {
            font-weight: 700;
            color: #1e40af;
        }
        
        em {
            font-style: italic;
        }
        
        a {
            color: #2563eb;
            text-decoration: none;
        }
        
        a:hover {
            text-decoration: underline;
        }
        
        hr {
            border: none;
            border-top: 2px solid #e5e7eb;
            margin: 2em 0;
        }
        
        .page-break {
            page-break-after: always;
        }
        
        @media print {
            body {
                padding: 0;
            }
            
            h1 {
                page-break-after: avoid;
            }
            
            h2 {
                page-break-after: avoid;
            }
            
            h3 {
                page-break-after: avoid;
            }
            
            table {
                page-break-inside: avoid;
            }
        }
    </style>
</head>
<body>
    ${html}
</body>
</html>
`;

// Write HTML file
const htmlPath = path.join(__dirname, '../MVP_ROADMAP_5_MONTHS.html');
fs.writeFileSync(htmlPath, htmlDocument, 'utf-8');

console.log('✅ HTML generado: MVP_ROADMAP_5_MONTHS.html');
console.log('\nPasos para convertir a PDF:');
console.log('1. Abre: MVP_ROADMAP_5_MONTHS.html en tu navegador');
console.log('2. Presiona: Ctrl+P (o Cmd+P en Mac)');
console.log('3. Selecciona: "Guardar como PDF"');
console.log('4. Listo! 📄');
