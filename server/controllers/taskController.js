import Task from '../models/Task.js';
import Project from '../models/Project.js';
import User from '../models/User.js';

// ─── Helper: resolve project membership ────────────────────────────────────
const getAuthorizedProject = async (projectId, userId, role) => {
  const project = await Project.findById(projectId);
  if (!project) return null;
  if (role === 'ADMIN') return project;
  if (project.isMember(userId)) return project;
  return null;
};

// ─── GET /api/tasks ────────────────────────────────────────────────────────
export const getTasks = async (req, res, next) => {
  try {
    const { role, _id: userId } = req.user;
    const filter = {};

    if (req.query.project) filter.project = req.query.project;
    if (req.query.status) filter.status = req.query.status;
    if (req.query.search) {
      filter.$or = [
        { title: { $regex: req.query.search, $options: 'i' } },
        { description: { $regex: req.query.search, $options: 'i' } },
        { assignee: { $regex: req.query.search, $options: 'i' } },
      ];
    }

    if (role === 'ADMIN') {
      // ADMIN sees all tasks (optionally filtered by project)
    } else {
      // Find projects this user can access
      const accessibleProjects = await Project.find({
        $or: [{ owner: userId }, { manager: userId }, { members: userId }],
      }).select('_id');
      const projectIds = accessibleProjects.map(p => p._id);

      if (filter.project) {
        // Verify the requested project is in accessible set
        const allowed = projectIds.some(pid => pid.toString() === filter.project);
        if (!allowed) return res.json([]); // silently return empty
      } else {
        filter.project = { $in: projectIds };
      }

      // TEAM_MEMBER sees only tasks assigned to them within those projects
      if (role === 'TEAM_MEMBER') {
        filter.$and = [
          ...(filter.$and || []),
          { $or: [{ assignedTo: userId }, { owner: userId }] },
        ];
      }
    }

    const tasks = await Task.find(filter)
      .populate('project', 'name')
      .populate('assignedTo', 'name email')
      .populate('comments.author', 'name')
      .sort('-createdAt');
    res.json(tasks);
  } catch (err) { next(err); }
};

// ─── POST /api/tasks ───────────────────────────────────────────────────────
export const createTask = async (req, res, next) => {
  try {
    const { title, description, project, assignee, assignedTo, priority, status, dueDate } = req.body;
    if (!title) return res.status(400).json({ message: 'Task title is required' });
    if (!project) return res.status(400).json({ message: 'Project is required' });

    if (req.user.role === 'TEAM_MEMBER')
      return res.status(403).json({ message: 'Team members cannot create tasks' });

    const proj = await getAuthorizedProject(project, req.user._id, req.user.role);
    if (!proj) return res.status(404).json({ message: 'Project not found or not accessible' });

    // Validate assignedTo is a member of the project
    let resolvedAssignedTo = null;
    if (assignedTo) {
      const memberInProject = await User.findById(assignedTo);
      if (!memberInProject) return res.status(404).json({ message: 'Assigned user not found' });
      if (req.user.role !== 'ADMIN' && !proj.isMember(assignedTo))
        return res.status(400).json({ message: 'Assigned user is not a member of this project' });
      resolvedAssignedTo = assignedTo;
    }

    const task = await Task.create({
      title, description, project, assignee, assignedTo: resolvedAssignedTo,
      priority, status, dueDate, owner: req.user._id,
    });
    const populated = await task.populate([
      { path: 'project', select: 'name' },
      { path: 'assignedTo', select: 'name email' },
    ]);
    res.status(201).json(populated);
  } catch (err) { next(err); }
};

// ─── GET /api/tasks/:id ────────────────────────────────────────────────────
export const getTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id)
      .populate('project', 'name owner manager members')
      .populate('assignedTo', 'name email')
      .populate('comments.author', 'name');
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const proj = await Project.findById(task.project._id);
    if (req.user.role !== 'ADMIN' && !proj.isMember(req.user._id))
      return res.status(403).json({ message: 'Not authorized to view this task' });

    // Team member can only see tasks assigned to them
    if (req.user.role === 'TEAM_MEMBER') {
      const isAssigned =
        task.assignedTo?.toString() === req.user._id.toString() ||
        task.owner?.toString() === req.user._id.toString();
      if (!isAssigned) return res.status(403).json({ message: 'Task not assigned to you' });
    }

    res.json(task);
  } catch (err) { next(err); }
};

