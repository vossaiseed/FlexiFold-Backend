import { Router } from "express";
import * as telecallerController from "../controllers/telecallerController.js";

const router = Router();

router.get("/", telecallerController.list);
router.get("/:id", telecallerController.getOne);
router.post("/", telecallerController.create);
router.put("/:id", telecallerController.update);
router.delete("/:id", telecallerController.remove);

export default router;
