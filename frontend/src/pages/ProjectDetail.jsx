import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  getProject, getTasks, createTask, updateTask,
  deleteTask, updateTaskStatus
} from '../api/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import toast from 'react-hot-toast';
import { Plus, X, Trash2, Pencil, ArrowLeft, Calendar, Users } from 'lucide-react';

const COLS = [
  { id: 'todo', label: 'To Do', color: 'var(--text-3)', dot: '○' },
  { id: 'in-progress', label: 'In Progress', color: 'var(--amber)', dot: '◑' },
  { id: 'done', label: 'Done', color: 'var(--emerald)', dot: '●' }
];

const fmt = (d) => d ? new Date(d).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';
const isOver = (t) => t.dueDate && t.status !== 'done' && new Date() > new Date(t.dueDate);

/* ─── Task Modal ─── */
const TaskModal = ({ task, projectId, project, onClose, onSave }) => {
  const [form, setForm] = useState({
    title: task?.title || '',
    description: task?.description || '',
    status: task?.status || 'todo',
    priority: task?.priority || 'medium',
    dueDate: task?.dueDate ? new Date(task.dueDate).toISOString().split('T')[0] : '',
    projectId
  });
  const [loading, setLoading] = useState(false);

  const memberCount = project?.members?.length || 0;

  const submit = async (e) => {
    e.preventDefault();
    if (!form.title.trim()) { toast.error('Title required'); return; }
    setLoading(true);
    try { await onSave({ ...form, dueDate: form.dueDate || null }); onClose(); }
    catch (err) { toast.error(err.response?.data?.message || 'Failed'); }
    finally { setLoading(false); }
  };

  return (
    <div className="overlay">
      <div className="modal slide-up">
        <div className="modal-header">
          <h2 className="modal-title">{task ? 'Edit Task' : 'New Task'}</h2>
          <button className="btn btn-ghost btn-icon" onClick={onClose}><X size={17} /></button>
        </div>

        {/* Auto-assign notice */}
        {!task && (
          <div className="alert-box alert-info" style={{ marginBottom: '18px', fontSize: '12px', display: 'flex', gap: '8px', alignItems: 'center' }}>
            <Users size={14} style={{ flexShrink: 0 }} />
            <span>This task will be <strong>auto-assigned to all {memberCount} member(s)</strong> in this project.</span>
          </div>
        )}

        <form onSubmit={submit}>
          <div className="form-group">
            <label className="form-label">Task Title *</label>
            <input id="task-title" className="form-input" placeholder="What needs to be done?"
              value={form.title} onChange={e => setForm(p => ({ ...p, title: e.target.value }))} />
          </div>
          <div className="form-group">
            <label className="form-label">Description</label>
            <textarea className="form-textarea" placeholder="Add more details..."
              value={form.description} onChange={e => setForm(p => ({ ...p, description: e.target.value }))} />
          </div>
          <div className="form-row">
            <div className="form-group">
              <label className="form-label">Status</label>
              <select className="form-select" value={form.status} onChange={e => setForm(p => ({ ...p, status: e.target.value }))}>
                <option value="todo">To Do</option>
                <option value="in-progress">In Progress</option>
                <option value="done">Done</option>
              </select>
            </div>
            <div className="form-group">
              <label className="form-label">Priority</label>
              <select className="form-select" value={form.priority} onChange={e => setForm(p => ({ ...p, priority: e.target.value }))}>
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <div className="form-group">
            <label className="form-label"><Calendar size={13} /> Due Date</label>
            <input type="date" className="form-input" value={form.dueDate}
              onChange={e => setForm(p => ({ ...p, dueDate: e.target.value }))} />
          </div>
          <div className="modal-actions">
            <button type="button" className="btn btn-ghost" onClick={onClose}>Cancel</button>
            <button id="task-save" type="submit" className="btn btn-primary" disabled={loading}>
              {loading ? 'Saving...' : (task ? 'Update Task' : `Create & Assign to All`)}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
};

/* ─── Task Card ─── */
const TaskCard = ({ task, isAdmin, userId, onEdit, onDelete, onStatus }) => {
  const overdue = isOver(task);
  const isAssignee = task.assignees?.some(a => (a._id || a) === userId);
  const canAct = isAdmin || isAssignee;

  return (
    <div className="task-card">
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '8px' }}>
        <div className="task-card-title">{task.title}</div>
        {isAdmin && (
          <div style={{ display: 'flex', gap: '3px', flexShrink: 0 }}>
            <button className="btn btn-ghost btn-icon" style={{ padding: '3px' }} onClick={() => onEdit(task)}><Pencil size={12} /></button>
            <button className="btn btn-danger btn-icon" style={{ padding: '3px' }} onClick={() => onDelete(task._id)}><Trash2 size={12} /></button>
          </div>
        )}
      </div>

      {task.description && (
        <p style={{ fontSize: '12px', color: 'var(--text-3)', margin: '4px 0 8px', lineHeight: 1.45 }}>
          {task.description.slice(0, 80)}{task.description.length > 80 ? '…' : ''}
        </p>
      )}

      <div className="task-meta">
        <span className={`badge badge-${task.priority}`}>{task.priority}</span>
        {task.dueDate && (
          <span className={`task-due${overdue ? ' overdue' : ''}`}>
            <Calendar size={10} /> {fmt(task.dueDate)}{overdue ? ' ⚠️' : ''}
          </span>
        )}
      </div>

      {/* Assignee avatars */}
      {task.assignees?.length > 0 && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginTop: '9px' }}>
          <div className="avatars">
            {task.assignees.slice(0, 5).map(a => {
              const name = a.name || '?';
              return (
                <div key={a._id || a} className="mini-avatar" style={{ width: 22, height: 22, fontSize: '9px', border: '1.5px solid var(--bg-2)' }} title={name}>
                  {name[0]?.toUpperCase()}
                </div>
              );
            })}
            {task.assignees.length > 5 && (
              <div className="mini-avatar" style={{ width: 22, height: 22, fontSize: '9px', background: 'var(--bg-4)', color: 'var(--text-3)' }}>
                +{task.assignees.length - 5}
              </div>
            )}
          </div>
          <span style={{ fontSize: '10px', color: 'var(--text-3)' }}>{task.assignees.length} assignee{task.assignees.length > 1 ? 's' : ''}</span>
        </div>
      )}

      {canAct && (
        <div className="status-row">
          {COLS.map(c => (
            <button key={c.id} className={`status-btn${task.status === c.id ? ` active-${c.id}` : ''}`}
              onClick={() => task.status !== c.id && onStatus(task._id, c.id)}
              disabled={task.status === c.id} title={c.label} style={{ fontSize: '11px' }}>
              {c.dot} {c.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
};

/* ─── Project Detail (Kanban Board) ─── */
const ProjectDetail = () => {
  const { id } = useParams();
  const { user } = useAuth();
  const navigate = useNavigate();
  const [project, setProject] = useState(null);
  const [tasks, setTasks] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [editTask, setEditTask] = useState(null);

  useEffect(() => {
    const load = async () => {
      try {
        const [pRes, tRes] = await Promise.all([getProject(id), getTasks({ projectId: id })]);
        setProject(pRes.data.data);
        setTasks(tRes.data.data);
      } catch { toast.error('Failed to load project'); navigate('/projects'); }
      finally { setLoading(false); }
    };
    load();
  }, [id]);

  const handleCreate = async (data) => {
    const res = await createTask(data);
    setTasks(prev => [res.data.data, ...prev]);
    toast.success(res.data.message || 'Task created!');
  };

  const handleUpdate = async (data) => {
    const res = await updateTask(editTask._id, data);
    setTasks(prev => prev.map(t => t._id === editTask._id ? res.data.data : t));
    toast.success('Task updated!');
  };

  const handleDelete = async (tid) => {
    if (!confirm('Delete this task?')) return;
    await deleteTask(tid);
    setTasks(prev => prev.filter(t => t._id !== tid));
    toast.success('Deleted');
  };

  const handleStatus = async (tid, status) => {
    try {
      await updateTaskStatus(tid, status);
      setTasks(prev => prev.map(t => t._id === tid ? { ...t, status } : t));
    } catch (err) { toast.error(err.response?.data?.message || 'Cannot update status'); }
  };

  const isAdmin = user?.role === 'admin';

  if (loading) return (
    <div className="app-layout"><Sidebar />
      <div className="main-content"><div className="loading-center" style={{ flex: 1 }}><div className="spinner" /><p className="loading-text">Loading board...</p></div></div>
    </div>
  );

  const donePct = tasks.length ? Math.round(tasks.filter(t => t.status === 'done').length / tasks.length * 100) : 0;

  return (
    <div className="app-layout">
      <Sidebar />
      <div className="main-content">
        <div className="topbar">
          <button className="btn btn-ghost btn-icon" onClick={() => navigate('/projects')}><ArrowLeft size={17} /></button>
          <div style={{ flex: 1 }}>
            <div className="topbar-title" style={{ display: 'flex', alignItems: 'center', gap: '9px' }}>
              <span style={{ width: 11, height: 11, borderRadius: '50%', background: project?.color, display: 'inline-block' }} />
              {project?.title}
            </div>
            <div className="topbar-sub">{tasks.length} tasks · {project?.members?.length} members · {donePct}% done</div>
          </div>

          {/* Member avatars in topbar */}
          <div className="avatars" style={{ marginRight: '8px' }}>
            {project?.members?.slice(0, 6).map(m => (
              <div key={m._id} className="sm-avatar" title={m.name}>{m.name?.[0]?.toUpperCase()}</div>
            ))}
            {project?.members?.length > 6 && <div className="sm-avatar" style={{ background: 'var(--bg-4)', color: 'var(--text-3)', fontSize: '10px' }}>+{project.members.length - 6}</div>}
          </div>

          <span className={`badge badge-${project?.status}`}>{project?.status}</span>
          {isAdmin && (
            <button id="new-task-btn" className="btn btn-primary btn-sm" onClick={() => { setEditTask(null); setShowModal(true); }}>
              <Plus size={14} /> Add Task
            </button>
          )}
        </div>

        {/* Progress bar */}
        {tasks.length > 0 && (
          <div style={{ height: '3px', background: 'var(--border)', position: 'relative' }}>
            <div style={{ position: 'absolute', left: 0, top: 0, bottom: 0, width: `${donePct}%`, background: project?.color || 'var(--accent)', transition: 'width .4s ease' }} />
          </div>
        )}

        <div className="page fade-in">
          <div className="kanban">
            {COLS.map(col => {
              const colTasks = tasks.filter(t => t.status === col.id);
              return (
                <div key={col.id} className="k-col">
                  <div className="k-col-hdr">
                    <div className="k-col-title" style={{ color: col.color }}>{col.dot} {col.label}</div>
                    <span className="k-count">{colTasks.length}</span>
                  </div>
                  {colTasks.length === 0
                    ? <div style={{ padding: '24px', textAlign: 'center', color: 'var(--text-3)', fontSize: '13px', opacity: .6 }}>No tasks</div>
                    : colTasks.map(t => (
                      <TaskCard key={t._id} task={t} isAdmin={isAdmin} userId={user?._id}
                        onEdit={t => { setEditTask(t); setShowModal(true); }}
                        onDelete={handleDelete} onStatus={handleStatus} />
                    ))
                  }
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {showModal && (
        <TaskModal task={editTask} projectId={id} project={project}
          onClose={() => { setShowModal(false); setEditTask(null); }}
          onSave={editTask ? handleUpdate : handleCreate} />
      )}
    </div>
  );
};

export default ProjectDetail;
