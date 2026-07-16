import { useState } from 'react';

const SOCKET_URL = process.env.REACT_APP_SERVER_URL || 'http://localhost:5000';

const GlobalStyles = () => (
  <style>{`
    @import url('https://fonts.googleapis.com/css2?family=Space+Grotesk:wght@500;600;700&family=Inter:wght@400;500;600&family=JetBrains+Mono:wght@500;600&display=swap');
    .join-container {
      position: relative; min-height: 100vh; width: 100%;
      display: flex; align-items: center; justify-content: center; padding: 24px;
      background: radial-gradient(circle at 15% 20%, rgba(124,92,252,0.22), transparent 45%),
        radial-gradient(circle at 85% 80%, rgba(45,212,191,0.16), transparent 45%), #0a0b1e;
      font-family: 'Inter', sans-serif; overflow: hidden;
    }
    .join-container .bubble {
      position: absolute; border-radius: 50%;
      background: linear-gradient(135deg, rgba(124,92,252,0.35), rgba(45,212,191,0.15));
      filter: blur(0.5px); opacity: 0; animation: floatUp 9s ease-in infinite;
    }
    .b1{width:34px;height:26px;left:12%;animation-delay:0s}
    .b2{width:22px;height:18px;left:28%;animation-delay:2.4s}
    .b3{width:44px;height:34px;left:68%;animation-delay:1.1s}
    .b4{width:18px;height:14px;left:82%;animation-delay:3.6s}
    .b5{width:28px;height:22px;left:50%;animation-delay:5s}
    @keyframes floatUp {
      0%{transform:translateY(110vh) scale(0.8);opacity:0}
      10%{opacity:0.7} 85%{opacity:0.4}
      100%{transform:translateY(-10vh) scale(1.1);opacity:0}
    }
    .join-box {
      position: relative; width: 100%; max-width: 420px;
      padding: 44px 36px 36px; border-radius: 24px;
      background: linear-gradient(180deg, rgba(23,25,51,0.9), rgba(15,16,36,0.9));
      border: 1px solid rgba(124,92,252,0.25);
      box-shadow: 0 0 0 1px rgba(255,255,255,0.02) inset, 0 30px 60px -20px rgba(0,0,0,0.6), 0 0 40px -10px rgba(124,92,252,0.25);
      backdrop-filter: blur(18px); text-align: center; z-index: 1;
      animation: riseIn 0.5s cubic-bezier(0.16,1,0.3,1);
    }
    @keyframes riseIn {
      from{opacity:0;transform:translateY(16px) scale(0.98)}
      to{opacity:1;transform:translateY(0) scale(1)}
    }
    .join-logo-wrap {
      position: relative; display: inline-flex; align-items: center; justify-content: center;
      width: 68px; height: 68px; margin-bottom: 18px; border-radius: 20px;
      background: linear-gradient(135deg, #7c5cfc, #4f8cfc);
      box-shadow: 0 8px 24px -6px rgba(124,92,252,0.6);
    }
    .join-logo { font-size: 30px; line-height: 1; }
    .live-dot {
      position: absolute; top: -3px; right: -3px; width: 14px; height: 14px;
      border-radius: 50%; background: #2dd4bf; border: 3px solid #14152e;
      animation: pulseDot 2s infinite;
    }
    @keyframes pulseDot {
      0%{box-shadow:0 0 0 0 rgba(45,212,191,0.55)}
      70%{box-shadow:0 0 0 8px rgba(45,212,191,0)}
      100%{box-shadow:0 0 0 0 rgba(45,212,191,0)}
    }
    .join-box h2 {
      font-family: 'Space Grotesk', sans-serif; font-size: 24px; font-weight: 700;
      color: #f5f3ff; margin: 0 0 8px; letter-spacing: -0.01em;
    }
    .join-sub { font-size: 14.5px; color: #9391b5; line-height: 1.5; margin: 0 0 20px; }
    .auth-tabs { display: flex; gap: 6px; margin-bottom: 24px; background: rgba(255,255,255,0.04); border-radius: 12px; padding: 4px; }
    .auth-tab {
      flex: 1; padding: 8px; border: none; border-radius: 9px; background: transparent;
      color: #7d7ba3; font-family: 'Inter', sans-serif; font-size: 13px; font-weight: 500;
      cursor: pointer; transition: all 0.2s;
    }
    .auth-tab.active { background: rgba(124,92,252,0.25); color: #f5f3ff; }
    .join-box form { display: flex; flex-direction: column; gap: 14px; }
    .input-group { text-align: left; }
    .input-group label { display: block; font-size: 11px; font-weight: 600; letter-spacing: 0.08em; color: #7d7ba3; margin-bottom: 7px; }
    .input-group .field-wrap { position: relative; display: flex; align-items: center; }
    .input-group .field-icon { position: absolute; left: 14px; font-size: 15px; opacity: 0.6; pointer-events: none; }
    .input-group input {
      width: 100%; box-sizing: border-box; padding: 13px 14px 13px 40px;
      border-radius: 12px; border: 1.5px solid rgba(124,92,252,0.18);
      background: rgba(255,255,255,0.04); color: #f5f3ff;
      font-size: 15px; font-family: 'Inter', sans-serif; outline: none;
      transition: border-color 0.2s, box-shadow 0.2s, background 0.2s;
    }
    .input-group input::placeholder { color: #5f5d80; }
    .input-group input:focus {
      border-color: #7c5cfc; background: rgba(124,92,252,0.08);
      box-shadow: 0 0 0 4px rgba(124,92,252,0.15);
    }
    .join-box form button[type='submit'] {
      margin-top: 6px; padding: 13px 18px; border: none; border-radius: 12px;
      background: linear-gradient(135deg, #7c5cfc, #4f8cfc); color: #fff;
      font-family: 'Space Grotesk', sans-serif; font-size: 15px; font-weight: 600;
      cursor: pointer; box-shadow: 0 10px 24px -8px rgba(124,92,252,0.55);
      transition: transform 0.15s, box-shadow 0.15s, filter 0.15s;
    }
    .join-box form button[type='submit']:hover { transform: translateY(-2px); filter: brightness(1.06); }
    .join-box form button[type='submit']:disabled { opacity: 0.6; cursor: not-allowed; transform: none; }
    .auth-error { color: #ff6b6b; font-size: 13px; margin: -4px 0 4px; text-align: left; }
    .auth-success { color: #2dd4bf; font-size: 13px; margin: -4px 0 4px; text-align: left; }
    .auth-link { background: none; border: none; color: #7c5cfc; font-size: 13px; cursor: pointer; text-decoration: underline; margin-top: 12px; }
    .home-btn {
      margin-top: 20px; padding: 11px 20px; border-radius: 12px;
      border: 1.5px solid rgba(124,92,252,0.3); background: rgba(124,92,252,0.08);
      color: #cfcdf0; font-family: 'Inter', sans-serif; font-size: 14px; font-weight: 500;
      cursor: pointer; transition: background 0.2s, border-color 0.2s;
    }
    .home-btn:hover { background: rgba(124,92,252,0.16); border-color: rgba(124,92,252,0.5); }
    .retry-btn {
      margin-top: 22px; padding: 12px 22px; border: none; border-radius: 12px;
      background: linear-gradient(135deg, #ff6b6b, #ff9472); color: #fff;
      font-family: 'Space Grotesk', sans-serif; font-weight: 600; font-size: 14.5px;
      cursor: pointer; transition: transform 0.15s;
    }
    .status-icon-wrap { display: inline-flex; align-items: center; justify-content: center; width: 68px; height: 68px; margin-bottom: 18px; border-radius: 20px; }
    .status-icon-wrap.waiting { background: linear-gradient(135deg, rgba(124,92,252,0.25), rgba(79,140,252,0.15)); animation: spinPulse 2.2s ease-in-out infinite; }
    .status-icon-wrap.rejected { background: linear-gradient(135deg, rgba(255,107,107,0.22), rgba(255,148,114,0.14)); animation: shake 0.5s ease-in-out; }
    @keyframes spinPulse { 0%,100%{transform:scale(1)} 50%{transform:scale(1.08)} }
    @keyframes shake { 0%,100%{transform:translateX(0)} 20%{transform:translateX(-6px)} 40%{transform:translateX(6px)} 60%{transform:translateX(-4px)} 80%{transform:translateX(4px)} }
    .typing-dots { display: inline-flex; gap: 4px; margin-top: 4px; }
    .typing-dots span { width: 6px; height: 6px; border-radius: 50%; background: #7c5cfc; animation: dotBounce 1.2s infinite ease-in-out; }
    .typing-dots span:nth-child(2){animation-delay:0.15s} .typing-dots span:nth-child(3){animation-delay:0.3s}
    @keyframes dotBounce { 0%,60%,100%{transform:translateY(0);opacity:0.5} 30%{transform:translateY(-4px);opacity:1} }
    .reset-token-box {
      margin-top: 12px; padding: 12px; border-radius: 10px;
      background: rgba(45,212,191,0.08); border: 1px solid rgba(45,212,191,0.25);
      font-family: 'JetBrains Mono', monospace; font-size: 12px; color: #2dd4bf;
      word-break: break-all; text-align: left;
    }
  `}</style>
);

