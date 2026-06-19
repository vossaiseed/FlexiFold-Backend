import { Router } from "express";
import * as leadController from "../controllers/leadController.js";
import { validate } from "../middleware/validate.js";
import { validateLead } from "../validators/leadValidator.js";

const router = Router();

router.get("/", leadController.list);
router.get("/:id", leadController.getOne);
router.post("/", validate(validateLead), leadController.create);
// PUT supports partial updates (e.g. status-only on approve/reject), so it is
// not gated by validateLead which requires name + phone.
router.put("/:id", leadController.update);
router.delete("/:id", leadController.remove);

export default router;
