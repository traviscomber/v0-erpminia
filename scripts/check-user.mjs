import { createClient } from '@supabase/supabase-js'
import * as dotenv from 'dotenv'

dotenv.config({ path: '.env.development.local' })

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

const supabase = createClient(supabaseUrl, serviceRoleKey)

async function checkUser() {
  try {
    console.log('\n🔍 Verificando estado del usuario...\n')

    // Check in auth
    const { data: authUsers } = await supabase.auth.admin.listUsers()
    const authUser = authUsers.users.find(u => u.email === 'mastudillo@lapatagua.cl')
    
    if (authUser) {
      console.log('✓ Usuario en Auth:')
      console.log(`  - ID: ${authUser.id}`)
      console.log(`  - Email: ${authUser.email}`)
      console.log(`  - Email Confirmed: ${authUser.email_confirmed_at ? 'Sí' : 'No'}`)
    } else {
      console.log('✗ Usuario NO encontrado en Auth')
    }

    // Check in profiles
    const { data: profile, error } = await supabase
      .from('profiles')
      .select('*')
      .eq('email', 'mastudillo@lapatagua.cl')
      .single()

    if (profile) {
      console.log('\n✓ Usuario en Profiles:')
      console.log(`  - ID: ${profile.id}`)
      console.log(`  - Email: ${profile.email}`)
      console.log(`  - Role: ${profile.role}`)
      console.log(`  - Status: ${profile.status}`)
    } else {
      console.log('\n✗ Usuario NO encontrado en Profiles:', error?.message)
    }

  } catch (err) {
    console.error('Error:', err.message)
  }
}

checkUser()
