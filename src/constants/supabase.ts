export const supabaseConfig = {
  url:
    process.env.EXPO_PUBLIC_SUPABASE_URL ??
    "https://dllxwnkwjhynkfibwudr.supabase.co",
  anonKey:
    process.env.EXPO_PUBLIC_SUPABASE_ANON_KEY ??
    "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImRsbHh3bmt3amh5bmtmaWJ3dWRyIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NzI3NjA2MTgsImV4cCI6MjA4ODMzNjYxOH0.q4fHa1EQ433LUi6BP148yiUdP_yIYbMLr9-3aqrXTEs",
} as const;