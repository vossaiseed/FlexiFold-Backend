// leadManagerController — request handlers
import { supabase } from "../../lib/supbase.js";

export const list = async (req, res, next) => {
  try {
    const { data, error } = await supabase
    .from("lead_managers")
    .select("*")
    .order("created_at", { ascending: false });
    if (error) throw error;
    if (!data) return res.json({ message: "No lead managers found", data: [] });
    res.json({ message: "Lead managers fetched successfully", data });
    
 
  } catch (err) {
    next(err);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const{data,error} = await supabase
    .from("lead_managers")
    .select("*")
    .eq("id", id)
    .single();
    if(error) throw error;
    if(!data) return res.status(404).json({ message: "Lead manager not found" });
    res.json({ message: "Lead manager fetched successfully", data });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const {name, phone, email, location, password} = req.body;
     const photo = req.file?.filename;
    if (!name || !phone || !password) {
      return res.status(400).json({ message: "name, phone and password are required" });
    }
    const { data, error } = await supabase
      .from("lead_managers")
      .insert([{ name, phone, email, location, password, photo }])
      .select()
      .single();
    if (error?.code === '23505') {
      return res.status(400).json({ message: 'Email already exists' });
    }
    if (error) throw error;
    res.status(201).json({ message: "Lead manager created successfully", data });
   
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, email, location, password } = req.body;
    const photo = req.file?.filename;
    const updates = { name, phone, email, location, password };
    if (photo) updates.photo = photo;

    const { data, error } = await supabase
      .from("lead_managers")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Lead manager not found" });

    res.json({ message: "Lead manager updated successfully", data });
  
   
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("lead_managers")
      .delete()
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Lead manager not found" });

    res.json({ message: "Lead manager removed successfully", data });

  } catch (err) {
    next(err);
  }
};