// ─── PUT /api/tasks/:id ────────────────────────────────────────────────────
export const updateTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const proj = await Project.findById(task.project);
    if (!proj) return res.status(404).json({ message: 'Project not found' });

    const isAdmin = req.user.role === 'ADMIN';
    const isManager = proj.manager?.toString() === req.user._id.toString();
    const isAssignedMember =
      req.user.role === 'TEAM_MEMBER' &&
      (task.assignedTo?.toString() === req.user._id.toString() ||
        task.owner?.toString() === req.user._id.toString());

    if (!isAdmin && !isManager && !isAssignedMember)
      return res.status(403).json({ message: 'Not authorized to update this task' });

    // Team members can ONLY update status
    if (req.user.role === 'TEAM_MEMBER') {
      if (req.body.status) task.status = req.body.status;
    } else {
      // ADMIN or PM can update all fields
      const fields = ['title', 'description', 'assignee', 'priority', 'status', 'dueDate'];
      fields.forEach(f => { if (req.body[f] !== undefined) task[f] = req.body[f]; });

      if (req.body.assignedTo !== undefined) {
        if (!req.body.assignedTo) {
          task.assignedTo = null;
        } else {
          const memberUser = await User.findById(req.body.assignedTo);
          if (!memberUser) return res.status(404).json({ message: 'Assigned user not found' });
          if (!isAdmin && !proj.isMember(req.body.assignedTo))
            return res.status(400).json({ message: 'User is not a project member' });
          task.assignedTo = req.body.assignedTo;
        }
      }

      if (req.body.project && req.body.project !== task.project.toString()) {
        if (!isAdmin) return res.status(403).json({ message: 'Only admin can move tasks between projects' });
        const newProj = await Project.findById(req.body.project);
        if (!newProj) return res.status(404).json({ message: 'Target project not found' });
        task.project = req.body.project;
      }
    }

    const updated = await task.save();
    const populated = await updated.populate([
      { path: 'project', select: 'name' },
      { path: 'assignedTo', select: 'name email' },
      { path: 'comments.author', select: 'name' },
    ]);
    res.json(populated);
  } catch (err) { next(err); }
};

// ─── DELETE /api/tasks/:id ─────────────────────────────────────────────────
export const deleteTask = async (req, res, next) => {
  try {
    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const proj = await Project.findById(task.project);
    const isAdmin = req.user.role === 'ADMIN';
    const isManager = proj?.manager?.toString() === req.user._id.toString();

    if (!isAdmin && !isManager)
      return res.status(403).json({ message: 'Only admins and project managers can delete tasks' });

    await task.deleteOne();
    res.json({ message: 'Task deleted' });
  } catch (err) { next(err); }
};

// ─── GET /api/tasks/stats ──────────────────────────────────────────────────
export const getStats = async (req, res, next) => {
  try {
    const { role, _id: userId } = req.user;
    let projectFilter, taskFilter;

    if (role === 'ADMIN') {
      projectFilter = {};
      taskFilter = {};
    } else {
      const accessibleProjects = await Project.find({
        $or: [{ owner: userId }, { manager: userId }, { members: userId }],
      }).select('_id');
      const projectIds = accessibleProjects.map(p => p._id);
      projectFilter = { _id: { $in: projectIds } };
      taskFilter = role === 'TEAM_MEMBER'
        ? { project: { $in: projectIds }, $or: [{ assignedTo: userId }, { owner: userId }] }
        : { project: { $in: projectIds } };
    }

    const [totalProjects, totalTasks, completedTasks, pendingTasks] = await Promise.all([
      Project.countDocuments(projectFilter),
      Task.countDocuments(taskFilter),
      Task.countDocuments({ ...taskFilter, status: 'Done' }),
      Task.countDocuments({ ...taskFilter, status: { $ne: 'Done' } }),
    ]);
    res.json({ totalProjects, totalTasks, completedTasks, pendingTasks });
  } catch (err) { next(err); }
};

// ─── POST /api/tasks/:id/comments ─────────────────────────────────────────
export const addComment = async (req, res, next) => {
  try {
    const { text } = req.body;
    if (!text?.trim()) return res.status(400).json({ message: 'Comment text is required' });

    const task = await Task.findById(req.params.id);
    if (!task) return res.status(404).json({ message: 'Task not found' });

    const proj = await Project.findById(task.project);
    if (!proj) return res.status(404).json({ message: 'Project not found' });

    if (req.user.role !== 'ADMIN' && !proj.isMember(req.user._id))
      return res.status(403).json({ message: 'Not a member of this project' });

    task.comments.push({ author: req.user._id, text: text.trim() });
    await task.save();
    await task.populate('comments.author', 'name');
    res.status(201).json(task.comments[task.comments.length - 1]);
  } catch (err) { next(err); }
};
