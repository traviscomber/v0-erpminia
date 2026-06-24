import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'
import bcrypt from 'bcrypt'

dotenv.config({ path: '.env.development.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function resetPasswords() {
  try {
    console.log('\n╔════════════════════════════════════════════════════════╗')
    console.log('║  Restableciendo contraseñas                             ║')
    console.log('╚════════════════════════════════════════════════════════╝\n')

    const users = [
      'mastudillo@lapatagua.cl',
      'ariellopez@lapatagua.cl'
    ]
    const newPassword = 'labbe2026'
    // Hash password with bcrypt (12 rounds)
    const passwordHash = await bcrypt.hash(newPassword, 12)

    for (const email of users) {
      console.log(`Actualizando ${email}...`)

      // Get user ID from Auth
      const { data: authUsers } = await supabase.auth.admin.listUsers()
      const user = authUsers.users.find(u => u.email === email)

      if (!user) {
        console.log(`  ⚠️  Usuario no encontrado en Auth`)
        continue
      }

      // Update Auth password
      const { error: authError } = await supabase.auth.admin.updateUserById(user.id, {
        password: newPassword
      })

      if (authError) {
        console.error(`  ❌ Error en Auth:`, authError.message)
        continue
      }

      console.log(`  ✓ Auth actualizado`)

      // Update profiles password_hash
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ password_hash: passwordHash })
        .eq('id', user.id)

      if (profileError) {
        console.error(`  ❌ Error en Profiles:`, profileError.message)
        continue
      }

      console.log(`  ✓ Profiles actualizado`)
      console.log(`  ✓ ${email} listo\n`)
    }

    console.log('╔════════════════════════════════════════════════════════╗')
    console.log('║         ✅ Contraseñas restablecidas                    ║')
    console.log('╚════════════════════════════════════════════════════════╝\n')
    
    console.log('🔐 Credenciales actuales:\n')
    console.log('1. mastudillo@lapatagua.cl | labbe2026')
    console.log('2. ariellopez@lapatagua.cl | labbe2026\n')

  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

resetPasswords()
