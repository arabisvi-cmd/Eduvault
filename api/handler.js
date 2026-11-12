function jsonResponse(data, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: {
      'Content-Type': 'application/json',
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization',
    },
  });
}

const ALLOWED_USER_TYPES = new Set(['admin', 'teacher', 'student', 'non_teaching_staff']);

function normalizeUserType(value) {
  const key = String(value || '').trim().toLowerCase().replace(/\s+/g, '_');
  return ALLOWED_USER_TYPES.has(key) ? key : null;
}

function canWriteWorkspace(user) {
  const t = normalizeUserType(user?.user_type);
  return t === 'admin' || t === 'teacher';
}

async function requireUserByEmail(env, email) {
  const normalized = String(email || '').toLowerCase().trim();
  if (!normalized) return null;
  return env.DB.prepare('SELECT * FROM users WHERE email = ?').bind(normalized).first();
}

async function verifyUserPassword(env, user, password) {
  const { hash } = await hashPassword(password, user.salt);
  return hash === user.password_hash;
}

function pathSuffixId(path, prefix) {
  if (!path.startsWith(`${prefix}/`)) return null;
  const id = path.slice(prefix.length + 1);
  return id && !id.includes('/') ? id : null;
}

function mapVaultSectionRow(row) {
  return {
    id: row.id,
    name: row.name,
    institution_id: row.institution_id,
    sort_order: row.sort_order ?? 0,
  };
}

function mapFolderRow(row) {
  return {
    id: row.id,
    institution_id: row.institution_id,
    vault_section_id: row.vault_section_id || null,
    parent_folder_id: row.parent_folder_id || null,
    name: row.name,
    path_label: row.path_label || '',
  };
}

