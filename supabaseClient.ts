import { createClient } from '@supabase/supabase-js';

// Replace these with your actual Supabase project URL and anon key
// You can find these in Project Settings > API
const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://your-project-url.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'your-anon-key';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
