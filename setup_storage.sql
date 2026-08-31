-- 1. Explicitly track active version
ALTER TABLE public.documents ADD COLUMN active_version_id uuid REFERENCES public.document_versions(id) ON DELETE SET NULL;

-- 2. Prevent duplicate version numbers per document
ALTER TABLE public.document_versions ADD CONSTRAINT unique_document_version UNIQUE (document_id, version_number);

-- 3. Storage RLS
DROP POLICY IF EXISTS "Storage access requires future upload implementation" ON storage.objects;

-- Helper to safely cast text to uuid in RLS
CREATE OR REPLACE FUNCTION public.is_valid_uuid(p_text text) RETURNS boolean AS $$
BEGIN
  PERFORM p_text::uuid;
  RETURN true;
EXCEPTION WHEN invalid_text_representation THEN
  RETURN false;
END;
$$ LANGUAGE plpgsql IMMUTABLE;

CREATE POLICY "Teachers can upload to assigned subjects"
ON storage.objects FOR ALL
USING (
  bucket_id = 'eduvault-documents'
  AND public.get_my_role() = 'TEACHER'
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
  AND public.is_valid_uuid((string_to_array(name, '/'))[2])
  AND EXISTS (
    SELECT 1 FROM public.teacher_assignments ta
    WHERE ta.user_id = auth.uid()
      AND ta.subject_id = (string_to_array(name, '/'))[2]::uuid
  )
);

CREATE POLICY "Students can read published files for enrolled subjects"
ON storage.objects FOR SELECT
USING (
  bucket_id = 'eduvault-documents'
  AND public.get_my_role() = 'STUDENT'
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
      AND d.status = 'PUBLISHED'
  )
);

CREATE POLICY "Admins can manage institution files"
ON storage.objects FOR ALL
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
