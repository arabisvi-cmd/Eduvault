import { supabase } from './supabase';

/**
 * ==============================================================================
 * EduVault: Document Operations & Storage Service (Phase 4B)
 * ==============================================================================
 * 
 * Architectural Guarantees:
 * 1. Storage bucket: 'eduvault-documents' (Private, non-public).
 * 2. Strict path convention: {institution_id}/{subject_id}/{document_id}/v{version}.{ext}
 * 3. MIME validation: Only approved academic formats (PDF, DOC, DOCX, XLS, XLSX, PNG, JPEG).
 * 4. Maximum file size: 50 MB (52,428,800 bytes).
 * 5. Explicit failure recovery: Storage upload rollback on DB failure.
 * 6. Academic authorization: Resolved securely from user session + RLS.
 * 7. Version immutability: Previous versions are preserved on update.
 */

export const STORAGE_BUCKET = 'eduvault-documents';
export const MAX_FILE_SIZE = 52428800; // 50 MB in bytes

export const ALLOWED_MIME_TYPES = [
  'application/pdf',
  'application/msword',
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  'application/vnd.ms-excel',
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  'image/png',
  'image/jpeg'
];

export const ALLOWED_STATUSES = ['DRAFT', 'PUBLISHED', 'ARCHIVED'];

const MIME_TO_EXTENSIONS = {
  'application/pdf': ['pdf'],
  'application/msword': ['doc'],
  'application/vnd.openxmlformats-officedocument.wordprocessingml.document': ['docx'],
  'application/vnd.ms-excel': ['xls'],
  'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet': ['xlsx'],
  'image/png': ['png'],
  'image/jpeg': ['jpg', 'jpeg']
};

const EXTENSION_TO_MIME = {
  pdf: 'application/pdf',
  doc: 'application/msword',
  docx: 'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
  xls: 'application/vnd.ms-excel',
  xlsx: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  png: 'image/png',
  jpg: 'image/jpeg',
  jpeg: 'image/jpeg'
};

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/**
 * Safely extracts sanitized alphanumeric extension from filename.
 * @param {string} fileName 
 * @returns {string}
 */
export function extractExtension(fileName) {
  if (!fileName || typeof fileName !== 'string') return '';
  const parts = fileName.trim().split('.');
  if (parts.length <= 1) return '';
  const rawExt = parts.pop().toLowerCase();
  return rawExt.replace(/[^a-z0-9]/g, '');
}

/**
 * Validates file size and MIME type against approved institutional policy.
 * @param {File|Blob|{ name: string, size: number, type: string }} file 
 * @returns {{ valid: boolean, error?: string, mimeType?: string, extension?: string, size?: number }}
 */
export function validateDocumentFile(file) {
  if (!file) {
    return { valid: false, error: 'No file provided.' };
  }

  if (typeof file.size === 'number' && file.size > MAX_FILE_SIZE) {
    const sizeMb = (file.size / (1024 * 1024)).toFixed(1);
    return {
      valid: false,
      error: `File size (${sizeMb} MB) exceeds the maximum allowed limit of 50 MB.`
    };
  }

  if (typeof file.size === 'number' && file.size === 0) {
    return { valid: false, error: 'File is empty (0 bytes).' };
  }

  const ext = extractExtension(file.name);
  const declaredMime = (file.type || '').trim().toLowerCase();

  // Resolve effective MIME type (handling browsers reporting generic or empty types)
  let effectiveMime = declaredMime;
  if (!effectiveMime || effectiveMime === 'application/octet-stream') {
    effectiveMime = EXTENSION_TO_MIME[ext] || '';
  }

  if (!ALLOWED_MIME_TYPES.includes(effectiveMime)) {
    return {
      valid: false,
      error: `Unsupported file type (${effectiveMime || ext || 'unknown'}). Allowed: PDF, DOC, DOCX, XLS, XLSX, PNG, JPEG.`
    };
  }

  const allowedExts = MIME_TO_EXTENSIONS[effectiveMime] || [];
  const safeExt = allowedExts.includes(ext) ? ext : allowedExts[0];

  return {
    valid: true,
    mimeType: effectiveMime,
    extension: safeExt,
    size: file.size
  };
}

