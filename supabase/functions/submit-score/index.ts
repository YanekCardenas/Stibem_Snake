import { createClient } from 'https://esm.sh/@supabase/supabase-js@2'

const supabaseUrl = Deno.env.get('SUPABASE_URL')!
const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY')!

const MAX_POINTS_PER_SECOND = 0.6
const SCORE_GRACE = 15

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
}

Deno.serve(async (req) => {
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders })
  }

  try {
    const { token, name, score } = await req.json()

    if (!token || typeof score !== 'number' || !name) {
      return new Response(JSON.stringify({ error: 'Datos incompletos' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey)

    const { data: session, error: sessionError } = await supabase
      .from('game_sessions')
      .select('id, started_at, used')
      .eq('id', token)
      .single()

    if (sessionError || !session) {
      return new Response(JSON.stringify({ error: 'Sesión inválida' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    if (session.used) {
      return new Response(JSON.stringify({ error: 'Esta sesión ya se usó' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const elapsedSeconds = (Date.now() - new Date(session.started_at).getTime()) / 1000
    const maxPossibleScore = SCORE_GRACE + elapsedSeconds * MAX_POINTS_PER_SECOND

    if (score < 0 || score > maxPossibleScore) {
      return new Response(JSON.stringify({ error: 'Score no válido para el tiempo jugado' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { data: claimed } = await supabase
      .from('game_sessions')
      .update({ used: true })
      .eq('id', token)
      .eq('used', false)
      .select('id')

    if (!claimed?.length) {
      return new Response(JSON.stringify({ error: 'Esta sesión ya se usó' }), {
        status: 400,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    const { error: insertError } = await supabase
      .from('scores')
      .insert({ name: String(name).slice(0, 20), score })

    if (insertError) {
      return new Response(JSON.stringify({ error: insertError.message }), {
        status: 500,
        headers: { ...corsHeaders, 'Content-Type': 'application/json' },
      })
    }

    return new Response(JSON.stringify({ ok: true }), {
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  } catch {
    return new Response(JSON.stringify({ error: 'Error interno' }), {
      status: 500,
      headers: { ...corsHeaders, 'Content-Type': 'application/json' },
    })
  }
})