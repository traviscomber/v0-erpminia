import { createClient } from '@/lib/supabase/server';
import { NextResponse } from 'next/server';

export async function POST(request: NextRequest) {
  try {
    const { email, password } = await request.json();

    if (!email || !password) {
      return NextResponse.json(
        { error: 'Email and password required' },
        { status: 400 }
      );
    }

    // Validate password strength
    const passwordStrength = validatePasswordStrength(password);
    if (!passwordStrength.isValid) {
      return NextResponse.json(
        { error: 'Password does not meet security requirements', details: passwordStrength.errors },
        { status: 400 }
      );
    }

    const supabase = await createClient();

    // Sign up with email verification required
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        emailRedirectTo: `${process.env.NEXT_PUBLIC_APP_URL}/auth/callback`,
        data: {
          email_verified: false,
          login_attempts: 0,
          last_login: null,
        }
      }
    });

    if (error) {
      // Log failed signup attempt
      await logAuthAttempt(email, 'signup_failed', false, error.message);
      return NextResponse.json(
        { error: error.message },
        { status: 400 }
      );
    }

    // Log successful signup
    await logAuthAttempt(email, 'signup_success', true);

    return NextResponse.json({
      success: true,
      message: 'Verification email sent. Please check your inbox.',
      user: data.user
    });
  } catch (err) {
    console.error('[v0] Signup error:', err);
    return NextResponse.json(
      { error: 'Internal server error' },
      { status: 500 }
    );
  }
}

// Password strength validation
function validatePasswordStrength(password: string) {
  const errors = [];
  
  if (password.length < 12) {
    errors.push('Password must be at least 12 characters long');
  }
  
  if (!/[A-Z]/.test(password)) {
    errors.push('Password must contain at least one uppercase letter');
  }
  
  if (!/[a-z]/.test(password)) {
    errors.push('Password must contain at least one lowercase letter');
  }
  
  if (!/[0-9]/.test(password)) {
    errors.push('Password must contain at least one number');
  }
  
  if (!/[!@#$%^&*()_+\-=\[\]{};':"\\|,.<>\/?]/.test(password)) {
    errors.push('Password must contain at least one special character');
  }

  return {
    isValid: errors.length === 0,
    errors
  };
}

// Log authentication attempts
async function logAuthAttempt(
  email: string,
  action: string,
  success: boolean,
  error?: string
) {
  const supabase = await createClient();
  
  await supabase
    .from('user_activity_log')
    .insert({
      user_id: null, // Not yet authenticated
      action,
      module: 'auth',
      status: success ? 'success' : 'failed',
      error_message: error || null,
      ip_address: null // Would come from request headers in real implementation
    });
}

// Import types
import { NextRequest } from 'next/server';
