import { supabase } from "../../lib/supbase.js";

// telecallerController — telecallers are users with role = 'telecaller'
export const list = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("users")
      .select("*")
      .eq("role", "telecaller")
      .order("created_at", { ascending: false });
    if (error) throw error;
    res.json({ message: "Telecallers fetched successfully", data: data || [] });
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
      .eq("role", "telecaller")
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Telecaller not found" });
    res.json({ message: "Telecaller fetched successfully", data });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const { name, email, phone, password, location } = req.body;
    if (!name) return res.status(400).json({ message: "name is required" });

    const { data, error } = await supabase
      .from("users")
      .insert([{ name, email, phone, password, location, role: "telecaller" }])
      .select()
      .single();
    if (error?.code === '23505') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    if (error) throw error;
    res.status(201).json({ message: "Telecaller created successfully", data });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, email, phone, password, location } = req.body;

    const { data, error } = await supabase
      .from("users")
      .update({ name, email, phone, password, location })
      .eq("id", id)
      .eq("role", "telecaller")
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Telecaller not found" });
    res.json({ message: "Telecaller updated successfully", data });
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
      .eq("role", "telecaller")
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Telecaller not found" });
    res.json({ message: "Telecaller deleted successfully", data });
  } catch (err) {
    next(err);
  }
};
