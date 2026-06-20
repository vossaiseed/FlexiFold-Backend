// Resolve the calling Supabase user from the request (cookie or Bearer header).
import { supabase } from "../../lib/supbase.js";

export function getTokenFromReq(req) {
  const header = req.headers.authorization || "";
  return req.cookies?.token || (header.startsWith("Bearer ") ? header.slice(7) : null);
}

// Returns the Supabase auth user object, or null when not authenticated.
export async function getUserFromReq(req) {
  const token = getTokenFromReq(req);
  if (!token) return null;
  try {
    const { data: { user } } = await supabase.auth.getUser(token);
    return user || null;
  } catch {
    return null;
  }
}

export async function getUserIdFromReq(req) {
  const user = await getUserFromReq(req);
  return user?.id || null;
}
