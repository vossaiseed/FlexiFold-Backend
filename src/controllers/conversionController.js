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
    if (!data || data.length === 0) return res.json({ message: "No conversions found", data: [] });

    // Resolve the related lead + sales-staff details for display.
    const leadIds = [...new Set(data.map((c) => c.lead_id).filter(Boolean))];
    const staffIds = [...new Set(data.map((c) => c.sales_staff_id).filter(Boolean))];

    const leadsMap = {};
    if (leadIds.length) {
      const { data: leads } = await supabase
        .from("leads")
        .select("id, name, email, phone, conversion_amount")
        .in("id", leadIds);
      (leads || []).forEach((l) => { leadsMap[l.id] = l; });
    }

    // Latest available amount: the lead's conversion_amount is the single source
    // of truth (written by the telecaller at conversion AND by Sales later, so it
    // always holds the most recent value); fall back to the request's own amount.
    const hasVal = (v) => v !== null && v !== undefined && v !== "";
    const effectiveAmount = (c) => {
      const leadAmt = leadsMap[c.lead_id]?.conversion_amount;
      return hasVal(leadAmt) ? leadAmt : (hasVal(c.amount) ? c.amount : null);
    };

    // sales_staff_id may reference the users table, the salesstaff table, or a
    // Supabase Auth user id (telecaller submissions). Resolve against all three
    // so the staff name always shows.
    const staffMap = {};
    if (staffIds.length) {
      for (const table of ["users", "salesstaff"]) {
        const { data: rows } = await supabase
          .from(table)
          .select("id, name, email, phone")
          .in("id", staffIds);
        (rows || []).forEach((u) => { if (!staffMap[u.id]) staffMap[u.id] = u; });
      }

      // Fall back to Auth metadata for any id not found in those tables.
      const missing = staffIds.filter((id) => !staffMap[id]);
      if (missing.length) {
        try {
          const { data: authList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
          (authList?.users || []).forEach((u) => {
            if (missing.includes(u.id)) {
              staffMap[u.id] = {
                id: u.id,
                name: u.user_metadata?.name,
                email: u.email,
                phone: u.user_metadata?.phoneNumber,
              };
            }
          });
        } catch (e) {
          console.warn("Could not load auth users for conversion staff names:", e?.message || e);
        }
      }
    }

    const enriched = data.map((c) => ({
      ...c,
      lead_name: leadsMap[c.lead_id]?.name || null,
      lead_email: leadsMap[c.lead_id]?.email || null,
      lead_phone: leadsMap[c.lead_id]?.phone || null,
      lead_conversion_amount: leadsMap[c.lead_id]?.conversion_amount ?? null,
      effective_amount: effectiveAmount(c),
      sales_staff_name: staffMap[c.sales_staff_id]?.name || null,
      sales_staff_email: staffMap[c.sales_staff_id]?.email || null,
      sales_staff_phone: staffMap[c.sales_staff_id]?.phone || null,
    }));

    res.json({ message: "Conversions fetched successfully", data: enriched });
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
      .insert([{ lead_id, sales_staff_id, customer_name, amount, status: status || "Pending", notes }])
      .select()
      .single();
    if (error?.code === "23505") {
      return res.status(400).json({ message: "Conversion already exists for this lead" });
    }
    if (error) throw error;
    res.status(201).json({ message: "Conversion created successfully", data });
  } catch (err) {
    next(err);
  }
};

export const update = async (req, res, next) => {
  try {
    const { id } = req.params;

    // Partial update: only change the fields actually provided, so an
    // approve/reject (status-only) request doesn't wipe other columns.
    const allowed = ["lead_id", "sales_staff_id", "customer_name", "amount", "status", "notes"];
    const updates = {};
    for (const key of allowed) {
      if (req.body[key] !== undefined) updates[key] = req.body[key];
    }
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No valid fields to update" });
    }

    const { data, error } = await supabase
      .from("conversions")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Conversion not found" });
    res.json({ message: "Conversion updated successfully", data });
  } catch (err) {
    next(err);
  }
};

// PUT /conversions/:id/amount — Sales (or admin) sets the final conversion
// amount + notes. Only touches amount/notes (cannot change status), so it's
// safe to allow the sales role without risking approve/reject.
export const updateAmount = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { amount, notes } = req.body;
    const updates = {};
    if (amount !== undefined) updates.amount = amount === "" ? null : amount;
    if (notes !== undefined) updates.notes = notes;
    if (Object.keys(updates).length === 0) {
      return res.status(400).json({ message: "No fields to update" });
    }
    const { data, error } = await supabase
      .from("conversions")
      .update(updates)
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Conversion not found" });
    res.json({ message: "Conversion amount updated successfully", data });
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
      .select()
      .single();
    if (error) throw error;
    if (!data) return res.status(404).json({ message: "Conversion not found" });
    res.json({ message: "Conversion removed successfully", data });
  } catch (err) {
    next(err);
  }
};
