// measurementController — measurement details + uploaded files/images for a lead.
import { supabase } from "../../lib/supbase.js";
import { getUserIdFromReq } from "../utils/authUser.js";

const enrich = async (rows) => {
  if (!rows?.length) return rows || [];
  const leadIds = [...new Set(rows.map((r) => r.lead_id).filter(Boolean))];
  let leadMap = {};
  if (leadIds.length) {
    const { data: leads } = await supabase.from("leads").select("id, name").in("id", leadIds);
    (leads || []).forEach((l) => { leadMap[l.id] = l; });
  }
  return rows.map((r) => ({ ...r, lead_name: leadMap[r.lead_id]?.name || null }));
};

export const list = async (req, res, next) => {
  try {
    const { lead_id, status } = req.query;
    let query = supabase.from("measurements").select("*").order("created_at", { ascending: false });
    if (lead_id) query = query.eq("lead_id", lead_id);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ message: "Measurements fetched successfully", data: await enrich(data) });
  } catch (err) {
    next(err);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("measurements").select("*").eq("id", req.params.id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Measurement not found" });
    res.json({ message: "Measurement fetched successfully", data: (await enrich([data]))[0] });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const { lead_id, site_visit_id, details, file_urls, status } = req.body;
    if (!lead_id) return res.status(400).json({ message: "lead_id is required" });
    const uploaded_by = req.body.uploaded_by || (await getUserIdFromReq(req));
    const { data, error } = await supabase
      .from("measurements")
      .insert([{ lead_id, site_visit_id, details, file_urls: file_urls || [], uploaded_by, status }])
      .select()
      .single();
    if (error?.code === "23514") return res.status(400).json({ message: error.message });
    if (error) throw error;
    res.status(201).json({ message: "Measurement created successfully", data });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const allowed = ["site_visit_id", "details", "file_urls", "status"];
    const updates = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    if (!Object.keys(updates).length) return res.status(400).json({ message: "No valid fields to update" });
    const { data, error } = await supabase.from("measurements").update(updates).eq("id", req.params.id).select().single();
    if (error?.code === "23514") return res.status(400).json({ message: error.message });
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Measurement not found" });
    res.json({ message: "Measurement updated successfully", data });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("measurements").delete().eq("id", req.params.id).select().single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Measurement not found" });
    res.json({ message: "Measurement removed successfully", data });
  } catch (err) {
    next(err);
  }
};
