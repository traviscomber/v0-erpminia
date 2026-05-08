#!/bin/bash

# Script para crear usuario admin en Supabase
# Uso: bash scripts/setup-admin.sh

echo "📝 Creando usuario administrador..."

SUPABASE_URL="${NEXT_PUBLIC_SUPABASE_URL}"
SERVICE_ROLE_KEY="${SUPABASE_SERVICE_ROLE_KEY}"

if [ -z "$SUPABASE_URL" ] || [ -z "$SERVICE_ROLE_KEY" ]; then
  echo "❌ Error: Variables de ambiente no configuradas"
  echo "   NEXT_PUBLIC_SUPABASE_URL y SUPABASE_SERVICE_ROLE_KEY son requeridas"
  exit 1
fi

EMAIL="juan@n3uralia.com"
PASSWORD="c4rlit0s"
NAME="Juan Admin"

echo "📧 Email: $EMAIL"
echo "🔐 Password: (oculta)"
echo "👤 Name: $NAME"

# Crear usuario usando API interna de Supabase
curl -X POST "${SUPABASE_URL}/auth/v1/admin/users" \
  -H "Authorization: Bearer ${SERVICE_ROLE_KEY}" \
  -H "Content-Type: application/json" \
  -d "{
    \"email\": \"${EMAIL}\",
    \"password\": \"${PASSWORD}\",
    \"email_confirm\": true,
    \"user_metadata\": {
      \"name\": \"${NAME}\",
      \"role\": \"admin\"
    }
  }"

echo ""
echo "✅ Usuario creado exitosamente"
echo ""
echo "Credenciales de acceso:"
echo "  Email: juan@n3uralia.com"
echo "  Password: c4rlit0s"
echo "  URL: http://localhost:3000/auth/login"

