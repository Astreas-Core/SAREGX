import React, { useState } from 'react';
import { 
  signInWithEmailAndPassword, 
  createUserWithEmailAndPassword, 
  updateProfile,
  GoogleAuthProvider,
  signInWithPopup
} from 'firebase/auth';
import { auth } from '../firebase';
import { Disc3, Music, PlayCircle, Eye, EyeOff } from 'lucide-react';

export default function Login() {
  const [isLogin, setIsLogin] = useState(true);
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [username, setUsername] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');
    
    if (!isLogin && password !== confirmPassword) {
      return setError('Passwords do not match');
    }

    setLoading(true);

    try {
      if (isLogin) {
        await signInWithEmailAndPassword(auth, email, password);
      } else {
        const userCredential = await createUserWithEmailAndPassword(auth, email, password);
        await updateProfile(userCredential.user, {
          displayName: username
        });
      }
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setError('');
    setLoading(true);
    const provider = new GoogleAuthProvider();
    try {
      await signInWithPopup(auth, provider);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      
      {/* LEFT SIDE - CREATIVE BRANDING */}
      <div className="login-left">
        
        {/* Decorative Background Elements */}
        <div style={{
          position: 'absolute',
          top: '-10%', left: '-10%',
          width: '500px', height: '500px',
          background: 'radial-gradient(circle, rgba(200, 160, 224, 0.1) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }}></div>
        
        <div style={{
          position: 'absolute',
          bottom: '-20%', right: '-10%',
          width: '600px', height: '600px',
          background: 'radial-gradient(circle, rgba(var(--accent-rgb), 0.15) 0%, transparent 70%)',
          borderRadius: '50%',
          pointerEvents: 'none'
        }}></div>

        {/* Floating Icons Art */}
        <div style={{ position: 'absolute', top: '15%', right: '15%', opacity: 0.15, transform: 'rotate(15deg)' }}>
          <Music size={120} color="var(--accent-pink)" />
        </div>
        <div style={{ position: 'absolute', bottom: '20%', left: '10%', opacity: 0.15, transform: 'rotate(-20deg)' }}>
          <Disc3 size={180} color="var(--accent)" />
        </div>
        <div style={{ position: 'absolute', top: '40%', right: '25%', opacity: 0.1 }}>
          <PlayCircle size={80} color="white" />
        </div>

        <div style={{ position: 'relative', zIndex: 1, maxWidth: '440px' }}>
          <h1 style={{ fontSize: '3.5rem', fontWeight: 800, letterSpacing: '-0.03em', lineHeight: 1.1, marginBottom: '24px' }}>
            Listen to <br/>
            <span style={{ 
              background: 'linear-gradient(to right, #ffffff, var(--accent-pink))',
              WebkitBackgroundClip: 'text',
              WebkitTextFillColor: 'transparent'
            }}>everything.</span>
          </h1>
          <p style={{ 
            fontSize: '1.15rem', 
            color: 'rgba(255, 255, 255, 0.95)', 
            lineHeight: 1.6,
            textShadow: '0 2px 10px rgba(0,0,0,0.5)',
            fontWeight: 500
          }}>
            Join Saregx to access millions of tracks, build your ultimate library, and experience music streaming with flawless real-time playback.
          </p>
        </div>
      </div>

      {/* RIGHT SIDE - FORM */}
      <div className="login-right">
        
        <h2 style={{ marginBottom: '8px', fontWeight: 700, fontSize: '2rem', letterSpacing: '-0.02em', color: 'white' }}>
          {isLogin ? 'Welcome back' : 'Create an account'}
        </h2>
        <p style={{ color: 'var(--text-muted)', marginBottom: '32px', fontSize: '0.95rem' }}>
          {isLogin ? 'Log in to access your music library.' : 'Sign up for free unlimited streaming.'}
        </p>
        
        {error && (
          <div style={{ 
            background: 'rgba(255, 60, 60, 0.1)', 
            border: '1px solid rgba(255, 60, 60, 0.3)',
            color: '#ff6b6b', 
            padding: '12px',
            borderRadius: '8px',
            marginBottom: '24px', 
            fontSize: '0.85rem'
          }}>
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
          {!isLogin && (
            <input 
              type="text" 
              placeholder="Username" 
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              style={inputStyle}
              required 
            />
          )}
          <input 
            type="email" 
            placeholder="Email address" 
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            style={inputStyle}
            required 
          />
          
          {/* Password Field */}
          <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
            <input 
              type={showPassword ? "text" : "password"} 
              placeholder="Password" 
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              style={{ ...inputStyle, width: '100%', paddingRight: '48px' }}
              required 
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              style={eyeButtonStyle}
              title={showPassword ? "Hide password" : "Show password"}
            >
              {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
            </button>
          </div>

          {/* Confirm Password Field (Only for Sign Up) */}
          {!isLogin && (
            <div style={{ position: 'relative', display: 'flex', alignItems: 'center' }}>
              <input 
                type={showPassword ? "text" : "password"} 
                placeholder="Confirm Password" 
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                style={{ ...inputStyle, width: '100%', paddingRight: '48px' }}
                required 
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                style={eyeButtonStyle}
              >
                {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
              </button>
            </div>
          )}
          
          <button 
            type="submit" 
            className="btn-cta" 
            style={{ width: '100%', marginTop: '12px', padding: '16px', fontSize: '1.05rem' }}
            disabled={loading}
          >
            {loading ? 'Processing...' : (isLogin ? 'Sign In' : 'Sign Up')}
          </button>
        </form>

        <div style={{ display: 'flex', alignItems: 'center', margin: '32px 0', gap: '12px' }}>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
          <span style={{ color: 'var(--text-muted)', fontSize: '0.8rem', fontWeight: 500, textTransform: 'uppercase' }}>or</span>
          <div style={{ flex: 1, height: '1px', background: 'rgba(255,255,255,0.1)' }}></div>
        </div>

        <button 
          onClick={handleGoogleSignIn}
          disabled={loading}
          style={{ 
            width: '100%', 
            padding: '14px', 
            background: 'rgba(255,255,255,0.05)', 
            border: '1px solid rgba(255,255,255,0.1)',
            borderRadius: '999px',
            color: 'white',
            fontSize: '1rem',
            fontWeight: 500,
            cursor: 'pointer',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            gap: '12px',
            transition: 'background 0.2s'
          }}
          onMouseEnter={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.1)'}
          onMouseLeave={(e) => e.currentTarget.style.background = 'rgba(255,255,255,0.05)'}
        >
          <svg viewBox="0 0 24 24" width="20" height="20">
            <path d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z" fill="#4285F4"/>
            <path d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z" fill="#34A853"/>
            <path d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z" fill="#FBBC05"/>
            <path d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z" fill="#EA4335"/>
          </svg>
          Continue with Google
        </button>

        <p style={{ marginTop: '32px', color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center' }}>
          {isLogin ? "Don't have an account? " : "Already have an account? "}
          <button 
            type="button"
            onClick={() => { 
              setIsLogin(!isLogin); 
              setError(''); 
              setPassword('');
              setConfirmPassword('');
            }} 
            style={{ background: 'none', border: 'none', color: 'var(--accent-pink)', cursor: 'pointer', fontWeight: 600, padding: 0 }}
          >
            {isLogin ? 'Sign up' : 'Sign in'}
          </button>
        </p>
      </div>
    </div>
  );
}

const inputStyle = {
  padding: '16px', 
  borderRadius: '12px', 
  border: '1px solid rgba(255,255,255,0.1)', 
  background: 'rgba(0,0,0,0.3)', 
  color: 'white',
  outline: 'none',
  fontSize: '1rem',
  transition: 'border-color 0.2s, background 0.2s'
};

const eyeButtonStyle = {
  position: 'absolute',
  right: '16px',
  background: 'none',
  border: 'none',
  color: 'var(--text-muted)',
  cursor: 'pointer',
  padding: 0,
  display: 'flex',
  alignItems: 'center',
  justifyContent: 'center',
};
