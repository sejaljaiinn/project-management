import User from '../models/User.js';
import Project from '../models/Project.js';
import Task from '../models/Task.js';

// GET /api/admin/users
export const getUsers = async (req, res, next) => {
  try {
    const users = await User.find().select('-password').sort('name');
    res.json(users);
  } catch (err) { next(err); }
};

// POST /api/admin/users  — create user with any role
export const createUser = async (req, res, next) => {
  try {
    const { name, email, password, role } = req.body;
    if (!name || !email || !password) return res.status(400).json({ message: 'name, email, password required' });
    if (password.length < 6) return res.status(400).json({ message: 'Password must be ≥ 6 chars' });
    const exists = await User.findOne({ email });
    if (exists) return res.status(409).json({ message: 'Email already registered' });
    const user = await User.create({ name, email, password, role: role || 'TEAM_MEMBER' });
    res.status(201).json(user);
  } catch (err) { next(err); }
};

// PUT /api/admin/users/:id  — update role only (no password via this route)
export const updateUserRole = async (req, res, next) => {
  try {
    const { role } = req.body;
    const allowed = ['ADMIN', 'PROJECT_MANAGER', 'TEAM_MEMBER'];
    if (!allowed.includes(role)) return res.status(400).json({ message: 'Invalid role' });
    if (req.params.id === req.user._id.toString())
      return res.status(403).json({ message: 'Cannot change your own role' });
    const user = await User.findByIdAndUpdate(req.params.id, { role }, { new: true }).select('-password');
    if (!user) return res.status(404).json({ message: 'User not found' });
    res.json(user);
  } catch (err) { next(err); }
};

// DELETE /api/admin/users/:id
export const deleteUser = async (req, res, next) => {
  try {
    if (req.params.id === req.user._id.toString())
      return res.status(403).json({ message: 'Cannot delete yourself' });
    const user = await User.findById(req.params.id);
    if (!user) return res.status(404).json({ message: 'User not found' });
    await user.deleteOne();
    res.json({ message: 'User deleted' });
  } catch (err) { next(err); }
};

// GET /api/admin/stats
export const getAdminStats = async (req, res, next) => {
  try {
    const [totalUsers, totalProjects, totalTasks, completedTasks] = await Promise.all([
      User.countDocuments(),
      Project.countDocuments(),
      Task.countDocuments(),
      Task.countDocuments({ status: 'Done' }),
    ]);
    res.json({ totalUsers, totalProjects, totalTasks, completedTasks, pendingTasks: totalTasks - completedTasks });
  } catch (err) { next(err); }
};
