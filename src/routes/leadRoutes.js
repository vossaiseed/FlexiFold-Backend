import { Router } from "express";
import * as leadController from "../controllers/leadController.js";
import { validate } from "../middleware/validate.js";
import { validateLead } from "../validators/leadValidator.js";

const router = Router();

router.get("/", leadController.list);
router.get("/:id", leadController.getOne);
router.post("/", validate(validateLead), leadController.create);
router.put("/:id", validate(validateLead), leadController.update);
router.delete("/:id", leadController.remove);

export default router;
