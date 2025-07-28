import { Router } from 'express';
import multer from 'multer';
import { uploadDocuments, listDocuments, deleteDocument } from '../controllers/documentController';

const router = Router();

// Configure multer to store files in memory, as the service layer needs the file buffer.
const storage = multer.memoryStorage();
const upload = multer({ storage: storage });

// The 'upload.any()' middleware will accept all files from the request, regardless of the field name.
// This resolves the "MulterError: Unexpected field" by making the endpoint more flexible.
// It populates `req.files` with an array of files, which the `uploadDocuments` controller expects.
router.post('/upload', upload.any(), uploadDocuments);

router.get('/', listDocuments);

router.delete('/:id', deleteDocument);

export default router;