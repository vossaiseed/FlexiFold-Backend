// conversionController — request handlers
import { supabase } from "../../lib/supbase.js";

export const list = async (req, res, next) => {
  try {
    const { status } = req.query;

    let query = supabase
      .from("conversions")
      .select("*")
      .order("created_at", { ascending: false });

    if (status) query = query.eq("status", status);

    const { data, error } = await query;
    if (error) throw error;
    if (!data) return res.json({ message: "No conversions found", data: [] });

    res.json({ message: "Conversions fetched successfully", data });
  } catch (err) {
    next(err);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const {id} = req.params;
    const {data,error} = await supabase
    .from("conversions")
    .select("*")
    .eq("id", id)
    .single();
    if(error) throw error;
    if(!data) return res.status(404).json({ message: "Conversion not found" });

    res.json({ message: "Conversion fetched successfully", data });
    
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const { lead_id, sales_staff_id, customer_name, amount, status, notes } = req.body;

    if (!lead_id) return res.status(400).json({ message: "lead_id is required" });

    const { data, error } = await supabase
      .from("conversions")
      .insert([{ lead_id, sales_staff_id, customer_name, amount, status, notes }])
      .select()
      .single();
    if (error) throw error;
 if (error?.code === '23505') {
  return res.status(400).json({
    message: 'Email already exists'
  });
}
    res.status(201).json({ message: "Conversion created successfully", data });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { lead_id, sales_staff_id, customer_name, amount, status, notes } = req.body;
    
     if (!lead_id) return res.status(400).json({ message: "lead_id is required" });
    const { data, error } = await supabase
    .from("conversions")
    .select()
    .eq("id", id)
    .update({ lead_id, sales_staff_id, customer_name, amount, status, notes })
    .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Conversion not found" });
    res.json({ message: "Conversion updated successfully", data });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
    .from("conversions")
    .delete()
    .eq("id", id)
    .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Conversion not found" });
    res.json({ message: "Conversion removed successfully", data });
  } catch (err) {
    next(err);
  }
};
