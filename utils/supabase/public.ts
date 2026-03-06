import { createClient, SupabaseClient } from "@supabase/supabase-js";

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseAnonKey =
  process.env.NEXT_PUBLIC_SUPABASE_PUBLISHABLE_DEFAULT_KEY;

/**
 * Creates a Supabase client using only the public anon key — no auth cookies.
 * Used for public/unauthenticated pages such as /public/[token].
 */
export const createPublicClient = (): SupabaseClient => {
  if (!supabaseUrl || !supabaseAnonKey) {
    return {
      from: () => ({
        select: () => ({
          eq: () => ({
            single: async () => ({ data: null, error: null }),
            maybeSingle: async () => ({ data: null, error: null }),
          }),
          ilike: () => ({
            order: () => ({
              range: async () => ({ data: [], error: null, count: 0 }),
            }),
          }),
          order: () => ({
            range: async () => ({ data: [], error: null, count: 0 }),
          }),
        }),
      }),
    } as unknown as SupabaseClient;
  }

  return createClient(supabaseUrl, supabaseAnonKey, {
    auth: { persistSession: false },
  });
};
