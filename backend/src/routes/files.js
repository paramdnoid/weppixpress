import { copyFiles, createFolder, deleteFiles, getFolderFiles, moveFiles, renameItem } from '../controllers/fileController.js';
import authenticateToken from '../middleware/authenticate.js';
import express from 'express';

const router = express.Router();

router.get('/', authenticateToken, getFolderFiles);
router.delete('/', authenticateToken, deleteFiles);
router.post('/move', authenticateToken, moveFiles);
router.post('/copy', authenticateToken, copyFiles);
router.post('/folder', authenticateToken, createFolder);
router.patch('/rename', authenticateToken, renameItem);

export default router;