#!/bin/bash

echo "═══════════════════════════════════════════════════════════════"
echo "   IMPORTACIÓN MASIVA A SUPABASE VIA API"
echo "═══════════════════════════════════════════════════════════════"
echo ""

# Start dev server in background if not running
if ! nc -z localhost 3000 2>/dev/null; then
  echo "Iniciando servidor dev..."
  cd /vercel/share/v0-project
  pnpm dev > /tmp/dev.log 2>&1 &
  sleep 5
fi

echo "✓ Servidor disponible en http://localhost:3000"
echo ""

# Helper function to send import request
import_data() {
  local type=$1
  local csv_file=$2
  local csv_type=$3
  
  echo "📥 Procesando $type..."
  
  # Parse CSV to JSON
  if [ "$csv_type" = "bodega" ]; then
    # For bodega.csv: CÓDIGO;FAMILIA;SUB-FAMILIA;EQUIPO;PRODUCTO
    tail -n +1 "$csv_file" | awk -F';' 'BEGIN {print "["} 
      NR==1 {next}
      {
        gsub(/"/, "\\\"");
        printf "{\"codigo\":\"%s\",\"familia\":\"%s\",\"sub_familia\":\"%s\",\"equipo\":\"%s\",\"producto\":\"%s\"}%s\n",
          $1, $2, $3, $4, $5, (NR<5105?",":"")
      }
      END {print "]"}' > /tmp/bodega-data.json
    
    wc=$(wc -l < "$csv_file")
    echo "   Registros: $((wc-1))"
    
    curl -X POST http://localhost:3000/api/bodega/bulk-import \
      -H "Content-Type: application/json" \
      -d "{\"type\":\"inventory\",\"data\":$(cat /tmp/bodega-data.json)}" \
      2>/dev/null | jq '.' || echo "Error en la importación"
      
  fi
}

# Import bodega inventory
import_data "Inventario Bodega" "/vercel/share/v0-project/scripts/import-bodega.csv" "bodega"

echo ""
echo "═══════════════════════════════════════════════════════════════"
echo "   IMPORTACIÓN FINALIZADA"
echo "═══════════════════════════════════════════════════════════════"
