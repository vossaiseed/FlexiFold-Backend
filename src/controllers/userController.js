import { supabase } from "../../lib/supbase.js";

// userController — generic CRUD over the users table
export const list = async (req, res, next) => {
  try {
    const { role } = req.query;
    let query = supabase
      .from("users")
      .select("*")
      .order("created_at", { ascending: false });
    if (role) query = query.eq("role", role);

    const { data, error } = await query;
    if (error) throw error;
    res.json({ message: "Users fetched successfully", data: data || [] });
  } catch (err) {
    next(err);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("id", id)
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User fetched successfully", data });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const { name, email, password, phone, role, profession, company, location } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });

    const { data, error } = await supabase
      .from("users")
      .insert([{ name, email, password, phone, role, profession, company, location }])
      .select()
      .single();
    if (error?.code === '23505') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    if (error) throw error;
    res.status(201).json({ message: "User created successfully", data });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, password, phone, role, profession, company, location } = req.body;

    const { data, error } = await supabase
      .from("users")
      .update({ name, email, password, phone, role, profession, company, location })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User updated successfully", data });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("users")
      .delete()
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "User not found" });
    res.json({ message: "User deleted successfully", data });
  } catch (err) {
    next(err);
  }
};