/**
 * Validates document metadata before database operations.
 * @param {Object} metadata
 * @param {string} metadata.title
 * @param {string} [metadata.description]
 * @param {string} [metadata.folderId]
 * @returns {{ valid: boolean, error?: string, title?: string, description?: string|null, folderId?: string|null }}
 */
export function validateDocumentMetadata({ title, description, folderId }) {
  const cleanTitle = (title || '').trim();
  if (!cleanTitle) {
    return { valid: false, error: 'Document title is required.' };
  }
  if (cleanTitle.length > 255) {
    return { valid: false, error: 'Document title cannot exceed 255 characters.' };
  }

  const cleanDesc = (description || '').trim();
  if (cleanDesc.length > 2000) {
    return { valid: false, error: 'Document description cannot exceed 2000 characters.' };
  }

  if (folderId && !UUID_REGEX.test(folderId)) {
    return { valid: false, error: 'Invalid folder ID format.' };
  }

  return {
    valid: true,
    title: cleanTitle,
    description: cleanDesc || null,
    folderId: folderId || null
  };
}

/**
 * Generates the strictly enforced storage path:
 * {institution_id}/{subject_id}/{document_id}/v{version}.{ext}
 * 
 * @param {string} institutionId 
 * @param {string} subjectId 
 * @param {string} documentId 
 * @param {number} versionNumber 
 * @param {string} extension 
 * @returns {string}
 */
export function generateStoragePath(institutionId, subjectId, documentId, versionNumber, extension) {
  if (!institutionId || !subjectId || !documentId || !versionNumber || !extension) {
    throw new Error('All path components (institutionId, subjectId, documentId, versionNumber, extension) are required.');
  }
  const cleanExt = extension.replace(/^\./, '').toLowerCase();
  return `${institutionId}/${subjectId}/${documentId}/v${versionNumber}.${cleanExt}`;
}

/**
 * Retrieves the currently authenticated caller's profile securely from the database.
 * NEVER trusts frontend-supplied institution_id or role.
 * 
 * @returns {Promise<{ error?: string, user?: Object, profile?: Object }>}
 */
export async function getAuthenticatedCallerContext() {
  if (!supabase) {
    return { error: 'Supabase client is not configured.' };
  }

  const { data: { user }, error: authErr } = await supabase.auth.getUser();
  if (authErr || !user) {
    return { error: 'Unauthorized: Active user session required.' };
  }

  const { data: profile, error: profErr } = await supabase
    .from('users')
    .select('id, institution_id, role, full_name, email')
    .eq('id', user.id)
    .single();

  if (profErr || !profile) {
    return { error: 'Unauthorized: User profile not found in directory.' };
  }

  if (!profile.institution_id) {
    return { error: 'Forbidden: User is not linked to an institution.' };
  }

  return { user, profile };
}

/**
 * Verifies academic authorization for a subject.
 * - ADMIN: within own institution
 * - TEACHER: assigned to subject within own institution
 * 
 * @param {string} subjectId 
 * @param {Object} callerProfile 
 * @returns {Promise<{ allowed: boolean, error?: string, subject?: Object }>}
 */
export async function verifySubjectAcademicAccess(subjectId, callerProfile) {
  if (!subjectId || !UUID_REGEX.test(subjectId)) {
    return { allowed: false, error: 'Valid subject ID is required.' };
  }

  const { data: subject, error: subjErr } = await supabase
    .from('subjects')
    .select(`
      id,
      name,
      term:terms!inner(
        id,
        program:programs!inner(
          id,
          academic_year:academic_years!inner(
            id,
            institution_id
          )
        )
      )
    `)
    .eq('id', subjectId)
    .single();

  if (subjErr || !subject) {
    return { allowed: false, error: 'Subject not found or inaccessible.' };
  }

  const subjectInstId = subject.term?.program?.academic_year?.institution_id;
  if (subjectInstId !== callerProfile.institution_id) {
    return { allowed: false, error: 'Forbidden: Subject does not belong to your institution.' };
  }

  if (callerProfile.role === 'ADMIN') {
    return { allowed: true, subject };
  }

  if (callerProfile.role === 'TEACHER') {
    const { data: assignment, error: assignErr } = await supabase
      .from('teacher_assignments')
      .select('id')
      .eq('user_id', callerProfile.id)
      .eq('subject_id', subjectId)
      .maybeSingle();

    if (assignErr || !assignment) {
      return { allowed: false, error: 'Forbidden: You are not assigned to teach this subject.' };
    }
    return { allowed: true, subject };
  }

  return { allowed: false, error: 'Forbidden: Insufficient role permissions to modify materials.' };
}

