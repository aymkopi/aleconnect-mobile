import AsyncStorage from "@react-native-async-storage/async-storage";
import { createClient } from "@supabase/supabase-js";
import "react-native-url-polyfill/auto";

import { supabaseConfig } from "@/constants";

export const supabase = createClient(
  supabaseConfig.url,
  supabaseConfig.anonKey,
  {
    auth: {
      autoRefreshToken: true,
      detectSessionInUrl: false,
      persistSession: true,
      storage: AsyncStorage,
    },
  },
);