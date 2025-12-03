const { S3Client, DeleteObjectCommand, HeadObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const multerS3 = require('multer-s3');

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const UPLOADS_FOLDER = "cadmax-interior-uploads/"

const upload = multer({
    storage: multerS3({
        s3: s3Client,
        bucket: process.env.S3_BUCKET_NAME,
        contentType: multerS3.AUTO_CONTENT_TYPE,
        metadata: (req, file, cb) => {
            cb(null, { fieldName: file.fieldname });
        },
        key: (req, file, cb) => {
            const safeName = file.originalname
                ? file.originalname.replace(/\s/g, '')
                : 'file';
            cb(null, `${UPLOADS_FOLDER}${Date.now()}-${safeName}`);
        },
        contentDisposition: 'inline',
    }),

    // ✅ THIS IS THE IMPORTANT PART
    fileFilter: (req, file, cb) => {
        // If no file, or invalid file object → silently skip
        if (!file || !file.mimetype) {
            return cb(null, false);
        }

        // Optional: allow only real file types
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            return cb(null, true);
        }

        // Reject unsupported types without throwing
        return cb(null, false);
    },

    limits: {
        fileSize: 10 * 1024 * 1024, // 10MB
    },
});

// ✅ Upload Function
const uploadFile = (req, res) => {
    return new Promise((resolve, reject) => {
        upload.single('file')(req, res, (err) => {
            if (err) {
                return reject({ status: false, message: err.message });
            }

            if (!req.file) {
                return reject({ status: false, message: 'No file received' });
            }

            resolve({
                status: true,
                message: "File uploaded successfully",
                fileUrl: req.file.location
            });
        });
    });
};

// ✅ Delete File from S3
const deleteFile = async (fileUrl) => {
    const bucketName = process.env.S3_BUCKET_NAME;

    // ✅ Extract key safely from S3 URL
    const url = new URL(fileUrl);
    const key = decodeURIComponent(url.pathname.substring(1)); 
    // removes leading "/"

    if (!key) {
        throw new Error("Invalid file URL");
    }

    console.log("Deleting S3 Object Key:", key); // DEBUG

    await s3Client.send(new DeleteObjectCommand({
        Bucket: bucketName,
        Key: key
    }));

    return true;
};


module.exports = { upload, uploadFile, deleteFile };