/**
 * 1. Creates a new document with an initial version (v1) and uploads the physical file.
 * 
 * Explicit failure recovery:
 * If any database operation fails after storage upload, attempts cleanup of the
 * newly uploaded object in 'eduvault-documents'.
 * 
 * @param {Object} params
 * @param {File|Blob} params.file
 * @param {string} params.subjectId
 * @param {string} [params.folderId]
 * @param {string} params.title
 * @param {string} [params.description]
 * @returns {Promise<{ success: boolean, document?: Object, version?: Object, error?: string }>}
 */
export async function createDocumentWithInitialVersion({ file, subjectId, folderId, title, description }) {
  // 1. Validate File
  const fileValidation = validateDocumentFile(file);
  if (!fileValidation.valid) {
    return { success: false, error: fileValidation.error };
  }

  // 2. Validate Metadata
  const metaValidation = validateDocumentMetadata({ title, description, folderId });
  if (!metaValidation.valid) {
    return { success: false, error: metaValidation.error };
  }

  // 3. Resolve Caller Context
  const caller = await getAuthenticatedCallerContext();
  if (caller.error) {
    return { success: false, error: caller.error };
  }
  const { profile } = caller;

  // 4. Verify Academic Authorization
  const authCheck = await verifySubjectAcademicAccess(subjectId, profile);
  if (!authCheck.allowed) {
    return { success: false, error: authCheck.error };
  }

  // 5. Verify Folder if provided
  if (metaValidation.folderId) {
    const { data: folder, error: fErr } = await supabase
      .from('folders')
      .select('id, subject_id')
      .eq('id', metaValidation.folderId)
      .single();

    if (fErr || !folder || folder.subject_id !== subjectId) {
      return { success: false, error: 'Invalid folder: folder does not belong to the selected subject.' };
    }
  }

  // 6. Generate IDs & Path
  const documentId = typeof crypto !== 'undefined' && crypto.randomUUID ? crypto.randomUUID() : (
    'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, c => {
      const r = Math.random() * 16 | 0;
      return (c === 'x' ? r : (r & 0x3 | 0x8)).toString(16);
    })
  );
  const versionNumber = 1;
  const storagePath = generateStoragePath(
    profile.institution_id,
    subjectId,
    documentId,
    versionNumber,
    fileValidation.extension
  );

  // 7. Upload physical file to Storage Bucket
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, {
      contentType: fileValidation.mimeType,
      upsert: false
    });

  if (uploadError) {
    return { success: false, error: `Storage upload failed: ${uploadError.message}` };
  }

  // Helper for explicit storage failure cleanup
  const cleanupStorageObject = async () => {
    try {
      const { error: remErr } = await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      if (remErr) {
        return ` (Storage cleanup warning: ${remErr.message})`;
      }
      return '';
    } catch (e) {
      return ` (Storage cleanup error: ${e.message})`;
    }
  };

  // 8. Database Operation: Insert Document Row
  const { data: docData, error: docError } = await supabase
    .from('documents')
    .insert({
      id: documentId,
      subject_id: subjectId,
      folder_id: metaValidation.folderId,
      title: metaValidation.title,
      description: metaValidation.description,
      status: 'DRAFT',
      created_by: profile.id
    })
    .select()
    .single();

  if (docError) {
    const warn = await cleanupStorageObject();
    return {
      success: false,
      error: `Failed to create document record: ${docError.message}${warn}`
    };
  }

  // 9. Database Operation: Insert Initial Document Version Row
  const { data: verData, error: verError } = await supabase
    .from('document_versions')
    .insert({
      document_id: documentId,
      version_number: versionNumber,
      storage_path: storagePath,
      file_type: fileValidation.mimeType,
      file_size: fileValidation.size,
      uploaded_by: profile.id
    })
    .select()
    .single();

  if (verError) {
    await supabase.from('documents').delete().eq('id', documentId);
    const warn = await cleanupStorageObject();
    return {
      success: false,
      error: `Failed to create initial version record: ${verError.message}${warn}`
    };
  }

  // 10. Database Operation: Update active_version_id
  const { error: activeErr } = await supabase
    .from('documents')
    .update({ active_version_id: verData.id })
    .eq('id', documentId);

  if (activeErr) {
    await supabase.from('document_versions').delete().eq('id', verData.id);
    await supabase.from('documents').delete().eq('id', documentId);
    const warn = await cleanupStorageObject();
    return {
      success: false,
      error: `Failed to set active version: ${activeErr.message}${warn}`
    };
  }

  return {
    success: true,
    document: { ...docData, active_version_id: verData.id },
    version: verData
  };
}

