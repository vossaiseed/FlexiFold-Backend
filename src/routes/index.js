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
import uploadRoutes from "./uploadRoutes.js";
import siteVisitRoutes from "./siteVisitRoutes.js";
import measurementRoutes from "./measurementRoutes.js";
import modelRoutes from "./modelRoutes.js";
import projectRoutes from "./projectRoutes.js";
import projectManagerRoutes from "./projectManagerRoutes.js";

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

// CRM fulfilment pipeline
router.use("/upload", uploadRoutes);
router.use("/site-visits", siteVisitRoutes);
router.use("/measurements", measurementRoutes);
router.use("/models", modelRoutes);
router.use("/projects", projectRoutes);
router.use("/project-managers", projectManagerRoutes);

export default router;
