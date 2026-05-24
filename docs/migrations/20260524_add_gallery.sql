-- Add gallery table
CREATE TABLE public.gallery_items (
  id uuid DEFAULT gen_random_uuid() PRIMARY KEY,
  title text NOT NULL,
  description text,
  image_url text NOT NULL,
  event_date date,
  created_at timestamptz DEFAULT now() NOT NULL,
  created_by uuid REFERENCES auth.users(id)
);

-- Enable RLS
ALTER TABLE public.gallery_items ENABLE ROW LEVEL SECURITY;

-- Policy: Ai cũng xem được
CREATE POLICY "Enable read access for all users" ON public.gallery_items FOR SELECT USING (true);

-- Policy: User đăng nhập mới được thêm
CREATE POLICY "Enable insert for authenticated users only" ON public.gallery_items FOR INSERT WITH CHECK (auth.uid() = created_by);

-- Policy: Chỉ admin hoặc người tạo mới được sửa
CREATE POLICY "Enable update for admin and owner" ON public.gallery_items FOR UPDATE USING (
  auth.uid() = created_by OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- Policy: Chỉ admin hoặc người tạo mới được xóa
CREATE POLICY "Enable delete for admin and owner" ON public.gallery_items FOR DELETE USING (
  auth.uid() = created_by OR 
  EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')
);

-- ========================================================
-- 10. STORAGE BUCKETS
-- ========================================================

-- Create storage bucket for gallery
INSERT INTO storage.buckets (id, name, public)
VALUES ('gallery', 'gallery', true)
ON CONFLICT (id) DO NOTHING;

-- Storage policies
CREATE POLICY "Public Access"
ON storage.objects FOR SELECT
USING ( bucket_id = 'gallery' );

CREATE POLICY "Authenticated users can upload"
ON storage.objects FOR INSERT
WITH CHECK ( bucket_id = 'gallery' AND auth.role() = 'authenticated' );

CREATE POLICY "Admin and owner can update"
ON storage.objects FOR UPDATE
USING ( bucket_id = 'gallery' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')) );

CREATE POLICY "Admin and owner can delete"
ON storage.objects FOR DELETE
USING ( bucket_id = 'gallery' AND (auth.uid() = owner OR EXISTS (SELECT 1 FROM public.profiles WHERE profiles.id = auth.uid() AND profiles.role = 'admin')) );
