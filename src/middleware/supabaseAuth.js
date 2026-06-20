// Supabase-token auth middleware.
// The app authenticates with Supabase (token in the `token` cookie or a Bearer
// header), so we validate against Supabase rather than a custom JWT. Pairs with
// roleCheck(...) which reads req.user.role.
import { getUserFromReq } from "../utils/authUser.js";

const toReqUser = (user) => ({
  id: user.id,
  email: user.email,
  role: user.user_metadata?.role || null,
  meta: user.user_metadata || {},
});

// Attach req.user when a session is present, but never block.
export const attachUser = async (req, res, next) => {
  const user = await getUserFromReq(req);
  if (user) req.user = toReqUser(user);
  next();
};

// Block unless authenticated.
export const requireAuth = async (req, res, next) => {
  const user = await getUserFromReq(req);
  if (!user) return res.status(401).json({ message: "Unauthorized — please log in" });
  req.user = toReqUser(user);
  next();
};
