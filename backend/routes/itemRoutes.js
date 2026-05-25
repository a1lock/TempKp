const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getItems, uploadPrices } = require('../controllers/itemController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

const upload = multer({
    dest: 'uploads/',
    limits: { fileSize: 2 * 1024 * 1024 }, // максимум 2 МБ
    fileFilter: (req, file, cb) => {
        const isCSV = file.mimetype === 'text/csv'
            || file.mimetype === 'application/vnd.ms-excel'
            || file.originalname.toLowerCase().endsWith('.csv');

        if (!isCSV) {
            return cb(new Error('допустимы только файлы в формате CSV'));
        }
        cb(null, true);
    },
});

const handleMulterError = (err, req, res, next) => {
    if (err instanceof multer.MulterError && err.code === 'LIMIT_FILE_SIZE') {
        return res.status(400).json({ error: 'файл слишком большой, максимальный размер 2 МБ' });
    }
    if (err) {
        return res.status(400).json({ error: err.message });
    }
    next();
};

router.get('/', getItems);
router.post(
    '/upload-prices',
    verifyToken,
    requireAdmin,
    (req, res, next) => upload.single('file')(req, res, (err) => handleMulterError(err, req, res, next)),
    uploadPrices
);

module.exports = router;