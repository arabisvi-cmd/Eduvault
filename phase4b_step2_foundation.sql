-- ==============================================================================
-- EduVault Phase 4B Step 2: Storage & Document Schema Foundation Migration
-- ==============================================================================

-- 1. Private Storage Bucket Setup
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'eduvault-documents',
  'eduvault-documents',
  false,
  52428800, -- 50 MB
  ARRAY[
    'application/pdf',
    'application/msword',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document',
    'application/vnd.ms-excel',
    'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
    'image/png',
    'image/jpeg'
  ]
)
ON CONFLICT (id) DO UPDATE SET
  public = false,
  file_size_limit = 52428800,
  allowed_mime_types = EXCLUDED.allowed_mime_types;

-- 2. Document Active Version Column
ALTER TABLE public.documents 
  ADD COLUMN IF NOT EXISTS active_version_id uuid REFERENCES public.document_versions(id) ON DELETE SET NULL;

-- Link existing prototype document to its version
UPDATE public.documents
SET active_version_id = '89ba045e-5215-43d6-b20c-59224be02bb0'
WHERE id = 'dcd449eb-c2b5-4fbb-a697-35f84a7a0bc6' AND active_version_id IS NULL;

-- 3. Version Uniqueness
ALTER TABLE public.document_versions 
  DROP CONSTRAINT IF EXISTS unique_document_version;

ALTER TABLE public.document_versions 
  ADD CONSTRAINT unique_document_version UNIQUE (document_id, version_number);

-- 4. Document Author Deletion Safety (ON DELETE SET NULL)
-- Make created_by nullable first to allow SET NULL
ALTER TABLE public.documents 
  ALTER COLUMN created_by DROP NOT NULL;

ALTER TABLE public.documents 
  DROP CONSTRAINT IF EXISTS documents_created_by_fkey;

ALTER TABLE public.documents 
  ADD CONSTRAINT documents_created_by_fkey 
  FOREIGN KEY (created_by) REFERENCES public.users(id) ON DELETE SET NULL;

-- 5. Folder / Subject Cross-Assignment Integrity Trigger
CREATE OR REPLACE FUNCTION public.verify_document_folder_subject()
RETURNS trigger AS $$
BEGIN
  IF NEW.folder_id IS NOT NULL THEN
    IF NOT EXISTS (
      SELECT 1 FROM public.folders 
      WHERE id = NEW.folder_id AND subject_id = NEW.subject_id
    ) THEN
      RAISE EXCEPTION 'Invalid folder assignment: folder % does not belong to subject %', NEW.folder_id, NEW.subject_id;
    END IF;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

DROP TRIGGER IF EXISTS trg_verify_document_folder_subject ON public.documents;
CREATE TRIGGER trg_verify_document_folder_subject
BEFORE INSERT OR UPDATE OF folder_id, subject_id ON public.documents
FOR EACH ROW EXECUTE FUNCTION public.verify_document_folder_subject();

-- 6. Performance Indexes for Materials & Document Hierarchy
CREATE INDEX IF NOT EXISTS idx_documents_subject_status ON public.documents(subject_id, status);
CREATE INDEX IF NOT EXISTS idx_documents_subject_folder ON public.documents(subject_id, folder_id);
CREATE INDEX IF NOT EXISTS idx_document_versions_doc_ver ON public.document_versions(document_id, version_number);

-- 7. Document & Version Audit Coverage
CREATE OR REPLACE FUNCTION public.log_document_changes()
RETURNS trigger AS $$
DECLARE
  log_entity_id uuid;
  log_metadata jsonb;
  v_action text := TG_OP;
  v_inst_id uuid;
BEGIN
  IF TG_OP = 'INSERT' THEN
    v_action := 'DOCUMENT_CREATED';
  ELSIF TG_OP = 'UPDATE' THEN
    IF OLD.status != 'PUBLISHED' AND NEW.status = 'PUBLISHED' THEN
      v_action := 'DOCUMENT_PUBLISHED';
    ELSIF OLD.status != 'ARCHIVED' AND NEW.status = 'ARCHIVED' THEN
      v_action := 'DOCUMENT_ARCHIVED';
    ELSIF OLD.status != 'DRAFT' AND NEW.status = 'DRAFT' THEN
      v_action := 'DOCUMENT_DRAFTED';
    ELSIF OLD.active_version_id IS DISTINCT FROM NEW.active_version_id THEN
      v_action := 'DOCUMENT_VERSION_UPDATED';
    ELSE
      v_action := 'DOCUMENT_UPDATED';
    END IF;
  ELSIF TG_OP = 'DELETE' THEN
    v_action := 'DOCUMENT_DELETED';
  END IF;

  IF TG_OP = 'DELETE' THEN
    log_entity_id := OLD.id;
    log_metadata := row_to_json(OLD);
  ELSE
    log_entity_id := NEW.id;
    log_metadata := row_to_json(NEW);
  END IF;

  v_inst_id := public.get_my_institution_id();

  INSERT INTO public.audit_logs (institution_id, user_id, action, entity_table, entity_id, metadata)
  VALUES (
    v_inst_id,
    auth.uid(),
    v_action,
    TG_TABLE_NAME,
    log_entity_id,
    log_metadata
  );
  
  IF TG_OP = 'DELETE' THEN
    RETURN OLD;
  END IF;
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Audit trigger on document_versions
CREATE OR REPLACE FUNCTION public.log_document_version_changes()
RETURNS trigger AS $$
DECLARE
  v_inst_id uuid;
  v_action text := 'DOCUMENT_VERSION_CREATED';
