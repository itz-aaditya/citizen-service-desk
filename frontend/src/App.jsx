import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Building2,
  FileText,
  Search,
  ArrowRight,
  RefreshCw,
  LogOut,
  LogIn,
  AlertTriangle,
  User,
  Plus,
  X,
  Bell,
  Download,
  Award,
  ExternalLink,
  Sun,
  Moon,
  Monitor,
  Briefcase,
  BarChart3,
  Eye,
  Check,
  Pause,
} from 'lucide-react';
import { api, setToken, getToken } from './api';
import { getNepalDateTime } from './nepaliDate';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Tabs: 'track', 'citizen', 'officer', 'supervisor'
  const [activeTab, setActiveTab] = useState('track');

  // Theme: 'light', 'dark', 'system'
  const [theme, setTheme] = useState('system');

  // Nepal Live Time & Date state (AD & BS)
  const [nepalTimeInfo, setNepalTimeInfo] = useState(getNepalDateTime());

  // Public Tracking
  const [trackRef, setTrackRef] = useState('');
  const [trackResult, setTrackResult] = useState(null);
  const [trackError, setTrackError] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Lists & Data
  const [services, setServices] = useState([]);
  const [offices, setOffices] = useState([]);
  const [requestsList, setRequestsList] = useState([]);
  const [appointmentsList, setAppointmentsList] = useState([]);
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestEvents, setRequestEvents] = useState([]);
  const [requestDocuments, setRequestDocuments] = useState([]);

  // Supervisor Telemetry
  const [alertsList, setAlertsList] = useState([]);
  const [delayReports, setDelayReports] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Modals
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' | 'register'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');

  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState('');
  const [transitionReason, setTransitionReason] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignOfficerId, setAssignOfficerId] = useState('');

  // Form states
  const [newReqServiceCode, setNewReqServiceCode] = useState('');
  const [newReqNotes, setNewReqNotes] = useState('');
  const [apptOfficeCode, setApptOfficeCode] = useState('');
  const [apptDate, setApptDate] = useState('');
  const [apptSlot, setApptSlot] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);

  // Document upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [docReviewComment, setDocReviewComment] = useState('');

  const showToast = (message, type = 'info') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Theme application
  useEffect(() => {
    const storedTheme = localStorage.getItem('sdoc_theme') || 'system';
    setTheme(storedTheme);
    applyTheme(storedTheme);
  }, []);

  const applyTheme = (t) => {
    const root = document.documentElement;
    const isSystemDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    if (t === 'dark') {
      root.classList.add('dark');
      root.setAttribute('data-theme', 'dark');
    } else if (t === 'light') {
      root.classList.remove('dark');
      root.setAttribute('data-theme', 'light');
    } else {
      root.removeAttribute('data-theme');
      if (isSystemDark) {
        root.classList.add('dark');
      } else {
        root.classList.remove('dark');
      }
    }
  };

  const handleThemeChange = (newTheme) => {
    setTheme(newTheme);
    localStorage.setItem('sdoc_theme', newTheme);
    applyTheme(newTheme);
  };

  useEffect(() => {
    const mediaQuery = window.matchMedia('(prefers-color-scheme: dark)');
    const listener = () => {
      if (theme === 'system') applyTheme('system');
    };
    mediaQuery.addEventListener('change', listener);
    return () => mediaQuery.removeEventListener('change', listener);
  }, [theme]);

  // Live ticking Nepal Clock & Date
  useEffect(() => {
    const timer = setInterval(() => {
      setNepalTimeInfo(getNepalDateTime());
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  useEffect(() => {
    const token = getToken();
    if (token) {
      api.getMe()
        .then((user) => {
          setCurrentUser(user);
          if (user.role === 'OFFICER') setActiveTab('officer');
          else if (user.role === 'SUPERVISOR') setActiveTab('supervisor');
          else setActiveTab('citizen');
        })
        .catch(() => {
          setToken(null);
          setCurrentUser(null);
        });
    }

    api.getServices().then(setServices).catch(console.error);
    api.getOffices().then(setOffices).catch(console.error);
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadNotifications();
      if (activeTab === 'citizen' && currentUser.role === 'CITIZEN') loadCitizenData();
      if (activeTab === 'officer' && currentUser.role === 'OFFICER') loadOfficerData();
      if (activeTab === 'supervisor' && currentUser.role === 'SUPERVISOR') loadSupervisorData();
    }
  }, [currentUser, activeTab]);

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data || []);
    } catch (e) {
      console.error(e);
    }
  };

  const loadCitizenData = async () => {
    setLoading(true);
    try {
      const [reqs, appts] = await Promise.all([
        api.getRequests().catch(() => []),
        api.getAppointments().catch(() => [])
      ]);
      setRequestsList(reqs || []);
      setAppointmentsList(appts || []);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadOfficerData = async () => {
    setLoading(true);
    try {
      const reqs = await api.getRequests();
      setRequestsList(reqs || []);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const loadSupervisorData = async () => {
    setLoading(true);
    try {
      const [stats, delays, alts, reqs] = await Promise.all([
        api.getExecutiveAnalytics().catch(() => null),
        api.getDelayReport().catch(() => []),
        api.getAlerts().catch(() => []),
        api.getRequests().catch(() => [])
      ]);
      setAnalytics(stats);
      setDelayReports(delays || []);
      setAlertsList(alts || []);
      setRequestsList(reqs || []);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Quick Demo Login
  const handleQuickDemoLogin = async (email, defaultRoleTab) => {
    try {
      setLoading(true);
      const res = await api.login(email, 'demo-password-1');
      setToken(res.access_token);
      const user = await api.getMe();
      setCurrentUser(user);
      setActiveTab(defaultRoleTab);
      showToast(`Logged in as ${user.full_name} (${user.role})`);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    setActiveTab('track');
    showToast('Signed out');
  };

  const handleAuthSubmit = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      if (authMode === 'login') {
        const res = await api.login(authEmail, authPassword);
        setToken(res.access_token);
      } else {
        await api.register(authEmail, authPassword, authFullName);
        const res = await api.login(authEmail, authPassword);
        setToken(res.access_token);
      }
      const user = await api.getMe();
      setCurrentUser(user);
      setShowAuthModal(false);
      showToast(`Welcome, ${user.full_name}!`);
      if (user.role === 'OFFICER') setActiveTab('officer');
      else if (user.role === 'SUPERVISOR') setActiveTab('supervisor');
      else setActiveTab('citizen');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTrackSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!trackRef.trim()) return;
    setTrackingLoading(true);
    setTrackError('');
    setTrackResult(null);
    try {
      const res = await api.trackReference(trackRef.trim());
      setTrackResult(res);
    } catch (e) {
      setTrackError(e.message || 'Reference not found');
    } finally {
      setTrackingLoading(false);
    }
  };

  const openRequestDetail = async (req) => {
    setSelectedRequest(req);
    setShowDetailModal(true);
    try {
      const [events, docs] = await Promise.all([
        api.getRequestEvents(req.id).catch(() => []),
        api.getRequestDocuments(req.id).catch(() => [])
      ]);
      setRequestEvents(events || []);
      setRequestDocuments(docs || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!selectedFile || !selectedRequest) return;
    try {
      setUploadingDoc(true);
      await api.uploadDocument(selectedRequest.id, selectedFile);
      showToast('Document uploaded successfully');
      setSelectedFile(null);
      const docs = await api.getRequestDocuments(selectedRequest.id);
      setRequestDocuments(docs);
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setUploadingDoc(false);
    }
  };

  const handleVerifyDocument = async (docId, newStatus) => {
    try {
      setLoading(true);
      await api.verifyDocument(docId, newStatus, docReviewComment || undefined);
      showToast(`Document ${newStatus.toLowerCase()}`);
      setDocReviewComment('');
      if (selectedRequest) {
        const docs = await api.getRequestDocuments(selectedRequest.id);
        setRequestDocuments(docs);
      }
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRequest = async (e) => {
    e.preventDefault();
    if (!newReqServiceCode) return;
    try {
      setLoading(true);
      const res = await api.createRequest(newReqServiceCode, newReqNotes || undefined);
      showToast(`Request submitted: ${res.reference}`);
      setShowNewRequestModal(false);
      setNewReqNotes('');
      loadCitizenData();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCheckAvailability = async (code, day) => {
    if (!code || !day) return;
    try {
      const res = await api.getAvailability(code, day);
      setAvailableSlots(res.slots || []);
    } catch (e) {
      console.error(e);
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!apptOfficeCode || !apptDate || !apptSlot) return;
    try {
      setLoading(true);
      await api.bookAppointment(apptOfficeCode, apptDate, apptSlot);
      showToast('Appointment booked successfully');
      setShowAppointmentModal(false);
      setApptSlot('');
      loadCitizenData();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTransition = async () => {
    if (!selectedRequest || !transitionTarget) return;
    try {
      setLoading(true);
      await api.transitionRequest(selectedRequest.id, transitionTarget, transitionReason || undefined);
      showToast(`Status updated to ${transitionTarget}`);
      setShowTransitionModal(false);
      setTransitionReason('');
      setShowDetailModal(false);
      if (currentUser?.role === 'OFFICER') loadOfficerData();
      else if (currentUser?.role === 'SUPERVISOR') loadSupervisorData();
      else loadCitizenData();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAssignOfficer = async () => {
    if (!selectedRequest || !assignOfficerId) return;
    try {
      setLoading(true);
      await api.assignOfficer(selectedRequest.id, parseInt(assignOfficerId));
      showToast('Officer assigned successfully');
      setShowAssignModal(false);
      setShowDetailModal(false);
      loadSupervisorData();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleManualScan = async () => {
    try {
      setLoading(true);
      const res = await api.scanAlerts();
      showToast(`Scan complete: ${res.new_alerts} new alerts across ${res.scanned_requests} requests`);
      loadSupervisorData();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAcknowledgeAlert = async (alertId) => {
    try {
      setLoading(true);
      await api.ackAlert(alertId);
      showToast('Statutory alert acknowledged');
      loadSupervisorData();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  /**
   * Status dot presentation:
   * 8px dot plus plain text:
   * Escalated = var(--alert), Late = var(--late), Due soon = var(--due-soon), On track = var(--on-track).
   */
  const renderStatus = (status) => {
    let dotColor = 'var(--on-track)';
    let text = status;

    if (status === 'ESCALATED' || status === 'CRITICAL_200') {
      dotColor = 'var(--alert)';
      text = 'Escalated';
    } else if (status === 'OVERDUE' || status === 'BREACH_100' || status === 'Late') {
      dotColor = 'var(--late)';
      text = 'Late';
    } else if (status === 'DUE_SOON' || status === 'NEEDS_INFO' || status === 'Due soon') {
      dotColor = 'var(--due-soon)';
      text = status === 'NEEDS_INFO' ? 'Needs info (clock paused)' : 'Due soon';
    } else if (status === 'REJECTED' || status === 'CANCELLED') {
      dotColor = 'var(--text-3)';
      text = status === 'REJECTED' ? 'Rejected' : 'Cancelled';
    } else if (status === 'SUBMITTED') {
      dotColor = 'var(--on-track)';
      text = 'Submitted';
    } else if (status === 'UNDER_REVIEW') {
      dotColor = 'var(--on-track)';
      text = 'Under review';
    } else if (status === 'APPROVED') {
      dotColor = 'var(--on-track)';
      text = 'Approved';
    } else if (status === 'COMPLETED') {
      dotColor = 'var(--on-track)';
      text = 'Completed';
    } else {
      dotColor = 'var(--on-track)';
      text = 'On track';
    }

    return (
      <span className="inline-flex items-center gap-2 text-xs font-normal" style={{ color: 'var(--text-1)' }}>
        <span
          className="status-dot flex-shrink-0"
          style={{ width: '8px', height: '8px', borderRadius: '50%', backgroundColor: dotColor }}
        />
        <span>{text}</span>
      </span>
    );
  };

  return (
    <div className="min-h-screen flex flex-col font-sans" style={{ backgroundColor: 'var(--page)', color: 'var(--text-1)' }}>
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-4 right-4 z-50">
          <div
            className="p-3 text-xs font-sans max-w-sm flex items-center gap-2"
            style={{
              backgroundColor: 'var(--panel)',
              border: '1px solid var(--border)',
              color: toast.type === 'error' ? 'var(--alert)' : 'var(--text-1)'
            }}
          >
            {toast.type === 'error' ? <AlertCircle className="w-4 h-4 flex-shrink-0" /> : <CheckCircle2 className="w-4 h-4 flex-shrink-0" />}
            <span>{toast.message}</span>
          </div>
        </div>
      )}

      {/* TOP TELEMETRY BAR */}
      <div
        className="text-xs px-6 py-2.5 flex flex-wrap items-center justify-between gap-4"
        style={{ backgroundColor: 'var(--panel)', borderBottom: '1px solid var(--border)', color: 'var(--text-2)' }}
      >
        {/* Left: Nepal Live Clock & Dual Calendar */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="flex items-center gap-2">
            <span className="text-sm">🇳🇵</span>
            <span className="font-mono font-medium" style={{ color: 'var(--text-1)' }}>{nepalTimeInfo.time12}</span>
            <span className="text-xs" style={{ color: 'var(--text-3)' }}>NPT</span>
            <span style={{ color: 'var(--divider)' }}>|</span>
            <span style={{ color: 'var(--text-2)' }}>वि.सं. {nepalTimeInfo.bsDateDevanagari}</span>
            <span className="font-mono" style={{ color: 'var(--text-3)' }}>({nepalTimeInfo.adDateShort} AD)</span>
          </div>

          <a
            href="https://www.hamropatro.com/calendar"
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center gap-1 px-2 py-0.5 text-xs transition"
            style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}
          >
            <span>हाम्रो पात्रो</span>
            <ExternalLink className="w-3 h-3 opacity-60" />
          </a>
        </div>

        {/* Right: Demo Persona Selector & Theme Toggle */}
        <div className="flex items-center gap-3">
          <div className="hidden sm:flex items-center gap-1">
            <span className="text-xs mr-1" style={{ color: 'var(--text-3)' }}>Demo:</span>
            <button
              onClick={() => handleQuickDemoLogin('citizen1@example.org', 'citizen')}
              className="px-2 py-0.5 text-xs transition"
              style={{ border: '1px solid var(--border)', backgroundColor: 'var(--panel)', color: 'var(--text-2)' }}
            >
              Citizen
            </button>
            <button
              onClick={() => handleQuickDemoLogin('officer1@example.org', 'officer')}
              className="px-2 py-0.5 text-xs transition"
              style={{ border: '1px solid var(--border)', backgroundColor: 'var(--panel)', color: 'var(--text-2)' }}
            >
              Officer
            </button>
            <button
              onClick={() => handleQuickDemoLogin('supervisor@example.org', 'supervisor')}
              className="px-2 py-0.5 text-xs transition"
              style={{ border: '1px solid var(--border)', backgroundColor: 'var(--panel)', color: 'var(--text-2)' }}
            >
              Supervisor
            </button>
          </div>

          {/* Theme Switcher: Light, Dark, System */}
          <div className="flex items-center" style={{ border: '1px solid var(--border)' }}>
            <button
              onClick={() => handleThemeChange('light')}
              title="Light"
              className="p-1 transition"
              style={{
                backgroundColor: theme === 'light' ? 'var(--ink)' : 'transparent',
                color: theme === 'light' ? 'var(--on-ink)' : 'var(--text-3)'
              }}
            >
              <Sun className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleThemeChange('dark')}
              title="Dark"
              className="p-1 transition"
              style={{
                backgroundColor: theme === 'dark' ? 'var(--ink)' : 'transparent',
                color: theme === 'dark' ? 'var(--on-ink)' : 'var(--text-3)'
              }}
            >
              <Moon className="w-3.5 h-3.5" />
            </button>
            <button
              onClick={() => handleThemeChange('system')}
              title="System"
              className="p-1 transition"
              style={{
                backgroundColor: theme === 'system' ? 'var(--ink)' : 'transparent',
                color: theme === 'system' ? 'var(--on-ink)' : 'var(--text-3)'
              }}
            >
              <Monitor className="w-3.5 h-3.5" />
            </button>
          </div>
        </div>
      </div>

      {/* MAIN HEADER */}
      <header style={{ backgroundColor: 'var(--panel)', borderBottom: '1px solid var(--border)' }}>
        <div className="max-w-6xl mx-auto px-6 h-16 flex items-center justify-between gap-6">
          {/* Brand */}
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('track')}>
            <Building2 className="w-5 h-5" style={{ color: 'var(--text-1)' }} />
            <div>
              <div className="text-sm font-semibold tracking-tight" style={{ color: 'var(--text-1)' }}>
                Citizen Service Desk
              </div>
              <div className="text-[11px]" style={{ color: 'var(--text-3)' }}>
                Public Service & SLA Counter
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 text-xs">
            <button
              onClick={() => setActiveTab('track')}
              className="px-3 py-1.5 transition font-medium"
              style={{
                backgroundColor: activeTab === 'track' ? 'var(--ink)' : 'transparent',
                color: activeTab === 'track' ? 'var(--on-ink)' : 'var(--text-2)',
                border: '1px solid',
                borderColor: activeTab === 'track' ? 'var(--ink)' : 'var(--border)'
              }}
            >
              Public Tracking
            </button>

            {(!currentUser || currentUser.role === 'CITIZEN') && (
              <button
                onClick={() => {
                  if (!currentUser) setShowAuthModal(true);
                  else setActiveTab('citizen');
                }}
                className="px-3 py-1.5 transition font-medium"
                style={{
                  backgroundColor: activeTab === 'citizen' ? 'var(--ink)' : 'transparent',
                  color: activeTab === 'citizen' ? 'var(--on-ink)' : 'var(--text-2)',
                  border: '1px solid',
                  borderColor: activeTab === 'citizen' ? 'var(--ink)' : 'var(--border)'
                }}
              >
                Citizen Portal
              </button>
            )}

            {currentUser?.role === 'OFFICER' && (
              <button
                onClick={() => setActiveTab('officer')}
                className="px-3 py-1.5 transition font-medium"
                style={{
                  backgroundColor: activeTab === 'officer' ? 'var(--ink)' : 'transparent',
                  color: activeTab === 'officer' ? 'var(--on-ink)' : 'var(--text-2)',
                  border: '1px solid',
                  borderColor: activeTab === 'officer' ? 'var(--ink)' : 'var(--border)'
                }}
              >
                Officer Queue
              </button>
            )}

            {currentUser?.role === 'SUPERVISOR' && (
              <button
                onClick={() => setActiveTab('supervisor')}
                className="px-3 py-1.5 transition font-medium"
                style={{
                  backgroundColor: activeTab === 'supervisor' ? 'var(--ink)' : 'transparent',
                  color: activeTab === 'supervisor' ? 'var(--on-ink)' : 'var(--text-2)',
                  border: '1px solid',
                  borderColor: activeTab === 'supervisor' ? 'var(--ink)' : 'var(--border)'
                }}
              >
                Supervisor Radar
              </button>
            )}
          </nav>

          {/* Right Controls */}
          <div className="flex items-center gap-3">
            {currentUser && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="p-1.5 relative transition"
                  style={{ border: '1px solid var(--border)', color: 'var(--text-2)' }}
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span
                      className="absolute -top-1 -right-1 w-2 h-2 rounded-full"
                      style={{ backgroundColor: 'var(--alert)' }}
                    />
                  )}
                </button>

                {showNotifications && (
                  <div
                    className="absolute right-0 mt-2 w-80 p-4 z-50 text-xs"
                    style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)' }}
                  >
                    <div className="flex items-center justify-between pb-2" style={{ borderBottom: '1px solid var(--divider)' }}>
                      <span className="font-medium" style={{ color: 'var(--text-1)' }}>Notifications</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={async () => {
                            await api.readAllNotifications();
                            loadNotifications();
                          }}
                          style={{ color: 'var(--text-3)' }}
                          className="hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-60 overflow-y-auto mt-2 space-y-2">
                      {notifications.length === 0 ? (
                        <div className="py-4 text-center" style={{ color: 'var(--text-3)' }}>No notifications</div>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className="py-2" style={{ borderBottom: '1px solid var(--divider)' }}>
                            <div className="flex justify-between font-medium" style={{ color: 'var(--text-1)' }}>
                              <span>{n.title}</span>
                              <span className="font-mono text-[10px]" style={{ color: 'var(--text-3)' }}>
                                {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                              </span>
                            </div>
                            <p className="mt-0.5" style={{ color: 'var(--text-2)' }}>{n.message}</p>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentUser ? (
              <div className="flex items-center gap-3 text-xs">
                <span className="font-medium" style={{ color: 'var(--text-1)' }}>{currentUser.full_name}</span>
                <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>({currentUser.role})</span>
                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="p-1 transition"
                  style={{ color: 'var(--text-3)' }}
                >
                  <LogOut className="w-3.5 h-3.5" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="px-3 py-1.5 text-xs font-medium transition"
                style={{ backgroundColor: 'var(--ink)', color: 'var(--on-ink)' }}
              >
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* MAIN CONTENT BODY */}
      <main className="flex-1 max-w-6xl w-full mx-auto px-6 py-8">
        {/* TAB 1: PUBLIC TRACKING */}
        {activeTab === 'track' && (
          <div className="space-y-6">
            {/* Search Block */}
            <div className="p-8 content-panel" style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)' }}>
              <div className="max-w-xl mx-auto space-y-4">
                <h1 className="text-xl font-bold text-center" style={{ color: 'var(--text-1)' }}>
                  Statutory Application Tracking
                </h1>
                <p className="text-xs text-center leading-relaxed" style={{ color: 'var(--text-2)' }}>
                  Enter your reference ID to inspect milestone status, SLA due dates, and completion certificates.
                </p>

                <form onSubmit={handleTrackSubmit} className="flex gap-2 pt-2">
                  <input
                    type="text"
                    placeholder="e.g. SR-2026-000001"
                    value={trackRef}
                    onChange={(e) => setTrackRef(e.target.value.toUpperCase())}
                    className="flex-1 px-3 py-2 text-sm font-mono focus:outline-none"
                    style={{
                      backgroundColor: 'var(--panel)',
                      border: '1px solid var(--border)',
                      color: 'var(--text-1)'
                    }}
                  />
                  <button
                    type="submit"
                    disabled={trackingLoading || !trackRef.trim()}
                    className="btn-ink px-4 py-2 text-xs flex items-center gap-1.5"
                  >
                    {trackingLoading ? <RefreshCw className="w-3.5 h-3.5 animate-spin" /> : 'Inspect'}
                    <ArrowRight className="w-3.5 h-3.5" />
                  </button>
                </form>

                <div className="flex items-center justify-center gap-2 text-xs" style={{ color: 'var(--text-3)' }}>
                  <span>Sample references:</span>
                  <button
                    type="button"
                    onClick={() => { setTrackRef('SR-2026-000001'); setTimeout(() => handleTrackSubmit(), 50); }}
                    className="font-mono underline"
                    style={{ color: 'var(--text-2)' }}
                  >
                    SR-2026-000001
                  </button>
                  <span>•</span>
                  <button
                    type="button"
                    onClick={() => { setTrackRef('SR-2026-000002'); setTimeout(() => handleTrackSubmit(), 50); }}
                    className="font-mono underline"
                    style={{ color: 'var(--text-2)' }}
                  >
                    SR-2026-000002
                  </button>
                </div>
              </div>
            </div>

            {/* Tracking Result */}
            {trackError && (
              <div
                className="p-4 text-xs flex items-center gap-2"
                style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--alert)', color: 'var(--alert)' }}
              >
                <AlertCircle className="w-4 h-4 flex-shrink-0" />
                <span>{trackError}</span>
              </div>
            )}

            {trackResult && (
              <div className="p-6 space-y-6" style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)' }}>
                <div className="flex items-center justify-between pb-4" style={{ borderBottom: '1px solid var(--divider)' }}>
                  <div>
                    <span className="text-[11px] block" style={{ color: 'var(--text-3)' }}>Reference</span>
                    <span className="text-lg font-mono font-bold" style={{ color: 'var(--text-1)' }}>{trackResult.reference}</span>
                  </div>
                  <div>
                    {renderStatus(trackResult.status)}
                  </div>
                </div>

                {/* 4-Step Stepper */}
                <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
                  {[
                    { step: 'SUBMITTED', title: '1. Registered' },
                    { step: 'UNDER_REVIEW', title: '2. Under Review' },
                    { step: 'APPROVED', title: '3. Approved' },
                    { step: 'COMPLETED', title: '4. Completed' },
                  ].map((item, idx) => {
                    const stages = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'COMPLETED'];
                    const currentIdx = stages.indexOf(trackResult.status);
                    const isPast = currentIdx >= idx;

                    return (
                      <div
                        key={item.step}
                        className="p-3 text-xs flex items-center gap-2"
                        style={{
                          backgroundColor: 'var(--panel)',
                          border: '1px solid',
                          borderColor: isPast ? 'var(--text-1)' : 'var(--divider)',
                          color: isPast ? 'var(--text-1)' : 'var(--text-3)'
                        }}
                      >
                        <span
                          className="w-2 h-2 rounded-full flex-shrink-0"
                          style={{ backgroundColor: isPast ? 'var(--on-track)' : 'var(--divider)' }}
                        />
                        <span className="font-medium">{item.title}</span>
                      </div>
                    );
                  })}
                </div>

                {/* Metadata */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-2 text-xs">
                  <div>
                    <span className="block" style={{ color: 'var(--text-3)' }}>Service</span>
                    <span className="font-medium" style={{ color: 'var(--text-1)' }}>{trackResult.service_name}</span>
                  </div>
                  <div>
                    <span className="block" style={{ color: 'var(--text-3)' }}>Submitted Date</span>
                    <span className="font-mono" style={{ color: 'var(--text-1)' }}>
                      {new Date(trackResult.submitted_at).toLocaleDateString()}
                    </span>
                  </div>
                  <div>
                    <span className="block" style={{ color: 'var(--text-3)' }}>Statutory Due Date</span>
                    <span className="font-mono font-medium" style={{ color: 'var(--text-1)' }}>
                      {new Date(trackResult.due_date).toLocaleDateString()}
                    </span>
                  </div>
                </div>
              </div>
            )}
          </div>
        )}

        {/* TAB 2: CITIZEN PORTAL */}
        {activeTab === 'citizen' && currentUser && (
          <div className="space-y-6">
            <div className="p-6 flex flex-wrap items-center justify-between gap-4" style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)' }}>
              <div>
                <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>Citizen Dashboard</h2>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>Logged in as {currentUser.full_name}</p>
              </div>
              <div className="flex gap-2">
                <button onClick={() => setShowNewRequestModal(true)} className="btn-ink px-3 py-1.5 text-xs">
                  + New Application
                </button>
                <button onClick={() => setShowAppointmentModal(true)} className="btn-outline px-3 py-1.5 text-xs">
                  Book Appointment
                </button>
              </div>
            </div>

            {/* Applications Table */}
            <div style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)' }}>
              <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--divider)' }}>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>My Applications</h3>
                <span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>{requestsList.length} total</span>
              </div>

              {requestsList.length === 0 ? (
                <div className="p-8 text-center text-xs" style={{ color: 'var(--text-3)' }}>No submitted applications on record.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--divider)', color: 'var(--text-3)' }}>
                        <th className="py-2.5 px-4 font-medium uppercase text-[11px]">Reference</th>
                        <th className="py-2.5 px-4 font-medium uppercase text-[11px]">Service</th>
                        <th className="py-2.5 px-4 font-medium uppercase text-[11px]">Due Date</th>
                        <th className="py-2.5 px-4 font-medium uppercase text-[11px]">Status</th>
                        <th className="py-2.5 px-4 font-medium uppercase text-[11px] text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requestsList.map((req) => (
                        <tr key={req.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                          <td className="py-3 px-4 font-mono font-bold" style={{ color: 'var(--text-1)' }}>{req.reference}</td>
                          <td className="py-3 px-4" style={{ color: 'var(--text-2)' }}>{req.service_name}</td>
                          <td className="py-3 px-4 font-mono" style={{ color: 'var(--text-2)' }}>{new Date(req.due_date).toLocaleDateString()}</td>
                          <td className="py-3 px-4">{renderStatus(req.status)}</td>
                          <td className="py-3 px-4 text-right">
                            <div className="flex items-center justify-end gap-2">
                              {req.status === 'COMPLETED' && (
                                <a
                                  href={api.getCertificateDownloadUrl(req.id)}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="underline text-xs"
                                  style={{ color: 'var(--text-1)' }}
                                >
                                  Certificate
                                </a>
                              )}
                              <button
                                onClick={() => openRequestDetail(req)}
                                className="underline text-xs"
                                style={{ color: 'var(--text-1)' }}
                              >
                                View
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Appointments Table */}
            <div style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)' }}>
              <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--divider)' }}>
                <h3 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Scheduled Appointments</h3>
                <span className="text-xs font-mono" style={{ color: 'var(--text-3)' }}>{appointmentsList.length} booked</span>
              </div>

              {appointmentsList.length === 0 ? (
                <div className="p-8 text-center text-xs" style={{ color: 'var(--text-3)' }}>No office appointments reserved.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--divider)', color: 'var(--text-3)' }}>
                        <th className="py-2.5 px-4 font-medium uppercase text-[11px]">Office</th>
                        <th className="py-2.5 px-4 font-medium uppercase text-[11px]">Date</th>
                        <th className="py-2.5 px-4 font-medium uppercase text-[11px]">Slot</th>
                        <th className="py-2.5 px-4 font-medium uppercase text-[11px]">Status</th>
                        <th className="py-2.5 px-4 font-medium uppercase text-[11px] text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {appointmentsList.map((a) => (
                        <tr key={a.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                          <td className="py-3 px-4" style={{ color: 'var(--text-1)' }}>{a.office_name} ({a.office_code})</td>
                          <td className="py-3 px-4 font-mono" style={{ color: 'var(--text-2)' }}>{a.appointment_date}</td>
                          <td className="py-3 px-4 font-mono" style={{ color: 'var(--text-2)' }}>{a.slot_start} - {a.slot_end}</td>
                          <td className="py-3 px-4">{renderStatus(a.status === 'BOOKED' ? 'On track' : 'Cancelled')}</td>
                          <td className="py-3 px-4 text-right">
                            {a.status === 'BOOKED' && (
                              <button
                                onClick={async () => {
                                  if (window.confirm('Cancel this appointment?')) {
                                    await api.cancelAppointment(a.id);
                                    showToast('Appointment cancelled');
                                    loadCitizenData();
                                  }
                                }}
                                className="underline"
                                style={{ color: 'var(--alert)' }}
                              >
                                Cancel
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 3: OFFICER QUEUE */}
        {activeTab === 'officer' && currentUser?.role === 'OFFICER' && (
          <div className="space-y-6">
            <div className="p-6 flex items-center justify-between" style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)' }}>
              <div>
                <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>Assigned Queue</h2>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>Files assigned to your counter</p>
              </div>
              <button onClick={loadOfficerData} className="btn-outline px-3 py-1.5 text-xs flex items-center gap-1.5">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh
              </button>
            </div>

            <div style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)' }}>
              {requestsList.length === 0 ? (
                <div className="p-8 text-center text-xs" style={{ color: 'var(--text-3)' }}>No active requests in queue.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--divider)', color: 'var(--text-3)' }}>
                        <th className="py-2.5 px-4 font-medium uppercase text-[11px]">Reference</th>
                        <th className="py-2.5 px-4 font-medium uppercase text-[11px]">Service</th>
                        <th className="py-2.5 px-4 font-medium uppercase text-[11px]">Due Date</th>
                        <th className="py-2.5 px-4 font-medium uppercase text-[11px]">Status</th>
                        <th className="py-2.5 px-4 font-medium uppercase text-[11px] text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {requestsList.map((req) => (
                        <tr key={req.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                          <td className="py-3 px-4 font-mono font-bold" style={{ color: 'var(--text-1)' }}>{req.reference}</td>
                          <td className="py-3 px-4" style={{ color: 'var(--text-2)' }}>{req.service_name}</td>
                          <td className="py-3 px-4 font-mono" style={{ color: 'var(--text-2)' }}>{new Date(req.due_date).toLocaleDateString()}</td>
                          <td className="py-3 px-4">{renderStatus(req.status)}</td>
                          <td className="py-3 px-4 text-right">
                            <button onClick={() => openRequestDetail(req)} className="btn-ink px-3 py-1 text-xs">
                              Process
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>
          </div>
        )}

        {/* TAB 4: SUPERVISOR RADAR */}
        {activeTab === 'supervisor' && currentUser?.role === 'SUPERVISOR' && (
          <div className="space-y-6">
            {/* Header */}
            <div className="p-6 flex flex-wrap items-center justify-between gap-4" style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)' }}>
              <div>
                <h2 className="text-base font-bold" style={{ color: 'var(--text-1)' }}>Supervisor Command Radar</h2>
                <p className="text-xs" style={{ color: 'var(--text-3)' }}>Statutory compliance telemetry and delay management</p>
              </div>
              <button onClick={handleManualScan} className="btn-ink px-3 py-1.5 text-xs flex items-center gap-1.5">
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Run SLA Scan
              </button>
            </div>

            {/* KPI Cards: Content blocks sit on var(--panel) with 1px var(--border). KPI numbers are var(--text-1). Only overdue count uses var(--alert). */}
            {analytics && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
                <div className="p-5" style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)' }}>
                  <span className="text-[11px] block uppercase" style={{ color: 'var(--text-3)' }}>SLA Compliance Rate</span>
                  <div className="text-3xl font-mono font-bold mt-1" style={{ color: 'var(--text-1)' }}>
                    {analytics.sla_compliance_rate}%
                  </div>
                  <span className="text-[11px] block mt-1" style={{ color: 'var(--text-3)' }}>Resolved on-time</span>
                </div>

                <div className="p-5" style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)' }}>
                  <span className="text-[11px] block uppercase" style={{ color: 'var(--text-3)' }}>Total Applications</span>
                  <div className="text-3xl font-mono font-bold mt-1" style={{ color: 'var(--text-1)' }}>
                    {analytics.total_requests}
                  </div>
                  <span className="text-[11px] block mt-1" style={{ color: 'var(--text-3)' }}>Completed: {analytics.completed_requests}</span>
                </div>

                <div className="p-5" style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)' }}>
                  <span className="text-[11px] block uppercase" style={{ color: 'var(--text-3)' }}>In-Progress Queue</span>
                  <div className="text-3xl font-mono font-bold mt-1" style={{ color: 'var(--text-1)' }}>
                    {analytics.pending_requests}
                  </div>
                  <span className="text-[11px] block mt-1" style={{ color: 'var(--text-3)' }}>Active files</span>
                </div>

                <div className="p-5" style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)' }}>
                  <span className="text-[11px] block uppercase" style={{ color: 'var(--text-3)' }}>Overdue Breaches</span>
                  <div className="text-3xl font-mono font-bold mt-1" style={{ color: 'var(--alert)' }}>
                    {analytics.overdue_requests}
                  </div>
                  <span className="text-[11px] block mt-1" style={{ color: 'var(--alert)' }}>Requires intervention</span>
                </div>
              </div>
            )}

            {/* Delay Escalation Table: Table rows separated by 1px var(--divider). Overdue hours are mono text in var(--alert). */}
            <div style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)' }}>
              <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--divider)' }}>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Active Delay Escalation Radar</h3>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>Applications flagged by statutory SLA scanner</p>
                </div>
                <span className="text-xs font-mono" style={{ color: 'var(--alert)' }}>{delayReports.length} Flagged</span>
              </div>

              {delayReports.length === 0 ? (
                <div className="p-8 text-center text-xs" style={{ color: 'var(--on-track)' }}>
                  All active applications are currently operating within SLA targets.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--divider)', color: 'var(--text-3)' }}>
                        <th className="py-2.5 px-4 font-medium uppercase text-[11px]">Reference</th>
                        <th className="py-2.5 px-4 font-medium uppercase text-[11px]">Service</th>
                        <th className="py-2.5 px-4 font-medium uppercase text-[11px]">Due Date</th>
                        <th className="py-2.5 px-4 font-medium uppercase text-[11px]">Severity & Hours</th>
                        <th className="py-2.5 px-4 font-medium uppercase text-[11px] text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {delayReports.map((d) => {
                        const level = d.level || (Array.isArray(d.delay_levels) ? d.delay_levels[0] : 'OVERDUE');
                        return (
                          <tr key={d.reference} style={{ borderBottom: '1px solid var(--divider)' }}>
                            <td className="py-3 px-4 font-mono font-bold" style={{ color: 'var(--text-1)' }}>{d.reference}</td>
                            <td className="py-3 px-4" style={{ color: 'var(--text-2)' }}>{d.service_name}</td>
                            <td className="py-3 px-4 font-mono" style={{ color: 'var(--text-2)' }}>{new Date(d.due_date).toLocaleDateString()}</td>
                            <td className="py-3 px-4">
                              <div className="flex items-center gap-2">
                                {renderStatus(level)}
                                {d.delay_hours > 0 && (
                                  <span className="font-mono text-xs" style={{ color: 'var(--alert)' }}>
                                    +{Math.round(d.delay_hours)}h
                                  </span>
                                )}
                              </div>
                            </td>
                            <td className="py-3 px-4 text-right">
                              <button
                                onClick={async () => {
                                  let found = requestsList.find(r => r.reference === d.reference);
                                  if (!found && d.request_id) {
                                    try {
                                      found = await api.getRequestDetail(d.request_id);
                                    } catch (err) {}
                                  }
                                  if (found) openRequestDetail(found);
                                }}
                                className="underline"
                                style={{ color: 'var(--text-1)' }}
                              >
                                Inspect
                              </button>
                            </td>
                          </tr>
                        );
                      })}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Statutory Alerts Log & Acknowledgement */}
            <div style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)' }}>
              <div className="p-4 flex items-center justify-between" style={{ borderBottom: '1px solid var(--divider)' }}>
                <div>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Statutory Delay Alerts Log</h3>
                  <p className="text-xs" style={{ color: 'var(--text-3)' }}>Audit trail of formal breach alerts</p>
                </div>
                <span className="text-xs font-mono" style={{ color: 'var(--text-2)' }}>
                  {alertsList.filter(a => !a.acknowledged).length} Pending Ack
                </span>
              </div>

              {alertsList.length === 0 ? (
                <div className="p-8 text-center text-xs" style={{ color: 'var(--text-3)' }}>No alerts logged.</div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr style={{ borderBottom: '1px solid var(--divider)', color: 'var(--text-3)' }}>
                        <th className="py-2.5 px-4 font-medium uppercase text-[11px]">ID</th>
                        <th className="py-2.5 px-4 font-medium uppercase text-[11px]">Reference</th>
                        <th className="py-2.5 px-4 font-medium uppercase text-[11px]">Level</th>
                        <th className="py-2.5 px-4 font-medium uppercase text-[11px]">Date</th>
                        <th className="py-2.5 px-4 font-medium uppercase text-[11px]">Status</th>
                        <th className="py-2.5 px-4 font-medium uppercase text-[11px] text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {alertsList.map((alt) => (
                        <tr key={alt.id} style={{ borderBottom: '1px solid var(--divider)' }}>
                          <td className="py-3 px-4 font-mono" style={{ color: 'var(--text-3)' }}>#{alt.id}</td>
                          <td className="py-3 px-4 font-mono font-bold" style={{ color: 'var(--text-1)' }}>{alt.reference}</td>
                          <td className="py-3 px-4">{renderStatus(alt.level)}</td>
                          <td className="py-3 px-4 font-mono" style={{ color: 'var(--text-3)' }}>{new Date(alt.created_at).toLocaleDateString()}</td>
                          <td className="py-3 px-4">
                            {alt.acknowledged ? (
                              <span style={{ color: 'var(--on-track)' }}>Acknowledged</span>
                            ) : (
                              <span style={{ color: 'var(--alert)' }}>Unacknowledged</span>
                            )}
                          </td>
                          <td className="py-3 px-4 text-right">
                            {!alt.acknowledged && (
                              <button
                                onClick={() => handleAcknowledgeAlert(alt.id)}
                                className="btn-ink px-2.5 py-1 text-xs"
                              >
                                Acknowledge
                              </button>
                            )}
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* Officer Workload Breakdown */}
            {analytics?.officers && (
              <div style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)' }}>
                <div className="p-4" style={{ borderBottom: '1px solid var(--divider)' }}>
                  <h3 className="text-sm font-semibold" style={{ color: 'var(--text-1)' }}>Officer Caseload Distribution</h3>
                </div>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 p-4">
                  {analytics.officers.map((off) => (
                    <div
                      key={off.officer_id}
                      className="p-4 space-y-2"
                      style={{ border: '1px solid var(--divider)', backgroundColor: 'var(--panel)' }}
                    >
                      <div className="font-semibold text-xs" style={{ color: 'var(--text-1)' }}>{off.officer_name}</div>
                      <div className="font-mono text-[11px]" style={{ color: 'var(--text-3)' }}>{off.email}</div>
                      <div className="grid grid-cols-3 gap-2 pt-2 text-center text-xs" style={{ borderTop: '1px solid var(--divider)' }}>
                        <div>
                          <span className="block text-[10px]" style={{ color: 'var(--text-3)' }}>Assigned</span>
                          <span className="font-mono font-bold" style={{ color: 'var(--text-1)' }}>{off.assigned_requests}</span>
                        </div>
                        <div>
                          <span className="block text-[10px]" style={{ color: 'var(--text-3)' }}>Done</span>
                          <span className="font-mono font-bold" style={{ color: 'var(--on-track)' }}>{off.completed_requests}</span>
                        </div>
                        <div>
                          <span className="block text-[10px]" style={{ color: 'var(--text-3)' }}>Overdue</span>
                          <span className="font-mono font-bold" style={{ color: 'var(--alert)' }}>{off.overdue_requests}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </main>

      {/* DETAIL INSPECTION MODAL */}
      {showDetailModal && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div
            className="max-w-2xl w-full max-h-[90vh] overflow-y-auto p-6 space-y-6"
            style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)' }}
          >
            <div className="flex items-center justify-between pb-3" style={{ borderBottom: '1px solid var(--divider)' }}>
              <div>
                <span className="text-[10px] uppercase font-mono block" style={{ color: 'var(--text-3)' }}>Application Detail</span>
                <div className="flex items-center gap-3">
                  <span className="text-lg font-mono font-bold" style={{ color: 'var(--text-1)' }}>{selectedRequest.reference}</span>
                  {renderStatus(selectedRequest.status)}
                </div>
              </div>
              <button onClick={() => setShowDetailModal(false)} className="p-1" style={{ color: 'var(--text-3)' }}>
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Action Bar */}
            <div className="flex flex-wrap gap-2">
              {(currentUser?.role === 'OFFICER' || currentUser?.role === 'SUPERVISOR') && (
                <button onClick={() => setShowTransitionModal(true)} className="btn-ink px-3 py-1.5 text-xs">
                  Update Status
                </button>
              )}
              {currentUser?.role === 'SUPERVISOR' && (
                <button onClick={() => setShowAssignModal(true)} className="btn-outline px-3 py-1.5 text-xs">
                  Assign Officer
                </button>
              )}
              {selectedRequest.status === 'COMPLETED' && (
                <a
                  href={api.getCertificateDownloadUrl(selectedRequest.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="btn-outline px-3 py-1.5 text-xs flex items-center gap-1.5"
                >
                  <Download className="w-3.5 h-3.5" />
                  Certificate (PDF)
                </a>
              )}
            </div>

            {/* Document Verification Section */}
            <div className="space-y-3 pt-3" style={{ borderTop: '1px solid var(--divider)' }}>
              <div className="flex items-center justify-between text-xs font-semibold" style={{ color: 'var(--text-1)' }}>
                <span>Documents ({requestDocuments.length})</span>
              </div>

              <form onSubmit={handleUploadDocument} className="flex items-center gap-2">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="text-xs file:mr-2 file:py-1 file:px-3 file:border file:border-border file:text-xs file:bg-panel file:text-text-1"
                />
                <button type="submit" disabled={!selectedFile || uploadingDoc} className="btn-ink px-3 py-1 text-xs">
                  {uploadingDoc ? 'Uploading...' : 'Upload'}
                </button>
              </form>

              <div className="space-y-2 mt-2">
                {requestDocuments.map((doc) => (
                  <div
                    key={doc.id}
                    className="p-3 text-xs flex items-center justify-between gap-3"
                    style={{ border: '1px solid var(--divider)', backgroundColor: 'var(--panel)' }}
                  >
                    <div>
                      <span className="font-medium" style={{ color: 'var(--text-1)' }}>{doc.filename}</span>
                      <span className="ml-2 font-mono text-[11px]" style={{ color: 'var(--text-3)' }}>({(doc.file_size / 1024).toFixed(1)} KB)</span>
                      <div className="mt-1 flex items-center gap-2">
                        {renderStatus(doc.status === 'VERIFIED' ? 'On track' : doc.status === 'REJECTED' ? 'REJECTED' : 'Due soon')}
                        {doc.review_comment && (
                          <span style={{ color: 'var(--text-3)' }}>Note: {doc.review_comment}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={api.getDocumentDownloadUrl(doc.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                        style={{ color: 'var(--text-1)' }}
                      >
                        Download
                      </a>
                      {(currentUser?.role === 'OFFICER' || currentUser?.role === 'SUPERVISOR') && doc.status === 'PENDING' && (
                        <div className="flex gap-1.5">
                          <button
                            onClick={() => handleVerifyDocument(doc.id, 'VERIFIED')}
                            className="btn-ink px-2 py-0.5 text-xs"
                          >
                            Verify
                          </button>
                          <button
                            onClick={() => handleVerifyDocument(doc.id, 'REJECTED')}
                            className="btn-outline px-2 py-0.5 text-xs"
                            style={{ color: 'var(--alert)' }}
                          >
                            Reject
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Audit Trail */}
            <div className="space-y-2 pt-3" style={{ borderTop: '1px solid var(--divider)' }}>
              <span className="text-xs font-semibold block" style={{ color: 'var(--text-1)' }}>Audit Trail</span>
              <div className="max-h-48 overflow-y-auto space-y-1.5 text-xs">
                {requestEvents.map((ev) => (
                  <div key={ev.id} className="p-2.5" style={{ border: '1px solid var(--divider)', backgroundColor: 'var(--panel)' }}>
                    <div className="flex justify-between">
                      <span className="font-mono" style={{ color: 'var(--text-1)' }}>{ev.from_status} ➔ {ev.to_status}</span>
                      <span className="font-mono text-[10px]" style={{ color: 'var(--text-3)' }}>
                        {new Date(ev.created_at).toLocaleString()}
                      </span>
                    </div>
                    {ev.reason && <p className="mt-0.5" style={{ color: 'var(--text-2)' }}>{ev.reason}</p>}
                    <span className="text-[10px]" style={{ color: 'var(--text-3)' }}>Actor: {ev.actor_name || 'System / Citizen'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW REQUEST MODAL */}
      {showNewRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="max-w-md w-full p-6 space-y-4" style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>New Service Application</h3>
              <button onClick={() => setShowNewRequestModal(false)} style={{ color: 'var(--text-3)' }}><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 font-medium" style={{ color: 'var(--text-2)' }}>Service</label>
                <select
                  value={newReqServiceCode}
                  onChange={(e) => setNewReqServiceCode(e.target.value)}
                  className="w-full px-3 py-2 text-xs focus:outline-none"
                  style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                >
                  <option value="">Select Service...</option>
                  {services.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name} ({s.sla_working_days} days SLA)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 font-medium" style={{ color: 'var(--text-2)' }}>Notes (Optional)</label>
                <textarea
                  rows={3}
                  value={newReqNotes}
                  onChange={(e) => setNewReqNotes(e.target.value)}
                  className="w-full px-3 py-2 text-xs focus:outline-none"
                  style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                  placeholder="Notes or purpose"
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowNewRequestModal(false)} className="btn-outline px-3 py-1.5 text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={loading || !newReqServiceCode} className="btn-ink px-3 py-1.5 text-xs">
                  Submit
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BOOK APPOINTMENT MODAL */}
      {showAppointmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="max-w-md w-full p-6 space-y-4" style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Book Counter Appointment</h3>
              <button onClick={() => setShowAppointmentModal(false)} style={{ color: 'var(--text-3)' }}><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleBookAppointment} className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 font-medium" style={{ color: 'var(--text-2)' }}>Office Location</label>
                <select
                  value={apptOfficeCode}
                  onChange={(e) => {
                    setApptOfficeCode(e.target.value);
                    handleCheckAvailability(e.target.value, apptDate);
                  }}
                  className="w-full px-3 py-2 text-xs focus:outline-none"
                  style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                >
                  <option value="">Select Office...</option>
                  {offices.map((o) => (
                    <option key={o.code} value={o.code}>{o.name} ({o.code})</option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block mb-1 font-medium" style={{ color: 'var(--text-2)' }}>Date (Sunday–Friday)</label>
                <input
                  type="date"
                  value={apptDate}
                  onChange={(e) => {
                    setApptDate(e.target.value);
                    handleCheckAvailability(apptOfficeCode, e.target.value);
                  }}
                  className="w-full px-3 py-2 text-xs font-mono focus:outline-none"
                  style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                />
              </div>

              {availableSlots.length > 0 && (
                <div>
                  <label className="block mb-1 font-medium" style={{ color: 'var(--text-2)' }}>30-Minute Slots</label>
                  <div className="grid grid-cols-2 gap-2 max-h-40 overflow-y-auto">
                    {availableSlots.map((s) => (
                      <button
                        key={s.slot_start}
                        type="button"
                        disabled={s.places_left <= 0}
                        onClick={() => setApptSlot(s.slot_start)}
                        className="p-2 text-left text-xs font-mono transition"
                        style={{
                          backgroundColor: apptSlot === s.slot_start ? 'var(--ink)' : 'var(--panel)',
                          color: apptSlot === s.slot_start ? 'var(--on-ink)' : 'var(--text-1)',
                          border: '1px solid',
                          borderColor: apptSlot === s.slot_start ? 'var(--ink)' : 'var(--border)',
                          opacity: s.places_left <= 0 ? 0.4 : 1
                        }}
                      >
                        <div>{s.slot_start} - {s.slot_end}</div>
                        <div className="text-[10px]" style={{ color: apptSlot === s.slot_start ? 'var(--on-ink)' : 'var(--text-3)' }}>
                          {s.places_left > 0 ? `${s.places_left} places left` : 'Full'}
                        </div>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex justify-end gap-2 pt-2">
                <button type="button" onClick={() => setShowAppointmentModal(false)} className="btn-outline px-3 py-1.5 text-xs">
                  Cancel
                </button>
                <button type="submit" disabled={!apptSlot || loading} className="btn-ink px-3 py-1.5 text-xs">
                  Book Slot
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSITION MODAL */}
      {showTransitionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="max-w-md w-full p-6 space-y-4" style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)' }}>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Transition Workflow Status</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 font-medium" style={{ color: 'var(--text-2)' }}>Target Status</label>
                <select
                  value={transitionTarget}
                  onChange={(e) => setTransitionTarget(e.target.value)}
                  className="w-full px-3 py-2 text-xs font-mono focus:outline-none"
                  style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                >
                  <option value="">Select Status...</option>
                  <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                  <option value="NEEDS_INFO">NEEDS_INFO (Pauses Clock)</option>
                  <option value="APPROVED">APPROVED</option>
                  <option value="COMPLETED">COMPLETED (Generates Certificate)</option>
                  <option value="REJECTED">REJECTED</option>
                </select>
              </div>

              <div>
                <label className="block mb-1 font-medium" style={{ color: 'var(--text-2)' }}>Reason / Remark</label>
                <input
                  type="text"
                  value={transitionReason}
                  onChange={(e) => setTransitionReason(e.target.value)}
                  placeholder="e.g. Verified citizenship documentation"
                  className="w-full px-3 py-2 text-xs focus:outline-none"
                  style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                />
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowTransitionModal(false)} className="btn-outline px-3 py-1.5 text-xs">
                  Cancel
                </button>
                <button onClick={handleTransition} disabled={!transitionTarget || loading} className="btn-ink px-3 py-1.5 text-xs">
                  Confirm
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN OFFICER MODAL */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="max-w-md w-full p-6 space-y-4" style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)' }}>
            <h3 className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>Assign Officer</h3>
            <div className="space-y-3 text-xs">
              <div>
                <label className="block mb-1 font-medium" style={{ color: 'var(--text-2)' }}>Select Officer</label>
                {analytics?.officers && analytics.officers.length > 0 ? (
                  <select
                    value={assignOfficerId}
                    onChange={(e) => setAssignOfficerId(e.target.value)}
                    className="w-full px-3 py-2 text-xs focus:outline-none"
                    style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                  >
                    <option value="">Select an Officer...</option>
                    {analytics.officers.map((off) => (
                      <option key={off.officer_id} value={off.officer_id}>
                        {off.officer_name} ({off.email}) — {off.assigned_requests} active
                      </option>
                    ))}
                  </select>
                ) : (
                  <input
                    type="number"
                    value={assignOfficerId}
                    onChange={(e) => setAssignOfficerId(e.target.value)}
                    placeholder="e.g. 2"
                    className="w-full px-3 py-2 text-xs font-mono focus:outline-none"
                    style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                  />
                )}
              </div>

              <div className="flex justify-end gap-2 pt-2">
                <button onClick={() => setShowAssignModal(false)} className="btn-outline px-3 py-1.5 text-xs">
                  Cancel
                </button>
                <button onClick={handleAssignOfficer} disabled={!assignOfficerId || loading} className="btn-ink px-3 py-1.5 text-xs">
                  Assign
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* AUTH MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60">
          <div className="max-w-sm w-full p-6 space-y-4" style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)' }}>
            <div className="flex items-center justify-between">
              <h3 className="text-sm font-bold" style={{ color: 'var(--text-1)' }}>
                {authMode === 'login' ? 'Sign In' : 'Register Citizen Account'}
              </h3>
              <button onClick={() => setShowAuthModal(false)} style={{ color: 'var(--text-3)' }}><X className="w-4 h-4" /></button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-3 text-xs">
              {authMode === 'register' && (
                <div>
                  <label className="block mb-1 font-medium" style={{ color: 'var(--text-2)' }}>Full Name</label>
                  <input
                    type="text"
                    required
                    value={authFullName}
                    onChange={(e) => setAuthFullName(e.target.value)}
                    placeholder="e.g. John Citizen"
                    className="w-full px-3 py-2 text-xs focus:outline-none"
                    style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                  />
                </div>
              )}

              <div>
                <label className="block mb-1 font-medium" style={{ color: 'var(--text-2)' }}>Email</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@example.org"
                  className="w-full px-3 py-2 text-xs focus:outline-none"
                  style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                />
              </div>

              <div>
                <label className="block mb-1 font-medium" style={{ color: 'var(--text-2)' }}>Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-3 py-2 text-xs focus:outline-none"
                  style={{ backgroundColor: 'var(--panel)', border: '1px solid var(--border)', color: 'var(--text-1)' }}
                />
              </div>

              <button type="submit" disabled={loading} className="btn-ink w-full py-2 text-xs mt-2">
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>

              <div className="text-center pt-1">
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="underline"
                  style={{ color: 'var(--text-3)' }}
                >
                  {authMode === 'login' ? 'Need an account? Register' : 'Already registered? Sign In'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
