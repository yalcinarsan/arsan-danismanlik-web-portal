import { createClient } from '@supabase/supabase-js';

const url = import.meta.env.PUBLIC_SUPABASE_URL as string;
const anonKey = import.meta.env.PUBLIC_SUPABASE_ANON_KEY as string;

// Tarayıcı istemcisi. anon key public'tir; güvenlik RLS ile sağlanır.
export const supabase = createClient(url, anonKey);
