import { useState, useEffect } from 'react';
import { getPendingRequests, acceptRequest, rejectRequest } from '../api/api';
import { useAuth } from '../context/AuthContext';
import Sidebar from '../components/Sidebar';
import toast from 'react-hot-toast';
import { Bell, CheckCircle, XCircle, Clock } from 'lucide-react';

const fmtTime = (d) => {
  const diff = Date.now() - new Date(d).getTime();
  const mins = Math.floor(diff / 60000);
  if (mins < 60) return `${mins}m ago`;
  const hrs = Math.floor(mins / 60);
  if (hrs < 24) return `${hrs}h ago`;
  return `${Math.floor(hrs / 24)}d ago`;
};

const JoinRequests = () => {
  const { user } = useAuth();
  const [requests, setRequests] = useState([]);
  const [loading, setLoading] = useState(true);
  const [processing, setProcessing] = useState({});

  const fetchRequests = async () => {
    try {
      const res = await getPendingRequests();
      setRequests(res.data.data);
    } catch { toast.error('Failed to load requests'); }
    finally { setLoading(false); }
  };

  useEffect(() => { fetchRequests(); }, []);

  const handle = async (projectId, userId, action) => {
    const key = `${projectId}-${userId}`;
    setProcessing(p => ({ ...p, [key]: action }));
    try {
      if (action === 'accept') {
        await acceptRequest(projectId, userId);
        toast.success('Member accepted and added to project! ✅');
      } else {
        await rejectRequest(projectId, userId);
        toast.success('Request rejected.');
      }
      setRequests(prev => prev.filter(r => !(r.projectId === projectId && r.user._id === userId)));
    } catch (err) {
      toast.error(err.response?.data?.message || 'Action failed');
    } finally {
      setProcessing(p => { const n = { ...p }; delete n[key]; return n; });
    }
  };

  return (
    <div className="app-layout">
      <Sidebar pendingCount={requests.length} />
      <div className="main-content">
        <div className="topbar">
          <div>
            <div className="topbar-title" style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
              <Bell size={20} color="var(--accent-light)" /> Join Requests
            </div>
            <div className="topbar-sub">{requests.length} pending request{requests.length !== 1 ? 's' : ''}</div>
          </div>
        </div>

        <div className="page fade-in">
          {loading ? (
            <div className="loading-center"><div className="spinner" /><p className="loading-text">Loading requests...</p></div>
          ) : requests.length === 0 ? (
            <div className="empty">
              <div className="empty-icon">🎉</div>
              <h3 className="empty-title">No pending requests</h3>
              <p className="empty-text">When team members request to join projects, they'll appear here for your approval.</p>
            </div>
          ) : (
            <div className="card" style={{ padding: 0 }}>
              <div style={{ padding: '18px 20px', borderBottom: '1px solid var(--border)', display: 'flex', alignItems: 'center', gap: '10px' }}>
                <Clock size={16} color="var(--amber)" />
                <span style={{ fontSize: '14px', fontWeight: 700 }}>Pending Approvals</span>
                <span className="badge badge-pending" style={{ marginLeft: '4px' }}>{requests.length}</span>
              </div>
              <div style={{ padding: '16px' }}>
                {requests.map(req => {
                  const key = `${req.projectId}-${req.user._id}`;
                  const isProcessing = processing[key];
                  const initials = req.user.name?.split(' ').map(n => n[0]).join('').slice(0, 2).toUpperCase();
                  return (
                    <div key={key} className="req-card">
                      <div style={{ width: 40, height: 40, borderRadius: '50%', background: 'linear-gradient(135deg,var(--accent),#4f46e5)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: '15px', fontWeight: 700, color: 'white', flexShrink: 0 }}>
                        {initials}
                      </div>
                      <div className="req-info">
                        <div className="req-user">{req.user.name}</div>
                        <div className="req-project">
                          wants to join <span style={{ color: 'var(--accent-light)', fontWeight: 600 }}>{req.projectTitle}</span>
                        </div>
                        <div className="req-time"><Clock size={10} style={{ display: 'inline' }} /> {fmtTime(req.requestedAt)} · {req.user.email}</div>
                      </div>
                      <div className="req-actions">
                        <button
                          className="btn btn-success btn-sm"
                          onClick={() => handle(req.projectId, req.user._id, 'accept')}
                          disabled={!!isProcessing}
                        >
                          <CheckCircle size={14} /> {isProcessing === 'accept' ? 'Adding...' : 'Accept'}
                        </button>
                        <button
                          className="btn btn-danger btn-sm"
                          onClick={() => handle(req.projectId, req.user._id, 'reject')}
                          disabled={!!isProcessing}
                        >
                          <XCircle size={14} /> {isProcessing === 'reject' ? '...' : 'Reject'}
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default JoinRequests;
