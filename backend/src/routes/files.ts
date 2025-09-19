import { copyFiles, createFolder, deleteFiles, downloadAsZip, downloadFile, getFolderFiles, moveFiles, renameItem } from '../controllers/fileController.js';
import authenticateToken from '../middleware/authenticate.js';
import express, { Router } from 'express';

const router: Router = express.Router();

router.get('/', authenticateToken, getFolderFiles);
router.get('/download', authenticateToken, downloadFile);
router.post('/download-zip', authenticateToken, downloadAsZip);
router.delete('/', authenticateToken, deleteFiles);
router.post('/move', authenticateToken, moveFiles);
router.post('/copy', authenticateToken, copyFiles);
router.post('/folder', authenticateToken, createFolder);
router.patch('/rename', authenticateToken, renameItem);

export default router;