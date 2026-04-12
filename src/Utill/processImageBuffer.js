const sharp = require("sharp");

const processImageBuffer = async (buffer) => {
    try {
        const processedBuffer = await sharp(buffer)
            .rotate()
            .resize({
                width: 1920,
                withoutEnlargement: true,
            })
            .webp({
                quality: 75,
                effort: 6,
            })
            .toBuffer();

        return processedBuffer;
    } catch (error) {
        console.error("Image processing failed:", error);
        return buffer; // fallback
    }
};

module.exports = processImageBuffer;