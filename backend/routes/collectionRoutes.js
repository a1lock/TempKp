const express = require('express');
const router = express.Router();
const { getUserCollections, createCollection, deleteCollection } = require('../controllers/collectionController');
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getUserCollections);
router.post('/', verifyToken, createCollection);
router.delete('/:id', verifyToken, deleteCollection);

module.exports = router;