import { supabase } from "../../lib/supbase.js";

// Verifies the Supabase connection at startup by running a lightweight,
// row-free query (head + count) against a known table.
export async function connectDB() {
  const { error } = await supabase
    .from("users")
    .select("*", { count: "exact", head: true });

  if (error) {
    console.error("❌ Supabase connection failed:", error.message);
    throw error;
  }

  console.log("✅ Supabase connected");
}
