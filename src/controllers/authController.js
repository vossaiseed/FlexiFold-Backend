import { supabase } from "../../lib/supbase.js";

const isProd = process.env.NODE_ENV === "production";
const COOKIE_NAME = "token";
const cookieOptions = {
  httpOnly: true,
  secure: isProd,
  sameSite: isProd ? "none" : "lax",
  maxAge: 7 * 24 * 60 * 60 * 1000,
};

export const register = async (req, res, next) => {
  try {

    const { name, email, password, phoneNumber, profession, location, role } = req.body;
    const { data, error } = await supabase.auth.signUp({
      email,
      password,
      options: { data: { name, phoneNumber, profession, location, role } },
    });
    if (error?.code === '23505') {
  return res.status(400).json({
    message: 'Email already exists'
  });
}
    
    if (error) throw error;

    if (data.user) {
      const { error: syncError } = await supabase
        .from('users')
        .upsert({
          id: data.user.id,
          name: name || data.user.user_metadata?.name,
          email,
          phone: phoneNumber,
          role: role || 'partner',
          location,
        }, { onConflict: 'id' });
      if (syncError) {
        console.warn('Could not sync user to users table:', syncError);
      }
    }

    // Mirror partner signups into the `partner` table so they appear in the
    // admin Partner section (which reads that table, not Supabase Auth).
    // Upsert on email keeps it idempotent — re-registering or an existing
    // admin-created partner with the same email is updated, not duplicated.
    if ((role || 'partner') === 'partner' && data.user) {
      const { error: partnerError } = await supabase
        .from('partner')
        .upsert({
          name: name || data.user.user_metadata?.name,
          email,
          phone: phoneNumber,
          city: location,
          password,
          role: 'partner',
        }, { onConflict: 'email' });
      if (partnerError) {
        console.warn('Could not sync partner to partner table:', partnerError);
      }
    }

    if (data.session?.access_token) {
      res.cookie(COOKIE_NAME, data.session.access_token, cookieOptions);
    }

    res.status(201).json({
      message: data.session
        ? "User registered successfully"
        : "User registered. Please confirm your email to continue.",
      user: data.user,
      session: data.session?.access_token ?? null,
    });
  } catch (err) {
    next(err);
  }
};

const normalizePhone = (p) => String(p ?? "").replace(/\D/g, "");

// Tables that hold people who can log in by phone. For admin-created rows the
// Auth email may be synthetic (derived from the phone) when no email was given,
// so we derive the same value deterministically here.
const PHONE_SOURCES = [
  { table: "lead_managers", role: "lead-manager", domain: "lm.flexifold.app" },
  { table: "partner",       role: "partner",      domain: "partner.flexifold.app" },
  // Sales staff (incl. telecallers) use the telecaller dashboard — there is no
  // dedicated /sales area, so map them to the role that has one.
  { table: "salesstaff",    role: "telecaller",   domain: "sales.flexifold.app" },
  { table: "users",         role: null,           domain: null }, // registered users
];

// Find a login record by phone across the app tables. Uses plain SELECTs, so it
// works whether the server key is service_role or anon (with allow_all RLS).
const findRecordByPhone = async (target) => {
  if (!target) return null;
  for (const s of PHONE_SOURCES) {
    const { data, error } = await supabase.from(s.table).select("*");
    if (error || !data) continue; // table may not exist — skip it
    const row = data.find((r) => normalizePhone(r.phone) === target);
    if (row) {
      const email = row.email || (s.domain ? `${target}@${s.domain}` : null);
      return {
        email,
        password: row.password ?? null,
        role: s.role || row.role || "partner",
        name: row.name,
        location: row.location ?? row.city ?? null,
      };
    }
  }

  // Fallback: search Supabase Auth metadata by phone. Covers accounts that live
  // only in Auth and not in any app table — e.g. admins created in the Supabase
  // dashboard. (password: null → the Auth account already exists, so no self-heal.)
  try {
    const { data: list } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    const u = (list?.users || []).find(
      (au) => normalizePhone(au.user_metadata?.phoneNumber) === target
    );
    if (u?.email) {
      return {
        email: u.email,
        password: null,
        role: u.user_metadata?.role || "partner",
        name: u.user_metadata?.name,
        location: u.user_metadata?.location,
      };
    }
  } catch { /* admin API unavailable — ignore */ }

  return null;
};

