#!/usr/bin/env node

/**
 * Script para generar PDF del MVP Roadmap
 * Ejecutar: npx tsx scripts/generate-mvp-pdf.js
 */

import fs from 'fs';
import path from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Simple HTML template to convert markdown to PDF
function generateHTML(markdown) {
  return `
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
      font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', 'Roboto', 'Oxygen', 'Ubuntu', 'Cantarell', 'Fira Sans', 'Droid Sans', 'Helvetica Neue', sans-serif;
      line-height: 1.6;
      color: #333;
      background: #f5f5f5;
      padding: 40px;
    }
    
    h1 {
      font-size: 2.5em;
      margin-bottom: 20px;
      color: #1a1a1a;
      border-bottom: 3px solid #0066cc;
      padding-bottom: 15px;
    }
    
    h2 {
      font-size: 1.8em;
      margin-top: 40px;
      margin-bottom: 15px;
      color: #0066cc;
      page-break-after: avoid;
    }
    
    h3 {
      font-size: 1.3em;
      margin-top: 25px;
      margin-bottom: 10px;
      color: #333;
      page-break-after: avoid;
    }
    
    p {
      margin-bottom: 12px;
      text-align: justify;
    }
    
    ul, ol {
      margin-left: 20px;
      margin-bottom: 12px;
    }
    
    li {
      margin-bottom: 8px;
    }
    
    code {
      background: #f4f4f4;
      padding: 2px 6px;
      border-radius: 3px;
      font-family: 'Courier New', monospace;
      font-size: 0.9em;
    }
    
    pre {
      background: #2d2d2d;
      color: #f8f8f2;
      padding: 15px;
      border-radius: 5px;
      overflow-x: auto;
      margin-bottom: 15px;
      font-family: 'Courier New', monospace;
      font-size: 0.85em;
      line-height: 1.4;
      page-break-inside: avoid;
    }
    
    strong {
      color: #0066cc;
      font-weight: 600;
    }
    
    em {
      font-style: italic;
      color: #666;
    }
    
    table {
      width: 100%;
      border-collapse: collapse;
      margin-bottom: 15px;
      page-break-inside: avoid;
    }
    
    th {
      background: #0066cc;
      color: white;
      padding: 12px;
      text-align: left;
      font-weight: 600;
    }
    
    td {
      border: 1px solid #ddd;
      padding: 12px;
    }
    
    tr:nth-child(even) {
      background: #f9f9f9;
    }
    
    hr {
      border: none;
      border-top: 2px solid #0066cc;
      margin: 30px 0;
      page-break-before: avoid;
    }
    
    .container {
      max-width: 900px;
      margin: 0 auto;
      background: white;
      padding: 50px;
      box-shadow: 0 0 10px rgba(0,0,0,0.1);
    }
    
    .cover-page {
      text-align: center;
      padding: 100px 0;
      border-bottom: 3px solid #0066cc;
      margin-bottom: 50px;
      page-break-after: always;
    }
    
    .cover-page h1 {
      font-size: 3em;
      border: none;
      margin-bottom: 20px;
    }
    
    .cover-page p {
      font-size: 1.2em;
      color: #666;
      margin-bottom: 10px;
    }
    
    .toc {
      page-break-after: always;
      margin-bottom: 30px;
    }
    
    .toc h2 {
      margin-top: 0;
    }
    
    .toc ul {
      list-style: none;
    }
    
    .toc li {
      margin-bottom: 10px;
    }
    
    .toc a {
      color: #0066cc;
      text-decoration: none;
    }
    
    @media print {
      body {
        padding: 0;
        background: white;
      }
      .container {
        box-shadow: none;
        padding: 0;
        max-width: 100%;
      }
    }
  </style>
</head>
<body>
  <div class="container">
    ${markdown}
  </div>
</body>
</html>
  `;
}

// Read the markdown file
const mdPath = path.join(__dirname, '../MVP_ROADMAP_5_MONTHS.md');
const markdown = fs.readFileSync(mdPath, 'utf-8');

// Convert markdown to basic HTML (simple implementation)
let html = markdown
  .replace(/^# (.*?)$/gm, '<h1>$1</h1>')
  .replace(/^## (.*?)$/gm, '<h2>$1</h2>')
  .replace(/^### (.*?)$/gm, '<h3>$1</h3>')
  .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
  .replace(/\*(.*?)\*/g, '<em>$1</em>')
  .replace(/`(.*?)`/g, '<code>$1</code>')
  .replace(/\n```(.*?)\n([\s\S]*?)\n```/g, '<pre><code>$2</code></pre>')
  .replace(/\n- (.*?)(?=\n)/g, '\n<li>$1</li>')
  .replace(/(<li>.*<\/li>)/s, '<ul>$1</ul>')
  .replace(/\n---\n/g, '<hr>')
  .replace(/\n\n/g, '</p><p>')
  .replace(/^/gm, '<p>')
  .replace(/$/gm, '</p>')
  .replace(/<p><\/p>/g, '');

const fullHTML = generateHTML(html);

// Save HTML file (which can be printed to PDF via browser)
const outputPath = path.join(__dirname, '../MVP_ROADMAP_5_MONTHS.html');
fs.writeFileSync(outputPath, fullHTML);

console.log('✅ HTML generado en:', outputPath);
console.log('📄 Para convertir a PDF:');
console.log('   1. Abre el archivo HTML en tu navegador');
console.log('   2. Presiona Ctrl+P (Windows) o Cmd+P (Mac)');
console.log('   3. Selecciona "Guardar como PDF"');
console.log('');
console.log('O usa una herramienta como:');
console.log('   npm install -g wkhtmltopdf');
console.log('   wkhtmltopdf MVP_ROADMAP_5_MONTHS.html MVP_ROADMAP_5_MONTHS.pdf');
