// Diagnose phone-login problems. Runs the same steps the login endpoint does
// and prints exactly where it breaks.
//   node scripts/diagnoseLogin.js <phone> [password]
// e.g. node scripts/diagnoseLogin.js 9746442665 secret123
import { supabase } from "../lib/supbase.js";

const phone = process.argv[2];
const password = process.argv[3];
const normalize = (p) => String(p ?? "").replace(/\D/g, "");

const run = async () => {
  console.log("SUPABASE_URL:", process.env.SUPABASE_URL);
  console.log("Looking up phone:", phone, "=> normalized:", normalize(phone));
  console.log("----------------------------------------------------");

  // Step 1 — list auth users (requires the service_role key)
  const { data: list, error: listError } = await supabase.auth.admin.listUsers({
    page: 1,
    perPage: 1000,
  });
  if (listError) {
    console.error("✗ admin.listUsers FAILED — the server key is NOT service_role:");
    console.error("  ", listError.message);
    process.exit(1);
  }
  console.log(`✓ admin.listUsers works. Total auth users: ${list.users.length}`);

  // Step 2 — find the user by phone metadata
  const target = normalize(phone);
  const match = list.users.find((u) => normalize(u.user_metadata?.phoneNumber) === target);

  if (!match) {
    console.log(`✗ No auth user has user_metadata.phoneNumber == ${target}`);
    console.log("  Existing auth users (email | phone | role | confirmed):");
    list.users.forEach((u) =>
      console.log(
        `   - ${u.email} | ${u.user_metadata?.phoneNumber ?? "(none)"} | ${u.user_metadata?.role ?? "(none)"} | ${u.email_confirmed_at ? "yes" : "NO"}`
      )
    );
  } else {
    console.log(`✓ Matched auth user:`);
    console.log(`   email=${match.email}`);
    console.log(`   role=${match.user_metadata?.role}`);
    console.log(`   email_confirmed=${match.email_confirmed_at ? "yes" : "NO"}`);

    // Step 3 — try the actual sign-in (only if a password was passed)
    if (password) {
      const { data, error } = await supabase.auth.signInWithPassword({
        email: match.email,
        password,
      });
      if (error) console.log(`✗ signInWithPassword FAILED: ${error.message}`);
      else console.log(`✓ signInWithPassword OK for ${data.user.email}`);
    } else {
      console.log("  (pass a password as the 2nd argument to also test sign-in)");
    }
  }

  // Step 4 — show the lead_managers table rows for reference
  console.log("----------------------------------------------------");
  const { data: lms, error: lmErr } = await supabase
    .from("lead_managers")
    .select("name, phone, email");
  if (lmErr) console.log("lead_managers read error:", lmErr.message);
  else console.log("lead_managers rows:", JSON.stringify(lms, null, 2));
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Diagnose failed:", err);
    process.exit(1);
  });
