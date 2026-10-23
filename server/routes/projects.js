import express from 'express';
import protect, { authorize } from '../middleware/auth.js';
import {
  getProjects, createProject, getProject, updateProject, deleteProject,
  addMember, removeMember,
} from '../controllers/projectController.js';

const router = express.Router();
router.use(protect);

router.route('/')
  .get(getProjects)
  .post(authorize('ADMIN', 'PROJECT_MANAGER'), createProject);

router.route('/:id')
  .get(getProject)
  .put(updateProject)
  .delete(authorize('ADMIN'), deleteProject);

router.post('/:id/members', authorize('ADMIN', 'PROJECT_MANAGER'), addMember);
router.delete('/:id/members/:userId', authorize('ADMIN', 'PROJECT_MANAGER'), removeMember);

export default router;
