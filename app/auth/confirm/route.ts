import { createServerClient } from '@supabase/ssr'
import { type EmailOtpType } from '@supabase/supabase-js'
import { NextRequest, NextResponse } from 'next/server'

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url)
  const code = searchParams.get('code')
  const token_hash = searchParams.get('token_hash')
  const type = searchParams.get('type') as EmailOtpType | null
  const callbackUrl = `${origin}/auth/callback`

  const response = NextResponse.redirect(callbackUrl)

  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        get(name) {
          return request.cookies.get(name)?.value
        },
        set(name, value, options) {
          response.cookies.set({ name, value, ...options })
        },
        remove(name, options) {
          response.cookies.set({ name, value: '', ...options })
        },
      },
    }
  )

  let error: Error | null = null

  if (token_hash && type) {
    // token_hash flow — no PKCE verifier needed, works cross-browser
    const result = await supabase.auth.verifyOtp({ token_hash, type })
    error = result.error
  } else if (code) {
    // PKCE code flow — verifier must be in cookies (set by server action)
    const result = await supabase.auth.exchangeCodeForSession(code)
    error = result.error
  } else {
    return NextResponse.redirect(`${callbackUrl}?error=no_code`)
  }

  if (error) {
    return NextResponse.redirect(`${callbackUrl}?error=${encodeURIComponent(error.message)}`)
  }

  return response
}
