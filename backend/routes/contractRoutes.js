const express = require('express');
const router = express.Router();
const { calculateContract } = require('../controllers/contractController');
const { verifyToken } = require('../middleware/authMiddleware');

router.post('/calculate', verifyToken, calculateContract);

module.exports = router;