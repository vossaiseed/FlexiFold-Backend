import { supabase } from "../../lib/supbase.js";

const digits = (p) => String(p ?? "").replace(/\D/g, "");

// Admin-initiated password reset for a person who logs in by phone (sales staff
// or partner). Updates their Supabase Auth account password so the new password
// actually works on login. If no Auth account exists yet, one is created so the
// person can log in for the first time with the new password.
//
// `domain` is the synthetic email domain used when the row has no real email
// (mirrors PHONE_SOURCES in authController) so we can find/create the account
// deterministically.
export const resetAuthPassword = async ({ email, phone, password, name, location, role, domain }) => {
  const phoneDigits = digits(phone);
  const targetEmail = (email || "").toLowerCase();
  const loginEmail = email || (phoneDigits && domain ? `${phoneDigits}@${domain}` : null);

  // Find the matching Auth user by email or phone metadata.
  let authUser = null;
  try {
    const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    authUser = (list?.users || []).find((u) => {
      const uEmail = (u.email || "").toLowerCase();
      const uPhone = digits(u.user_metadata?.phoneNumber);
      return (targetEmail && uEmail === targetEmail) ||
             (loginEmail && uEmail === loginEmail.toLowerCase()) ||
             (phoneDigits && uPhone === phoneDigits);
    });
  } catch (e) {
    console.warn("resetAuthPassword: could not list auth users:", e?.message || e);
  }

  const metadata = { name, phoneNumber: phone, location, role };

  if (authUser) {
    const { error } = await supabase.auth.admin.updateUserById(authUser.id, {
      password,
      user_metadata: { ...(authUser.user_metadata || {}), ...metadata },
    });
    if (error) throw error;
    return { created: false };
  }

  // No Auth account yet — create one so the new password lets them log in.
  if (!loginEmail) {
    throw new Error("Cannot reset password: no email or phone on record.");
  }
  const { error: createErr } = await supabase.auth.admin.createUser({
    email: loginEmail,
    password,
    email_confirm: true,
    user_metadata: metadata,
  });
  if (createErr && !/already|registered|exists/i.test(createErr.message || "")) {
    throw createErr;
  }
  return { created: true };
};
