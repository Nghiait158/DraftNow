const express = require('express');
const router = express.Router();
const authMiddleware = require('../middleware/authMiddleware');
const {
    getAllDocuments,
    getDocument,
    createDocument,
    updateDocument,
    deleteDocument,
    addColaborator,
    getHistory,
    generateShareLink,
} = require('../controllers/documentController');

router.use(authMiddleware);
router.get('/', getAllDocuments);
router.post('/', createDocument);router.get('/:id', getDocument);
router.put('/:id', updateDocument);
router.delete('/:id', deleteDocument);
router.post('/:id/collaborators', addColaborator);
router.get('/:id/history', getHistory);
router.post('/:id/share', generateShareLink);



module.exports = router;

