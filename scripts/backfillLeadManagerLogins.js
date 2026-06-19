// One-off backfill: create a Supabase Auth login for every row in the
// `lead_managers` table that doesn't already have one, so admin-created lead
// managers can log in. Login finds them by phoneNumber in user_metadata.
// Run from the server folder:  node scripts/backfillLeadManagerLogins.js
import { supabase } from "../lib/supbase.js";

const run = async () => {
  const { data: managers, error } = await supabase.from("lead_managers").select("*");
  if (error) throw error;

  let created = 0;
  let skipped = 0;

  for (const m of managers || []) {
    if (!m.password) {
      console.warn(`  - ${m.name}: no password stored, skipping`);
      skipped++;
      continue;
    }

    const digits = String(m.phone || "").replace(/\D/g, "");
    const loginEmail = m.email || (digits ? `${digits}@lm.flexifold.app` : null);
    if (!loginEmail) {
      console.warn(`  - ${m.name}: no email or phone, skipping`);
      skipped++;
      continue;
    }

    const { error: authError } = await supabase.auth.admin.createUser({
      email: loginEmail,
      password: m.password,
      email_confirm: true,
      user_metadata: {
        name: m.name,
        phoneNumber: m.phone,
        location: m.location,
        role: "lead-manager",
      },
    });

    if (authError) {
      // "email already registered" just means they already have a login.
      console.warn(`  ✗ ${m.name} (${loginEmail}): ${authError.message}`);
      skipped++;
    } else {
      console.log(`  ✓ ${m.name} (${loginEmail})`);
      created++;
    }
  }

  console.log(`\nDone. Created ${created} login(s), skipped ${skipped}.`);
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
