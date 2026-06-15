import { createClient } from "@supabase/supabase-js";

// --- UJI COBA SEMENTARA ---
// Paste langsung URL dan Anon Key kamu di dalam tanda kutip ini
// Pastikan tidak ada spasi ekstra dan TIDAK ADA tanda garis miring (/) di akhir URL
const supabaseUrl = "https://hcjapxjbyjitegiklejl.supabase.co";
const supabaseAnonKey =
  "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImhjamFweGpieWppdGVnaWtsZWpsIiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE0NDIzOTYsImV4cCI6MjA5NzAxODM5Nn0.cDSYoQNz8YD1do8AsdTSVWvBHB1AXp5VUFpWeRFCPCw";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
