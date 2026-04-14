#!/usr/bin/env python3
import os
import re
from pathlib import Path

# Read the markdown file
md_file = Path('/vercel/share/v0-project/MVP_ROADMAP_5_MONTHS.md')
content = md_file.read_text(encoding='utf-8')

# Convert markdown to HTML
def markdown_to_html(md_content):
    html = md_content
    
    # Headings
    html = re.sub(r'^# (.*?)$', r'<h1>\1</h1>', html, flags=re.MULTILINE)
    html = re.sub(r'^## (.*?)$', r'<h2>\1</h2>', html, flags=re.MULTILINE)
    html = re.sub(r'^### (.*?)$', r'<h3>\1</h3>', html, flags=re.MULTILINE)
    html = re.sub(r'^#### (.*?)$', r'<h4>\1</h4>', html, flags=re.MULTILINE)
    
    # Bold
    html = re.sub(r'\*\*(.*?)\*\*', r'<strong>\1</strong>', html)
    html = re.sub(r'__(.*?)__', r'<strong>\1</strong>', html)
    
    # Italic
    html = re.sub(r'\*(.*?)\*', r'<em>\1</em>', html)
    html = re.sub(r'_(.*?)_', r'<em>\1</em>', html)
    
    # Code blocks
    html = re.sub(r'```(.*?)```', r'<pre><code>\1</code></pre>', html, flags=re.DOTALL)
    
    # Inline code
    html = re.sub(r'`(.*?)`', r'<code>\1</code>', html)
    
    # Lists
    html = re.sub(r'^\- (.*?)$', r'<li>\1</li>', html, flags=re.MULTILINE)
    html = re.sub(r'^\* (.*?)$', r'<li>\1</li>', html, flags=re.MULTILINE)
    html = re.sub(r'((?:<li>.*?</li>\n?)+)', r'<ul>\1</ul>', html, flags=re.DOTALL)
    
    # Line breaks
    html = html.replace('\n\n', '</p><p>')
    
    # Links
    html = re.sub(r'\[(.*?)\]\((.*?)\)', r'<a href="\2">\1</a>', html)
    
    return html

html_content = markdown_to_html(content)

# Create full HTML document
full_html = f"""<!DOCTYPE html>
<html lang="es">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>n3uralia ERP mining - MVP Roadmap 5 Meses</title>
    <style>
        * {{
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }}
        
        body {{
            font-family: 'Segoe UI', Tahoma, Geneva, Verdana, sans-serif;
            line-height: 1.6;
            color: #333;
            background: white;
            padding: 40px;
            max-width: 900px;
            margin: 0 auto;
        }}
        
        h1 {{
            font-size: 2.5em;
            margin: 30px 0 15px 0;
            color: #0f172a;
            border-bottom: 3px solid #3b82f6;
            padding-bottom: 10px;
        }}
        
        h2 {{
            font-size: 1.8em;
            margin: 25px 0 12px 0;
            color: #1e293b;
            border-left: 4px solid #3b82f6;
            padding-left: 15px;
        }}
        
        h3 {{
            font-size: 1.3em;
            margin: 18px 0 10px 0;
            color: #334155;
        }}
        
        h4 {{
            font-size: 1.1em;
            margin: 12px 0 8px 0;
            color: #475569;
            font-weight: 600;
        }}
        
        p {{
            margin: 12px 0;
            text-align: justify;
        }}
        
        ul, ol {{
            margin: 15px 0 15px 30px;
        }}
        
        li {{
            margin: 8px 0;
            list-style-type: disc;
        }}
        
        code {{
            background: #f1f5f9;
            padding: 2px 6px;
            border-radius: 3px;
            font-family: 'Courier New', monospace;
            font-size: 0.9em;
        }}
        
        pre {{
            background: #1e293b;
            color: #e2e8f0;
            padding: 15px;
            border-radius: 5px;
            overflow-x: auto;
            margin: 15px 0;
            line-height: 1.5;
        }}
        
        pre code {{
            background: none;
            padding: 0;
            color: inherit;
        }}
        
        a {{
            color: #3b82f6;
            text-decoration: none;
            border-bottom: 1px dotted #3b82f6;
        }}
        
        a:hover {{
            color: #2563eb;
        }}
        
        table {{
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }}
        
        th, td {{
            border: 1px solid #cbd5e1;
            padding: 12px;
            text-align: left;
        }}
        
        th {{
            background: #f1f5f9;
            font-weight: 600;
        }}
        
        blockquote {{
            border-left: 4px solid #e2e8f0;
            padding-left: 15px;
            margin: 15px 0;
            color: #64748b;
            font-style: italic;
        }}
        
        .section-break {{
            page-break-after: always;
            margin: 40px 0;
        }}
        
        @media print {{
            body {{
                padding: 20px;
            }}
            
            h1, h2 {{
                page-break-after: avoid;
            }}
            
            ul, ol {{
                page-break-inside: avoid;
            }}
        }}
    </style>
</head>
<body>
    {html_content}
    <div style="margin-top: 50px; padding-top: 20px; border-top: 1px solid #e2e8f0; text-align: center; color: #94a3b8; font-size: 0.9em;">
        <p>n3uralia ERP mining - MVP Roadmap 5 Meses</p>
        <p>Documento generado automáticamente</p>
    </div>
</body>
</html>
"""

# Write HTML file
output_file = Path('/vercel/share/v0-project/MVP_ROADMAP_5_MONTHS.html')
output_file.write_text(full_html, encoding='utf-8')

print(f"✓ PDF HTML generado exitosamente")
print(f"✓ Archivo: {output_file}")
print(f"✓ Abre el archivo en tu navegador y presiona Ctrl+P (o Cmd+P en Mac) para guardar como PDF")
