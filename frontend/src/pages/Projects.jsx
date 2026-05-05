import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  getProjects, createProject, updateProject, deleteProject,
  getAllUsers, addMember, removeMember, requestJoin
} from '../api/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import toast from 'react-hot-toast';
import { Plus, Pencil, Trash2, X, UserPlus, UserMinus, LogIn, Clock, XCircle } from 'lucide-react';

const COLORS = ['#7c3aed','#4f46e5','#ec4899','#f59e0b','#10b981','#38bdf8','#f97316','#14b8a6'];

/* ─── Project Modal (Admin) ─── */
const ProjectModal = ({ project, onClose, onSave, users }) => {
  const [form, setForm] = useState({
    title: project?.title || '', description: project?.description || '',
    status: project?.status || 'active', color: project?.color || COLORS[0],
    members: project?.members?.map(m => m._id || m) || []
  });
  const [loading, setLoading] = useState(false);

  const toggleMember = (id) => setForm(p => ({
    ...p, members: p.members.includes(id) ? p.members.filter(m => m !== id) : [...p.members, id]
  }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title is required'); return; }
    setLoading(true);
    try { await onSave(form); onClose(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed to save'); }
    finally { setLoading(false); }
  };

  return (
    <div className="overlay">
      <div className="modal slide-up">
        <div className="modal-header">
          <h2 className="modal-title">{project ? 'Edit Project' : 'New Project'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={17} /></button>
        </div>
        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label">Project Title *</label>
            <input id="project-title" className="form-input" placeholder="Enter project name"
              value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" placeholder="Brief description..."
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                <option value="active">Active</option>
                <option value="on-hold">On Hold</option>
                <option value="completed">Completed</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Color</label>
              <div style={{ display: 'flex', gap: '7px', flexWrap: 'wrap', marginTop: '4px' }}>
                {COLORS.map(c => (
                  <button key={c} type="button" onClick={() => setForm(p => ({ ...p, color: c }))}
                    style={{ width: 24, height: 24, borderRadius: '50%', background: c, border: 'none', cursor: 'pointer', outline: form.color === c ? '2px solid white' : 'none', outlineOffset: '2px' }} />
                ))}
              </div>
            </div>
          </div>
          {users?.length > 0 && (
            <div className="form-group">
              <label className="form-label"><UserPlus size={13} /> Assign Members</label>
              <div style={{ maxHeight: '160px', overflowY: 'auto', display: 'flex', flexDirection: 'column', gap: '5px' }}>
                {users.filter(u => u.role !== 'admin').map(u => (
                  <label key={u._id} style={{ display: 'flex', alignItems: 'center', gap: '8px', cursor: 'pointer', padding: '7px 10px', borderRadius: 'var(--r-sm)', background: form.members.includes(u._id) ? 'var(--accent-subtle)' : 'var(--bg-3)', border: `1px solid ${form.members.includes(u._id) ? 'rgba(124,58,237,.3)' : 'var(--border)'}` }}>
                    <input type="checkbox" checked={form.members.includes(u._id)} onChange={() => toggleMember(u._id)} />
                    <div className="mini-avatar" style={{ width: 26, height: 26, fontSize: '11px' }}>{u.name?.[0]?.toUpperCase()}</div>
                    <span style={{ fontSize: '13px', fontWeight: 500, flex: 1 }}>{u.name}</span>
                    <span style={{ fontSize: '11px', color: 'var(--text-3)' }}>{u.email}</span>
                  </label>
                ))}
              </div>
            </div>
          )}
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button id="project-save" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (project ? 'Update' : 'Create Project')}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Main Projects Page ─── */
const Projects = () => {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [projects, setProjects] = useState([]);
  const [allUsers, setAllUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editProject, setEditProject] = useState(null);
  const [requestingId, setRequestingId] = useState(null);

  const fetchProjects = async () => {
    try {
      const res = await getProjects();
      setProjects(res.data.data);
    } catch { toast.error('Failed to load projects'); }
    finally { setLoading(false); }
  };

  useEffect(() => {
    fetchProjects();
    if (user?.role === 'admin') getAllUsers().then(r => setAllUsers(r.data.data)).catch(() => {});
  }, [user]);

  const handleCreate = async (data) => {
    const res = await createProject(data);
    setProjects(prev => [{ ...res.data.data, taskCount: 0, completedCount: 0 }, ...prev]);
    toast.success('Project created! 🎉');
  };

  const handleUpdate = async (data) => {
    const res = await updateProject(editProject._id, data);
    setProjects(prev => prev.map(p => p._id === editProject._id ? { ...res.data.data, taskCount: p.taskCount, completedCount: p.completedCount } : p));
    toast.success('Project updated!');
  };

  const handleDelete = async (id) => {
    if (!confirm('Delete this project and all its tasks?')) return;
    try { await deleteProject(id); setProjects(prev => prev.filter(p => p._id !== id)); toast.success('Deleted'); }
    catch { toast.error('Failed to delete'); }
  };

  const handleJoinRequest = async (projectId) => {
    setRequestingId(projectId);
    try {
      await requestJoin(projectId);
      setProjects(prev => prev.map(p => p._id === projectId ? { ...p, myJoinStatus: 'pending' } : p));
      toast.success('Join request sent! Waiting for admin approval.');
    } catch (err) { toast.error(err.response?.data?.message || 'Failed to send request'); }
    finally { setRequestingId(null); }
  };

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title">Projects</div>
            <div className="topbar-sub">{projects.length} project(s) total</div>
          </div>
          {user?.role === 'admin' && (
            <button id="new-project-btn" className="btn btn-primary" onClick={() => { setEditProject(null); setShowModal(true); }}>
              <Plus size={15} /> New Project
            </button>
          )}
        </div>

        <div className="page fade-in">
          {loading ? (
            <div className="loading-center"><div className="spinner" /><p className="loading-text">Loading projects...</p></div>
          ) : projects.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">📁</div>
              <h3 className="empty-title">No projects yet</h3>
              <p className="empty-text">{user?.role === 'admin' ? 'Create your first project to get started' : 'No projects created yet. Check back soon.'}</p>
              {user?.role === 'admin' && <button className="btn btn-primary mt-4" onClick={() => setShowModal(true)}><Plus size={15} /> Create Project</button>}
            </div>
          ) : (
            <div className="proj-grid">
              {projects.map(pr => {
                const canOpen = user?.role === 'admin' || pr.isMember;
                return (
                  <div key={pr._id} className="proj-card">
                    <div className="proj-bar" style={{ background: pr.color || 'var(--accent)' }} />
                    <div className="proj-body">
                      <div className="flex-between" style={{ marginBottom: '6px' }}>
                        <h3 className="proj-title" style={{ cursor: canOpen ? 'pointer' : 'default' }}
                          onClick={() => canOpen && navigate(`/projects/${pr._id}`)}>
                          {pr.title}
                        </h3>
                        <div style={{ display: 'flex', gap: '4px', alignItems: 'center' }}>
                          <span className={`badge badge-${pr.status}`}>{pr.status}</span>
                          {user?.role === 'admin' && (
                            <>
                              <button className="btn btn-ghost btn-icon btn-sm" onClick={() => { setEditProject(pr); setShowModal(true); }} title="Edit"><Pencil size={13} /></button>
                              <button className="btn btn-danger btn-icon btn-sm" onClick={() => handleDelete(pr._id)} title="Delete"><Trash2 size={13} /></button>
                            </>
                          )}
                        </div>
                      </div>
                      <p className="proj-desc">{pr.description || 'No description'}</p>

                      <div className="proj-footer">
                        <div className="avatars">
                          {pr.members?.slice(0, 5).map(m => (
                            <div key={m._id || m} className="sm-avatar" title={m.name}>{m.name?.[0]?.toUpperCase()}</div>
                          ))}
                          {pr.members?.length > 5 && <div className="sm-avatar" style={{ background: 'var(--bg-4)', color: 'var(--text-3)', fontSize: '10px' }}>+{pr.members.length - 5}</div>}
                        </div>
                        <span style={{ fontSize: '12px', color: 'var(--text-3)' }}>{pr.completedCount}/{pr.taskCount} done</span>
                      </div>

                      {pr.taskCount > 0 && (
                        <div className="progress-bar">
                          <div className="progress-fill" style={{ width: `${Math.round(pr.completedCount / pr.taskCount * 100)}%`, background: pr.color || 'var(--accent)' }} />
                        </div>
                      )}

                      {/* Action Area */}
                      <div style={{ marginTop: '12px' }}>
                        {canOpen ? (
                          <button className="btn btn-secondary btn-sm w-full" style={{ justifyContent: 'center' }}
                            onClick={() => navigate(`/projects/${pr._id}`)}>
                            Open Board →
                          </button>
                        ) : pr.myJoinStatus === 'pending' ? (
                          <div className="join-banner pending"><Clock size={13} /> Request pending — waiting for admin approval</div>
                        ) : pr.myJoinStatus === 'rejected' ? (
                          <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                            <div className="join-banner rejected"><XCircle size={13} /> Request was rejected by admin</div>
                            <button className="btn btn-ghost btn-sm w-full" style={{ justifyContent: 'center' }}
                              onClick={() => handleJoinRequest(pr._id)} disabled={requestingId === pr._id}>
                              <LogIn size={13} /> Request Again
                            </button>
                          </div>
                        ) : (
                          <button className="btn btn-amber btn-sm w-full" style={{ justifyContent: 'center' }}
                            onClick={() => handleJoinRequest(pr._id)} disabled={requestingId === pr._id}>
                            <LogIn size={13} /> {requestingId === pr._id ? 'Sending...' : 'Request to Join'}
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>
      </div>

      {showModal && (
        <ProjectModal
          project={editProject}
          users={allUsers}
          onClose={() => { setShowModal(false); setEditProject(null); }}
          onSave={editProject ? handleUpdate : handleCreate}
        />
      )}
    </div>
  );
};

export default Projects;
