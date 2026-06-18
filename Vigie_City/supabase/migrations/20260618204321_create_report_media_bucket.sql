-- Create report-media storage bucket
-- MIGRATION ONLY — do not execute without review

INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES (
  'report-media',
  'report-media',
  false,
  10485760,  -- 10 MB max per file
  ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif', 'video/mp4', 'video/quicktime']
)
ON CONFLICT (id) DO NOTHING;

-- RLS policies for report-media bucket
CREATE POLICY "Users can upload their own media"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'report-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Users can read own media"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'report-media' AND (storage.foldername(name))[1] = auth.uid()::text);

CREATE POLICY "Moderators can read all media"
ON storage.objects FOR SELECT TO authenticated
USING (
  bucket_id = 'report-media' AND (
    public.has_role(auth.uid(), 'admin') OR
    EXISTS (
      SELECT 1 FROM public.user_roles
      WHERE user_id = auth.uid() AND role = 'moderator'
    )
  )
);
