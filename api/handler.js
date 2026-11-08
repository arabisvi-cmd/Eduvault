function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

async function hashPassword(password, saltHex = null) {
  const enc = new TextEncoder();
  const salt = saltHex
    ? new Uint8Array(saltHex.match(/.{1,2}/g).map(byte => parseInt(byte, 16)))
    : crypto.getRandomValues(new Uint8Array(16));

  const keyMaterial = await crypto.subtle.importKey(
    'raw',
    enc.encode(password),
    { name: 'PBKDF2' },
    false,
    ['deriveBits', 'deriveKey']
  );

  const derivedKey = await crypto.subtle.deriveBits(
    {
      name: 'PBKDF2',
      salt,
      iterations: 100000,
      hash: 'SHA-256',
    },
    keyMaterial,
    256
  );

  const hashArray = Array.from(new Uint8Array(derivedKey));
  const hashHex = hashArray.map(b => b.toString(16).padStart(2, '0')).join('');
  const finalSaltHex = Array.from(salt).map(b => b.toString(16).padStart(2, '0')).join('');

  return { hash: hashHex, salt: finalSaltHex };
}

export async function handleApi(request, env) {
  const url = new URL(request.url);
  const path = url.pathname.replace(/^\/api/, '');

  if (request.method === 'OPTIONS') {
    return new Response(null, {
      status: 204,
      headers: {
        'Access-Control-Allow-Origin': '*',
        'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (!env.DB) {
    return jsonResponse({ error: 'D1 database binding (DB) is not configured.' }, 500);
  }

  try {
    if (path === '/documents' && request.method === 'GET') {
      const { results } = await env.DB.prepare(
        'SELECT * FROM documents ORDER BY created_at DESC LIMIT 100'
      ).all();
      return jsonResponse({ data: results || [] });
    }

    if (path === '/documents' && request.method === 'POST') {
      const body = await request.json();
      const id = body.id || `doc-${Date.now()}`;
      await env.DB.prepare(
        `INSERT INTO documents (
          id, title, institution, academic_year, class_grade, subject, timeline, file_type, file_size, owner, section, role, folder_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id,
        body.title || 'Untitled Document',
        body.institution || '',
        body.academic_year || body.year || '',
        body.class_grade || body.class || '',
        body.subject || '',
        body.timeline || '',
        body.file_type || body.type || 'pdf',
        body.file_size || body.size || '1.0 MB',
        body.owner || 'me',
        body.section || 'Section A',
        body.role || 'students',
        body.folder_id || body.folderId || null
      ).run();

      return jsonResponse({ success: true, data: { id, ...body } });
    }

    if (path === '/auth/signup' && request.method === 'POST') {
      const { email, password, full_name, institution } = await request.json();
      if (!email || !password) {
        return jsonResponse({ error: 'Email and password are required' }, 400);
      }

      const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(email.toLowerCase()).first();
      if (existing) {
        return jsonResponse({ error: 'User already exists' }, 409);
      }

      const { hash, salt } = await hashPassword(password);
      const userId = `usr_${Date.now()}`;

      await env.DB.prepare(
        'INSERT INTO users (id, email, password_hash, salt, full_name, institution) VALUES (?, ?, ?, ?, ?, ?)'
      ).bind(userId, email.toLowerCase(), hash, salt, full_name || '', institution || '').run();

      return jsonResponse({
        success: true,
        user: { id: userId, email: email.toLowerCase(), full_name, institution }
      });
    }

    if (path === '/auth/login' && request.method === 'POST') {
      const { email, password } = await request.json();
      if (!email || !password) {
        return jsonResponse({ error: 'Email and password are required' }, 400);
      }

      const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email.toLowerCase()).first();
      if (!user) {
        return jsonResponse({ error: 'Invalid email or password' }, 401);
      }

      const { hash } = await hashPassword(password, user.salt);
      if (hash !== user.password_hash) {
        return jsonResponse({ error: 'Invalid email or password' }, 401);
      }

      return jsonResponse({
        success: true,
        user: { id: user.id, email: user.email, full_name: user.full_name, institution: user.institution }
      });
    }

    return jsonResponse({ error: `Not found: ${path}` }, 404);
  } catch (err) {
    return jsonResponse({ error: err.message || 'Internal Server Error' }, 500);
  }
}
