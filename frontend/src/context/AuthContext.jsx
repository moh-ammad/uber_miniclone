import { createContext, useContext, useState, useEffect } from 'react';
import api from '../lib/axios';
import { initSocket, disconnectSocket } from '../lib/socket';

const AuthContext = createContext();

export const useAuth = () => useContext(AuthContext);

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const token = sessionStorage.getItem('token');
    if (token) {
      loadUser();
    } else {
      setLoading(false);
    }
  }, []);

  const loadUser = async () => {
    try {
      const { data } = await api.get('/api/auth/profile');
      setUser(data.user);
      initSocket(data.user.id);
    } catch (error) {
      sessionStorage.removeItem('token');
    } finally {
      setLoading(false);
    }
  };

  const login = async (email, password) => {
    const { data } = await api.post('/api/auth/login', { email, password });
    sessionStorage.setItem('token', data.token);
    setUser(data.user);
    initSocket(data.user.id);
    return data.user;
  };

  const register = async (userData) => {
    const { data } = await api.post('/api/auth/register', userData);
    sessionStorage.setItem('token', data.token);
    setUser(data.user);
    initSocket(data.user.id);
    return data.user;
  };

  const logout = () => {
    sessionStorage.removeItem('token');
    setUser(null);
    disconnectSocket();
  };

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout }}>
      {children}
    </AuthContext.Provider>
  );
};
