import React, { useState, useEffect } from 'react';
import api from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';

export default function TaskModal({ task, projectId, projectMembers, projects: propProjects, onClose, onSave }) {
  const { user, isAdmin, isPM } = useAuth();
  const isMemberOnly = user?.role === 'TEAM_MEMBER';

  const [projects, setProjects] = useState(propProjects || []);
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    project: task?.project?._id || task?.project || projectId || '',
    assignedTo: task?.assignedTo?._id || task?.assignedTo || '',
    priority: task?.priority || 'Medium',
    status: task?.status || 'To Do',
    dueDate: task?.dueDate ? task.dueDate.split('T')[0] : '',
  });
  const [members, setMembers] = useState(projectMembers || []);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!propProjects) {
      api.get('/projects').then(res => setProjects(res.data)).catch(() => {});
    }
  }, [propProjects]);

  // Load project members when project selection changes
  useEffect(() => {
    if (!projectId && form.project && !projectMembers) {
      api.get(`/projects/${form.project}`)
        .then(res => setMembers(res.data.members || []))
        .catch(() => {});
    } else if (projectMembers) {
      setMembers(projectMembers);
    }
  }, [form.project, projectId, projectMembers]);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    if (!form.title.trim()) { setError('Title is required'); return; }
    if (!form.project) { setError('Please select a project'); return; }
    setSaving(true);
    try {
      const payload = {
        title: form.title,
        description: form.description,
        project: form.project,
        assignedTo: form.assignedTo || null,
        priority: form.priority,
        status: form.status,
        dueDate: form.dueDate || undefined,
      };
      if (task) {
        await api.put(`/tasks/${task._id}`, payload);
      } else {
        await api.post('/tasks', payload);
      }
      onSave();
    } catch (err) {
      setError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal modal--lg" onClick={(e) => e.stopPropagation()}>
        <div className="modal__header">
          <h2>{task ? 'Edit Task' : 'New Task'}</h2>
          <button className="modal__close" onClick={onClose}>✕</button>
        </div>
        <form onSubmit={handleSubmit}>
          {error && <div className="alert alert--error">{error}</div>}

          {/* Title — editable by admin/pm only; members see read-only */}
          <div className="form-row">
            <div className="form-group form-group--full">
              <label>Title *</label>
              <input
                value={form.title}
                onChange={(e) => set('title', e.target.value)}
                placeholder="Task title"
                required
                readOnly={isMemberOnly}
              />
            </div>
          </div>

          {!isMemberOnly && (
            <div className="form-row">
              <div className="form-group form-group--full">
                <label>Description</label>
                <textarea
                  rows={2}
                  value={form.description}
                  onChange={(e) => set('description', e.target.value)}
                  placeholder="Optional details…"
                />
              </div>
            </div>
          )}

          <div className="form-row">
            {/* Project selector — hidden when projectId is fixed */}
            {!projectId && (
              <div className="form-group">
                <label>Project *</label>
                <select
                  value={form.project}
                  onChange={(e) => set('project', e.target.value)}
                  required
                  disabled={isMemberOnly}
                >
                  <option value="">Select project…</option>
                  {projects.map(p => <option key={p._id} value={p._id}>{p.name}</option>)}
                </select>
              </div>
            )}

            {/* Assigned To — user dropdown from project members */}
            {!isMemberOnly && (
              <div className="form-group">
                <label>Assign To</label>
                <select
                  value={form.assignedTo}
                  onChange={(e) => set('assignedTo', e.target.value)}
                >
                  <option value="">— Unassigned —</option>
                  {members.map(m => (
                    <option key={m._id} value={m._id}>{m.name}</option>
                  ))}
                </select>
              </div>
            )}
          </div>

          <div className="form-row">
            {!isMemberOnly && (
              <div className="form-group">
                <label>Priority</label>
                <select value={form.priority} onChange={(e) => set('priority', e.target.value)}>
                  <option>Low</option>
                  <option>Medium</option>
                  <option>High</option>
                </select>
              </div>
            )}
            <div className="form-group">
              <label>Status</label>
              <select value={form.status} onChange={(e) => set('status', e.target.value)}>
                <option>To Do</option>
                <option>In Progress</option>
                <option>Done</option>
              </select>
            </div>
            {!isMemberOnly && (
              <div className="form-group">
                <label>Due Date</label>
                <input type="date" value={form.dueDate} onChange={(e) => set('dueDate', e.target.value)} />
              </div>
            )}
          </div>

          <div className="modal__footer">
            <button type="button" className="btn btn--ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn btn--primary" disabled={saving}>
              {saving ? 'Saving…' : task ? 'Update Task' : 'Create Task'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
