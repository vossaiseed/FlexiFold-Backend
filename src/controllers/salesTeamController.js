import { supabase } from "../../lib/supbase.js";

// salesTeamController — request handlers (salesstaff table)
export const list = async (req, res, next) => {
  try {
    const { data, error } = await supabase
      .from("salesstaff")
      .select("*")
      .order("created_at", { ascending: false });
    if (error) throw error;
    if (!data) return res.json({ message: "No sales team members found", data: [] });
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