/**
 * 2. Uploads and attaches a new version to an existing document.
 * 
 * Invariants:
 * - Does NOT delete previous versions.
 * - Enforces unique document_id + version_number.
 * - Safely cleans up the newly uploaded object if database insertion fails.
 * 
 * @param {string} documentId 
 * @param {File|Blob} file 
 * @param {string} [changeNotes] 
 * @returns {Promise<{ success: boolean, version?: Object, error?: string }>}
 */
export async function replaceDocumentVersion(documentId, file, changeNotes = '') {
  if (!documentId || !UUID_REGEX.test(documentId)) {
    return { success: false, error: 'Valid document ID is required.' };
  }

  // 1. Validate File
  const fileValidation = validateDocumentFile(file);
  if (!fileValidation.valid) {
    return { success: false, error: fileValidation.error };
  }

  // 2. Caller Context
  const caller = await getAuthenticatedCallerContext();
  if (caller.error) {
    return { success: false, error: caller.error };
  }
  const { profile } = caller;

  // 3. Load Document & Verify Access
  const { data: doc, error: docErr } = await supabase
    .from('documents')
    .select(`
      id,
      subject_id,
      status,
      title,
      active_version_id,
      subject:subjects!inner(
        id,
        term:terms!inner(
          id,
          program:programs!inner(
            id,
            academic_year:academic_years!inner(
              id,
              institution_id
            )
          )
        )
      )
    `)
    .eq('id', documentId)
    .single();

  if (docErr || !doc) {
    return { success: false, error: 'Document not found or inaccessible.' };
  }

  const subjectInstId = doc.subject?.term?.program?.academic_year?.institution_id;
  if (subjectInstId !== profile.institution_id) {
    return { success: false, error: 'Forbidden: Document does not belong to your institution.' };
  }

  if (profile.role === 'TEACHER') {
    const { data: assignment } = await supabase
      .from('teacher_assignments')
      .select('id')
      .eq('user_id', profile.id)
      .eq('subject_id', doc.subject_id)
      .maybeSingle();

    if (!assignment) {
      return { success: false, error: 'Forbidden: You are not assigned to teach this subject.' };
    }
  } else if (profile.role !== 'ADMIN') {
    return { success: false, error: 'Forbidden: Only assigned teachers or administrators can replace versions.' };
  }

  // 4. Determine Next Version Number
  const { data: latestVers, error: lvErr } = await supabase
    .from('document_versions')
    .select('version_number')
    .eq('document_id', documentId)
    .order('version_number', { ascending: false })
    .limit(1);

  if (lvErr) {
    return { success: false, error: `Failed to inspect document versions: ${lvErr.message}` };
  }

  const latestVerNumber = (latestVers && latestVers.length > 0) ? latestVers[0].version_number : 0;
  const nextVersion = latestVerNumber + 1;

  // 5. Generate Target Storage Path
  const storagePath = generateStoragePath(
    profile.institution_id,
    doc.subject_id,
    documentId,
    nextVersion,
    fileValidation.extension
  );

  // 6. Upload Physical Object (upsert: false prevents accidental overwrites)
  const { error: uploadError } = await supabase.storage
    .from(STORAGE_BUCKET)
    .upload(storagePath, file, {
      contentType: fileValidation.mimeType,
      upsert: false
    });

  if (uploadError) {
    return { success: false, error: `Storage upload failed: ${uploadError.message}` };
  }

  const cleanupStorageObject = async () => {
    try {
      const { error: remErr } = await supabase.storage.from(STORAGE_BUCKET).remove([storagePath]);
      if (remErr) return ` (Storage cleanup warning: ${remErr.message})`;
      return '';
    } catch (e) {
      return ` (Storage cleanup error: ${e.message})`;
    }
  };

  // 7. Insert New Version Row
  const { data: verData, error: verErr } = await supabase
    .from('document_versions')
    .insert({
      document_id: documentId,
      version_number: nextVersion,
      storage_path: storagePath,
      file_type: fileValidation.mimeType,
      file_size: fileValidation.size,
      uploaded_by: profile.id
    })
    .select()
    .single();

  if (verErr) {
    const warn = await cleanupStorageObject();
    if (verErr.code === '23505' || verErr.message?.includes('unique_document_version')) {
      return {
        success: false,
        error: `Concurrent update collision: version ${nextVersion} was already created. Please refresh and retry.${warn}`
      };
    }
    return {
      success: false,
      error: `Failed to insert new version record: ${verErr.message}${warn}`
    };
  }

  // 8. Update Document Active Version Pointer
  const { error: activeErr } = await supabase
    .from('documents')
    .update({
      active_version_id: verData.id,
      updated_at: new Date().toISOString()
    })
    .eq('id', documentId);

  if (activeErr) {
    // Rollback the newly inserted version only; preserve prior versions
    await supabase.from('document_versions').delete().eq('id', verData.id);
    const warn = await cleanupStorageObject();
    return {
      success: false,
      error: `Failed to update active version pointer: ${activeErr.message}${warn}`
    };
  }

  return {
    success: true,
    version: verData
  };
}

