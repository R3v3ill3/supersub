import { createClient } from '@supabase/supabase-js';

// Single Supabase client instance to avoid duplicates
export const supabase = createClient(
  import.meta.env.VITE_SUPABASE_URL || 'https://sliznojlnyconyxpcebl.supabase.co',
  import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InNsaXpub2psbnljb255eHBjZWJsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTg2MDk3MzgsImV4cCI6MjA3NDE4NTczOH0.XsMf24fGqe0VeLD69nVcpKNnk-D0fvYCd0GW36TCwfU'
);
