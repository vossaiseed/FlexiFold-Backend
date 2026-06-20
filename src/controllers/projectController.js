// projectController — execution record owned by a Project Manager.
import { supabase } from "../../lib/supbase.js";

const enrich = async (rows) => {
  if (!rows?.length) return rows || [];
  const leadIds = [...new Set(rows.map((r) => r.lead_id).filter(Boolean))];
  const pmIds = [...new Set(rows.map((r) => r.project_manager_id).filter(Boolean))];
  let leadMap = {};
  let pmMap = {};
  if (leadIds.length) {
    const { data: leads } = await supabase.from("leads").select("id, name, phone, location").in("id", leadIds);
    (leads || []).forEach((l) => { leadMap[l.id] = l; });
  }
  if (pmIds.length) {
    const { data: pms } = await supabase.from("project_managers").select("id, name, phone").in("id", pmIds);
    (pms || []).forEach((p) => { pmMap[p.id] = p; });
  }
  return rows.map((r) => ({
    ...r,
    lead_name: leadMap[r.lead_id]?.name || null,
    lead_phone: leadMap[r.lead_id]?.phone || null,
    lead_location: leadMap[r.lead_id]?.location || null,
    project_manager_name: pmMap[r.project_manager_id]?.name || null,
  }));
};

export const list = async (req, res, next) => {
  try {
    const { lead_id, status, project_manager_id } = req.query;
    let query = supabase.from("projects").select("*").order("created_at", { ascending: false });
    if (lead_id) query = query.eq("lead_id", lead_id);
    if (status) query = query.eq("status", status);
    if (project_manager_id) query = query.eq("project_manager_id", project_manager_id);
    const { data, error } = await query;
    if (error) throw error;
    res.json({ message: "Projects fetched successfully", data: await enrich(data) });
  } catch (err) {
    next(err);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("projects").select("*").eq("id", req.params.id).maybeSingle();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Project not found" });
    res.json({ message: "Project fetched successfully", data: (await enrich([data]))[0] });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    const { lead_id, project_manager_id, notes, status } = req.body;
    if (!lead_id) return res.status(400).json({ message: "lead_id is required" });

    // Avoid duplicate project rows for the same lead — reuse if one exists.
    // Use a limited list (not maybeSingle, which errors if duplicates exist).
    const { data: existingRows } = await supabase
      .from("projects")
      .select("*")
      .eq("lead_id", lead_id)
      .order("created_at", { ascending: true })
      .limit(1);
    const existing = existingRows?.[0];
    if (existing) {
      const reuse = { project_manager_id, notes };
      if (status !== undefined) reuse.status = status; // keep current status unless told otherwise
      const { data, error } = await supabase
        .from("projects")
        .update(reuse)
        .eq("id", existing.id)
        .select()
        .single();
      if (error) throw error;
      return res.status(200).json({ message: "Project updated successfully", data: (await enrich([data]))[0] });
    }

    const { data, error } = await supabase
      .from("projects")
      .insert([{ lead_id, project_manager_id, notes, status }])
      .select()
      .single();
    if (error?.code === "23514") return res.status(400).json({ message: error.message });
    if (error) throw error;
    res.status(201).json({ message: "Project created successfully", data: (await enrich([data]))[0] });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const allowed = ["project_manager_id", "status", "notes"];
    const updates = {};
    for (const k of allowed) if (req.body[k] !== undefined) updates[k] = req.body[k];
    // Stamp completion time when moved to Completed; clear it otherwise.
    if (updates.status === "Completed") updates.completed_at = new Date().toISOString();
    else if (updates.status) updates.completed_at = null;
    if (!Object.keys(updates).length) return res.status(400).json({ message: "No valid fields to update" });

    const { data, error } = await supabase.from("projects").update(updates).eq("id", req.params.id).select().single();
    if (error?.code === "23514") return res.status(400).json({ message: error.message });
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Project not found" });
    res.json({ message: "Project updated successfully", data: (await enrich([data]))[0] });
  } catch (err) {
    next(err);
  }
};

export const remove = async (req, res, next) => {
  try {
    const { data, error } = await supabase.from("projects").delete().eq("id", req.params.id).select().single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Project not found" });
    res.json({ message: "Project removed successfully", data });
  } catch (err) {
    next(err);
  }
};
