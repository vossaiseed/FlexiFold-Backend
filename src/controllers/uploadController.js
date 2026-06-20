// Generic file/image upload — stores files in Supabase Storage, returns URLs.
import { uploadFiles } from "../../lib/storage.js";

export const upload = async (req, res, next) => {
  try {
    const files = req.files || [];
    if (!files.length) {
      return res.status(400).json({ message: "No files uploaded" });
    }
    const urls = await uploadFiles(files);
    res.status(201).json({ message: "Files uploaded successfully", data: { urls } });
  } catch (err) {
    next(err);
  }
};
