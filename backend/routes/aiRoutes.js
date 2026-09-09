const express = require('express');
const router = express.Router();
const {
  generateTasks,
  importTasks,
  summarizeProgress,
  chat,
} = require('../controllers/aiController');
const { protect } = require('../middleware/authMiddleware');

// --- AI Routes ---

router.post('/generate-tasks', protect, generateTasks);
router.post('/import-tasks', protect, importTasks);
router.post('/summarize-progress', protect, summarizeProgress);
router.post('/chat', protect, chat);

module.exports = router;
