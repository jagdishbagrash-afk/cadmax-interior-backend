const multer = require("multer");
const path = require("path");
const fs = require("fs");

// Ensure uploads folder exists
const uploadPath = path.join(process.cwd(), "public/Images");
if (!fs.existsSync(uploadPath)) {
  fs.mkdirSync(uploadPath, { recursive: true });
}

const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, uploadPath);
  },
  filename: (req, file, cb) => {
    const uniqueName = Date.now() + "-" + file.originalname.replace(/\s+/g, "_");
    cb(null, uniqueName);
  },
});

const fileFilter = (req, file, cb) => {
  if (!file || !file.originalname || file.originalname.trim() === "") {
    return cb(null, false); // skip empty files
  }
  cb(null, true);
};

const upload = multer({
  storage,
  fileFilter, // apply our custom file filter
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB per file
    files: 10,
  },
});

module.exports = upload;