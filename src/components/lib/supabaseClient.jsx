import { createClient } from 'https://esm.sh/@supabase/supabase-js@2.39.0';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://gfqphegxvcbsqbdqfmoc.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImdmcXBoZWd4dmNic3FiZHFmbW9jIiwicm9sZSI6ImFub24iLCJpYXQiOjE3MzMwNjA5NTcsImV4cCI6MjA0ODYzNjk1N30.VH_2IXLqaXWGd9-Lm5TZ8tYKqxVQJKgXHOXzGqZBm8k';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);

export const SCREENSHOTS_BUCKET = 'promptster_screenshots';