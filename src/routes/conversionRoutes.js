import { Router } from "express";
import * as conversionController from "../controllers/conversionController.js";
import { requireAuth } from "../middleware/supabaseAuth.js";
import { roleCheck } from "../middleware/roleCheck.js";

const router = Router();

router.get("/", conversionController.list);
router.get("/:id", conversionController.getOne);
// Telecallers raise conversion requests; admins approve/reject.
router.post("/", requireAuth, roleCheck("admin", "telecaller"), conversionController.create);
// Sales finalises only the amount/notes (cannot change status).
router.put("/:id/amount", requireAuth, roleCheck("admin", "sales"), conversionController.updateAmount);
router.put("/:id", requireAuth, roleCheck("admin"), conversionController.update);
router.delete("/:id", requireAuth, roleCheck("admin"), conversionController.remove);

export default router;
