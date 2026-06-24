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

async function createUser(email, fullName, role) {
  try {
    console.log('\n╔════════════════════════════════════════════════════════╗')
    console.log(`║  Creando usuario: ${email.padEnd(38)} ║`)
    console.log('╚════════════════════════════════════════════════════════╝\n')

    // 1. Obtener usuario de Supabase Auth o crear si no existe
    console.log('1. Buscando usuario en Auth...')
    const { data: existingUsers } = await supabase.auth.admin.listUsers()
    
    let userId
    const existingUser = existingUsers?.users?.find(u => u.email === email)
    
    if (existingUser) {
      console.log(`   ✓ Usuario encontrado: ${existingUser.id}`)
      userId = existingUser.id
    } else {
      console.log('   Creando usuario en Auth...')
      const { data: authUser, error: authError } = await supabase.auth.admin.createUser({
        email: email,
        password: 'TempPassword123!@#',
        email_confirm: true,
      })

      if (authError) {
        console.error('❌ Error creando usuario en Auth:', authError.message)
        process.exit(1)
      }

      console.log(`   ✓ Usuario creado: ${authUser.user.id}`)
      userId = authUser.user.id
    }

    // 2. Crear perfil en la tabla profiles
    console.log('\n2. Creando/actualizando perfil...')
    
    // Obtener organization_id
    const { data: org, error: orgError } = await supabase
      .from('organizations')
      .select('id')
      .limit(1)
      .single()

    if (orgError) {
      console.error('❌ Error obteniendo organización:', orgError.message)
      process.exit(1)
    }

    // Hash the password for the profiles table
    const passwordHash = crypto.createHash('sha256').update('TempPassword123!@#').digest('hex')

    const { error: profileError } = await supabase
      .from('profiles')
      .upsert([{
        id: userId,
        email: email,
        full_name: fullName,
        role: role,
        organization_id: org.id,
        status: 'active',
        password_hash: passwordHash,
      }], { onConflict: 'id' })

    if (profileError) {
      console.error('❌ Error creando perfil:', profileError.message)
      process.exit(1)
    }

    console.log('   ✓ Perfil creado/actualizado')

    // 3. Verificar
    console.log('\n3. Verificando usuario...')
    const { data: profile, error: verifyError } = await supabase
      .from('profiles')
      .select('id, email, full_name, role, status')
      .eq('email', email)
      .single()

    if (verifyError) {
      console.error('❌ Error verificando:', verifyError.message)
      process.exit(1)
    }

    console.log(`   ✓ Usuario verificado:`)
    console.log(`     - Email: ${profile.email}`)
    console.log(`     - Nombre: ${profile.full_name}`)
    console.log(`     - Rol: ${profile.role}`)
    console.log(`     - Estado: ${profile.status}`)

    console.log('\n╔════════════════════════════════════════════════════════╗')
    console.log('║         ✅ Usuario creado exitosamente                  ║')
    console.log('╚════════════════════════════════════════════════════════╝\n')
    console.log('📋 Credenciales:')
    console.log(`   📧 Email: ${email}`)
    console.log(`   🔐 Contraseña temporal: TempPassword123!@#`)
    console.log(`   👤 Rol: ${fullName}`)
    console.log('\n⚠️  El usuario debe cambiar la contraseña en el primer login\n')

  } catch (err) {
    console.error('❌ Error:', err.message)
    process.exit(1)
  }
}

// Get email and role from command line arguments
const email = process.argv[2] || 'ariellopez@lapatagua.cl'
const fullName = process.argv[3] || 'Jefe de Mantención y Equipos Móviles y Estacionarios'
const role = process.argv[4] || 'jefe_mantencion'

createUser(email, fullName, role)
