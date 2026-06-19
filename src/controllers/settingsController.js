// settingsController — profile, notification prefs and password for the
// currently logged-in user (resolved from their session cookie / bearer token).
import { supabase } from "../../lib/supbase.js";

const DEFAULT_NOTIFY = { email: true, leadAlerts: true, weekly: false };

// Resolve the authenticated user from the cookie (preferred) or Bearer header.
const getAuthUser = async (req) => {
  const header = req.headers.authorization || "";
  const token =
    req.cookies?.token || (header.startsWith("Bearer ") ? header.slice(7) : null);
  if (!token) return null;
  const { data: { user }, error } = await supabase.auth.getUser(token);
  if (error) return null;
  return user;
};

export const getSettings = async (req, res, next) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const meta = user.user_metadata || {};
    res.json({
      message: "Settings fetched successfully",
      data: {
        name: meta.name || "",
        email: user.email || "",
        phone: meta.phoneNumber || "",
        role: meta.role || "",
        location: meta.location || "",
        profession: meta.profession || "",
        company: meta.company || "",
        notify: { ...DEFAULT_NOTIFY, ...(meta.notify || {}) },
      },
    });
  } catch (err) {
    next(err);
  }
};

export const updateSettings = async (req, res, next) => {
  try {
    const user = await getAuthUser(req);
    if (!user) return res.status(401).json({ message: "Unauthorized" });

    const { name, phone, location, profession, company, notify, currentPassword, newPassword } = req.body;

    // --- Optional password change ---
    if (newPassword) {
      if (!currentPassword) {
        return res.status(400).json({ message: "Current password is required to set a new password" });
      }
      // Verify the current password by attempting a sign-in with it.
      const { error: verifyError } = await supabase.auth.signInWithPassword({
        email: user.email,
        password: currentPassword,
      });
      if (verifyError) {
        return res.status(400).json({ message: "Current password is incorrect" });
      }
      const { error: pwError } = await supabase.auth.admin.updateUserById(user.id, {
        password: newPassword,
      });
      if (pwError) throw pwError;
    }

    // --- Profile + notification metadata (only overwrite provided fields) ---
    const newMeta = {
      ...(user.user_metadata || {}),
      ...(name !== undefined ? { name } : {}),
      ...(phone !== undefined ? { phoneNumber: phone } : {}),
      ...(location !== undefined ? { location } : {}),
      ...(profession !== undefined ? { profession } : {}),
      ...(company !== undefined ? { company } : {}),
      ...(notify !== undefined ? { notify } : {}),
    };
    const { data: updated, error: metaError } = await supabase.auth.admin.updateUserById(
      user.id,
      { user_metadata: newMeta }
    );
    if (metaError) throw metaError;

    // Keep the public.users row in sync (name/phone are used across the app).
    await supabase.from("users").upsert(
      {
        id: user.id,
        name: newMeta.name,
        email: user.email,
        phone: newMeta.phoneNumber,
        role: newMeta.role || "partner",
        location: newMeta.location,
      },
      { onConflict: "id" }
    );

    res.json({ message: "Settings updated successfully", data: updated.user });
  } catch (err) {
    next(err);
  }
};
