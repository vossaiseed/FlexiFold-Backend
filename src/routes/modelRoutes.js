import { Router } from "express";
import * as modelController from "../controllers/modelController.js";
import { requireAuth } from "../middleware/supabaseAuth.js";
import { roleCheck } from "../middleware/roleCheck.js";

const router = Router();

router.get("/", modelController.list);
router.get("/:id", modelController.getOne);
router.post("/", requireAuth, roleCheck("admin", "sales"), modelController.create);
// project-manager may PUT to verify (Approve/Reject) uploaded models.
router.put("/:id", requireAuth, roleCheck("admin", "sales", "project-manager"), modelController.update);
router.delete("/:id", requireAuth, roleCheck("admin", "telecaller"), modelController.remove);

export default router;
