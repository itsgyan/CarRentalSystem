import React, { createContext, useContext, useState, useEffect } from 'react';

const AuthContext = createContext();

const API_BASE = 'http://localhost:5000/api';

export const AuthProvider = ({ children }) => {
  const [user, setUser] = useState(null);
  const [loading, setLoading] = useState(true);
  const [notifications, setNotifications] = useState([]);

  // Load user from localStorage on start
  useEffect(() => {
    const initializeAuth = async () => {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        try {
          const res = await fetch(`${API_BASE}/auth/profile`, {
            headers: {
              'Authorization': `Bearer ${storedToken}`
            }
          });
          const result = await res.json();
          if (result.success) {
            setUser({ ...result.data, token: storedToken });
            await fetchNotifications(storedToken);
          } else {
            // Token invalid/expired
            localStorage.removeItem('token');
          }
        } catch (error) {
          console.error('Failed to sync authentication profile:', error);
        }
      }
      setLoading(false);
    };

    initializeAuth();
  }, []);

  const fetchNotifications = async (token) => {
    try {
      const res = await fetch(`${API_BASE}/notifications`, {
        headers: {
          'Authorization': `Bearer ${token}`
        }
      });
      const result = await res.json();
      if (result.success) {
        setNotifications(result.data);
      }
    } catch (error) {
      console.error('Failed to fetch user notifications:', error);
    }
  };

  const login = async (email, password) => {
    try {
      const res = await fetch(`${API_BASE}/auth/login`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, password })
      });
      const result = await res.json();
      
      if (result.success) {
        localStorage.setItem('token', result.data.token);
        setUser(result.data);
        await fetchNotifications(result.data.token);
        return { success: true };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      return { success: false, message: 'Server unreachable. Please try again.' };
    }
  };

  const register = async (name, email, password, phone) => {
    try {
      const res = await fetch(`${API_BASE}/auth/register`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ name, email, password, phone })
      });
      const result = await res.json();

      if (result.success) {
        localStorage.setItem('token', result.data.token);
        setUser(result.data);
        await fetchNotifications(result.data.token);
        return { success: true };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      return { success: false, message: 'Registration failed. Server unreachable.' };
    }
  };

  const logout = () => {
    localStorage.removeItem('token');
    setUser(null);
    setNotifications([]);
  };

  const uploadLicense = async (file) => {
    if (!user) return { success: false, message: 'Must be logged in to upload license.' };
    
    const formData = new FormData();
    formData.append('license', file);

    try {
      const res = await fetch(`${API_BASE}/auth/upload-license`, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${user.token}`
        },
        body: formData
      });
      const result = await res.json();

      if (result.success) {
        // Sync local user states
        const updatedUser = { 
          ...user, 
          drivingLicenseUrl: result.data.drivingLicenseUrl,
          isVerified: result.data.isVerified
        };
        setUser(updatedUser);
        await fetchNotifications(user.token);
        return { success: true, data: result.data };
      } else {
        return { success: false, message: result.message };
      }
    } catch (error) {
      console.error('License upload failed:', error);
      return { success: false, message: 'Upload failed. Check your file size/extension.' };
    }
  };

  const forgotPassword = async (email) => {
    try {
      const res = await fetch(`${API_BASE}/auth/forgot-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email })
      });
      const result = await res.json();
      return result;
    } catch (error) {
      return { success: false, message: 'Server error. Please try again.' };
    }
  };

  const resetPassword = async (email, token, newPassword) => {
    try {
      const res = await fetch(`${API_BASE}/auth/reset-password`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ email, token, newPassword })
      });
      const result = await res.json();
      return result;
    } catch (error) {
      return { success: false, message: 'Server error. Please try again.' };
    }
  };

  const refreshNotifications = () => {
    if (user && user.token) {
      fetchNotifications(user.token);
    }
  };

  const markNotificationRead = async (id) => {
    if (!user) return;
    try {
      const res = await fetch(`${API_BASE}/notifications/${id}/read`, {
        method: 'PUT',
        headers: {
          'Authorization': `Bearer ${user.token}`
        }
      });
      const result = await res.json();
      if (result.success) {
        setNotifications(prev => prev.map(n => n.id === id ? { ...n, isRead: true } : n));
      }
    } catch (error) {
      console.error('Failed to mark notification read:', error);
    }
  };

  return (
    <AuthContext.Provider value={{
      user,
      loading,
      notifications,
      login,
      register,
      logout,
      uploadLicense,
      forgotPassword,
      resetPassword,
      refreshNotifications,
      markNotificationRead
    }}>
      {children}
    </AuthContext.Provider>
  );
};

export const useAuth = () => useContext(AuthContext);
