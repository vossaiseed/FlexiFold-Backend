import { Router } from "express";
import * as siteVisitController from "../controllers/siteVisitController.js";
import { requireAuth } from "../middleware/supabaseAuth.js";
import { roleCheck } from "../middleware/roleCheck.js";

const router = Router();

router.get("/", siteVisitController.list);
router.get("/:id", siteVisitController.getOne);
router.post("/", requireAuth, roleCheck("admin", "sales"), siteVisitController.create);
router.put("/:id", requireAuth, roleCheck("admin", "sales"), siteVisitController.update);
router.delete("/:id", requireAuth, roleCheck("admin", "sales"), siteVisitController.remove);

export default router;
