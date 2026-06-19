import { Router } from "express";
import * as partnerController from "../controllers/partnerController.js";

const router = Router();

router.get("/", partnerController.list);
router.get("/:id/leads", partnerController.getLeads);
router.get("/:id", partnerController.getOne);
router.post("/", partnerController.create);
router.put("/:id/reset-password", partnerController.resetPassword);
router.put("/:id", partnerController.update);
router.delete("/:id", partnerController.remove);

export default router;
