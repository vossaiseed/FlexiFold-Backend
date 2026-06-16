// leadController — request handlers
import { supabase } from "../../lib/supbase.js";

export const list = async (req, res, next) => {
  try {
    const { status } = req.query;
    let query = supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    if (!data) return res.json({ message: "No leads found", data: [] });
    res.json({ message: "Leads fetched successfully", data });
  } catch (err) {
    next(err);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const{data,error} = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();
    if(error) throw error;
    if(!data) return res.status(404).json({ message: "Lead not found" });
    res.json({ message: "Lead fetched successfully", data });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const {
      name, phone, whatsapp, email, location, state,
      requirement, units, urgency, designation, language,
      status, notes, partner_id, assigned_to,
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: "name and phone are required" });
    }

    const { data, error } = await supabase
      .from("leads")
      .insert([{
        name, phone, whatsapp, email, location, state,
        requirement, units, urgency, designation, language,
        status, notes, partner_id, assigned_to,
      }])
      .select()
      .single();
    if (error?.code === '23505') {
      return res.status(400).json({ message: 'Lead already exists' });
    }
    if (error) throw error;
    res.status(201).json({ message: "Lead created successfully", data });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const {
      name, phone, whatsapp, email, location, state,
      requirement, units, urgency, designation, language,
      status, notes, partner_id, assigned_to,
    } = req.body;
    
    if (!name || !phone) {
      return res.status(400).json({ message: "name and phone are required" });
    }
    const { data, error } = await supabase
      .from("leads")
      .update({
        name, phone, whatsapp, email, location, state,
        requirement, units, urgency, designation, language,
        status, notes, partner_id, assigned_to,
      })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Lead not found" });
    res.json({ message: "Lead updated successfully", data });
  } catch (err) {
    next(err);
  }
}
  

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
      .from("leads")
      .delete()
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Lead not found" });
    res.json({ message: "Lead removed successfully", data });
  } catch (err) {
    next(err);
  }
}
  

