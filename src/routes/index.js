import { Router } from "express";
import authRoutes from "./authRoutes.js";
import leadRoutes from "./leadRoutes.js";
import partnerRoutes from "./partnerRoutes.js";
import leadManagerRoutes from "./leadManagerRoutes.js";
import salesTeamRoutes from "./salesTeamRoutes.js";
import telecallerRoutes from "./telecallerRoutes.js";
import conversionRoutes from "./conversionRoutes.js";
import userRoutes from "./userRoutes.js";
import settingsRoutes from "./settingsRoutes.js";

const router = Router();

router.use("/auth", authRoutes);
router.use("/users", userRoutes);
router.use("/leads", leadRoutes);
router.use("/partners", partnerRoutes);
router.use("/lead-managers", leadManagerRoutes);
router.use("/sales-team", salesTeamRoutes);
router.use("/telecallers", telecallerRoutes);
router.use("/conversions", conversionRoutes);
router.use("/settings", settingsRoutes);

export default router;
