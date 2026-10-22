import React, { createContext, useContext, useState, useEffect } from 'react';
import { User } from '../types/index.js';
import { api } from '../services/api.js';
import { getSocket } from '../services/socket.js';

interface AuthContextType {
  user: User | null;
  token: string | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
  quickDemoLogin: (type: 'CITIZEN' | 'SENIOR' | 'OFFICER' | 'ADMIN') => Promise<void>;
}

const AuthContext = createContext<AuthContextType>({
  user: null,
  token: null,
  isAuthenticated: false,
  isLoading: true,
  login: () => {},
  logout: () => {},
  quickDemoLogin: async () => {},
});

export const AuthProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [user, setUser] = useState<User | null>(null);
  const [token, setToken] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);

  useEffect(() => {
    const savedToken = localStorage.getItem('sampada_token');
    const savedUser = localStorage.getItem('sampada_user');

    if (savedToken && savedUser) {
      try {
        const parsed = JSON.parse(savedUser) as User;
        setToken(savedToken);
        setUser(parsed);

        // Join socket room
        const socket = getSocket();
        socket.emit('join', { userId: parsed.id, role: parsed.role });
      } catch (e) {
        localStorage.removeItem('sampada_token');
        localStorage.removeItem('sampada_user');
      }
    }
    setIsLoading(false);
  }, []);

  const login = (newToken: string, newUser: User) => {
    localStorage.setItem('sampada_token', newToken);
    localStorage.setItem('sampada_user', JSON.stringify(newUser));
    setToken(newToken);
    setUser(newUser);

    const socket = getSocket();
    socket.emit('join', { userId: newUser.id, role: newUser.role });
  };

  const logout = () => {
    if (user) {
      const socket = getSocket();
      socket.emit('leave', { userId: user.id, role: user.role });
    }
    localStorage.removeItem('sampada_token');
    localStorage.removeItem('sampada_user');
    setToken(null);
    setUser(null);
    window.location.href = '/';
  };

  const quickDemoLogin = async (type: 'CITIZEN' | 'SENIOR' | 'OFFICER' | 'ADMIN') => {
    let identifier = '';
    let password = '';

    if (type === 'CITIZEN') {
      identifier = 'citizen.rajesh@gmail.com';
      password = 'CitizenPassword@123';
    } else if (type === 'SENIOR') {
      identifier = 'senior.shrimati@gmail.com';
      password = 'CitizenPassword@123';
    } else if (type === 'OFFICER') {
      identifier = 'officer.sharma@sampadakar.gov.in';
      password = 'OfficerPassword@123';
    } else if (type === 'ADMIN') {
      identifier = 'admin@sampadakar.gov.in';
      password = 'AdminPassword@123';
    }

    const res = await api.post('/auth/login', { identifier, password });
    if (res.data?.success) {
      login(res.data.token, res.data.user);
    }
  };

  return (
    <AuthContext.Provider
      value={{
        user,
        token,
        isAuthenticated: !!user,
        isLoading,
        login,
        logout,
        quickDemoLogin,
      }}
    >
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
