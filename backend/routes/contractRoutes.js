const express = require('express');
const router = express.Router();
const { calculateContract } = require('../controllers/contractController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/calculate', verifyToken, calculateContract);
router.get('/history', verifyToken, getContractHistory);

module.exports = router;