import { createClient } from '@supabase/supabase-js';

const supabaseUrl = import.meta.env.VITE_SUPABASE_URL || 'https://zoitxvhzprlubwyojkmo.supabase.co';
const supabaseAnonKey = import.meta.env.VITE_SUPABASE_ANON_KEY || 'eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6InpvaXR4dmh6cHJsdWJ3eW9qa21vIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODM2NjEyNDQsImV4cCI6MjA5OTIzNzI0NH0.Xvhy2o_fsl5v6RWdMWVB0WUi-SF1MmgLGlez4k6n4jY';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);