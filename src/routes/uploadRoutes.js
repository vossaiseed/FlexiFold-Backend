import { Router } from "express";
import multer from "multer";
import * as uploadController from "../controllers/uploadController.js";
import { requireAuth } from "../middleware/supabaseAuth.js";
import { roleCheck } from "../middleware/roleCheck.js";

// Keep files in memory; we stream the buffer straight to Supabase Storage.
const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: 15 * 1024 * 1024 }, // 15 MB per file
});

const router = Router();

// POST /api/upload  (multipart/form-data, field name "files", up to 10)
router.post("/", requireAuth, roleCheck("admin", "sales"), upload.array("files", 10), uploadController.upload);

export default router;