/**
 * 3. Updates the document lifecycle status (DRAFT -> PUBLISHED -> ARCHIVED).
 * Students are strictly forbidden from altering document status.
 * 
 * @param {string} documentId 
 * @param {'DRAFT' | 'PUBLISHED' | 'ARCHIVED'} status 
 * @returns {Promise<{ success: boolean, document?: Object, error?: string }>}
 */
export async function updateDocumentStatus(documentId, status) {
  if (!documentId || !UUID_REGEX.test(documentId)) {
    return { success: false, error: 'Valid document ID is required.' };
  }

  const cleanStatus = (status || '').trim().toUpperCase();
  if (!ALLOWED_STATUSES.includes(cleanStatus)) {
    return {
      success: false,
      error: `Invalid status '${status}'. Allowed statuses: ${ALLOWED_STATUSES.join(', ')}.`
    };
  }

  const caller = await getAuthenticatedCallerContext();
  if (caller.error) {
    return { success: false, error: caller.error };
  }

  if (caller.profile.role === 'STUDENT') {
    return { success: false, error: 'Forbidden: Students cannot alter document lifecycle status.' };
  }

  const { data, error } = await supabase
    .from('documents')
    .update({
      status: cleanStatus,
      updated_at: new Date().toISOString()
    })
    .eq('id', documentId)
    .select()
    .single();

  if (error) {
    return { success: false, error: `Failed to update document status: ${error.message}` };
  }

  return { success: true, document: data };
}

/**
 * 4. Folder Operations
 */

/**
 * Creates a new subject-scoped folder.
 * 
 * @param {Object} params
 * @param {string} params.subjectId
 * @param {string} params.name
 * @param {string} [params.parentFolderId]
 * @returns {Promise<{ success: boolean, folder?: Object, error?: string }>}
 */
