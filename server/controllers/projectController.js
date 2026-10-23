import Project from '../models/Project.js';
import Task from '../models/Task.js';
import User from '../models/User.js';

// ─── Helper ────────────────────────────────────────────────────────────────
// Returns project visible to the requesting user, or null
const visibleProject = async (projectId, user) => {
  const project = await Project.findById(projectId)
    .populate('owner', 'name email role')
    .populate('manager', 'name email role')
    .populate('members', 'name email role');
  if (!project) return null;
  if (user.role === 'ADMIN') return project;
  if (project.isMember(user._id)) return project;
  return null;
};

// ─── GET /api/projects ─────────────────────────────────────────────────────
export const getProjects = async (req, res, next) => {
  try {
    let projects;
    if (req.user.role === 'ADMIN') {
      projects = await Project.find()
        .populate('owner', 'name email')
        .populate('manager', 'name email')
        .sort('-createdAt');
    } else {
      // PM sees managed projects; TM sees member projects; also own (legacy owner field)
      projects = await Project.find({
        $or: [
          { owner: req.user._id },
          { manager: req.user._id },
          { members: req.user._id },
        ],
      })
        .populate('owner', 'name email')
        .populate('manager', 'name email')
        .sort('-createdAt');
    }
    res.json(projects);
  } catch (err) { next(err); }
};

// ─── POST /api/projects ────────────────────────────────────────────────────
// ADMIN and PROJECT_MANAGER only
export const createProject = async (req, res, next) => {
  try {
    const { name, description, managerId } = req.body;
    if (!name) return res.status(400).json({ message: 'Project name is required' });

    let manager = null;
    if (req.user.role === 'ADMIN' && managerId) {
      const mgr = await User.findById(managerId);
      if (!mgr) return res.status(404).json({ message: 'Manager user not found' });
      if (mgr.role !== 'PROJECT_MANAGER' && mgr.role !== 'ADMIN')
        return res.status(400).json({ message: 'Assigned manager must have role PROJECT_MANAGER or ADMIN' });
      manager = managerId;
    } else if (req.user.role === 'PROJECT_MANAGER') {
      manager = req.user._id; // PM creates their own project
    }

    const project = await Project.create({ name, description, owner: req.user._id, manager });
    await project.populate('owner', 'name email');
    await project.populate('manager', 'name email');
    res.status(201).json(project);
  } catch (err) { next(err); }
};

// ─── GET /api/projects/:id ─────────────────────────────────────────────────
export const getProject = async (req, res, next) => {
  try {
    const project = await visibleProject(req.params.id, req.user);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    res.json(project);
  } catch (err) { next(err); }
};

// ─── PUT /api/projects/:id ─────────────────────────────────────────────────
export const updateProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    // ADMIN can update any; PM can update only projects they manage
    const isAdmin = req.user.role === 'ADMIN';
    const isManager = project.manager?.toString() === req.user._id.toString();
    if (!isAdmin && !isManager)
      return res.status(403).json({ message: 'Not authorized to update this project' });

    const { name, description } = req.body;
    if (name) project.name = name;
    if (description !== undefined) project.description = description;

    // Only ADMIN can reassign manager
    if (isAdmin && req.body.managerId !== undefined) {
      if (!req.body.managerId) {
        project.manager = null;
      } else {
        const mgr = await User.findById(req.body.managerId);
        if (!mgr) return res.status(404).json({ message: 'Manager not found' });
        project.manager = req.body.managerId;
      }
    }

    const updated = await project.save();
    await updated.populate('owner', 'name email');
    await updated.populate('manager', 'name email');
    await updated.populate('members', 'name email role');
    res.json(updated);
  } catch (err) { next(err); }
};

// ─── DELETE /api/projects/:id ──────────────────────────────────────────────
// ADMIN only
export const deleteProject = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });
    await Task.deleteMany({ project: project._id });
    await project.deleteOne();
    res.json({ message: 'Project deleted' });
  } catch (err) { next(err); }
};

// ─── POST /api/projects/:id/members ───────────────────────────────────────
// ADMIN or Project Manager: add a member
export const addMember = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isAdmin = req.user.role === 'ADMIN';
    const isManager = project.manager?.toString() === req.user._id.toString();
    if (!isAdmin && !isManager)
      return res.status(403).json({ message: 'Not authorized to manage members' });

    const { userId } = req.body;
    if (!userId) return res.status(400).json({ message: 'userId is required' });
    const member = await User.findById(userId);
    if (!member) return res.status(404).json({ message: 'User not found' });
    if (project.members.some(m => m.toString() === userId))
      return res.status(409).json({ message: 'User is already a member' });

    project.members.push(userId);
    await project.save();
    await project.populate('members', 'name email role');
    res.json({ members: project.members });
  } catch (err) { next(err); }
};

// ─── DELETE /api/projects/:id/members/:userId ─────────────────────────────
// ADMIN or Project Manager: remove a member
export const removeMember = async (req, res, next) => {
  try {
    const project = await Project.findById(req.params.id);
    if (!project) return res.status(404).json({ message: 'Project not found' });

    const isAdmin = req.user.role === 'ADMIN';
    const isManager = project.manager?.toString() === req.user._id.toString();
    if (!isAdmin && !isManager)
      return res.status(403).json({ message: 'Not authorized to manage members' });

    project.members = project.members.filter(m => m.toString() !== req.params.userId);
    await project.save();
    await project.populate('members', 'name email role');
    res.json({ members: project.members });
  } catch (err) { next(err); }
};
