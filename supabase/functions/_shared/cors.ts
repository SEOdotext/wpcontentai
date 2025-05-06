export const corsHeaders = {
  'Access-Control-Allow-Origin': 'https://contentgardener.ai',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Credentials': 'true'
};

export function handleCors(req: Request) {
  // Always return CORS headers for OPTIONS requests
  if (req.method === 'OPTIONS') {
    return new Response('ok', { 
      headers: {
        ...corsHeaders,
        'Content-Type': 'text/plain'
      }
    })
  }
  return null
} 