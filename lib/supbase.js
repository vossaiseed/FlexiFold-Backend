import {createClient} from '@supabase/supabase-js';
import dotenv from 'dotenv';

// override: true ensures the value in .env wins over any pre-existing
// SUPABASE_KEY in the shell/system env (otherwise the stale key is used).
dotenv.config({ override: true });

export const supabase = createClient(
  process.env.SUPABASE_URL,
  process.env.SUPABASE_KEY
);