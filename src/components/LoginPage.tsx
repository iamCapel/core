import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import * as firebaseUserStorage from '../services/firebaseUserStorage';
import mopcLogo from '../logo.svg';

const LoginPage: React.FC = () => {
  const [username, setUsername] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setLoading(true);
    
    try {
      const result = await firebaseUserStorage.loginWithUsername(username, password);
      
      if (result.success && result.user) {
        // Guardar información del usuario en localStorage para sesión
        localStorage.setItem('currentUser', JSON.stringify(result.user));
        
        // Redirigir al Dashboard si el login es exitoso
        navigate('/dashboard');
      } else {
        setError(result.error || 'Usuario o contraseña incorrectos');
      }
    } catch (err: any) {
      setError('Error de conexión o credenciales inválidas');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="login-container">
      <img src={mopcLogo} alt="MOPC Logo" className="login-logo" />
      <h2>Iniciar Sesión</h2>
      <form onSubmit={handleSubmit} style={{ marginTop: 20 }}>
        <input
          type="text"
          placeholder="Usuario"
          value={username}
          onChange={e => setUsername(e.target.value)}
          required
          disabled={loading}
          style={{ display: 'block', margin: '10px auto', padding: '8px', width: '80%' }}
        />
        <input
          type="password"
          placeholder="Contraseña"
          value={password}
          onChange={e => setPassword(e.target.value)}
          required
          disabled={loading}
          style={{ display: 'block', margin: '10px auto', padding: '8px', width: '80%' }}
        />
        <button type="submit" disabled={loading} style={{ marginTop: 10, padding: '8px 24px' }}>
          {loading ? 'Iniciando sesión...' : 'Entrar'}
        </button>
        {error && <div style={{ color: 'red', marginTop: 10 }}>{error}</div>}
      </form>
      <div style={{ marginTop: '24px', textAlign: 'center', color: '#555', fontSize: '0.95rem' }}>
        ¿Olvidaste tu contraseña? | <span style={{ color: '#222', fontWeight: 'bold' }}>¿Tienes código de administrador?</span>
      </div>
    </div>
  );
};

export default LoginPage;
