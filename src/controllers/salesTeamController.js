import { supabase } from "../../lib/supbase.js";
import { resetAuthPassword } from "../utils/authReset.js";

const CLOSED = ["Converted", "Failed", "Rejected"];
const digits = (p) => String(p ?? "").replace(/\D/g, "");
const norm = (s) => (s || "").trim().toLowerCase();

// salesTeamController — request handlers (salesstaff table)
export const list = async (req, res, next) => {
  try {
    const { data: staff, error } = await supabase
      .from("salesstaff")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (!staff || staff.length === 0) return res.json({ message: "No sales team members found", data: [] });

    // A lead's assigned_to may be the salesstaff row id OR the staff member's
    // Auth id. Bridge Auth id -> phone via the users table so we can attribute
    // each lead to the right staff member regardless of which id was stored.
    // NOTE: `assigned_name` is NOT a real column — leadController derives it in
    // code. Selecting it here errors the whole query. Use only real columns and
    // resolve the staff member via assigned_to (its value may be the salesstaff
    // row id OR the staff member's Auth id, which we bridge through `users`).
    const { data: leads } = await supabase
      .from("leads")
      .select("id, assigned_to, status, urgency");
    const { data: users } = await supabase.from("users").select("id, phone, name");
    const userById = {};
    (users || []).forEach((u) => { userById[u.id] = u; });

    const data = staff.map((s) => {
      const sPhone = digits(s.phone);
      const sName = norm(s.name);
      const mine = (leads || []).filter((l) => {
        if (!l.assigned_to) return false;
        if (l.assigned_to === s.id) return true;
        const u = userById[l.assigned_to];
        if (u && ((sPhone && digits(u.phone) === sPhone) || (sName && norm(u.name) === sName))) return true;
        return false;
      });
      return {
        ...s,
        leads_count: mine.length,
        active_count: mine.filter((l) => !CLOSED.includes(l.status)).length,
        converted_count: mine.filter((l) => l.status === "Converted").length,
        vip_count: mine.filter((l) => l.urgency === "High" && !CLOSED.includes(l.status)).length,
      };
    });

    res.json({ message: "Sales team members fetched successfully", data });
  } catch (err) {
    next(err);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("salesstaff")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Sales team member not found" });
    res.json({ message: "Sales team member fetched successfully", data });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const {
      name, phone, email, password, city, state,
      closing_capacity, max_lead_capacity, language,
      proficiency, full_access, role,
    } = req.body;
    const photo = req.file?.filename;

    if (!name || !phone) {
      return res.status(400).json({ message: "name and phone are required" });
    }

    // Provision a Supabase Auth login (phone + password), role "sales", so the
    // member can log in to the Sales dashboard.
    if (password) {
      const d = digits(phone);
      const loginEmail = email || (d ? `${d}@sales.flexifold.app` : null);
      if (loginEmail) {
        const { error: authError } = await supabase.auth.admin.createUser({
          email: loginEmail,
          password,
          email_confirm: true,
          user_metadata: { name, phoneNumber: phone, location: city, role: "sales" },
        });
        if (authError) console.warn("Could not create auth login for sales staff:", authError.message);
      }
    }

    const { data, error } = await supabase
      .from("salesstaff")
      .insert([{
        name, phone, email, password, city, state,
        closing_capacity, max_lead_capacity, language,
        proficiency, full_access, role, photo,
      }])
      .select()
      .single();
    if (error?.code === '23505') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    if (error) throw error;
    res.status(201).json({ message: "Sales staff created successfully", data });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name, phone, email, password, city, state,
      closing_capacity, max_lead_capacity, language,
      proficiency, full_access, role,
    } = req.body;
    const photo = req.file?.filename;

    const updates = {
      name, phone, email, password, city, state,
      closing_capacity, max_lead_capacity, language,
      proficiency, full_access, role,
    };
    if (photo) updates.photo = photo;

    const { data, error } = await supabase
      .from("salesstaff")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error?.code === '23505') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Sales staff not found" });
    res.json({ message: "Sales staff updated successfully", data });
  } catch (err) {
    next(err);
  }
};

// PUT /sales-team/:id/reset-password — admin sets a new login password for a
// sales staff member. Updates both the table row (so it shows on the card) and
// their Supabase Auth account (so the new password works on login).
export const resetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!password || String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const { data: staff, error: getErr } = await supabase
      .from("salesstaff")
      .select("*")
      .eq("id", id)
      .single();
    if (getErr) throw getErr;
    if (!staff) return res.status(404).json({ message: "Sales staff not found" });

    await resetAuthPassword({
      email: staff.email,
      phone: staff.phone,
      password,
      name: staff.name,
      location: staff.city,
      role: "sales",
      domain: "sales.flexifold.app",
    });

    const { data, error } = await supabase
      .from("salesstaff")
      .update({ password })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    res.json({ message: "Password reset successfully", data });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("salesstaff")
      .delete()
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Sales staff not found" });
    res.json({ message: "Sales staff deleted successfully", data });
  } catch (err) {
    next(err);
  }
};
