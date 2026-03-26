-- ==========================================
-- GIA PHẢ VIỆT - MIGRATION
-- Chạy file này trên SQL Editor của Supabase để cập nhật
-- ==========================================

-- 1. Bổ sung các trường mới cho bảng persons
ALTER TABLE public.persons
ADD COLUMN IF NOT EXISTS hometown TEXT,
ADD COLUMN IF NOT EXISTS grave_address TEXT,
ADD COLUMN IF NOT EXISTS is_eldest_son BOOLEAN NOT NULL DEFAULT FALSE,
ADD COLUMN IF NOT EXISTS is_eldest_grandson BOOLEAN NOT NULL DEFAULT FALSE;

-- 2. Tạo bảng site_settings (Cấu hình chung)
CREATE TABLE IF NOT EXISTS public.site_settings (
  id INT PRIMARY KEY DEFAULT 1,
  site_name TEXT DEFAULT 'Gia phả Việt',
  logo_url TEXT,
  footer_address TEXT,
  footer_email TEXT,
  footer_phone TEXT,
  footer_custom_text TEXT,
  updated_at TIMESTAMPTZ DEFAULT NOW(),
  CONSTRAINT single_row CHECK (id = 1)
);

ALTER TABLE public.site_settings ENABLE ROW LEVEL SECURITY;

-- Hàm hỗ trợ kiểm tra quyền Admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND role = 'admin'
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Hàm hỗ trợ kiểm tra quyền Editor
CREATE OR REPLACE FUNCTION public.is_editor()
RETURNS BOOLEAN AS $$
BEGIN
  RETURN EXISTS (
    SELECT 1 FROM public.profiles
    WHERE id = auth.uid() AND (role = 'editor' OR role = 'admin')
  );
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Everyone can read settings
DROP POLICY IF EXISTS "Enable read access for all users" ON public.site_settings;
CREATE POLICY "Enable read access for all users" ON public.site_settings FOR SELECT USING (true);
-- Only Admins can update settings
DROP POLICY IF EXISTS "Admins can update settings" ON public.site_settings;
CREATE POLICY "Admins can update settings" ON public.site_settings FOR UPDATE USING (public.is_admin()) WITH CHECK (public.is_admin());
-- Only Admins can insert settings
DROP POLICY IF EXISTS "Admins can insert settings" ON public.site_settings;
CREATE POLICY "Admins can insert settings" ON public.site_settings FOR INSERT USING (public.is_admin());

-- Insert default row if not exists
INSERT INTO public.site_settings (id, site_name) VALUES (1, 'Gia phả Việt') ON CONFLICT (id) DO NOTHING;

-- 3. Tạo bảng transactions (Sổ thu chi, Công đức, Khuyến học)
DO $$ BEGIN
    CREATE TYPE public.transaction_type_enum AS ENUM ('income', 'expense');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

DO $$ BEGIN
    CREATE TYPE public.transaction_category_enum AS ENUM ('cong_duc', 'khuyen_hoc', 'thu_chi_chung');
EXCEPTION
    WHEN duplicate_object THEN null;
END $$;

CREATE TABLE IF NOT EXISTS public.transactions (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  amount NUMERIC NOT NULL,
  type public.transaction_type_enum NOT NULL,
  category public.transaction_category_enum NOT NULL,
  description TEXT NOT NULL,
  date DATE NOT NULL DEFAULT CURRENT_DATE,
  contributor_name TEXT, -- Người đóng góp (có thể là thành viên hoặc người ngoài)
  person_id UUID REFERENCES public.persons(id) ON DELETE SET NULL, -- Link tới thành viên nếu có
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.transactions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.transactions;
CREATE POLICY "Enable read access for authenticated users" ON public.transactions FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins and Editors can insert transactions" ON public.transactions;
CREATE POLICY "Admins and Editors can insert transactions" ON public.transactions FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR public.is_editor());

DROP POLICY IF EXISTS "Admins and Editors can update transactions" ON public.transactions;
CREATE POLICY "Admins and Editors can update transactions" ON public.transactions FOR UPDATE TO authenticated USING (public.is_admin() OR public.is_editor()) WITH CHECK (public.is_admin() OR public.is_editor());

DROP POLICY IF EXISTS "Admins and Editors can delete transactions" ON public.transactions;
CREATE POLICY "Admins and Editors can delete transactions" ON public.transactions FOR DELETE TO authenticated USING (public.is_admin() OR public.is_editor());

DROP TRIGGER IF EXISTS tr_transactions_updated_at ON public.transactions;
CREATE TRIGGER tr_transactions_updated_at BEFORE UPDATE ON public.transactions FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();

-- 4. Tạo bảng news (Tin tức dòng họ)
CREATE TABLE IF NOT EXISTS public.news (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  title TEXT NOT NULL,
  content TEXT NOT NULL, -- Sẽ lưu HTML từ Rich Text Editor
  thumbnail_url TEXT,
  is_published BOOLEAN NOT NULL DEFAULT TRUE,
  created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ DEFAULT NOW(),
  updated_at TIMESTAMPTZ DEFAULT NOW()
);

ALTER TABLE public.news ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS "Enable read access for authenticated users" ON public.news;
CREATE POLICY "Enable read access for authenticated users" ON public.news FOR SELECT TO authenticated USING (true);

DROP POLICY IF EXISTS "Admins and Editors can insert news" ON public.news;
CREATE POLICY "Admins and Editors can insert news" ON public.news FOR INSERT TO authenticated WITH CHECK (public.is_admin() OR public.is_editor());

DROP POLICY IF EXISTS "Admins and Editors can update news" ON public.news;
CREATE POLICY "Admins and Editors can update news" ON public.news FOR UPDATE TO authenticated USING (public.is_admin() OR public.is_editor()) WITH CHECK (public.is_admin() OR public.is_editor());

DROP POLICY IF EXISTS "Admins and Editors can delete news" ON public.news;
CREATE POLICY "Admins and Editors can delete news" ON public.news FOR DELETE TO authenticated USING (public.is_admin() OR public.is_editor());

DROP TRIGGER IF EXISTS tr_news_updated_at ON public.news;
CREATE TRIGGER tr_news_updated_at BEFORE UPDATE ON public.news FOR EACH ROW EXECUTE PROCEDURE public.handle_updated_at();
