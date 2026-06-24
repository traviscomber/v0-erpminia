import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import crypto from 'crypto'

dotenv.config({ path: '.env.development.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

if (!supabaseUrl || !serviceRoleKey) {
  console.error('❌ Missing Supabase environment variables')
  process.exit(1)
}

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function updatePasswords() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════╗')
    console.log('║     Actualizando contraseñas de usuarios                ║')
    console.log('╚════════════════════════════════════════════════════════╝\n')

    const users = [
      'mastudillo@lapatagua.cl',
      'ariellopez@lapatagua.cl'
    ]
    const newPassword = 'labbe2026'
    const passwordHash = crypto.createHash('sha256').update(newPassword).digest('hex')

    for (const email of users) {
      console.log(`Actualizando ${email}...`)

      // 1. Update Auth password
      const { data: authUser } = await supabase.auth.admin.listUsers()
      const user = authUser.users.find(u => u.email === email)

      if (!user) {
        console.log(`  ⚠️  Usuario no encontrado en Auth`)
        continue
      }

      const { error: authError } = await supabase.auth.admin.updateUserById(user.id, {
        password: newPassword
      })

      if (authError) {
        console.error(`  ❌ Error actualizando Auth:`, authError.message)
        continue
      }

      console.log(`  ✓ Contraseña en Auth actualizada`)

      // 2. Update profiles password_hash
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ password_hash: passwordHash })
        .eq('email', email)

      if (profileError) {
        console.error(`  ❌ Error actualizando profiles:`, profileError.message)
        continue
      }

      console.log(`  ✓ Hash en profiles actualizado`)
      console.log(`  ✓ ${email} listo\n`)
    }

    console.log('╔════════════════════════════════════════════════════════╗')
    console.log('║         ✅ Contraseñas actualizadas                     ║')
    console.log('╚════════════════════════════════════════════════════════╝\n')
    
    console.log('🔐 Nuevas credenciales:\n')
    console.log('1. mastudillo@lapatagua.cl')
    console.log('   Contraseña: labbe2026\n')
    console.log('2. ariellopez@lapatagua.cl')
    console.log('   Contraseña: labbe2026\n')

  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

updatePasswords()
