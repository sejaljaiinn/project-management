import express from 'express';
import protect, { authorize } from '../middleware/auth.js';
import {
  getUsers, createUser, updateUserRole, deleteUser, getAdminStats,
} from '../controllers/adminController.js';

const router = express.Router();
router.use(protect);

// Admin-only stats
router.get('/stats', authorize('ADMIN'), getAdminStats);

// User listing: ADMIN gets all; PROJECT_MANAGER gets the list for member assignment
// Full CRUD restricted to ADMIN
router.get('/users', authorize('ADMIN', 'PROJECT_MANAGER'), getUsers);
router.post('/users', authorize('ADMIN'), createUser);
router.put('/users/:id', authorize('ADMIN'), updateUserRole);
router.delete('/users/:id', authorize('ADMIN'), deleteUser);

export default router;
