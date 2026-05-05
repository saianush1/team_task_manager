import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { login } from '../api/api';
import toast from 'react-hot-toast';
import { Mail, Lock, Zap, Eye, EyeOff } from 'lucide-react';

const Login = () => {
  const { loginUser } = useAuth();
  const navigate = useNavigate();
  const [form, setForm] = useState({ email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const [showPass, setShowPass] = useState(false);
  const [error, setError] = useState('');

  const handleChange = e => { setForm(p => ({ ...p, [e.target.name]: e.target.value })); setError(''); };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!form.email || !form.password) { setError('All fields are required'); return; }
    setLoading(true);
    try {
      const res = await login(form);
      loginUser(res.data.token, res.data.user);
      toast.success(`Welcome back, ${res.data.user.name}! 👋`);
      navigate('/dashboard');
    } catch (err) {
      setError(err.response?.data?.message || 'Login failed. Check your credentials.');
    } finally { setLoading(false); }
  };

  return (
    <div className="auth-page">
      <div className="auth-glow" /><div className="auth-glow2" />
      <div className="auth-card fade-in">
        <div className="auth-logo">
          <div className="auth-icon"><Zap size={26} color="white" /></div>
          <h1 className="auth-title">Welcome back</h1>
          <p className="auth-sub">Sign in to your TaskFlow workspace</p>
        </div>

        <form onSubmit={handleSubmit}>
          {error && <div className="alert-box alert-error">{error}</div>}
          <div className="form-group">
            <label className="form-label"><Mail size={13} />Email Address</label>
            <input id="login-email" type="email" name="email" className="form-input"
              placeholder="you@example.com" value={form.email} onChange={handleChange} autoComplete="email" />
          </div>
          <div className="form-group">
            <label className="form-label"><Lock size={13} />Password</label>
            <div style={{ position: 'relative' }}>
              <input id="login-password" type={showPass ? 'text' : 'password'} name="password"
                className="form-input" placeholder="Your password" value={form.password}
                onChange={handleChange} style={{ paddingRight: '40px' }} autoComplete="current-password" />
              <button type="button" onClick={() => setShowPass(!showPass)}
                style={{ position: 'absolute', right: '11px', top: '50%', transform: 'translateY(-50%)', background: 'none', color: 'var(--text-3)', padding: '2px' }}>
                {showPass ? <EyeOff size={15} /> : <Eye size={15} />}
              </button>
            </div>
          </div>
          <button id="login-submit" type="submit" className="btn btn-primary w-full"
            style={{ justifyContent: 'center', marginTop: '6px' }} disabled={loading}>
            {loading ? <><div className="spinner" style={{ width: 17, height: 17, borderWidth: 2 }} />Signing in...</> : 'Sign In →'}
          </button>
        </form>
        <p className="auth-link-row">Don't have an account? <Link to="/signup">Create one</Link></p>
      </div>
    </div>
  );
};

export default Login;
