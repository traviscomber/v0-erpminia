import { createClient } from '@supabase/supabase-js';

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseServiceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseServiceKey) {
  console.error('Missing Supabase credentials');
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseServiceKey, {
  auth: {
    autoRefreshToken: false,
    persistSession: false,
  },
});

async function createDemoUser() {
  try {
    console.log('Creating demo user...');
    
    const { data, error } = await supabase.auth.admin.createUser({
      email: 'demo@n3uralia.com',
      password: 'DemoPass123!',
      email_confirm: true,
      user_metadata: {
        full_name: 'Admin Demo',
        role: 'admin',
      },
    });

    if (error) {
      console.error('Error creating user:', error.message);
      process.exit(1);
    }

    console.log('✅ Demo user created successfully!');
    console.log('Email:', data.user?.email);
    console.log('User ID:', data.user?.id);
    console.log('\n📝 Login credentials:');
    console.log('Email: demo@n3uralia.com');
    console.log('Password: DemoPass123!');
  } catch (err) {
    console.error('Error:', err);
    process.exit(1);
  }
}

createDemoUser();
