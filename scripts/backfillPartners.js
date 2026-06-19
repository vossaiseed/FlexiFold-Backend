// One-off backfill: copy existing Supabase Auth partner signups into the
// `partner` table so they appear in the admin Partner section.
// Run from the server folder:  node scripts/backfillPartners.js
import { supabase } from "../lib/supbase.js";

const run = async () => {
  let page = 1;
  let synced = 0;
  let scanned = 0;

  for (;;) {
    const { data, error } = await supabase.auth.admin.listUsers({ page, perPage: 1000 });
    if (error) throw error;

    const users = data.users || [];
    if (users.length === 0) break;

    for (const u of users) {
      scanned++;
      const meta = u.user_metadata || {};
      const role = meta.role || "partner";
      if (role !== "partner") continue; // only mirror partners

      const { error: upsertError } = await supabase
        .from("partner")
        .upsert(
          {
            name: meta.name || u.email,
            email: u.email,
            phone: meta.phoneNumber || null,
            city: meta.location || null,
            role: "partner",
          },
          { onConflict: "email" }
        );

      if (upsertError) {
        console.warn(`  ✗ ${u.email}: ${upsertError.message}`);
      } else {
        synced++;
        console.log(`  ✓ ${u.email}`);
      }
    }

    if (users.length < 1000) break;
    page++;
  }

  console.log(`\nDone. Scanned ${scanned} auth users, synced ${synced} partner(s).`);
};

run()
  .then(() => process.exit(0))
  .catch((err) => {
    console.error("Backfill failed:", err);
    process.exit(1);
  });
