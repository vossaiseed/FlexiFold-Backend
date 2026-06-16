import { Router } from "express";
import * as leadManagerController from "../controllers/leadManagerController.js";

const router = Router();

router.get("/", leadManagerController.list);
router.get("/:id", leadManagerController.getOne);
router.post("/", leadManagerController.create);
router.put("/:id", leadManagerController.update);
router.delete("/:id", leadManagerController.remove);

export default router;
