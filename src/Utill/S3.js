const { S3Client, DeleteObjectCommand, PutObjectCommand } = require('@aws-sdk/client-s3');
const multer = require('multer');
const processImageBuffer = require('./processImageBuffer');

const s3Client = new S3Client({
    region: process.env.AWS_REGION,
    credentials: {
        accessKeyId: process.env.AWS_ACCESS_KEY_ID,
        secretAccessKey: process.env.AWS_SECRET_ACCESS_KEY,
    },
});

const UPLOADS_FOLDER = "cadmax-interior-uploads/";

// Memory storage for processing
const storage = multer.memoryStorage();

// Base multer configuration
const multerConfig = {
    storage: storage,
    fileFilter: (req, file, cb) => {
        if (!file || !file.mimetype) {
            return cb(null, false);
        }
        
        if (file.mimetype.startsWith('image/') || file.mimetype === 'application/pdf') {
            return cb(null, true);
        }
        
        return cb(null, false);
    },
    limits: {
        fileSize: 10 * 1024 * 1024,
    },
};

// Helper function to process and upload single file
const processAndUploadFile = async (file) => {
    if (!file) return null;
    
    try {
        let finalBuffer = file.buffer;
        let finalMimetype = file.mimetype;
        let finalOriginalName = file.originalname;
        
        if (file.mimetype.startsWith('image/')) {
            const processedBuffer = await processImageBuffer(file.buffer);
            if (processedBuffer.length !== file.buffer.length) {
                finalBuffer = processedBuffer;
                finalMimetype = 'image/webp';
                finalOriginalName = file.originalname.replace(/\.[^/.]+$/, '') + '.webp';
            }
        }
        
        const safeName = finalOriginalName.replace(/\s/g, '');
        const key = `${UPLOADS_FOLDER}${Date.now()}-${Math.random().toString(36).substring(7)}-${safeName}`;
        
        const uploadParams = {
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key,
            Body: finalBuffer,
            ContentType: finalMimetype,
            ContentDisposition: 'inline',
        };
        
        await s3Client.send(new PutObjectCommand(uploadParams));
        
        const fileUrl = `https://${process.env.S3_BUCKET_NAME}.s3.${process.env.AWS_REGION}.amazonaws.com/${key}`;
        
        return {
            ...file,
            location: fileUrl,
            key: key,
            originalname: finalOriginalName,
            mimetype: finalMimetype,
            size: finalBuffer.length,
        };
    } catch (error) {
        console.error('Error processing/uploading file:', error);
        throw error;
    }
};

// Helper to process multiple files
const processAndUploadMultipleFiles = async (files) => {
    const processedFiles = [];
    for (const file of files) {
        const processedFile = await processAndUploadFile(file);
        processedFiles.push(processedFile);
    }
    return processedFiles;
};

// 1. Single file upload middleware
const createSingleUploadMiddleware = (fieldName) => {
    const multerUpload = multer(multerConfig).single(fieldName);
    
    return async (req, res, next) => {
        multerUpload(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ success: false, message: err.message });
            }
            
            if (!req.file) {
                return next();
            }
            
            try {
                const processedFile = await processAndUploadFile(req.file);
                req.file = processedFile;
                console.log("✅ File uploaded:", processedFile.location);
                next();
            } catch (uploadError) {
                console.error('S3 Upload Error:', uploadError);
                return res.status(500).json({ success: false, message: 'Failed to upload file to S3' });
            }
        });
    };
};

// 2. Multiple fields upload middleware
const createFieldsUploadMiddleware = (fieldsConfig) => {
    const multerUpload = multer(multerConfig).fields(fieldsConfig);
    
    return async (req, res, next) => {
        multerUpload(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ success: false, message: err.message });
            }
            
            if (!req.files) {
                return next();
            }
            
            try {
                const processedFiles = {};
                
                for (const fieldName in req.files) {
                    const files = req.files[fieldName];
                    const processedFieldFiles = await processAndUploadMultipleFiles(files);
                    processedFiles[fieldName] = processedFieldFiles;
                }
                
                req.files = processedFiles;
                console.log("✅ Multiple fields files uploaded successfully");
                next();
            } catch (uploadError) {
                console.error('S3 Upload Error:', uploadError);
                return res.status(500).json({ success: false, message: 'Failed to upload files to S3' });
            }
        });
    };
};

