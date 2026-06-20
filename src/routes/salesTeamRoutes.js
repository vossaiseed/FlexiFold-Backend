import { Router } from "express";
import * as salesTeamController from "../controllers/salesTeamController.js";
import { requireAuth } from "../middleware/supabaseAuth.js";
import { roleCheck } from "../middleware/roleCheck.js";

const router = Router();

router.get("/", salesTeamController.list);
router.get("/:id", salesTeamController.getOne);
router.post("/", requireAuth, roleCheck("admin"), salesTeamController.create);
router.put("/:id/reset-password", requireAuth, roleCheck("admin"), salesTeamController.resetPassword);
router.put("/:id", requireAuth, roleCheck("admin"), salesTeamController.update);
router.delete("/:id", requireAuth, roleCheck("admin"), salesTeamController.remove);

export default router;
