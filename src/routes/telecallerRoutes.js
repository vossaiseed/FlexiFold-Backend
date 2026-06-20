import { Router } from "express";
import * as telecallerController from "../controllers/telecallerController.js";
import { requireAuth } from "../middleware/supabaseAuth.js";
import { roleCheck } from "../middleware/roleCheck.js";

const router = Router();

router.get("/", telecallerController.list);
router.get("/:id", telecallerController.getOne);
router.post("/", requireAuth, roleCheck("admin"), telecallerController.create);
router.put("/:id", requireAuth, roleCheck("admin"), telecallerController.update);
router.delete("/:id", requireAuth, roleCheck("admin"), telecallerController.remove);

export default router;
