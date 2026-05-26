import React from 'react';
import { Bell, MessageSquare, Mail, AlertCircle, Check, ShieldCheck } from 'lucide-react';
import { useAuth } from '../contexts/AuthContext';

export const NotificationPanel = ({ isOpen, onClose }) => {
  const { notifications, markNotificationRead } = useAuth();

  if (!isOpen) return null;

  const getIcon = (type) => {
    switch (type) {
      case 'SMS':
        return <MessageSquare size={16} style={{ color: 'var(--accent-secondary)' }} />;
      case 'Email':
        return <Mail size={16} style={{ color: 'var(--accent-primary)' }} />;
      default:
        return <Bell size={16} style={{ color: 'var(--accent-success)' }} />;
    }
  };

  const getChannelBadge = (type) => {
    switch (type) {
      case 'SMS':
        return <span style={{ fontSize: '9px', background: 'rgba(6, 182, 212, 0.12)', color: 'var(--accent-secondary)', padding: '2px 6px', borderRadius: '4px', fontWeight:'600' }}>SMS</span>;
      case 'Email':
        return <span style={{ fontSize: '9px', background: 'rgba(99, 102, 241, 0.12)', color: 'var(--accent-primary)', padding: '2px 6px', borderRadius: '4px', fontWeight:'600' }}>EMAIL</span>;
      default:
        return <span style={{ fontSize: '9px', background: 'rgba(16, 185, 129, 0.12)', color: 'var(--accent-success)', padding: '2px 6px', borderRadius: '4px', fontWeight:'600' }}>ALERT</span>;
    }
  };

  return (
    <div 
      className="glass-panel animate-fade-in" 
      style={{
        position: 'absolute',
        top: '65px',
        right: '20px',
        width: '320px',
        maxHeight: '400px',
        overflowY: 'auto',
        zIndex: 1000,
        padding: '16px',
        boxShadow: '0 10px 40px rgba(0,0,0,0.5)',
        border: '1px solid rgba(255, 255, 255, 0.08)'
      }}
    >
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '12px', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '8px' }}>
        <h4 style={{ fontSize: '15px', color: 'var(--text-primary)', fontFamily:'var(--font-title)', display:'flex', alignItems:'center', gap:'6px' }}>
          <Bell size={16} /> Notification Center
        </h4>
        <span style={{ fontSize: '11px', color: 'var(--text-muted)' }}>
          {notifications.filter(n => !n.isRead).length} unread
        </span>
      </div>

      <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
        {notifications.length > 0 ? (
          notifications.map(n => (
            <div 
              key={n.id} 
              onClick={() => !n.isRead && markNotificationRead(n.id)}
              style={{
                padding: '10px',
                borderRadius: 'var(--radius-sm)',
                background: n.isRead ? 'rgba(255,255,255,0.01)' : 'rgba(99, 102, 241, 0.05)',
                border: n.isRead ? '1px dashed rgba(255,255,255,0.03)' : '1px solid rgba(99, 102, 241, 0.15)',
                cursor: n.isRead ? 'default' : 'pointer',
                transition: 'var(--transition-smooth)',
                position: 'relative'
              }}
              className={!n.isRead ? 'glass-panel-hover' : ''}
            >
              {/* Glow Dot */}
              {!n.isRead && (
                <span style={{
                  position: 'absolute',
                  top: '10px',
                  right: '10px',
                  width: '6px',
                  height: '6px',
                  background: 'var(--accent-primary)',
                  borderRadius: '50%',
                  boxShadow: '0 0 8px var(--accent-primary)'
                }}></span>
              )}

              <div style={{ display: 'flex', gap: '8px', alignItems: 'center', marginBottom: '4px' }}>
                {getIcon(n.type)}
                <span style={{ fontSize: '12px', fontWeight: '700', color: 'var(--text-primary)' }}>{n.title}</span>
              </div>
              <p style={{ fontSize: '11px', color: 'var(--text-secondary)', wordBreak: 'break-word', marginBottom: '6px' }}>
                {n.message}
              </p>
              <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
                {getChannelBadge(n.type)}
                <span style={{ fontSize: '9px', color: 'var(--text-muted)' }}>
                  {new Date(n.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                </span>
              </div>
            </div>
          ))
        ) : (
          <div style={{ padding: '20px', textAlign: 'center', color: 'var(--text-muted)', fontSize: '12px' }}>
            Your inbox is completely clear!
          </div>
        )}
      </div>
    </div>
  );
};
