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

const ALLOWED_USER_TYPES = new Set(['admin', 'teacher', 'student', 'non_teaching_staff']);

function normalizeUserType(value) {
  const key = String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
  return ALLOWED_USER_TYPES.has(key) ? key : null;
}

function publicUser(row) {
  return {
    id: row.id,
    email: row.email,
    full_name: row.full_name,
    institution: row.institution,
    profile_image: row.profile_image || '',
    user_type: row.user_type || 'student',
  };
}

async function lookupDirectoryUser(env, email) {
  return env.DB.prepare(
    'SELECT email, user_type, institution FROM user_directory WHERE email = ?'
  ).bind(email.toLowerCase()).first();
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

      const normalizedEmail = email.toLowerCase().trim();
      const existing = await env.DB.prepare('SELECT id FROM users WHERE email = ?').bind(normalizedEmail).first();
      if (existing) {
        return jsonResponse({ error: 'User already exists' }, 409);
      }

      const directoryEntry = await lookupDirectoryUser(env, normalizedEmail);
      if (!directoryEntry) {
        return jsonResponse({
          error: 'This email is not on your school roster. Contact an administrator to be added before signing up.',
        }, 403);
      }

      const userType = normalizeUserType(directoryEntry.user_type);
      if (!userType) {
        return jsonResponse({ error: 'Roster entry has an invalid user type. Contact an administrator.' }, 500);
      }

      const rosterInstitution = directoryEntry.institution || institution || '';

      const { hash, salt } = await hashPassword(password);
      const userId = `usr_${Date.now()}`;

      await env.DB.prepare(
        'INSERT INTO users (id, email, password_hash, salt, full_name, institution, user_type) VALUES (?, ?, ?, ?, ?, ?, ?)'
      ).bind(userId, normalizedEmail, hash, salt, full_name || '', rosterInstitution, userType).run();

      return jsonResponse({
        success: true,
        user: {
          id: userId,
          email: normalizedEmail,
          full_name,
          institution: rosterInstitution,
          profile_image: '',
          user_type: userType,
        }
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
        user: publicUser(user),
      });
    }

    if (path === '/auth/update-profile' && request.method === 'POST') {
      const { email, full_name } = await request.json();
      const trimmed = (full_name || '').trim();
      if (!email || !trimmed) {
        return jsonResponse({ error: 'Email and name are required' }, 400);
      }

      const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email.toLowerCase()).first();
      if (!user) {
        return jsonResponse({ error: 'Account not found' }, 404);
      }

      await env.DB.prepare('UPDATE users SET full_name = ? WHERE id = ?').bind(trimmed, user.id).run();
      const updated = { ...user, full_name: trimmed };
      return jsonResponse({ success: true, user: publicUser(updated) });
    }

    if (path === '/auth/profile-image' && request.method === 'POST') {
      const { email, image_data } = await request.json();
      if (!email || !image_data) {
        return jsonResponse({ error: 'Email and image are required' }, 400);
      }
      const isDataUrl = /^data:image\/(jpeg|jpg|png|webp|gif);base64,/i.test(image_data);
      if (!isDataUrl) {
        return jsonResponse({ error: 'Upload a JPEG, PNG, WebP, or GIF image' }, 400);
      }
      // shortcut: ~450KB data URL cap, revisit if avatars move to R2
      if (image_data.length > 450000) {
        return jsonResponse({ error: 'Image is too large (max about 400KB)' }, 400);
      }

      const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email.toLowerCase()).first();
      if (!user) {
        return jsonResponse({ error: 'Account not found' }, 404);
      }

      await env.DB.prepare('UPDATE users SET profile_image = ? WHERE id = ?').bind(image_data, user.id).run();
      const updated = { ...user, profile_image: image_data };
      return jsonResponse({ success: true, user: publicUser(updated) });
    }

    if (path === '/auth/change-password' && request.method === 'POST') {
      const { email, current_password, new_password } = await request.json();
      if (!email || !current_password || !new_password) {
        return jsonResponse({ error: 'Email, current password, and new password are required' }, 400);
      }
      if (new_password.length < 8) {
        return jsonResponse({ error: 'New password must be at least 8 characters' }, 400);
      }

      const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email.toLowerCase()).first();
      if (!user) {
        return jsonResponse({ error: 'Account not found' }, 404);
      }

      const { hash: currentHash } = await hashPassword(current_password, user.salt);
      if (currentHash !== user.password_hash) {
        return jsonResponse({ error: 'Current password is incorrect' }, 401);
      }

      const { hash, salt } = await hashPassword(new_password);
      await env.DB.prepare(
        'UPDATE users SET password_hash = ?, salt = ? WHERE id = ?'
      ).bind(hash, salt, user.id).run();

      return jsonResponse({ success: true });
    }

    if (path === '/auth/delete-account' && request.method === 'POST') {
      const { email, password } = await request.json();
      if (!email || !password) {
        return jsonResponse({ error: 'Email and password are required to delete your account' }, 400);
      }

      const user = await env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(email.toLowerCase()).first();
      if (!user) {
        return jsonResponse({ error: 'Account not found' }, 404);
      }

      const { hash } = await hashPassword(password, user.salt);
      if (hash !== user.password_hash) {
        return jsonResponse({ error: 'Password is incorrect' }, 401);
      }

      await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run();
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: `Not found: ${path}` }, 404);
  } catch (err) {
    return jsonResponse({ error: err.message || 'Internal Server Error' }, 500);
  }
}
