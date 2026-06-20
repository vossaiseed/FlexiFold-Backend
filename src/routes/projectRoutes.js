import { Router } from "express";
import * as projectController from "../controllers/projectController.js";
import { requireAuth } from "../middleware/supabaseAuth.js";
import { roleCheck } from "../middleware/roleCheck.js";

const router = Router();

router.get("/", projectController.list);
router.get("/:id", projectController.getOne);
// Admin or Sales Team assigns a Project Manager (creates/updates the project).
router.post("/", requireAuth, roleCheck("admin", "sales"), projectController.create);
// Project Managers (and admins) update project status.
router.put("/:id", requireAuth, roleCheck("admin", "project-manager"), projectController.update);
router.delete("/:id", requireAuth, roleCheck("admin"), projectController.remove);

export default router;
