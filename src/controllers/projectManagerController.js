// projectManagerController — Project Manager accounts (login + admin CRUD).
import { supabase } from "../../lib/supbase.js";

export const list = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("project_managers")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ message: "Project managers fetched successfully", data: data || [] });
  } catch (err) {
    next(err);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("project_managers").select("*").eq("id", req.params.id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Project manager not found" });
    res.json({ message: "Project manager fetched successfully", data });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const { name, phone, email, location, password } = req.body;
    const photo = req.file?.filename;
    if (!name || !phone || !password) {
      return res.status(400).json({ message: "name, phone and password are required" });
    }

    // Create a Supabase Auth login (phone + password), role "project-manager".
    const digits = String(phone || "").replace(/\D/g, "");
    const loginEmail = email || (digits ? `${digits}@pm.flexifold.app` : null);
    if (loginEmail) {
      const { error: authError } = await supabase.auth.admin.createUser({
        email: loginEmail,
        password,
        email_confirm: true,
        user_metadata: { name, phoneNumber: phone, location, role: "project-manager" },
      });
      if (authError) {
        console.warn("Could not create auth login for project manager:", authError.message);
      }
    }

    const { data, error } = await supabase
      .from("project_managers")
      .insert([{ name, phone, email, location, password, photo }])
      .select()
      .single();
    if (error?.code === "23505") return res.status(400).json({ message: "Email already exists" });
    if (error) throw error;
    res.status(201).json({ message: "Project manager created successfully", data });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const { name, phone, email, location, password } = req.body;
    const photo = req.file?.filename;
    const updates = { name, phone, email, location, password };
    if (photo) updates.photo = photo;
    Object.keys(updates).forEach((k) => updates[k] === undefined && delete updates[k]);

    const { data, error } = await supabase
      .from("project_managers")
      .update(updates)
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Project manager not found" });
    res.json({ message: "Project manager updated successfully", data });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("project_managers")
      .delete()
      .eq("id", req.params.id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Project manager not found" });
    res.json({ message: "Project manager removed successfully", data });
  } catch (err) {
    next(err);
  }
};
