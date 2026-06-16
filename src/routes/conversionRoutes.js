import { Router } from "express";
import * as conversionController from "../controllers/conversionController.js";

const router = Router();

router.get("/", conversionController.list);
router.get("/:id", conversionController.getOne);
router.post("/", conversionController.create);
router.put("/:id", conversionController.update);
router.delete("/:id", conversionController.remove);

export default router;
