import React, { useState, useEffect, useRef } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { 
  LayoutDashboard, 
  Users, 
  UserCircle, 
  Bell, 
  LogOut, 
  Plus, 
  Menu, 
  X,
  CreditCard,
  Settings,
  Check
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../../context/AuthContext';
import { useSocket } from '../../context/SocketContext';
import { API_URL as API_BASE_URL } from '../../config';

const NavItem = ({ to, icon: Icon, label, active, onClick }) => (
  <Link 
    to={to} 
    onClick={onClick}
    className={`flex items-center gap-3 px-4 py-3 rounded-2xl transition-all duration-300 group ${
      active 
        ? 'bg-emerald-500/10 text-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.1)]' 
        : 'text-slate-400 hover:bg-white/5 hover:text-white'
    }`}
  >
    <Icon size={22} className={`${active ? 'text-emerald-500' : 'group-hover:text-white transition-colors'}`} />
    <span className="font-medium">{label}</span>
    {active && (
      <motion.div 
        layoutId="active-pill"
        className="ml-auto w-1.5 h-1.5 rounded-full bg-emerald-500"
      />
    )}
  </Link>
);

export default function PremiumShell({ children }) {
  const { user, token, logout } = useAuth();
  const socket = useSocket();
  const location = useLocation();
  const navigate = useNavigate();
  
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [notifications, setNotifications] = useState([]);
  const [isNotifDropdownOpen, setIsNotifDropdownOpen] = useState(false);
  const dropdownRef = useRef(null);

  const unreadCount = notifications.filter(n => !n.isRead).length;

  const navigation = [
    { to: '/dashboard', icon: LayoutDashboard, label: 'Dashboard' },
    { to: '/groups', icon: Users, label: 'Groups' },
    { to: '/friends', icon: UserCircle, label: 'Friends' },
    { to: '/profile', icon: Settings, label: 'Settings' },
  ];

  const fetchNotifications = async () => {
    if (!token) return;
    try {
      const response = await fetch(`${API_BASE_URL}/users/notifications?limit=30`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      const data = await response.json();
      if (response.ok) {
        setNotifications(data.notifications || []);
      }
    } catch (error) {
      console.error('Failed to fetch notifications:', error);
    }
  };

  useEffect(() => {
    fetchNotifications();
  }, [token]);

  useEffect(() => {
    if (socket && user?._id) {
      socket.emit('joinUserRoom', user._id);
      
      const handleNewNotification = () => {
        fetchNotifications();
      };
      
      socket.on('newNotification', handleNewNotification);
      
      return () => {
        socket.off('newNotification', handleNewNotification);
      };
    }
  }, [socket, user?._id]);

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsNotifDropdownOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const handleLogout = () => {
    logout();
    navigate('/login');
  };

  const handleMarkAsRead = async (id) => {
    try {
      await fetch(`${API_BASE_URL}/users/notifications/${id}/read`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => n._id === id ? { ...n, isRead: true } : n));
    } catch (error) {
      console.error('Error marking as read:', error);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      await fetch(`${API_BASE_URL}/users/notifications/read-all`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }
      });
      setNotifications(prev => prev.map(n => ({ ...n, isRead: true })));
    } catch (error) {
      console.error('Error marking all as read:', error);
    }
  };

  const handleNotificationClick = (notif) => {
    if (!notif.isRead) {
      handleMarkAsRead(notif._id);
    }
    setIsNotifDropdownOpen(false);
    if (notif.link) {
      navigate(notif.link);
    }
  };

  return (
    <div className="flex min-h-screen bg-[#050505] text-white font-sans selection:bg-emerald-500/30">
      {/* Sidebar - Desktop */}
      <aside className="fixed left-0 top-0 hidden h-full w-72 border-r border-white/5 bg-[#080808] p-6 lg:block">
        <div className="mb-10 flex items-center gap-3 px-2">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-gradient-to-br from-emerald-400 to-emerald-600 shadow-lg shadow-emerald-500/20">
            <CreditCard className="text-white" size={20} />
          </div>
          <span className="text-xl font-bold tracking-tight text-white font-outfit">VibeSplit</span>
        </div>

        <nav className="flex flex-col gap-2">
          {navigation.map((item) => (
            <NavItem 
              key={item.to} 
              {...item} 
              active={location.pathname === item.to}
            />
          ))}
        </nav>

        <div className="absolute bottom-8 left-6 right-6">
          <button 
            onClick={handleLogout}
            className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-slate-400 transition-colors hover:bg-red-500/10 hover:text-red-500"
          >
            <LogOut size={22} />
            <span className="font-medium">Logout</span>
          </button>
          
          <div className="mt-6 flex items-center gap-3 rounded-3xl bg-white/5 p-3 pr-4 ring-1 ring-white/10">
            <div className="h-10 w-10 overflow-hidden rounded-2xl bg-gradient-to-tr from-slate-700 to-slate-600">
              <img 
                src={user?.avatar || `https://api.dicebear.com/7.x/avataaars/svg?seed=${user?.name || 'User'}`} 
                alt="Avatar"
                className="h-full w-full object-cover"
              />
            </div>
            <div className="flex flex-col overflow-hidden">
              <span className="truncate text-sm font-semibold">{user?.name || 'Guest User'}</span>
            </div>
          </div>
        </div>
      </aside>

      {/* Main Content Area */}
      <div className="flex-1 lg:pl-72">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-20 items-center justify-between bg-[#050505]/80 px-6 backdrop-blur-xl lg:px-10">
          <button 
            className="lg:hidden"
            onClick={() => setIsMobileMenuOpen(true)}
          >
            <Menu size={24} />
          </button>

          <div className="hidden lg:block">
            <h2 className="text-sm font-medium text-slate-500">Welcome back,</h2>
            <p className="text-lg font-bold font-outfit">{user?.name || 'Guest'}</p>
          </div>

          <div className="flex items-center gap-4 relative" ref={dropdownRef}>
            <button 
              onClick={() => setIsNotifDropdownOpen(!isNotifDropdownOpen)}
              className="relative flex h-10 w-10 items-center justify-center rounded-xl bg-white/5 text-slate-400 transition-all hover:bg-white/10 hover:text-white hover:scale-105 active:scale-95"
            >
              <Bell size={20} />
              {unreadCount > 0 && (
                <span className="absolute right-3 top-3 h-2 w-2 rounded-full bg-emerald-500 ring-2 ring-[#050505]" />
              )}
            </button>

            {/* Notification Dropdown */}
            <AnimatePresence>
              {isNotifDropdownOpen && (
                <motion.div
                  initial={{ opacity: 0, y: 10, scale: 0.95 }}
                  animate={{ opacity: 1, y: 0, scale: 1 }}
                  exit={{ opacity: 0, y: 10, scale: 0.95 }}
                  transition={{ duration: 0.2 }}
                  className="absolute right-0 top-14 w-80 overflow-hidden rounded-[2rem] border border-white/10 bg-[#0A0A0A] shadow-2xl shadow-black/50 overflow-y-auto max-h-[400px]"
                >
                  <div className="flex items-center justify-between border-b border-white/5 p-5 bg-white/[0.02]">
                    <h3 className="text-sm font-bold uppercase tracking-widest text-slate-300">Notifications</h3>
                    {unreadCount > 0 && (
                      <button 
                        onClick={handleMarkAllAsRead}
                        className="text-[10px] font-black uppercase tracking-widest text-emerald-500 hover:text-emerald-400 transition-colors"
                      >
                        Mark all as read
                      </button>
                    )}
                  </div>

                  <div className="divide-y divide-white/[0.03]">
                    {notifications.length === 0 ? (
                      <div className="p-8 text-center">
                        <Bell className="mx-auto text-slate-800" size={32} />
                        <p className="mt-3 text-xs font-medium text-slate-600">No notifications yet.</p>
                      </div>
                    ) : (
                      notifications.map((notif) => (
                        <button
                          key={notif._id}
                          onClick={() => handleNotificationClick(notif)}
                          className={`flex w-full flex-col gap-1 p-5 text-left transition-colors ${notif.isRead ? 'bg-transparent text-slate-400' : 'bg-emerald-500/5 text-white'}`}
                        >
                          <p className={`text-sm ${notif.isRead ? 'font-medium' : 'font-bold'}`}>{notif.message}</p>
                          <span className="text-[10px] font-medium text-slate-600">
                            {new Date(notif.createdAt).toLocaleDateString()} at {new Date(notif.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </button>
                      ))
                    )}
                  </div>
                </motion.div>
              )}
            </AnimatePresence>
          </div>
        </header>

        {/* Page Content */}
        <main className="w-full px-4 sm:px-6 md:px-8 py-6 lg:py-10">
          <motion.div
            initial={{ opacity: 0, y: 10 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.4 }}
          >
            {children}
          </motion.div>
        </main>
      </div>

      {/* Mobile Menu Overlay */}
      <AnimatePresence>
        {isMobileMenuOpen && (
          <>
            <motion.div 
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => setIsMobileMenuOpen(false)}
              className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm lg:hidden"
            />
            <motion.div
              initial={{ x: '-100%' }}
              animate={{ x: 0 }}
              exit={{ x: '-100%' }}
              transition={{ type: 'spring', damping: 25, stiffness: 200 }}
              className="fixed inset-y-0 left-0 z-50 w-full max-w-xs bg-[#080808] p-6 shadow-2xl lg:hidden"
            >
              <div className="flex items-center justify-between mb-10 px-2">
                 <div className="flex items-center gap-3">
                  <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-emerald-500">
                    <CreditCard size={20} className="text-black" />
                  </div>
                  <span className="text-xl font-bold font-outfit">VibeSplit</span>
                </div>
                <button onClick={() => setIsMobileMenuOpen(false)}>
                  <X size={24} />
                </button>
              </div>

              <nav className="flex flex-col gap-2">
                {navigation.map((item) => (
                  <NavItem 
                    key={item.to} 
                    {...item} 
                    active={location.pathname === item.to}
                    onClick={() => setIsMobileMenuOpen(false)}
                  />
                ))}
              </nav>

              <div className="absolute bottom-10 left-6 right-6">
                <button 
                  onClick={handleLogout}
                  className="flex w-full items-center gap-3 rounded-2xl px-4 py-3 text-slate-400 hover:bg-red-500/10 hover:text-red-500"
                >
                  <LogOut size={22} />
                  <span className="font-medium">Logout</span>
                </button>
              </div>
            </motion.div>
          </>
        )}
      </AnimatePresence>
    </div>
  );
}
