// One-off backfill: create a Supabase Auth login for every row in the `partner`
// table that doesn't already have one, so admin-created partners can log in.
// Login finds them by phoneNumber in user_metadata, then signs in by email.
// Run from the server folder:  node scripts/backfillPartnerLogins.js
import { supabase } from "../lib/supbase.js";

const run = async () => {
  const { data: partners, error } = await supabase.from("partner").select("*");
  if (error) throw error;

  let created = 0;
  let skipped = 0;

  for (const p of partners || []) {
    if (!p.password) {
      console.warn(`  - ${p.name}: no password stored, skipping`);
      skipped++;
      continue;
    }

    const digits = String(p.phone || "").replace(/\D/g, "");
    const loginEmail = p.email || (digits ? `${digits}@partner.flexifold.app` : null);
    if (!loginEmail) {
      console.warn(`  - ${p.name}: no email or phone, skipping`);
      skipped++;
      continue;
    }

    const { error: authError } = await supabase.auth.admin.createUser({
      email: loginEmail,
      password: p.password,
      email_confirm: true,
      user_metadata: {
        name: p.name,
        phoneNumber: p.phone,
        location: p.city,
        role: "partner",
      },
    });

    if (authError) {
      // "email already registered" just means they already have a login.
      console.warn(`  ✗ ${p.name} (${loginEmail}): ${authError.message}`);
      skipped++;
    } else {
      console.log(`  ✓ ${p.name} (${loginEmail})`);
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
