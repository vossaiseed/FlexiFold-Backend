import { supabase } from "../../lib/supbase.js";

// Build an id -> name map for resolving lead.partner_id / assigned_to.
// Those ids are Supabase Auth user ids. The public.users table mirrors them,
// but isn't always populated for every partner, so we fall back to the name
// stored in Auth user_metadata. Result: partner names resolve reliably.
const buildUserNameMap = async () => {
  const map = {};

  const { data: users } = await supabase.from("users").select("id, name");
  (users || []).forEach((u) => {
    if (u.name) map[u.id] = u.name;
  });

  try {
    const { data: authList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
    (authList?.users || []).forEach((u) => {
      if (!map[u.id] && u.user_metadata?.name) map[u.id] = u.user_metadata.name;
    });
  } catch (e) {
    console.warn("Could not load auth users for name map:", e?.message || e);
  }

  // Also resolve ids that point at app tables (e.g. a lead reassigned to a
  // sales-staff row), so assigned_to / partner_id show a name either way.
  for (const table of ["salesstaff", "lead_managers", "partner"]) {
    const { data } = await supabase.from(table).select("id, name");
    (data || []).forEach((r) => {
      if (r.name && !map[r.id]) map[r.id] = r.name;
    });
  }

  return map;
};

export const list = async (req, res, next) => {
  try {
    const { status } = req.query;

    // Identify the caller from their session. Partners may only see the leads
    // they created; admins, lead-managers, etc. see everything.
    const header = req.headers.authorization || "";
    const token = req.cookies?.token || (header.startsWith("Bearer ") ? header.slice(7) : null);

    let callerId = null;
    let callerRole = null;
    if (token) {
      const { data: { user: authUser }, error: uErr } = await supabase.auth.getUser(token);
      if (!uErr && authUser) {
        callerId = authUser.id;
        callerRole = authUser.user_metadata?.role || null;
      }
    }

    let query = supabase
    .from("leads")
    .select("*")
    .order("created_at", { ascending: false });
    if (status) query = query.eq("status", status);
    // Scope partners to their own leads so they can't see other partners' leads.
    if (callerRole === "partner" && callerId) {
      query = query.eq("partner_id", callerId);
    }
    const { data: leads, error } = await query;
    if (error) throw error;
    if (!leads) return res.json({ message: "No leads found", data: [] });

    // Resolve names from the users table, falling back to Auth metadata.
    const userMap = await buildUserNameMap();

    const data = leads.map(lead => ({
      ...lead,
      partner_name: userMap[lead.partner_id] || null,
      assigned_name: userMap[lead.assigned_to] || null,
      partner: userMap[lead.partner_id] || null, // fallback
    }));

    res.json({ message: "Leads fetched successfully", data });
  } catch (err) {
    next(err);
  }
};

export const getOne = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { data: lead, error } = await supabase
    .from("leads")
    .select("*")
    .eq("id", id)
    .single();
    if(error) throw error;
    if(!lead) return res.status(404).json({ message: "Lead not found" });

    // Resolve partner/assignee name (users table + Auth metadata fallback).
    const userMap = await buildUserNameMap();
    const partner_name = userMap[lead.partner_id] || null;
    const assigned_name = userMap[lead.assigned_to] || null;

    const data = {
      ...lead,
      partner_name,
      assigned_name,
      partner: partner_name,
    };

    res.json({ message: "Lead fetched successfully", data });
  } catch (err) {
    next(err);
  }
};

export const create = async (req, res, next) => {
  try {
    let {
      name, phone, whatsapp, email, location, state,
      requirement, units, urgency, designation, language,
      status, notes, partner_id, assigned_to,
    } = req.body;

    if (!name || !phone) {
      return res.status(400).json({ message: "name and phone are required" });
    }

    // ----------------------------------------------------------------
    // Resolve the calling user from the JWT so we can:
    //   1. Auto-sync them into the public.users table (prevents FK errors)
    //   2. Auto-set partner_id / assigned_to when the caller is a partner
    // ----------------------------------------------------------------
    const header = req.headers.authorization || "";
    const token = req.cookies?.token || (header.startsWith("Bearer ") ? header.slice(7) : null);

    if (token) {
      try {
        const { data: { user: authUser }, error: uErr } = await supabase.auth.getUser(token);

        if (uErr) {
          console.warn("JWT validation failed:", uErr.message);
        } else if (authUser) {
          // Always upsert the user to public.users so FK references never fail
          const { error: syncError } = await supabase
            .from("users")
            .upsert(
              {
                id: authUser.id,
                name: authUser.user_metadata?.name || "Unknown",
                email: authUser.email,
                phone: authUser.user_metadata?.phoneNumber || "",
                role: authUser.user_metadata?.role || "partner",
                location: authUser.user_metadata?.location,
              },
              { onConflict: "id" }
            );

          if (syncError) {
            console.warn("Could not sync user before lead creation:", syncError.message);
          }

          // Auto-assign partner_id / assigned_to for partner role
          if (authUser.user_metadata?.role === "partner") {
            partner_id = partner_id || authUser.id;
            assigned_to = assigned_to || authUser.id;
          }
        }
      } catch (e) {
        console.warn("Error during user sync:", e?.message || e);
      }
    }

    // Send the values directly to Supabase since we dropped the foreign key constraints.

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

    // Only update the fields actually provided so partial updates
    // (e.g. a status-only change on approve/reject) don't wipe other columns.
    const allowed = [
      "name", "phone", "whatsapp", "email", "location", "state",
      "requirement", "units", "urgency", "designation", "language",
      "status", "notes", "partner_id", "assigned_to",
      "assigned_sales_id", "assigned_sales_name",
      "assigned_telecaller_id", "assigned_telecaller_name",
      "conversion_amount", "sale_notes",
      "last_call_at", "next_follow_up", "call_count",
    ];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    // Auto-record status changes in the activity notes (skip if the caller
    // already supplied a notes update — it logged the change itself).
    if (updates.status !== undefined && updates.notes === undefined) {
      const { data: current } = await supabase
        .from("leads")
        .select("status, notes")
        .eq("id", id)
        .maybeSingle();
      if (current && current.status !== updates.status) {
        const entry = `[${new Date().toISOString().slice(0, 10)}] Status → ${updates.status}`;
        updates.notes = current.notes ? `${current.notes}\n${entry}` : entry;
      }
    }

    const { data: lead, error } = await supabase
      .from("leads")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    // 23514 = check_violation (e.g. a status value the DB constraint rejects).
    if (error?.code === "23514") {
      return res.status(400).json({ message: `Invalid value for update: ${error.message}` });
    }
    if (error) throw error;
    if (!lead) return res.status(404).json({ message: "Lead not found" });

    // Re-attach derived name fields so the response matches the GET /leads shape
    // (otherwise consumers lose partner_name/assigned_name after an update).
    const userMap = await buildUserNameMap();
    const partner_name = userMap[lead.partner_id] || null;
    const assigned_name = userMap[lead.assigned_to] || null;

    const data = { ...lead, partner_name, assigned_name, partner: partner_name };
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
  

