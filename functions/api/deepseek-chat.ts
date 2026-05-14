interface Env {
  DEEPSEEK_API_KEY: string;
}

const DEEPSEEK_API_URL = 'https://api.deepseek.com/chat/completions';
const DEFAULT_MODEL = 'deepseek-v4-flash';

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': 'Content-Type'
};

const jsonResponse = (body: unknown, init: ResponseInit = {}) =>
  new Response(JSON.stringify(body), {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...corsHeaders,
      ...(init.headers || {})
    }
  });

export const onRequest: PagesFunction<Env> = async ({ request, env }) => {
  if (request.method === 'OPTIONS') {
    return new Response(null, { status: 204, headers: corsHeaders });
  }

  if (request.method !== 'POST') {
    return jsonResponse({ error: 'Method not allowed.' }, { status: 405 });
  }

  if (!env.DEEPSEEK_API_KEY) {
    return jsonResponse(
      { error: 'DEEPSEEK_API_KEY is not configured on the server.' },
      { status: 500 }
    );
  }

  let body: any;
  try {
    body = await request.json();
  } catch {
    return jsonResponse({ error: 'Invalid JSON request body.' }, { status: 400 });
  }

  if (!Array.isArray(body?.messages)) {
    return jsonResponse({ error: 'Request body must include a messages array.' }, { status: 400 });
  }

  const deepSeekBody = {
    model: body.model || DEFAULT_MODEL,
    messages: body.messages,
    response_format: body.response_format || { type: 'json_object' },
    thinking: body.thinking || { type: 'disabled' },
    temperature: typeof body.temperature === 'number' ? body.temperature : 0.1
  };

  const response = await fetch(DEEPSEEK_API_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${env.DEEPSEEK_API_KEY}`
    },
    body: JSON.stringify(deepSeekBody)
  });

  const text = await response.text();
  return new Response(text, {
    status: response.status,
    headers: {
      'Content-Type': response.headers.get('Content-Type') || 'application/json',
      ...corsHeaders
    }
  });
};
