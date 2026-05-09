const fs = require("fs");
const path = require("path");

/**
 * Deletes uploaded files from the public folder.
 * @param {string[]} fileUrls - Array of file URLs to delete
 */
function deleteUploadedFiles(fileUrls = []) {
  if (!Array.isArray(fileUrls) || fileUrls.length === 0) {
    console.warn("No file URLs provided for deletion.");
    return;
  }

  fileUrls.forEach((fileUrl) => {
    try {
      // Remove domain and query params (if any)
      const relativePath = fileUrl.replace(/^https?:\/\/[^\/]+/, ""); // removes http://localhost:5000 part
      const absolutePath = path.join(process.cwd(), "public", relativePath);

      if (fs.existsSync(absolutePath)) {
        fs.unlinkSync(absolutePath);
        console.log(`✅ Deleted file: ${absolutePath}`);
      } else {
        console.warn(`⚠️ File not found: ${absolutePath}`);
      }
    } catch (err) {
      console.error(`❌ Error deleting ${fileUrl}:`, err.message);
    }
  });
}

module.exports = deleteUploadedFiles;