import { createContext, useContext, useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import api from '../api/axiosConfig'; // Sesuaikan path ini dengan settingan Axios/Fetch API kamu

const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const navigate = useNavigate();
  const [user, setUser] = useState(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true); 

  useEffect(() => {
    const checkAuth = () => {
      try {
        const token = localStorage.getItem('token');
        const userDataStr = localStorage.getItem('user');

        if (token && userDataStr) {
          const userData = JSON.parse(userDataStr);
          setUser(userData);
          setIsAuthenticated(true);
        } else {
          setUser(null);
          setIsAuthenticated(false);
        }
      } catch (error) {
        console.error("Gagal membaca data dari localStorage:", error);
        localStorage.removeItem('token');
        localStorage.removeItem('user');
        localStorage.removeItem('role');
      } finally {
        setLoading(false);
      }
    };

    checkAuth();
  }, []);

  const login = (token, userData) => {
    localStorage.setItem('token', token);
    localStorage.setItem('user', JSON.stringify(userData));
    
    if (userData?.role) {
      localStorage.setItem('role', userData.role);
    }
    
    setUser(userData);
    setIsAuthenticated(true);
    navigate('/dashboard'); 
  };

  // PEMBARUAN DI SINI
  const logout = async () => {
    try {
      // 1. Tembak API Backend supaya tercatat di Logger & is_login jadi 0
      // Gunakan token dari localStorage untuk header Authorization
      const token = localStorage.getItem('token');
      if (token) {
        await api.post('/api/auth/logout', {}, {
          headers: { Authorization: `Bearer ${token}` }
        });
      }
    } catch (error) {
      console.error("Gagal memberitahu server saat logout:", error);
      // Biarkan tetap lanjut menghapus local storage walau error (misal internet putus)
    } finally {
      // 2. Bersihkan Karcis di Frontend
      localStorage.removeItem('token');
      localStorage.removeItem('user');
      localStorage.removeItem('role'); 
      
      setUser(null);
      setIsAuthenticated(false);
      navigate('/login', { replace: true }); 
    }
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);