async function isFolderCycle(env, folderId, newParentId) {
  if (!newParentId || newParentId === folderId) return true;
  let currentId = newParentId;
  const seen = new Set();
  while (currentId) {
    if (currentId === folderId) return true;
    if (seen.has(currentId)) break;
    seen.add(currentId);
    const row = await env.DB.prepare('SELECT parent_folder_id FROM folders WHERE id = ?').bind(currentId).first();
    if (!row) break;
    currentId = row.parent_folder_id;
  }
  return false;
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

async function syncUserTypeFromRoster(env, userRow) {
  const directoryEntry = await lookupDirectoryUser(env, userRow.email);
  if (!directoryEntry) return userRow;
  const rosterType = normalizeUserType(directoryEntry.user_type);
  if (!rosterType || rosterType === userRow.user_type) return userRow;
  await env.DB.prepare('UPDATE users SET user_type = ? WHERE id = ?').bind(rosterType, userRow.id).run();
  return { ...userRow, user_type: rosterType };
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
        'Access-Control-Allow-Methods': 'GET, POST, PATCH, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type, Authorization',
      },
    });
  }

  if (!env.DB) {
    return jsonResponse({ error: 'D1 database binding (DB) is not configured.' }, 500);
  }

  try {
    if (path === '/documents' && request.method === 'GET') {
      const institutionId = url.searchParams.get('institution_id') || '';
      const { results } = institutionId
        ? await env.DB.prepare(
            'SELECT * FROM documents WHERE institution = ? ORDER BY created_at DESC LIMIT 200'
          ).bind(institutionId).all()
        : await env.DB.prepare(
            'SELECT * FROM documents ORDER BY created_at DESC LIMIT 200'
          ).all();
      return jsonResponse({ data: results || [] });
    }

    if (path === '/documents' && request.method === 'POST') {
      const body = await request.json();
      const actor = await requireUserByEmail(env, body.email);
      if (!actor) {
        return jsonResponse({ error: 'Valid email is required to upload documents' }, 401);
      }
      if (!canWriteWorkspace(actor)) {
        return jsonResponse({ error: 'You have read-only access' }, 403);
      }
      const id = body.id || `doc-${Date.now()}`;
      const folderId = body.folder_id || body.folderId || null;
      const vaultSectionId = body.vault_section_id || body.vaultSectionId || null;
      await env.DB.prepare(
        `INSERT INTO documents (
          id, title, institution, academic_year, class_grade, subject, timeline, file_type, file_size, owner, section, role, folder_id, vault_section_id
        ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`
      ).bind(
        id,
        body.title || 'Untitled Document',
        body.institution || actor.institution || '',
        body.academic_year || body.year || '',
        body.class_grade || body.class || '',
        body.subject || '',
        body.timeline || '',
        body.file_type || body.type || 'pdf',
        body.file_size || body.size || '1.0 MB',
        body.owner || actor.email,
        body.section || 'Section A',
        body.role || 'students',
        folderId,
        vaultSectionId
      ).run();

      return jsonResponse({ success: true, data: { id, ...body, folder_id: folderId, vault_section_id: vaultSectionId } });
    }

    const documentPatchId = pathSuffixId(path, '/documents');
    if (documentPatchId && request.method === 'PATCH') {
      const body = await request.json();
      const actor = await requireUserByEmail(env, body.email);
      if (!actor) return jsonResponse({ error: 'Valid email is required' }, 401);
      if (!canWriteWorkspace(actor)) return jsonResponse({ error: 'You have read-only access' }, 403);

      const existing = await env.DB.prepare('SELECT * FROM documents WHERE id = ?').bind(documentPatchId).first();
      if (!existing) return jsonResponse({ error: 'Document not found' }, 404);

      const folderId = body.folder_id !== undefined
        ? (body.folder_id || body.folderId || null)
        : existing.folder_id;
      let vaultSectionId = body.vault_section_id !== undefined
        ? (body.vault_section_id || body.vaultSectionId || null)
        : existing.vault_section_id;

      if (body.folder_id !== undefined || body.folderId !== undefined) {
        const fid = folderId;
        if (fid) {
          const folder = await env.DB.prepare('SELECT vault_section_id FROM folders WHERE id = ?').bind(fid).first();
          if (!folder) return jsonResponse({ error: 'Destination folder not found' }, 400);
          vaultSectionId = folder.vault_section_id || null;
        }
      }

      await env.DB.prepare(
        'UPDATE documents SET folder_id = ?, vault_section_id = ? WHERE id = ?'
      ).bind(folderId, vaultSectionId, documentPatchId).run();

      return jsonResponse({
        success: true,
        data: { ...existing, folder_id: folderId, vault_section_id: vaultSectionId },
      });
    }

    if (path === '/vault-sections' && request.method === 'GET') {
      const institutionId = url.searchParams.get('institution_id') || '';
      if (!institutionId) return jsonResponse({ error: 'institution_id is required' }, 400);
      const { results } = await env.DB.prepare(
        'SELECT * FROM vault_sections WHERE institution_id = ? ORDER BY sort_order ASC, created_at ASC'
      ).bind(institutionId).all();
      return jsonResponse({ data: (results || []).map(mapVaultSectionRow) });
    }

    if (path === '/vault-sections' && request.method === 'POST') {
      const body = await request.json();
      const actor = await requireUserByEmail(env, body.email);
      if (!actor) return jsonResponse({ error: 'Valid email is required' }, 401);
      if (!canWriteWorkspace(actor)) return jsonResponse({ error: 'You have read-only access' }, 403);

      const name = String(body.name || '').trim();
      const institutionId = body.institution_id || body.institutionId || actor.institution || '';
      if (!name || !institutionId) {
        return jsonResponse({ error: 'name and institution_id are required' }, 400);
      }

      const id = body.id || `section-${Date.now()}`;
      await env.DB.prepare(
        `INSERT INTO vault_sections (id, institution_id, name, sort_order, created_by)
         VALUES (?, ?, ?, ?, ?)`
      ).bind(id, institutionId, name, Number(body.sort_order) || 0, actor.id).run();

      return jsonResponse({ success: true, data: mapVaultSectionRow({ id, institution_id: institutionId, name, sort_order: 0 }) });
    }

    if (path === '/vault-sections/delete' && request.method === 'POST') {
      const body = await request.json();
      const actor = await requireUserByEmail(env, body.email);
      if (!actor) return jsonResponse({ error: 'Valid email is required' }, 401);
      if (!canWriteWorkspace(actor)) return jsonResponse({ error: 'You have read-only access' }, 403);
      if (!body.password || !(await verifyUserPassword(env, actor, body.password))) {
        return jsonResponse({ error: 'Password is incorrect' }, 401);
      }

      const sectionId = body.id;
      if (!sectionId) return jsonResponse({ error: 'Section id is required' }, 400);

      const section = await env.DB.prepare(
        'SELECT id FROM vault_sections WHERE id = ? AND institution_id = ?'
      ).bind(sectionId, body.institution_id || body.institutionId || actor.institution || '').first();
      if (!section) return jsonResponse({ error: 'Section not found' }, 404);

      await env.DB.batch([
        env.DB.prepare(
          `DELETE FROM documents WHERE vault_section_id = ?
           OR folder_id IN (SELECT id FROM folders WHERE vault_section_id = ?)`
        ).bind(sectionId, sectionId),
        env.DB.prepare('DELETE FROM folders WHERE vault_section_id = ?').bind(sectionId),
        env.DB.prepare('DELETE FROM vault_sections WHERE id = ?').bind(sectionId),
      ]);

      return jsonResponse({ success: true });
    }

    if (path === '/folders' && request.method === 'GET') {
      const institutionId = url.searchParams.get('institution_id') || '';
      if (!institutionId) return jsonResponse({ error: 'institution_id is required' }, 400);
      const { results } = await env.DB.prepare(
        'SELECT * FROM folders WHERE institution_id = ? ORDER BY created_at DESC'
      ).bind(institutionId).all();
      return jsonResponse({ data: (results || []).map(mapFolderRow) });
    }

    if (path === '/folders' && request.method === 'POST') {
      const body = await request.json();
      const actor = await requireUserByEmail(env, body.email);
      if (!actor) return jsonResponse({ error: 'Valid email is required' }, 401);
      if (!canWriteWorkspace(actor)) return jsonResponse({ error: 'You have read-only access' }, 403);

      const name = String(body.name || '').trim();
      const institutionId = body.institution_id || body.institutionId || actor.institution || '';
      if (!name || !institutionId) {
        return jsonResponse({ error: 'name and institution_id are required' }, 400);
      }

      const parentFolderId = body.parent_folder_id || body.parentFolderId || null;
      let vaultSectionId = body.vault_section_id || body.vaultSectionId || null;

      if (parentFolderId) {
        const parent = await env.DB.prepare('SELECT institution_id, vault_section_id FROM folders WHERE id = ?')
          .bind(parentFolderId).first();
        if (!parent || parent.institution_id !== institutionId) {
          return jsonResponse({ error: 'Parent folder not found' }, 400);
        }
        vaultSectionId = parent.vault_section_id || null;
      }

      const id = body.id || `folder-${Date.now()}`;
      const pathLabel = body.path_label || body.path || '';

      await env.DB.prepare(
        `INSERT INTO folders (id, institution_id, vault_section_id, parent_folder_id, name, path_label)
         VALUES (?, ?, ?, ?, ?, ?)`
      ).bind(id, institutionId, vaultSectionId, parentFolderId, name, pathLabel).run();

      return jsonResponse({
        success: true,
        data: mapFolderRow({
          id,
          institution_id: institutionId,
          vault_section_id: vaultSectionId,
          parent_folder_id: parentFolderId,
          name,
          path_label: pathLabel,
        }),
      });
    }

    const folderPatchId = pathSuffixId(path, '/folders');
    if (folderPatchId && request.method === 'PATCH') {
      const body = await request.json();
      const actor = await requireUserByEmail(env, body.email);
      if (!actor) return jsonResponse({ error: 'Valid email is required' }, 401);
      if (!canWriteWorkspace(actor)) return jsonResponse({ error: 'You have read-only access' }, 403);

      const existing = await env.DB.prepare('SELECT * FROM folders WHERE id = ?').bind(folderPatchId).first();
      if (!existing) return jsonResponse({ error: 'Folder not found' }, 404);

      const parentFolderId = body.parent_folder_id !== undefined
        ? (body.parent_folder_id || body.parentFolderId || null)
        : existing.parent_folder_id;
      let vaultSectionId = body.vault_section_id !== undefined
        ? (body.vault_section_id || body.vaultSectionId || null)
        : existing.vault_section_id;

      if (body.parent_folder_id !== undefined || body.parentFolderId !== undefined) {
        if (parentFolderId && await isFolderCycle(env, folderPatchId, parentFolderId)) {
          return jsonResponse({ error: 'Invalid folder move' }, 400);
        }
        if (parentFolderId) {
          const parent = await env.DB.prepare('SELECT vault_section_id FROM folders WHERE id = ?')
            .bind(parentFolderId).first();
          if (!parent) return jsonResponse({ error: 'Parent folder not found' }, 400);
          vaultSectionId = parent.vault_section_id || null;
        } else if (body.vault_section_id !== undefined || body.vaultSectionId !== undefined) {
          vaultSectionId = body.vault_section_id || body.vaultSectionId || null;
        }
      }

      const name = body.name !== undefined ? String(body.name).trim() : existing.name;

      await env.DB.prepare(
        `UPDATE folders SET parent_folder_id = ?, vault_section_id = ?, name = ?
         WHERE id = ?`
      ).bind(parentFolderId, vaultSectionId, name || existing.name, folderPatchId).run();

      return jsonResponse({
        success: true,
        data: mapFolderRow({
          ...existing,
          parent_folder_id: parentFolderId,
          vault_section_id: vaultSectionId,
          name: name || existing.name,
        }),
      });
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

      const syncedUser = await syncUserTypeFromRoster(env, user);

      return jsonResponse({
        success: true,
        user: publicUser(syncedUser),
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

      const synced = await syncUserTypeFromRoster(env, user);
      if (normalizeUserType(synced.user_type) !== 'admin') {
        return jsonResponse({ error: 'Only administrators can delete accounts' }, 403);
      }

      await env.DB.prepare('DELETE FROM users WHERE id = ?').bind(user.id).run();
      return jsonResponse({ success: true });
    }

    return jsonResponse({ error: `Not found: ${path}` }, 404);
  } catch (err) {
    return jsonResponse({ error: err.message || 'Internal Server Error' }, 500);
  }
}