// 3. Array of files upload middleware (same field name)
const createArrayUploadMiddleware = (fieldName, maxCount) => {
    const multerUpload = multer(multerConfig).array(fieldName, maxCount);
    
    return async (req, res, next) => {
        multerUpload(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ success: false, message: err.message });
            }
            
            if (!req.files || req.files.length === 0) {
                return next();
            }
            
            try {
                const processedFiles = await processAndUploadMultipleFiles(req.files);
                req.files = processedFiles;
                console.log(`✅ ${processedFiles.length} files uploaded successfully`);
                next();
            } catch (uploadError) {
                console.error('S3 Upload Error:', uploadError);
                return res.status(500).json({ success: false, message: 'Failed to upload files to S3' });
            }
        });
    };
};

// 4. ANY files upload middleware (accepts all files regardless of field name)
const createAnyUploadMiddleware = () => {
    const multerUpload = multer(multerConfig).any();
    
    return async (req, res, next) => {
        multerUpload(req, res, async (err) => {
            if (err) {
                return res.status(400).json({ success: false, message: err.message });
            }
            
            if (!req.files || req.files.length === 0) {
                return next();
            }
            
            try {
                const processedFiles = await processAndUploadMultipleFiles(req.files);
                req.files = processedFiles;
                console.log(`✅ ${processedFiles.length} files uploaded successfully (any fields)`);
                next();
            } catch (uploadError) {
                console.error('S3 Upload Error:', uploadError);
                return res.status(500).json({ success: false, message: 'Failed to upload files to S3' });
            }
        });
    };
};

// 5. No files middleware
const createNoneUploadMiddleware = () => {
    return (req, res, next) => next();
};

// Main upload object with ALL multer methods
const upload = {
    single: (fieldName) => createSingleUploadMiddleware(fieldName),
    fields: (fieldsConfig) => createFieldsUploadMiddleware(fieldsConfig),
    array: (fieldName, maxCount) => createArrayUploadMiddleware(fieldName, maxCount),
    any: () => createAnyUploadMiddleware(),  // ✅ Added .any() support
    none: () => createNoneUploadMiddleware(),
};

// For backward compatibility with existing code
const uploadFile = async (req, res) => {
    return new Promise((resolve, reject) => {
        const middleware = createSingleUploadMiddleware('file');
        middleware(req, res, (err) => {
            if (err) {
                reject({ status: false, message: err.message });
            } else if (req.file && req.file.location) {
                resolve({
                    status: true,
                    message: "File uploaded successfully",
                    file: req.file,
                    fileUrl: req.file.location
                });
            } else {
                reject({ status: false, message: 'No file uploaded' });
            }
        });
    });
};

const deleteFile = async (fileUrl) => {
    try {
        let key;
        if (fileUrl.includes('amazonaws.com')) {
            const url = new URL(fileUrl);
            key = decodeURIComponent(url.pathname.substring(1));
        } else {
            key = fileUrl;
        }
        
        if (!key) {
            throw new Error("Invalid file URL or key");
        }
        
        console.log("Deleting S3 Object Key:", key);
        
        await s3Client.send(new DeleteObjectCommand({
            Bucket: process.env.S3_BUCKET_NAME,
            Key: key
        }));
        
        return true;
    } catch (error) {
        console.error('Delete error:', error);
        throw error;
    }
};

const uploadMiddleware = (fieldName = 'file') => {
    return createSingleUploadMiddleware(fieldName);
};

module.exports = { 
    upload,  // ✅ Now supports .single(), .fields(), .array(), .any(), .none()
    uploadFile, 
    deleteFile,
    uploadMiddleware
};