const express = require('express');
const router = express.Router();
const multer = require('multer');
const { getItems, uploadPrices } = require('../controllers/itemController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

const upload = multer({ dest: 'uploads/' });

router.get('/', getItems);
router.post('/upload-prices', verifyToken, requireAdmin, upload.single('file'), uploadPrices);

module.exports = router;