import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.development.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function updateUserProfile() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════╗')
    console.log('║    Actualizando perfil de administrador                ║')
    console.log('╚════════════════════════════════════════════════════════╝\n')

    const { error } = await supabase
      .from('profiles')
      .update({
        full_name: 'Jefe de Mantención y Equipos Móviles y Estacionarios'
      })
      .eq('email', 'mastudillo@lapatagua.cl')

    if (error) {
      console.error('❌ Error:', error.message)
      process.exit(1)
    }

    console.log('✓ Perfil actualizado exitosamente\n')

    // Verificar
    const { data: profile } = await supabase
      .from('profiles')
      .select('email, full_name, role')
      .eq('email', 'mastudillo@lapatagua.cl')
      .single()

    console.log('✓ Datos actualizados:')
    console.log(`  Email: ${profile.email}`)
    console.log(`  Nombre: ${profile.full_name}`)
    console.log(`  Rol: ${profile.role}`)
    console.log('\n')

  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

updateUserProfile()
