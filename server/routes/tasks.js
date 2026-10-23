import express from 'express';
import protect from '../middleware/auth.js';
import {
  getTasks, createTask, getTask, updateTask, deleteTask, getStats, addComment,
} from '../controllers/taskController.js';

const router = express.Router();
router.use(protect);

router.get('/stats', getStats);
router.route('/').get(getTasks).post(createTask);
router.route('/:id').get(getTask).put(updateTask).delete(deleteTask);
router.post('/:id/comments', addComment);

export default router;
