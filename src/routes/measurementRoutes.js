import { Router } from "express";
import * as measurementController from "../controllers/measurementController.js";
import { requireAuth } from "../middleware/supabaseAuth.js";
import { roleCheck } from "../middleware/roleCheck.js";

const router = Router();

router.get("/", measurementController.list);
router.get("/:id", measurementController.getOne);
router.post("/", requireAuth, roleCheck("admin", "sales"), measurementController.create);
// project-manager may PUT to verify (Approve/Reject) uploaded measurements.
router.put("/:id", requireAuth, roleCheck("admin", "sales", "project-manager"), measurementController.update);
router.delete("/:id", requireAuth, roleCheck("admin", "telecaller"), measurementController.remove);

export default router;
