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

    // Create a Supabase Auth account so the lead manager can log in (phone + password).
    // Login finds them by phoneNumber in user_metadata, then signs in with the
    // account's email — so store the phone in metadata and use the given email
    // (or a synthetic one from the phone when none given). role is "lead-manager".
    const digits = String(phone || "").replace(/\D/g, "");
    const loginEmail = email || (digits ? `${digits}@lm.flexifold.app` : null);
    if (loginEmail) {
      const { error: authError } = await supabase.auth.admin.createUser({
        email: loginEmail,
        password,
        email_confirm: true, // skip email verification so they can log in now
        user_metadata: {
          name,
          phoneNumber: phone,
          location,
          role: "lead-manager",
        },
      });
      // A duplicate just means an account already exists — don't block the row.
      if (authError) {
        console.warn("Could not create auth login for lead manager:", authError.message);
      }
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
