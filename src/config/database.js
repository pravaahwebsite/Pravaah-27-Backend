const supabaseUrl = () => {
  const value = process.env.SUPABASE_URL;
  if (!value) throw new Error('SUPABASE_URL is not configured');
  return value.replace(/\/$/, '');
};

const serviceKey = () => {
  const value = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!value) throw new Error('SUPABASE_SERVICE_ROLE_KEY is not configured');
  return value;
};

export async function supabaseRequest(path, { method = 'GET', body } = {}) {
  const key = serviceKey();
  const headers = {
    apikey: key,
    'Content-Type': 'application/json',
    Prefer: 'return=representation,resolution=merge-duplicates',
  };
  // Legacy service_role keys are JWTs; current sb_secret keys are API keys.
  if (!key.startsWith('sb_secret_')) headers.Authorization = `Bearer ${key}`;
  const response = await fetch(`${supabaseUrl()}/rest/v1/${path}`, {
    method,
    headers,
    body: body === undefined ? undefined : JSON.stringify(body),
  });
  const text = await response.text();
  if (!response.ok) throw new Error(`Supabase API ${response.status}: ${text}`);
  return text ? JSON.parse(text) : [];
}

export async function checkDatabase() {
  await supabaseRequest('profiles?select=firebase_uid&limit=1');
}

export async function closeDatabasePool() {}
