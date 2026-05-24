const express = require('express');
const router = express.Router();
const { calculateContract, getContractHistory } = require('../controllers/contractController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/calculate', verifyToken, calculateContract);
router.get('/history', verifyToken, getContractHistory); // получение истории расчетов

module.exports = router;