BEGIN
  IF TG_OP = 'DELETE' THEN
    v_action := 'DOCUMENT_VERSION_DELETED';
  END IF;

  SELECT ay.institution_id INTO v_inst_id
  FROM public.documents d
  JOIN public.subjects s ON d.subject_id = s.id
  JOIN public.terms t ON s.term_id = t.id
  JOIN public.programs p ON t.program_id = p.id
  JOIN public.academic_years ay ON p.academic_year_id = ay.id
  WHERE d.id = COALESCE(NEW.document_id, OLD.document_id);

  IF v_inst_id IS NULL THEN
    v_inst_id := public.get_my_institution_id();
  END IF;

  INSERT INTO public.audit_logs (institution_id, user_id, action, entity_table, entity_id, metadata)
  VALUES (
    v_inst_id,
    auth.uid(),
    v_action,
    'document_versions',
    COALESCE(NEW.id, OLD.id),
    jsonb_build_object(
      'document_id', COALESCE(NEW.document_id, OLD.document_id),
      'version_number', COALESCE(NEW.version_number, OLD.version_number),
      'file_type', COALESCE(NEW.file_type, OLD.file_type),
      'file_size', COALESCE(NEW.file_size, OLD.file_size),
      'storage_path', COALESCE(NEW.storage_path, OLD.storage_path),
      'uploaded_by', COALESCE(NEW.uploaded_by, OLD.uploaded_by)
    )
  );

  RETURN COALESCE(NEW, OLD);
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

DROP TRIGGER IF EXISTS document_version_audit_trigger ON public.document_versions;
CREATE TRIGGER document_version_audit_trigger
AFTER INSERT OR DELETE ON public.document_versions
FOR EACH ROW EXECUTE FUNCTION public.log_document_version_changes();

-- 8. Storage Object RLS Policies
CREATE OR REPLACE FUNCTION public.is_valid_uuid(p_text text) 
RETURNS boolean AS $$
BEGIN
  IF p_text IS NULL OR length(p_text) != 36 THEN
    RETURN false;
  END IF;
  PERFORM p_text::uuid;
  RETURN true;
EXCEPTION WHEN OTHERS THEN
  RETURN false;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

-- Drop prior policies if present to prevent conflicts
DROP POLICY IF EXISTS "Admins can manage institution files" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can upload to assigned subjects" ON storage.objects;
DROP POLICY IF EXISTS "Teachers can manage files for assigned subjects" ON storage.objects;
DROP POLICY IF EXISTS "Students can read published files for enrolled subjects" ON storage.objects;

-- ADMIN Policy: Full storage management within own institution
CREATE POLICY "Admins can manage institution files"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'eduvault-documents'
  AND public.get_my_role() = 'ADMIN'
  AND public.is_valid_uuid((string_to_array(name, '/'))[1])
  AND (string_to_array(name, '/'))[1]::uuid = public.get_my_institution_id()
)
WITH CHECK (
  bucket_id = 'eduvault-documents'
  AND public.get_my_role() = 'ADMIN'
  AND public.is_valid_uuid((string_to_array(name, '/'))[1])
  AND (string_to_array(name, '/'))[1]::uuid = public.get_my_institution_id()
);

-- TEACHER Policy: Full management within own institution and assigned subject
CREATE POLICY "Teachers can manage files for assigned subjects"
ON storage.objects FOR ALL
TO authenticated
USING (
  bucket_id = 'eduvault-documents'
  AND public.get_my_role() = 'TEACHER'
  AND public.is_valid_uuid((string_to_array(name, '/'))[1])
  AND (string_to_array(name, '/'))[1]::uuid = public.get_my_institution_id()
  AND public.is_valid_uuid((string_to_array(name, '/'))[2])
  AND EXISTS (
    SELECT 1 FROM public.teacher_assignments ta
    WHERE ta.user_id = auth.uid()
      AND ta.subject_id = (string_to_array(name, '/'))[2]::uuid
  )
)
WITH CHECK (
  bucket_id = 'eduvault-documents'
  AND public.get_my_role() = 'TEACHER'
  AND public.is_valid_uuid((string_to_array(name, '/'))[1])
  AND (string_to_array(name, '/'))[1]::uuid = public.get_my_institution_id()
  AND public.is_valid_uuid((string_to_array(name, '/'))[2])
  AND EXISTS (
    SELECT 1 FROM public.teacher_assignments ta
    WHERE ta.user_id = auth.uid()
      AND ta.subject_id = (string_to_array(name, '/'))[2]::uuid
  )
);

-- STUDENT Policy: Read-only access for enrolled subjects and PUBLISHED documents
CREATE POLICY "Students can read published files for enrolled subjects"
ON storage.objects FOR SELECT
TO authenticated
USING (
  bucket_id = 'eduvault-documents'
  AND public.get_my_role() = 'STUDENT'
  AND public.is_valid_uuid((string_to_array(name, '/'))[1])
  AND (string_to_array(name, '/'))[1]::uuid = public.get_my_institution_id()
  AND public.is_valid_uuid((string_to_array(name, '/'))[2])
  AND public.is_valid_uuid((string_to_array(name, '/'))[3])
  AND EXISTS (
    SELECT 1 FROM public.student_enrollments se
    WHERE se.user_id = auth.uid()
      AND se.subject_id = (string_to_array(name, '/'))[2]::uuid
  )
  AND EXISTS (
    SELECT 1 FROM public.documents d
    WHERE d.id = (string_to_array(name, '/'))[3]::uuid
      AND d.subject_id = (string_to_array(name, '/'))[2]::uuid
      AND d.status = 'PUBLISHED'
  )
);
