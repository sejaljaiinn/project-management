import React, { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import api from '../services/api';
import { useAuth } from '../context/AuthContext.jsx';

const emptyForm = { name: '', description: '', managerId: '' };

export default function Projects() {
  const { user, isAdmin, isPM } = useAuth();
  const [projects, setProjects] = useState([]);
  const [managers, setManagers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [saving, setSaving] = useState(false);
  const [formError, setFormError] = useState('');

  const canCreate = isAdmin || isPM;
  const canEdit = (p) => isAdmin || (isPM && p.manager?._id === user?._id);
  const canDelete = (p) => isAdmin;

  const load = async () => {
    try {
      const res = await api.get('/projects');
      setProjects(res.data);
    } catch {
      setError('Failed to load projects');
    } finally {
      setLoading(false);
    }
  };

  const loadManagers = async () => {
    if (!isAdmin) return;
    try {
      const res = await api.get('/admin/users');
      setManagers(res.data.filter(u => u.role === 'PROJECT_MANAGER' || u.role === 'ADMIN'));
    } catch {}
  };

  useEffect(() => { load(); loadManagers(); }, []);

  const openCreate = () => {
    setEditProject(null);
    setForm(emptyForm);
    setFormError('');
    setShowModal(true);
  };

  const openEdit = (p) => {
    setEditProject(p);
    setForm({ name: p.name, description: p.description, managerId: p.manager?._id || '' });
    setFormError('');
    setShowModal(true);
  };

  const closeModal = () => { setShowModal(false); setEditProject(null); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setFormError('');
    if (!form.name.trim()) { setFormError('Project name is required'); return; }
    setSaving(true);
    try {
      const payload = { name: form.name, description: form.description };
      if (isAdmin && form.managerId) payload.managerId = form.managerId;
      if (editProject) {
        await api.put(`/projects/${editProject._id}`, payload);
      } else {
        await api.post('/projects', payload);
      }
      closeModal();
      load();
    } catch (err) {
      setFormError(err.response?.data?.message || 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async (id) => {
    if (!window.confirm('Delete this project and all its tasks?')) return;
    try {
      await api.delete(`/projects/${id}`);
      setProjects(projects.filter(p => p._id !== id));
    } catch {
      alert('Delete failed');
    }
  };

  if (loading) return <div className="page-loading"><div className="spinner"></div><p>Loading projects…</p></div>;

  return (
    <div className="page">
      <div className="page__header">
        <div>
          <h1>Projects</h1>
          <p className="text-muted">{projects.length} project{projects.length !== 1 ? 's' : ''}</p>
        </div>
        {canCreate && (
          <button className="btn btn--primary" onClick={openCreate}>+ New Project</button>
        )}
      </div>

      {error && <div className="alert alert--error">{error}</div>}

      {projects.length === 0 ? (
        <div className="empty-state empty-state--page">
          <div className="empty-state__icon">📁</div>
          <h2>No projects yet</h2>
          <p>
            {canCreate
              ? 'Create your first project to get started.'
              : 'You have not been added to any projects yet.'}
          </p>
          {canCreate && (
            <button className="btn btn--primary" onClick={openCreate}>+ Create Project</button>
          )}
        </div>
      ) : (
        <div className="projects-grid">
          {projects.map((p) => (
            <div key={p._id} className="project-card">
              <div className="project-card__header">
                <span className="project-card__icon">📁</span>
                <div className="project-card__actions">
                  {canEdit(p) && (
                    <button className="btn btn--ghost btn--xs" onClick={() => openEdit(p)} title="Edit project">✏️</button>
                  )}
                  {canDelete(p) && (
                    <button className="btn btn--ghost btn--xs btn--danger" onClick={() => handleDelete(p._id)} title="Delete project">🗑️</button>
                  )}
                </div>
              </div>
              <h3 className="project-card__name">
                <Link to={`/projects/${p._id}`}>{p.name}</Link>
              </h3>
              <p className="project-card__desc text-muted">{p.description || 'No description'}</p>
              {p.manager && (
                <p className="text-sm text-muted">Manager: {p.manager.name}</p>
              )}
              <div className="project-card__footer">
                <span className="text-muted text-sm">{new Date(p.createdAt).toLocaleDateString()}</span>
                <Link to={`/projects/${p._id}`} className="link text-sm">View →</Link>
              </div>
            </div>
          ))}
        </div>
      )}

      {showModal && (
        <div className="modal-overlay" onClick={closeModal}>
          <div className="modal" onClick={(e) => e.stopPropagation()}>
            <div className="modal__header">
              <h2>{editProject ? 'Edit Project' : 'New Project'}</h2>
              <button className="modal__close" onClick={closeModal}>✕</button>
            </div>
            <form onSubmit={handleSubmit}>
              {formError && <div className="alert alert--error">{formError}</div>}
              <div className="form-group">
                <label>Project Name *</label>
                <input
                  value={form.name}
                  onChange={(e) => setForm({ ...form, name: e.target.value })}
                  placeholder="My awesome project"
                  required
                />
              </div>
              <div className="form-group">
                <label>Description</label>
                <textarea
                  rows={3}
                  value={form.description}
                  onChange={(e) => setForm({ ...form, description: e.target.value })}
                  placeholder="Optional description…"
                />
              </div>
              {isAdmin && (
                <div className="form-group">
                  <label>Project Manager</label>
                  <select
                    value={form.managerId}
                    onChange={(e) => setForm({ ...form, managerId: e.target.value })}
                  >
                    <option value="">— None —</option>
                    {managers.map(m => (
                      <option key={m._id} value={m._id}>{m.name} ({m.role === 'ADMIN' ? 'Admin' : 'PM'})</option>
                    ))}
                  </select>
                </div>
              )}
              <div className="modal__footer">
                <button type="button" className="btn btn--ghost" onClick={closeModal}>Cancel</button>
                <button type="submit" className="btn btn--primary" disabled={saving}>
                  {saving ? 'Saving…' : editProject ? 'Update' : 'Create'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