const AmbientBubbles = () => (
  <>
    <span className="bubble b1" /><span className="bubble b2" />
    <span className="bubble b3" /><span className="bubble b4" /><span className="bubble b5" />
  </>
);

// ── Main Join / Auth Component ────────────────────────────────────────────────
function Join({ onJoin, joinStatus, onRetry, onGoHome }) {
  const [tab, setTab] = useState('login'); // 'login' | 'register' | 'forgot' | 'reset'
  const [form, setForm] = useState({ username: '', email: '', password: '', confirmPassword: '', resetToken: '', newPassword: '' });
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');
  const [loading, setLoading] = useState(false);
  const [loggedInUser, setLoggedInUser] = useState(null);
  const [resetTokenDisplay, setResetTokenDisplay] = useState('');

  const set = (field) => (e) => { setForm((f) => ({ ...f, [field]: e.target.value })); setError(''); setSuccess(''); };

  const handleRegister = async (e) => {
    e.preventDefault();
    if (form.password !== form.confirmPassword) return setError('Passwords do not match');
    setLoading(true);
    try {
      const res = await fetch(`${SOCKET_URL}/api/auth/register`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ username: form.username, email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error);
      setSuccess('Account created! You can now log in.');
      setTab('login');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${SOCKET_URL}/api/auth/login`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email, password: form.password }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error);
      setLoggedInUser(data.username);
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  const handleForgot = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await fetch(`${SOCKET_URL}/api/auth/forgot-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: form.email }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error);
      setResetTokenDisplay(data.resetToken);
      setSuccess('Reset token generated. Copy it below and use it to reset your password.');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  const handleReset = async (e) => {
    e.preventDefault();
    if (form.newPassword !== form.confirmPassword) return setError('Passwords do not match');
    setLoading(true);
    try {
      const res = await fetch(`${SOCKET_URL}/api/auth/reset-password`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: form.resetToken, newPassword: form.newPassword }),
      });
      const data = await res.json();
      if (!res.ok) return setError(data.error);
      setSuccess('Password reset! You can now log in.');
      setTab('login'); setResetTokenDisplay('');
    } catch { setError('Network error'); }
    finally { setLoading(false); }
  };

  // ── Waiting / Rejected states ─────────────────────────────────────────────
  if (joinStatus === 'waiting') {
    return (
      <div className="join-container">
        <GlobalStyles /><AmbientBubbles />
        <div className="join-box">
          <div className="status-icon-wrap waiting"><span className="join-logo">⏳</span></div>
          <h2>Waiting for Approval</h2>
          <p className="join-sub">Your request has been sent to the room admin.</p>
          <div className="typing-dots"><span /><span /><span /></div>
          <br />
          <button className="home-btn" onClick={onGoHome}>🏠 Return to Home</button>
        </div>
      </div>
    );
  }

  if (joinStatus === 'rejected') {
    return (
      <div className="join-container">
        <GlobalStyles /><AmbientBubbles />
        <div className="join-box">
          <div className="status-icon-wrap rejected"><span className="join-logo">🚫</span></div>
          <h2>Request Denied</h2>
          <p className="join-sub">The admin declined your request.</p>
          <button className="retry-btn" onClick={onRetry}>Try Again</button>
          <br />
          <button className="home-btn" onClick={onGoHome}>🏠 Return to Home</button>
        </div>
      </div>
    );
  }

  // ── After login: go straight into the app (no room yet) ────────────────────
  if (loggedInUser) {
    onJoin(loggedInUser, null);
    return null;
  }

  // ── Auth forms ────────────────────────────────────────────────────────────
  return (
    <div className="join-container">
      <GlobalStyles /><AmbientBubbles />
      <div className="join-box">
        <div className="join-logo-wrap">
          <span className="join-logo">💬</span>
          <span className="live-dot" />
        </div>
        <h2>ChatApp</h2>

        {tab !== 'forgot' && tab !== 'reset' && (
          <div className="auth-tabs">
            <button className={`auth-tab ${tab === 'login' ? 'active' : ''}`} onClick={() => { setTab('login'); setError(''); setSuccess(''); }}>Sign In</button>
            <button className={`auth-tab ${tab === 'register' ? 'active' : ''}`} onClick={() => { setTab('register'); setError(''); setSuccess(''); }}>Register</button>
          </div>
        )}

        {error && <p className="auth-error">⚠ {error}</p>}
        {success && <p className="auth-success">✓ {success}</p>}

        {/* LOGIN */}
        {tab === 'login' && (
          <form onSubmit={handleLogin}>
            <div className="input-group">
              <label>EMAIL</label>
              <div className="field-wrap"><span className="field-icon">✉</span>
                <input type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
              </div>
            </div>
            <div className="input-group">
              <label>PASSWORD</label>
              <div className="field-wrap"><span className="field-icon">🔑</span>
                <input type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required />
              </div>
            </div>
            <button type="submit" disabled={loading}>{loading ? 'Signing in…' : 'Sign In →'}</button>
            <button type="button" className="auth-link" onClick={() => { setTab('forgot'); setError(''); setSuccess(''); }}>Forgot password?</button>
          </form>
        )}

        {/* REGISTER */}
        {tab === 'register' && (
          <form onSubmit={handleRegister}>
            <div className="input-group">
              <label>USERNAME</label>
              <div className="field-wrap"><span className="field-icon">👤</span>
                <input placeholder="e.g. John" value={form.username} onChange={set('username')} required />
              </div>
            </div>
            <div className="input-group">
              <label>EMAIL</label>
              <div className="field-wrap"><span className="field-icon">✉</span>
                <input type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
              </div>
            </div>
            <div className="input-group">
              <label>PASSWORD</label>
              <div className="field-wrap"><span className="field-icon">🔑</span>
                <input type="password" placeholder="••••••••" value={form.password} onChange={set('password')} required />
              </div>
            </div>
            <div className="input-group">
              <label>CONFIRM PASSWORD</label>
              <div className="field-wrap"><span className="field-icon">🔑</span>
                <input type="password" placeholder="••••••••" value={form.confirmPassword} onChange={set('confirmPassword')} required />
              </div>
            </div>
            <button type="submit" disabled={loading}>{loading ? 'Creating…' : 'Create Account →'}</button>
          </form>
        )}

        {/* FORGOT PASSWORD */}
        {tab === 'forgot' && (
          <form onSubmit={handleForgot}>
            <p className="join-sub" style={{ marginBottom: 16 }}>Enter your email to get a reset token</p>
            <div className="input-group">
              <label>EMAIL</label>
              <div className="field-wrap"><span className="field-icon">✉</span>
                <input type="email" placeholder="you@example.com" value={form.email} onChange={set('email')} required />
              </div>
            </div>
            <button type="submit" disabled={loading}>{loading ? 'Sending…' : 'Get Reset Token →'}</button>
            {resetTokenDisplay && (
              <>
                <div className="reset-token-box">{resetTokenDisplay}</div>
                <button type="button" className="auth-link" onClick={() => { setTab('reset'); setError(''); setSuccess(''); }}>Use this token to reset password →</button>
              </>
            )}
            <button type="button" className="auth-link" onClick={() => { setTab('login'); setError(''); setSuccess(''); }}>← Back to Sign In</button>
          </form>
        )}

        {/* RESET PASSWORD */}
        {tab === 'reset' && (
          <form onSubmit={handleReset}>
            <p className="join-sub" style={{ marginBottom: 16 }}>Enter your reset token and new password</p>
            <div className="input-group">
              <label>RESET TOKEN</label>
              <div className="field-wrap"><span className="field-icon">🔐</span>
                <input placeholder="Paste token here" value={form.resetToken} onChange={set('resetToken')} required />
              </div>
            </div>
            <div className="input-group">
              <label>NEW PASSWORD</label>
              <div className="field-wrap"><span className="field-icon">🔑</span>
                <input type="password" placeholder="••••••••" value={form.newPassword} onChange={set('newPassword')} required />
              </div>
            </div>
            <div className="input-group">
              <label>CONFIRM PASSWORD</label>
              <div className="field-wrap"><span className="field-icon">🔑</span>
                <input type="password" placeholder="••••••••" value={form.confirmPassword} onChange={set('confirmPassword')} required />
              </div>
            </div>
            <button type="submit" disabled={loading}>{loading ? 'Resetting…' : 'Reset Password →'}</button>
            <button type="button" className="auth-link" onClick={() => { setTab('login'); setError(''); setSuccess(''); }}>← Back to Sign In</button>
          </form>
        )}
      </div>
    </div>
  );
}

export default Join;
