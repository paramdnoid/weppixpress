import express from 'express';
import { getFolderFiles } from '../controllers/fileController.js';
import authenticate from '../middleware/authenticate.js'; 

const router = express.Router();


router.get('/', authenticate, getFolderFiles);


export default router;
