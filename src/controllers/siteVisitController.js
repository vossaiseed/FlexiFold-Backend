// siteVisitController — site visits created by the sales team for a lead.
import { supabase } from "../../lib/supbase.js";
import { getUserIdFromReq } from "../utils/authUser.js";

const enrich = async (rows) => {
  if (!rows?.length) return rows || [];
  const leadIds = [...new Set(rows.map((r) => r.lead_id).filter(Boolean))];
  let leadMap = {};
  if (leadIds.length) {
    const { data: leads } = await supabase.from("leads").select("id, name, phone").in("id", leadIds);
    (leads || []).forEach((l) => { leadMap[l.id] = l; });
  }
  return rows.map((r) => ({
    ...r,
    lead_name: leadMap[r.lead_id]?.name || null,
    lead_phone: leadMap[r.lead_id]?.phone || null,
  }));
};

export const list = async (req, res, next) => {
  try {
    const { lead_id, status } = req.query;
    let query = supabase.from("site_visits").select("*").order("created_at", { ascending: false });
    if (lead_id) query = query.eq("lead_id", lead_id);
    if (status) query = query.eq("status", status);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ message: "Site visits fetched successfully", data: await enrich(data) });
  } catch (err) {
    next(err);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("site_visits").select("*").eq("id", req.params.id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Site visit not found" });
    res.json({ message: "Site visit fetched successfully", data: (await enrich([data]))[0] });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const { lead_id, visit_date, location, notes, status } = req.body;
    if (!lead_id) return res.status(400).json({ message: "lead_id is required" });
    const assigned_to = req.body.assigned_to || (await getUserIdFromReq(req));
    const { data, error } = await supabase
      .from("site_visits")
      .insert([{ lead_id, assigned_to, visit_date, location, notes, status }])
      .select()
      .single();
    if (error?.code === "23514") return res.status(400).json({ message: error.message });
    if (error) throw error;
    res.status(201).json({ message: "Site visit created successfully", data });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const allowed = ["visit_date", "location", "notes", "status", "assigned_to"];
    const updates = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    if (!Object.keys(updates).length) return res.status(400).json({ message: "No valid fields to update" });
    const { data, error } = await supabase.from("site_visits").update(updates).eq("id", req.params.id).select().single();
    if (error?.code === "23514") return res.status(400).json({ message: error.message });
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Site visit not found" });
    res.json({ message: "Site visit updated successfully", data });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("site_visits").delete().eq("id", req.params.id).select().single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Site visit not found" });
    res.json({ message: "Site visit removed successfully", data });
  } catch (err) {
    next(err);
  }
};
