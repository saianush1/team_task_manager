import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { signup } from '../api/api';
import toast from 'react-hot-toast';
import { Mail, Lock, User, Zap, Eye, EyeOff, Info } from 'lucide-react';

const Signup = () => {
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => { setForm(p => ({ ...p, [e.target.name]: e.target.value })); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.name || !form.email || !form.password) { setError('All fields are required'); return; }
    if (form.password.length < 6) { setError('Password must be at least 6 characters'); return; }
    setLoading(true);
    try {
      const res = await signup(form);
      loginUser(res.data.token, res.data.user);
      toast.success(res.data.message || `Welcome, ${res.data.user.name}! 🎉`);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Signup failed. Please try again.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-glow" /><div className="auth-glow2" />
      <div className="auth-card fade-in">
        <div className="auth-logo">
          <div className="auth-icon"><Zap size={26} color="white" /></div>
          <h1 className="auth-title">Create account</h1>
          <p className="auth-sub">Join your team's TaskFlow workspace</p>
        </div>

        <div className="alert-box alert-info" style={{ display: 'flex', gap: '8px', alignItems: 'flex-start' }}>
          <Info size={14} style={{ flexShrink: 0, marginTop: '1px' }} />
          <span style={{ fontSize: '12px' }}>
            The <strong>first</strong> registered user becomes the Admin. All others are Members who can request to join projects.
          </span>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="alert-box alert-error">{error}</div>}
          <div className="form-group">
            <label className="form-label"><User size={13} />Full Name</label>
            <input id="signup-name" type="text" name="name" className="form-input"
              placeholder="John Doe" value={form.name} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label"><Mail size={13} />Email Address</label>
            <input id="signup-email" type="email" name="email" className="form-input"
              placeholder="you@example.com" value={form.email} onChange={handleChange} />
          </div>
          <div className="form-group">
            <label className="form-label"><Lock size={13} />Password</label>
            <div style={{ position: 'relative' }}>
              <input id="signup-password" type={showPass ? 'text' : 'password'} name="password"
                className="form-input" placeholder="Min. 6 characters" value={form.password}
                onChange={handleChange} style={{ paddingRight: '40px' }} />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', background: 'none', color: 'var(--text-3)', padding: '2px' }}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <button id="signup-submit" type="submit" className="btn btn-primary w-full"
            style={{ justifyContent: 'center', marginTop: '6px' }} disabled={loading}>
            {loading ? <><div className="spinner" style={{ width: 17, height: 17, borderWidth: 2 }} />Creating...</> : 'Create Account →'}
          </button>
        </form>
        <p className="auth-link-row">Already have an account? <Link to="/login">Sign in</Link></p>
      </div>
    </div>
  );
};

export default Signup;
