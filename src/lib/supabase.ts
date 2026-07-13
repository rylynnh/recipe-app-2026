import { createClient } from '@supabase/supabase-js';

const supabaseUrl = 'https://zoitxvhzprlubwyojkmo.supabase.co';
const supabaseAnonKey = 'sb_publishable_pb5AJV85ScYlWCsAJby2RQ_Cekg4gO4';

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
