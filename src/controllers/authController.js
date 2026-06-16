// Auth controller — registration, login, current user
import { supabase } from "../../lib/supbase.js";

// httpOnly auth cookie — the browser sends it automatically on each request,
// and JS can't read it (mitigates token theft via XSS).
const isProd = process.env.NODE_ENV === "production";
const COOKIE_NAME = "token";
const cookieOptions = {
  httpOnly: true,
  secure: isProd, // HTTPS-only in production
  sameSite: isProd ? "none" : "lax", // cross-site cookies in prod require "none"
  maxAge: 7 * 24 * 60 * 60 * 1000, // 7 days
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

    // Only an active session has a token to store in the cookie. When email
    // confirmation is required there's no session yet, so we skip the cookie.
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

// Compare phone numbers by digits only, so spaces/dashes don't break matching.
// Coerce to a string first — stored metadata or the request body may send a number.
const normalizePhone = (p) => String(p ?? "").replace(/\D/g, "");

export const login = async (req, res, next) => {
  try {
    const { phoneNumber, password } = req.body;

    // Users sign up with email; their phone number is saved in user metadata.
    // Look up the account by phone, then sign in with that account's email.
    // NOTE: this scans the auth user list — fine for now, but for a large user
    // base replace with an indexed phone->email lookup (e.g. a profiles table).
    const { data: list, error: listError } = await supabase.auth.admin.listUsers({
      page: 1,
      perPage: 1000,
    });
    if (listError) throw listError;

    const target = normalizePhone(phoneNumber);
    const account = list.users.find(
      (u) => normalizePhone(u.user_metadata?.phoneNumber) === target
    );
    if (!account?.email) {
      return res.status(401).json({ message: "Invalid phone number or password" });
    }

    const { data, error } = await supabase.auth.signInWithPassword({
      email: account.email,
      password,
    });
    if (error) {
      return res.status(401).json({ message: "Invalid phone number or password" });
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
  // httpOnly cookies can't be removed from JS, so the server must clear it.
  // Match the attributes used when setting it, otherwise the browser keeps it.
  res.clearCookie(COOKIE_NAME, {
    httpOnly: true,
    secure: isProd,
    sameSite: isProd ? "none" : "lax",
  });
  res.json({ message: "Logged out successfully" });
};
