// partnerController — request handlers
import { supabase } from "../../lib/supbase.js";
import { resetAuthPassword } from "../utils/authReset.js";

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
    const { name, phone, email, password ,companyname,city,state,role,commission_rate} = req.body;
    const image = req.file?.filename;

    // Create a Supabase Auth account so this partner can actually log in.
    // Login finds the partner by phoneNumber in user_metadata, then signs in
    // with the account's email — so we store the phone in metadata and use the
    // given email (or a synthetic one derived from the phone when none given).
    // Auth metadata role is always "partner" (the form's role column is just a
    // display status like "Authorized Partner").
    if (password) {
      const digits = String(phone || "").replace(/\D/g, "");
      const loginEmail = email || (digits ? `${digits}@partner.flexifold.app` : null);
      if (loginEmail) {
        const { error: authError } = await supabase.auth.admin.createUser({
          email: loginEmail,
          password,
          email_confirm: true, // skip email verification so they can log in now
          user_metadata: {
            name,
            phoneNumber: phone,
            location: city,
            role: "partner",
          },
        });
        // A duplicate just means an account already exists — don't block the row.
        if (authError) {
          console.warn("Could not create auth login for partner:", authError.message);
        }
      } else {
        console.warn("Partner created without a login: no email or phone provided.");
      }
    }

    const {data,error}=await supabase
    .from("partner")
    .insert([{ name, phone, email, password ,companyname,city,state,role,image,
      commission_rate: commission_rate != null && commission_rate !== "" ? Number(commission_rate) : 10 }])
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
    const { name, phone, email ,companyname,city,state,role,commission_rate} = req.body;
    const image = req.file?.filename;
    const { data, error } = await supabase
    .from("partner")
    .update({ name, phone, email ,companyname,city,state,role,image,
      commission_rate: commission_rate != null && commission_rate !== "" ? Number(commission_rate) : undefined })
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

// PUT /partners/:id/reset-password — admin sets a new login password for a
// partner. Updates both the table row and their Supabase Auth account.
export const resetPassword = async (req, res, next) => {
  try {
    const { id } = req.params;
    const { password } = req.body;
    if (!password || String(password).length < 6) {
      return res.status(400).json({ message: "Password must be at least 6 characters" });
    }

    const { data: partner, error: getErr } = await supabase
      .from("partner")
      .select("*")
      .eq("id", id)
      .single();
    if (getErr) throw getErr;
    if (!partner) return res.status(404).json({ message: "Partner not found" });

    await resetAuthPassword({
      email: partner.email,
      phone: partner.phone,
      password,
      name: partner.name,
      location: partner.city,
      role: "partner",
      domain: "partner.flexifold.app",
    });

    const { data, error } = await supabase
      .from("partner")
      .update({ password })
      .eq("id", id)
      .select()
      .single();
    if (error) throw error;

    res.json({ message: "Password reset successfully", data });
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

// GET /partners/:id/leads — leads belonging to this partner.
// leads.partner_id stores the Auth user id, but the partner-table row uses its
// own id, so we bridge them by matching the partner's email / phone to an Auth
// user, then fetch that user's leads.
export const getLeads = async (req, res, next) => {
  try {
    const { id } = req.params;

    const { data: partner, error: pErr } = await supabase
      .from("partner")
      .select("email, phone")
      .eq("id", id)
      .single();
    if (pErr) throw pErr;
    if (!partner) return res.json({ message: "No leads found", data: [] });

    const targetEmail = (partner.email || "").toLowerCase();
    const targetPhone = String(partner.phone || "").replace(/\D/g, "");

    const authIds = new Set();
    try {
      const { data: authList } = await supabase.auth.admin.listUsers({ page: 1, perPage: 1000 });
      (authList?.users || []).forEach((u) => {
        const email = (u.email || "").toLowerCase();
        const phone = String(u.user_metadata?.phoneNumber || "").replace(/\D/g, "");
        if ((targetEmail && email === targetEmail) || (targetPhone && phone === targetPhone)) {
          authIds.add(u.id);
        }
      });
    } catch (e) {
      console.warn("getLeads: could not list auth users:", e?.message || e);
    }

    // Also match the partner-table id itself: leads added from the admin
    // partner-details page store partner_id = the partner-table id (not Auth id).
    const idsToMatch = new Set([...authIds, id]);

    const { data: leads, error } = await supabase
      .from("leads")
      .select("*")
      .in("partner_id", [...idsToMatch])
      .order("created_at", { ascending: false });
    if (error) throw error;

    res.json({ message: "Partner leads fetched successfully", data: leads || [] });
  } catch (err) {
    next(err);
  }
};
