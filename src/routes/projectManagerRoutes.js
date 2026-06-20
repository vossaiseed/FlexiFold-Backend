import { Router } from "express";
import * as projectManagerController from "../controllers/projectManagerController.js";
import { requireAuth } from "../middleware/supabaseAuth.js";
import { roleCheck } from "../middleware/roleCheck.js";

const router = Router();

router.get("/", projectManagerController.list);
router.get("/:id", projectManagerController.getOne);
router.post("/", requireAuth, roleCheck("admin"), projectManagerController.create);
router.put("/:id", requireAuth, roleCheck("admin"), projectManagerController.update);
router.delete("/:id", requireAuth, roleCheck("admin"), projectManagerController.remove);

export default router;
