import express from 'express';
import { getFolderFiles, deleteFiles, moveFiles, copyFiles, createFolder, renameItem } from '../controllers/fileController.js';
import authenticate from '../middleware/authenticate.js';

const router = express.Router();

router.get('/', authenticate, getFolderFiles);
router.delete('/', authenticate, deleteFiles);
router.post('/move', authenticate, moveFiles);
router.post('/copy', authenticate, copyFiles);
router.post('/folder', authenticate, createFolder);
router.patch('/rename', authenticate, renameItem);

export default router;