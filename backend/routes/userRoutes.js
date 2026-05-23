const express = require('express');
const router = express.Router();
const { getAllUsers, deleteUser } = require('../controllers/userController');
const { verifyToken, requireAdmin } = require('../middleware/authMiddleware');

router.get('/', verifyToken, requireAdmin, getAllUsers);
router.delete('/:id', verifyToken, requireAdmin, deleteUser);

module.exports = router;