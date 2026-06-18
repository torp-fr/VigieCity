
CREATE POLICY "users upload own report media" ON storage.objects FOR INSERT TO authenticated
  WITH CHECK (bucket_id = 'report-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "users read own report media" ON storage.objects FOR SELECT TO authenticated
  USING (bucket_id = 'report-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "users update own report media" ON storage.objects FOR UPDATE TO authenticated
  USING (bucket_id = 'report-media' AND (storage.foldername(name))[1] = auth.uid()::text);
CREATE POLICY "users delete own report media" ON storage.objects FOR DELETE TO authenticated
  USING (bucket_id = 'report-media' AND (storage.foldername(name))[1] = auth.uid()::text);
