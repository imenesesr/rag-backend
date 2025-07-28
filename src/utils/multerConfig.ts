import multer from 'multer';

const storage = multer.memoryStorage();

export const upload = multer({
  storage: storage,
  fileFilter: (_req, file, callback) => {
    if (file.mimetype === 'application/pdf') {
      callback(null, true);
    } else {
      callback(new Error('Only PDF files are allowed'));
    }
  },
  limits: {
    fileSize: 10 * 1024 * 1024, // 10MB limit
  },
});