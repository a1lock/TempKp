const express = require('express');
const router = express.Router();
const { calculateContract, getContractHistory, getContractDetails } = require('../controllers/contractController');
const { verifyToken } = require('../middleware/authMiddleware');

// роут для расчета и сохранения контракта
router.post('/calculate', verifyToken, calculateContract);

// роут для получения истории расчетов пользователя
router.get('/history', verifyToken, getContractHistory);

// роут для получения деталей конкретного контракта по id
router.get('/:id', verifyToken, getContractDetails);

module.exports = router;