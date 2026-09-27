DROP POLICY IF EXISTS "Global admins can update platform profiles" ON public.profiles;
CREATE POLICY "Global admins can update platform profiles"
  ON public.profiles FOR UPDATE TO authenticated
  USING (public.is_global_admin())
  WITH CHECK (public.is_global_admin());

DROP POLICY IF EXISTS "Global admins can delete platform profiles" ON public.profiles;
CREATE POLICY "Global admins can delete platform profiles"
  ON public.profiles FOR DELETE TO authenticated
  USING (public.is_global_admin() AND id <> auth.uid());