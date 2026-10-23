import React, { useEffect, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';
import TaskModal from '../components/TaskModal.jsx';

export default function ProjectDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const { user, isAdmin, isPM } = useAuth();

  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showTaskModal, setShowTaskModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [statusFilter, setStatusFilter] = useState('');

  // Member management
  const [allUsers, setAllUsers] = useState([]);
  const [addingMember, setAddingMember] = useState(false);
  const [selectedUserId, setSelectedUserId] = useState('');
  const [memberError, setMemberError] = useState('');

  // Task detail / comments panel
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDetail, setTaskDetail] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  const isManager = project?.manager?._id === user?._id || project?.manager === user?._id;
  const canManage = isAdmin || isManager;
  const canCreateTask = isAdmin || isManager;

  const load = async () => {
    try {
      const [projRes, taskRes] = await Promise.all([
        api.get(`/projects/${id}`),
        api.get(`/tasks?project=${id}`),
      ]);
      setProject(projRes.data);
      setTasks(taskRes.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to load project');
    } finally {
      setLoading(false);
    }
  };

  const loadAllUsers = async () => {
    if (!isAdmin && !isManager) return;
    try {
      const res = await api.get('/admin/users');
      setAllUsers(res.data);
    } catch {}
  };

  useEffect(() => { load(); }, [id]);
  useEffect(() => { if (isAdmin || isManager) loadAllUsers(); }, [isAdmin, isManager]);

  const handleDeleteProject = async () => {
    if (!window.confirm('Delete this project and all its tasks?')) return;
    try {
      await api.delete(`/projects/${id}`);
      navigate('/projects');
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleDeleteTask = async (taskId) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${taskId}`);
      setTasks(tasks.filter(t => t._id !== taskId));
      if (selectedTask?._id === taskId) setSelectedTask(null);
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleSaveTask = () => { setShowTaskModal(false); setEditTask(null); load(); };

  // Member management
  const handleAddMember = async (e) => {
    e.preventDefault();
    setMemberError('');
    if (!selectedUserId) { setMemberError('Please select a user'); return; }
    setAddingMember(true);
    try {
      await api.post(`/projects/${id}/members`, { userId: selectedUserId });
      setSelectedUserId('');
      load();
    } catch (err) {
      setMemberError(err.response?.data?.message || 'Failed to add member');
    } finally {
      setAddingMember(false);
    }
  };

  const handleRemoveMember = async (userId) => {
    if (!window.confirm('Remove this team member from the project?')) return;
    try {
      await api.delete(`/projects/${id}/members/${userId}`);
      load();
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to remove member');
    }
  };

  // Task detail & comments
  const openTaskDetail = async (task) => {
    setSelectedTask(task);
    try {
      const res = await api.get(`/tasks/${task._id}`);
      setTaskDetail(res.data);
    } catch {
      setTaskDetail(task);
    }
  };

  const handleAddComment = async (e) => {
    e.preventDefault();
    if (!commentText.trim()) return;
    setAddingComment(true);
    try {
      await api.post(`/tasks/${selectedTask._id}/comments`, { text: commentText });
      setCommentText('');
      const res = await api.get(`/tasks/${selectedTask._id}`);
      setTaskDetail(res.data);
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to add comment');
    } finally {
      setAddingComment(false);
    }
  };

  // Status update for TEAM_MEMBER
  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const res = await api.put(`/tasks/${taskId}`, { status: newStatus });
      setTasks(tasks.map(t => t._id === taskId ? { ...t, status: res.data.status } : t));
      if (taskDetail?._id === taskId) setTaskDetail(prev => ({ ...prev, status: res.data.status }));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  const filtered = statusFilter ? tasks.filter(t => t.status === statusFilter) : tasks;

  const priorityClass = (p) => ({ Low: 'badge--green', Medium: 'badge--yellow', High: 'badge--red' }[p] || '');
  const statusClass = (s) => ({ 'To Do': 'badge--gray', 'In Progress': 'badge--blue', Done: 'badge--green' }[s] || '');

  // Eligible users to add (not already members, not manager, not owner)
  const existingIds = new Set([
    ...(project?.members?.map(m => m._id) || []),
    project?.manager?._id,
    project?.owner?._id,
  ].filter(Boolean));
  const eligibleUsers = allUsers.filter(u => !existingIds.has(u._id));

  if (loading) return <div className="page-loading"><div className="spinner"></div><p>Loading…</p></div>;
  if (error) return (
    <div className="page">
      <div className="alert alert--error">{error}</div>
      <Link to="/projects" className="btn btn--ghost">← Back to Projects</Link>
    </div>
  );

  return (
    <div className="page" style={{ maxWidth: '1200px' }}>
      <div className="page__header">
        <div>
          <Link to="/projects" className="text-muted text-sm">← Projects</Link>
          <h1>{project?.name}</h1>
          {project?.description && <p className="text-muted">{project.description}</p>}
          {project?.manager && (
            <p className="text-sm text-muted" style={{ marginTop: '0.25rem' }}>
              Manager: <strong>{project.manager.name}</strong>
            </p>
          )}
        </div>
        <div className="page__header-actions">
          {canCreateTask && (
            <button className="btn btn--primary" onClick={() => { setEditTask(null); setShowTaskModal(true); }}>
              + Add Task
            </button>
          )}
          {isAdmin && (
            <button className="btn btn--danger btn--sm" onClick={handleDeleteProject}>Delete Project</button>
          )}
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 300px', gap: '1.25rem' }}>
        {/* Left: Tasks */}
        <div>
          {/* Filters */}
          <div className="filters">
            <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
              <option value="">All Status</option>
              <option>To Do</option>
              <option>In Progress</option>
              <option>Done</option>
            </select>
            <span className="text-muted text-sm">{filtered.length} task{filtered.length !== 1 ? 's' : ''}</span>
          </div>

          {filtered.length === 0 ? (
            <div className="empty-state empty-state--page">
              <div className="empty-state__icon">✅</div>
              <h2>No tasks {statusFilter ? `with status "${statusFilter}"` : 'yet'}</h2>
              {canCreateTask && (
                <button className="btn btn--primary" onClick={() => setShowTaskModal(true)}>+ Add Task</button>
              )}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Assigned To</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Due Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {filtered.map((t) => (
                    <tr key={t._id} style={{ cursor: 'pointer' }}>
                      <td onClick={() => openTaskDetail(t)}>
                        <div className="task-title">{t.title}</div>
                        {t.description && (
                          <div className="text-muted text-sm">
                            {t.description.slice(0, 60)}{t.description.length > 60 ? '…' : ''}
                          </div>
                        )}
                      </td>
                      <td>
                        {t.assignedTo
                          ? <span>{t.assignedTo.name}</span>
                          : t.assignee
                            ? <span className="text-muted">{t.assignee}</span>
                            : <span className="text-muted">—</span>
                        }
                      </td>
                      <td><span className={`badge ${priorityClass(t.priority)}`}>{t.priority}</span></td>
                      <td>
                        {/* Team members can update status inline */}
                        {user?.role === 'TEAM_MEMBER' && (t.assignedTo?._id === user?._id || t.assignedTo === user?._id) ? (
                          <select
                            value={t.status}
                            onChange={(e) => handleStatusChange(t._id, e.target.value)}
                            className="filter-select"
                            style={{ fontSize: '0.78rem', padding: '0.2rem 0.4rem' }}
                            onClick={(e) => e.stopPropagation()}
                          >
                            <option>To Do</option>
                            <option>In Progress</option>
                            <option>Done</option>
                          </select>
                        ) : (
                          <span className={`badge ${statusClass(t.status)}`}>{t.status}</span>
                        )}
                      </td>
                      <td>{t.dueDate ? new Date(t.dueDate).toLocaleDateString() : <span className="text-muted">—</span>}</td>
                      <td onClick={(e) => e.stopPropagation()}>
                        <div className="table-actions">
                          <button
                            className="btn btn--ghost btn--xs"
                            onClick={() => openTaskDetail(t)}
                            title="View details & comments"
                          >
                            💬
                          </button>
                          {canManage && (
                            <>
                              <button className="btn btn--ghost btn--xs" onClick={() => { setEditTask(t); setShowTaskModal(true); }}>✏️</button>
                              <button className="btn btn--ghost btn--xs btn--danger" onClick={() => handleDeleteTask(t._id)}>🗑️</button>
                            </>
                          )}
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </div>

        {/* Right: Team Members + Task Detail */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          {/* Team Members */}
          <div className="card">
            <div className="card__header">
              <h2>Team Members</h2>
              <span className="badge badge--gray">{(project?.members?.length || 0) + (project?.manager ? 1 : 0)}</span>
            </div>

            {project?.manager && (
              <div style={{ marginBottom: '0.5rem' }}>
                <span className="text-muted text-sm">Manager</span>
                <div className="sidebar__user" style={{ padding: '0.4rem 0' }}>
                  <div className="avatar" style={{ width: 28, height: 28, fontSize: '0.75rem' }}>
                    {project.manager.name?.[0]?.toUpperCase()}
                  </div>
                  <span style={{ fontSize: '0.875rem', fontWeight: 500 }}>{project.manager.name}</span>
                  <span className="badge badge--blue" style={{ marginLeft: 'auto' }}>PM</span>
                </div>
              </div>
            )}

            {project?.members?.length > 0 && (
              <div>
                <span className="text-muted text-sm">Members</span>
                {project.members.map(m => (
                  <div key={m._id} className="sidebar__user" style={{ padding: '0.4rem 0', justifyContent: 'space-between' }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                      <div className="avatar" style={{ width: 28, height: 28, fontSize: '0.75rem' }}>
                        {m.name?.[0]?.toUpperCase()}
                      </div>
                      <div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 500 }}>{m.name}</div>
                        <div className="text-muted text-sm">{m.email}</div>
                      </div>
                    </div>
                    {canManage && (
                      <button
                        className="btn btn--ghost btn--xs btn--danger"
                        onClick={() => handleRemoveMember(m._id)}
                        title="Remove member"
                      >✕</button>
                    )}
                  </div>
                ))}
              </div>
            )}

            {project?.members?.length === 0 && !project?.manager && (
              <p className="text-muted text-sm">No team members yet.</p>
            )}

            {/* Add member — admin and PM (manager of this project) */}
            {canManage && eligibleUsers.length > 0 && (
              <form onSubmit={handleAddMember} style={{ marginTop: '0.75rem' }}>
                {memberError && <div className="alert alert--error" style={{ marginBottom: '0.5rem', padding: '0.5rem', fontSize: '0.8rem' }}>{memberError}</div>}
                <div style={{ display: 'flex', gap: '0.4rem' }}>
                  <select
                    value={selectedUserId}
                    onChange={(e) => setSelectedUserId(e.target.value)}
                    className="filter-select"
                    style={{ flex: 1, fontSize: '0.8rem' }}
                  >
                    <option value="">Add member…</option>
                    {eligibleUsers.map(u => (
                      <option key={u._id} value={u._id}>{u.name}</option>
                    ))}
                  </select>
                  <button type="submit" className="btn btn--primary btn--sm" disabled={addingMember}>
                    {addingMember ? '…' : '+'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Task Detail & Comments */}
          {selectedTask && (
            <div className="card">
              <div className="card__header">
                <h2 style={{ fontSize: '0.95rem' }}>{taskDetail?.title || selectedTask.title}</h2>
                <button className="modal__close" onClick={() => { setSelectedTask(null); setTaskDetail(null); }}>✕</button>
              </div>
              {taskDetail?.description && (
                <p className="text-muted text-sm" style={{ marginBottom: '0.75rem' }}>{taskDetail.description}</p>
              )}
              <div style={{ display: 'flex', gap: '0.4rem', flexWrap: 'wrap', marginBottom: '0.75rem' }}>
                <span className={`badge ${statusClass(taskDetail?.status || selectedTask.status)}`}>
                  {taskDetail?.status || selectedTask.status}
                </span>
                <span className={`badge ${priorityClass(taskDetail?.priority || selectedTask.priority)}`}>
                  {taskDetail?.priority || selectedTask.priority}
                </span>
                {(taskDetail?.assignedTo || selectedTask.assignedTo) && (
                  <span className="badge badge--purple">
                    {taskDetail?.assignedTo?.name || selectedTask.assignedTo?.name || 'Assigned'}
                  </span>
                )}
              </div>

              {/* Comments */}
              <div>
                <h3 style={{ fontSize: '0.85rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-muted)' }}>
                  COMMENTS ({taskDetail?.comments?.length || 0})
                </h3>
                <div style={{ maxHeight: '200px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
                  {(taskDetail?.comments || []).length === 0 ? (
                    <p className="text-muted text-sm">No comments yet. Be the first to comment!</p>
                  ) : (
                    (taskDetail?.comments || []).map((c, i) => (
                      <div key={c._id || i} style={{ background: 'var(--bg)', borderRadius: '6px', padding: '0.5rem 0.65rem' }}>
                        <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.2rem' }}>
                          <strong style={{ fontSize: '0.8rem' }}>{c.author?.name || 'Unknown'}</strong>
                          <span className="text-muted text-sm">
                            {c.createdAt ? new Date(c.createdAt).toLocaleDateString() : ''}
                          </span>
                        </div>
                        <p style={{ fontSize: '0.85rem', margin: 0 }}>{c.text}</p>
                      </div>
                    ))
                  )}
                </div>
                <form onSubmit={handleAddComment} style={{ display: 'flex', gap: '0.4rem' }}>
                  <input
                    value={commentText}
                    onChange={(e) => setCommentText(e.target.value)}
                    placeholder="Add a comment…"
                    style={{
                      flex: 1, padding: '0.45rem 0.7rem', border: '1.5px solid var(--border)',
                      borderRadius: '7px', fontSize: '0.85rem', outline: 'none',
                    }}
                  />
                  <button type="submit" className="btn btn--primary btn--sm" disabled={addingComment || !commentText.trim()}>
                    {addingComment ? '…' : 'Post'}
                  </button>
                </form>
              </div>
            </div>
          )}
        </div>
      </div>

      {showTaskModal && (
        <TaskModal
          projectId={id}
          projectMembers={project?.members || []}
          task={editTask}
          onClose={() => { setShowTaskModal(false); setEditTask(null); }}
          onSave={handleSaveTask}
        />
      )}
    </div>
  );
}