// Create the Auth account if it's missing. Prefers the admin API (needs
// service_role); falls back to public signUp (works with the anon key).
const ensureAuthUser = async (email, password, metadata) => {
  try {
    const { error } = await supabase.auth.admin.createUser({
      email, password, email_confirm: true, user_metadata: metadata,
    });
    if (!error || /already|registered|exists/i.test(error.message || "")) return;
  } catch { /* fall through to signUp */ }
  await supabase.auth.signUp({ email, password, options: { data: metadata } });
};

export const login = async (req, res, next) => {
  try {
    const { phoneNumber, password } = req.body;
    const target = normalizePhone(phoneNumber);

    const record = await findRecordByPhone(target);
    if (!record?.email) {
      return res.status(401).json({ message: "Invalid phone number or password" });
    }

    let { data, error } = await supabase.auth.signInWithPassword({
      email: record.email,
      password,
    });

    // Self-heal: sign-in failed but the stored password matches → the Auth
    // account is missing (admin added them but the login was never created).
    // Create it on the fly and retry once.
    if (error && record.password && record.password === password) {
      await ensureAuthUser(record.email, password, {
        name: record.name,
        phoneNumber,
        location: record.location,
        role: record.role,
      });
      ({ data, error } = await supabase.auth.signInWithPassword({
        email: record.email,
        password,
      }));
    }

    if (error || !data?.session) {
      return res.status(401).json({ message: "Invalid phone number or password" });
    }

    // Heal a stale/missing role on the Auth account using the table the person
    // was found in (e.g. someone in lead_managers must be role "lead-manager").
    // This drives the post-login redirect AND the route guards.
    const canonicalRole = record.role;
    if (canonicalRole && data.user && data.user.user_metadata?.role !== canonicalRole) {
      const newMeta = { ...(data.user.user_metadata || {}), role: canonicalRole };
      try {
        const { data: upd } = await supabase.auth.admin.updateUserById(data.user.id, {
          user_metadata: newMeta,
        });
        if (upd?.user) data.user = upd.user;
      } catch {
        try {
          const { data: upd2 } = await supabase.auth.updateUser({ data: newMeta });
          if (upd2?.user) data.user = upd2.user;
        } catch { /* ignore — fall back to patching the response below */ }
      }
      if (data.user?.user_metadata) data.user.user_metadata.role = canonicalRole;
    }

    if (data.user) {
      const { error: syncError } = await supabase
        .from('users')
        .upsert({
          id: data.user.id,
          name: data.user.user_metadata?.name,
          email: data.user.email,
          phone: data.user.user_metadata?.phoneNumber,
          role: data.user.user_metadata?.role || 'partner',
          location: data.user.user_metadata?.location,
        }, { onConflict: 'id' });
      if (syncError) {
        console.warn('Could not sync user on login:', syncError);
        // Don't fail login just because of sync error
      }
    }

    res.cookie(COOKIE_NAME, data.session.access_token, cookieOptions);

    res.json({
      message: "User logged in successfully",
      user: data.user,
      session: data.session.access_token,
    });
  } catch (err) {
    next(err);
  }
};

export const me = async (req, res, next) => {
  try {
    // Prefer the auth cookie; fall back to a Bearer header for non-browser clients.
    const header = req.headers.authorization || "";
    const token =
      req.cookies?.[COOKIE_NAME] ||
      (header.startsWith("Bearer ") ? header.slice(7) : null);
    if (!token) return res.status(401).json({ message: "Unauthorized" });

    const { data: { user }, error } = await supabase.auth.getUser(token);
    if (error) throw error;
    res.json({ user: user || null });
  } catch (err) {
    next(err);
  }
};

export const logout = (req, res) => {
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  });
  res.json({ message: "Logged out successfully" });
};
