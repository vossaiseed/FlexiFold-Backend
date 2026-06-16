import { Router } from "express";
import * as authController from "../controllers/authController.js";
import { validate } from "../middleware/validate.js";
import { validateRegister, validateLogin } from "../validators/authValidator.js";

const router = Router();

router.post("/register", validate(validateRegister), authController.register);
router.post("/login", validate(validateLogin), authController.login);
router.post("/logout", authController.logout);
router.get("/me", authController.me);

export default router;
