import { Router } from "express";
import * as salesTeamController from "../controllers/salesTeamController.js";

const router = Router();

router.get("/", salesTeamController.list);
router.get("/:id", salesTeamController.getOne);
router.post("/", salesTeamController.create);
router.put("/:id", salesTeamController.update);
router.delete("/:id", salesTeamController.remove);

export default router;