export async function createFolder({ subjectId, name, parentFolderId = null }) {
  if (!subjectId || !UUID_REGEX.test(subjectId)) {
    return { success: false, error: 'Valid subject ID is required.' };
  }

  const cleanName = (name || '').trim();
  if (!cleanName) {
    return { success: false, error: 'Folder name is required.' };
  }
  if (cleanName.length > 100) {
    return { success: false, error: 'Folder name cannot exceed 100 characters.' };
  }

  const caller = await getAuthenticatedCallerContext();
  if (caller.error) {
    return { success: false, error: caller.error };
  }

  const authCheck = await verifySubjectAcademicAccess(subjectId, caller.profile);
  if (!authCheck.allowed) {
    return { success: false, error: authCheck.error };
  }

  // If parent folder specified, ensure it belongs to the exact same subject
  if (parentFolderId) {
    if (!UUID_REGEX.test(parentFolderId)) {
      return { success: false, error: 'Invalid parent folder ID.' };
    }
    const { data: parent, error: pErr } = await supabase
      .from('folders')
      .select('id, subject_id')
      .eq('id', parentFolderId)
      .single();

    if (pErr || !parent || parent.subject_id !== subjectId) {
      return { success: false, error: 'Invalid parent folder: parent does not belong to this subject.' };
    }
  }

  const { data, error } = await supabase
    .from('folders')
    .insert({
      subject_id: subjectId,
      parent_folder_id: parentFolderId || null,
      name: cleanName
    })
    .select()
    .single();

  if (error) {
    return { success: false, error: `Failed to create folder: ${error.message}` };
  }

  return { success: true, folder: data };
}

/**
 * Renames an existing folder.
 * 
 * @param {string} folderId 
 * @param {string} name 
 * @returns {Promise<{ success: boolean, folder?: Object, error?: string }>}
 */
export async function renameFolder(folderId, name) {
  if (!folderId || !UUID_REGEX.test(folderId)) {
    return { success: false, error: 'Valid folder ID is required.' };
  }

  const cleanName = (name || '').trim();
  if (!cleanName) {
    return { success: false, error: 'Folder name is required.' };
  }
  if (cleanName.length > 100) {
    return { success: false, error: 'Folder name cannot exceed 100 characters.' };
  }

  const { data, error } = await supabase
    .from('folders')
    .update({ name: cleanName })
    .eq('id', folderId)
    .select()
    .single();

  if (error) {
    return { success: false, error: `Failed to rename folder: ${error.message}` };
  }

  return { success: true, folder: data };
}

/**
 * Deletes a folder.
 * 
 * Database safety:
 * 'documents.folder_id' uses ON DELETE SET NULL, so documents inside the folder
 * are automatically retained at the root subject level.
 * 
 * @param {string} folderId 
 * @returns {Promise<{ success: boolean, error?: string }>}
 */
export async function deleteFolder(folderId) {
  if (!folderId || !UUID_REGEX.test(folderId)) {
    return { success: false, error: 'Valid folder ID is required.' };
  }

  const { error } = await supabase
    .from('folders')
    .delete()
    .eq('id', folderId);

  if (error) {
    return { success: false, error: `Failed to delete folder: ${error.message}` };
  }

  return { success: true };
}

/**
 * 5. Secure Document Access / Download
 * 
 * Generates a time-limited signed URL for an object in the private 'eduvault-documents' bucket.
 * Supabase Storage RLS enforces authorization at generation time.
 * 
 * @param {string} storagePath 
 * @param {Object} [options]
 * @param {number} [options.expiresIn=60] - Expiration duration in seconds
 * @returns {Promise<{ success: boolean, signedUrl?: string, error?: string }>}
 */
export async function downloadDocumentVersion(storagePath, options = { expiresIn: 60 }) {
  if (!storagePath || typeof storagePath !== 'string') {
    return { success: false, error: 'Valid storage path is required.' };
  }

  // Security guard against path traversal attempts
  const cleanPath = storagePath.trim().replace(/^\/+/, '');
  if (cleanPath.includes('..')) {
    return { success: false, error: 'Invalid storage path.' };
  }

  if (!supabase) {
    return { success: false, error: 'Supabase client is not configured.' };
  }

  const expiry = typeof options?.expiresIn === 'number' ? options.expiresIn : 60;

  const { data, error } = await supabase.storage
    .from(STORAGE_BUCKET)
    .createSignedUrl(cleanPath, expiry);

  if (error) {
    return { success: false, error: `Failed to generate download URL: ${error.message}` };
  }

  return { success: true, signedUrl: data.signedUrl };
}
