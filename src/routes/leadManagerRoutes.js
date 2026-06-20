import { Router } from "express";
import * as leadManagerController from "../controllers/leadManagerController.js";
import { requireAuth } from "../middleware/supabaseAuth.js";
import { roleCheck } from "../middleware/roleCheck.js";

const router = Router();

router.get("/", leadManagerController.list);
router.get("/:id", leadManagerController.getOne);
router.post("/", requireAuth, roleCheck("admin"), leadManagerController.create);
router.put("/:id", requireAuth, roleCheck("admin"), leadManagerController.update);
router.delete("/:id", requireAuth, roleCheck("admin"), leadManagerController.remove);

export default router;
