import React, { useEffect, useState } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';
import TaskModal from '../components/TaskModal.jsx';

export default function Tasks() {
  const { user, isAdmin, isPM } = useAuth();
  const isMember = user?.role === 'TEAM_MEMBER';
  const canCreate = isAdmin || isPM;
  const canDelete = isAdmin || isPM;

  const [tasks, setTasks] = useState([]);
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);
  const [selectedTask, setSelectedTask] = useState(null);
  const [taskDetail, setTaskDetail] = useState(null);
  const [commentText, setCommentText] = useState('');
  const [addingComment, setAddingComment] = useState(false);

  const load = async () => {
    try {
      const params = {};
      if (statusFilter) params.status = statusFilter;
      if (search) params.search = search;
      const [taskRes, projRes] = await Promise.all([
        api.get('/tasks', { params }),
        api.get('/projects'),
      ]);
      setTasks(taskRes.data);
      setProjects(projRes.data);
    } catch {
      setError('Failed to load tasks');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    const t = setTimeout(() => load(), search ? 400 : 0);
    return () => clearTimeout(t);
  }, [search, statusFilter]);

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this task?')) return;
    try {
      await api.delete(`/tasks/${id}`);
      setTasks(tasks.filter(t => t._id !== id));
    } catch (err) {
      setError(err.response?.data?.message || 'Delete failed');
    }
  };

  const handleSave = () => { setShowModal(false); setEditTask(null); load(); };

  const handleStatusChange = async (taskId, newStatus) => {
    try {
      const res = await api.put(`/tasks/${taskId}`, { status: newStatus });
      setTasks(tasks.map(t => t._id === taskId ? { ...t, status: res.data.status } : t));
    } catch (err) {
      setError(err.response?.data?.message || 'Failed to update status');
    }
  };

  const openTaskDetail = async (task) => {
    setSelectedTask(task);
    setCommentText('');
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

  const priorityClass = (p) => ({ Low: 'badge--green', Medium: 'badge--yellow', High: 'badge--red' }[p] || '');
  const statusClass = (s) => ({ 'To Do': 'badge--gray', 'In Progress': 'badge--blue', Done: 'badge--green' }[s] || '');

  return (
    <div className="page" style={{ maxWidth: '1200px' }}>
      <div className="page__header">
        <div>
          <h1>{isMember ? 'My Tasks' : 'Tasks'}</h1>
          <p className="text-muted">{tasks.length} task{tasks.length !== 1 ? 's' : ''}</p>
        </div>
        {canCreate && (
          <button className="btn btn--primary" onClick={() => { setEditTask(null); setShowModal(true); }}>
            + New Task
          </button>
        )}
      </div>

      {/* Search & Filter */}
      <div className="filters">
        <input
          className="search-input"
          type="search"
          placeholder="🔍  Search tasks…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
        />
        <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)} className="filter-select">
          <option value="">All Status</option>
          <option>To Do</option>
          <option>In Progress</option>
          <option>Done</option>
        </select>
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: selectedTask ? '1fr 340px' : '1fr', gap: '1rem' }}>
        <div>
          {loading ? (
            <div className="page-loading"><div className="spinner"></div><p>Loading tasks…</p></div>
          ) : tasks.length === 0 ? (
            <div className="empty-state empty-state--page">
              <div className="empty-state__icon">✅</div>
              <h2>No tasks found</h2>
              <p>{search || statusFilter ? 'Try adjusting your filters.' : isMember ? 'No tasks have been assigned to you yet.' : 'Create your first task.'}</p>
              {canCreate && !search && !statusFilter && (
                <button className="btn btn--primary" onClick={() => setShowModal(true)}>+ Create Task</button>
              )}
            </div>
          ) : (
            <div className="table-wrap">
              <table className="task-table">
                <thead>
                  <tr>
                    <th>Title</th>
                    <th>Project</th>
                    <th>Assigned To</th>
                    <th>Priority</th>
                    <th>Status</th>
                    <th>Due Date</th>
                    <th>Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {tasks.map((t) => (
                    <tr key={t._id}>
                      <td onClick={() => openTaskDetail(t)} style={{ cursor: 'pointer' }}>
                        <div className="task-title">{t.title}</div>
                        {t.description && (
                          <div className="text-muted text-sm">
                            {t.description.slice(0, 60)}{t.description.length > 60 ? '…' : ''}
                          </div>
                        )}
                      </td>
                      <td><span className="text-muted">{t.project?.name}</span></td>
                      <td>
                        {t.assignedTo?.name
                          ? <span>{t.assignedTo.name}</span>
                          : <span className="text-muted">—</span>
                        }
                      </td>
                      <td><span className={`badge ${priorityClass(t.priority)}`}>{t.priority}</span></td>
                      <td>
                        {isMember && (t.assignedTo?._id === user?._id || t.assignedTo === user?._id) ? (
                          <select
                            value={t.status}
                            onChange={(e) => handleStatusChange(t._id, e.target.value)}
                            className="filter-select"
                            style={{ fontSize: '0.78rem', padding: '0.2rem 0.4rem' }}
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
                      <td>
                        <div className="table-actions">
                          <button className="btn btn--ghost btn--xs" onClick={() => openTaskDetail(t)} title="View comments">
                            💬
                          </button>
                          {!isMember && (
                            <button className="btn btn--ghost btn--xs" onClick={() => { setEditTask(t); setShowModal(true); }}>✏️</button>
                          )}
                          {canDelete && (
                            <button className="btn btn--ghost btn--xs btn--danger" onClick={() => handleDelete(t._id)}>🗑️</button>
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

        {/* Task Detail / Comments Panel */}
        {selectedTask && (
          <div className="card" style={{ height: 'fit-content', position: 'sticky', top: '80px' }}>
            <div className="card__header">
              <h2 style={{ fontSize: '0.95rem', flex: 1, marginRight: '0.5rem' }}>
                {taskDetail?.title || selectedTask.title}
              </h2>
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
              {taskDetail?.assignedTo?.name && (
                <span className="badge badge--purple">{taskDetail.assignedTo.name}</span>
              )}
            </div>

            <h3 style={{ fontSize: '0.8rem', fontWeight: 600, marginBottom: '0.5rem', color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
              Comments ({taskDetail?.comments?.length || 0})
            </h3>
            <div style={{ maxHeight: '250px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem', marginBottom: '0.75rem' }}>
              {(taskDetail?.comments || []).length === 0 ? (
                <p className="text-muted text-sm">No comments yet.</p>
              ) : (
                (taskDetail?.comments || []).map((c, i) => (
                  <div key={c._id || i} style={{ background: 'var(--bg)', borderRadius: '6px', padding: '0.5rem 0.65rem' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.15rem' }}>
                      <strong style={{ fontSize: '0.8rem' }}>{c.author?.name || 'Unknown'}</strong>
                      <span className="text-muted" style={{ fontSize: '0.72rem' }}>
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
        )}
      </div>

      {showModal && (
        <TaskModal
          task={editTask}
          projects={projects}
          onClose={() => { setShowModal(false); setEditTask(null); }}
          onSave={handleSave}
        />
      )}
    </div>
  );
}
