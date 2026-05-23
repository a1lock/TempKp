const express = require('express');
const router = express.Router();
const { getUserCollections, getCollectionById, createCollection, updateCollection, deleteCollection, exportCollectionToCSV } = require('../controllers/collectionController')
const { verifyToken } = require('../middleware/authMiddleware');

router.get('/', verifyToken, getUserCollections);
router.get('/:id', verifyToken, getCollectionById);
router.get('/:id/export', verifyToken, exportCollectionToCSV);
router.post('/', verifyToken, createCollection);
router.put('/:id', verifyToken, updateCollection);
router.delete('/:id', verifyToken, deleteCollection);

module.exports = router;