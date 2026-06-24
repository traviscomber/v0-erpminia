import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.development.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function verifyUser() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════╗')
    console.log('║         Verificando usuario de mantenimiento            ║')
    console.log('╚════════════════════════════════════════════════════════╝\n')

    // Verificar en profiles
    const { data: profile, error: verifyError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, status, organization_id')
      .eq('email', 'mastudillo@lapatagua.cl')
      .single()

    if (verifyError) {
      console.error('❌ Error:', verifyError.message)
      process.exit(1)
    }

    if (!profile) {
      console.log('⚠️  Usuario no encontrado en profiles')
      process.exit(0)
    }

    console.log('✅ Usuario encontrado:\n')
    console.log(`   📧 Email: ${profile.email}`)
    console.log(`   👤 Nombre: ${profile.full_name}`)
    console.log(`   🔑 Rol: ${profile.role}`)
    console.log(`   ✓ Estado: ${profile.status}`)
    console.log(`   🏢 Organization ID: ${profile.organization_id}`)
    
    console.log('\n╔════════════════════════════════════════════════════════╗')
    console.log('║              ✅ Usuario verificado                       ║')
    console.log('╚════════════════════════════════════════════════════════╝\n')
    
    console.log('🔐 Credenciales de acceso:')
    console.log(`   Email: mastudillo@lapatagua.cl`)
    console.log(`   Contraseña temporal: TempPassword123!@#`)
    console.log(`   Rol: Jefe de Mantención`)
    console.log('\n')

  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

verifyUser()
