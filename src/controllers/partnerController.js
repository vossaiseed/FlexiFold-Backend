// partnerController — request handlers
import { supabase } from "../../lib/supbase.js";

export const list = async (req, res, next) => {
  try {
    const { status } = req.query;
    const { data, error } = await supabase
    .from("partner")
    .select("*")
    .order("created_at", { ascending: false });
    if(error) throw error;
    if(!data) return res.json({ message: "No partners found", data: [] });
    res.json({ message: "Partners fetched successfully", data });
    
  } catch (err) {
    next(err);
    console.error(err);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
    .from("partner")
    .select("*")
    .eq("id",id)
    .single();
    if(error) throw error;
    if(!data) return res.status(404).json({ message: "Partner not found" });

    res.json({ message: "Partner fetched successfully", data });
  } catch (err) {
    next(err);
    console.error(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const { name, phone, email, password ,companyname,city,state,role} = req.body;
    const image = req.file?.filename;
    const {data,error}=await supabase
    .from("partner")
    .insert([{ name, phone, email, password ,companyname,city,state,role,image}])
    .select()
    .single();
    if (error?.code === '23505') {
  return res.status(400).json({
    message: 'Email already exists'
  });
}
    if(error) throw error;
    if(!data) return res.status(400).json({ message: "Failed to create partner" });
    res.status(201).json({ message: "Partner created successfully", data });
  } catch (err) {
    next(err);
    console.error(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { name, phone, email ,companyname,city,state,role} = req.body;
    const image = req.file?.filename;
    const { data, error } = await supabase
    .from("partner")
    .update({ name, phone, email ,companyname,city,state,role,image})
    .eq("id", id)
    .select()
    .single();
    if (error?.code === '23505') {
  return res.status(400).json({
    message: 'Email already exists'
  });
}
    if(error) throw error;
    if(!data) return res.status(404).json({ message: "Partner not found" });
    res.json({ message: "Partner updated successfully", data });
  
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data, error } = await supabase
    .from("partner")
    .delete()
    .eq("id", id)
    .select()
    .single();
    if(error) throw error;
    if(!data) return res.status(404).json({ message: "Partner not found" });
    res.json({ message: "Partner deleted successfully", data });
  } catch (err) {
    next(err);
  }
};
