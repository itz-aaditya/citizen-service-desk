import React, { useState, useEffect } from 'react';
import {
  Clock,
  CheckCircle2,
  AlertCircle,
  Calendar,
  Building2,
  ShieldAlert,
  FileText,
  UserCheck,
  Search,
  ArrowRight,
  RefreshCw,
  LogOut,
  LogIn,
  AlertTriangle,
  PauseCircle,
  User,
  PlusCircle,
  X,
  MapPin,
  Check,
  Users,
  Bell,
  Download,
  UploadCloud,
  Award,
  FileCheck,
  BarChart3,
  TrendingUp,
  FileSpreadsheet,
  ShieldCheck,
  Sparkles,
  ExternalLink,
  ChevronRight,
  Eye,
  CheckSquare,
  XCircle,
  Briefcase
} from 'lucide-react';
import { api, setToken, getToken } from './api';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('track'); // 'track', 'citizen', 'officer', 'supervisor'
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Public Tracking
  const [trackRef, setTrackRef] = useState('');
  const [trackResult, setTrackResult] = useState(null);
  const [trackError, setTrackError] = useState('');
  const [trackingLoading, setTrackingLoading] = useState(false);

  // Catalogue
  const [services, setServices] = useState([]);
  const [offices, setOffices] = useState([]);

  // Data lists
  const [requestsList, setRequestsList] = useState([]);
  const [appointmentsList, setAppointmentsList] = useState([]);
  const [alertsList, setAlertsList] = useState([]);
  const [delayReports, setDelayReports] = useState([]);
  const [analytics, setAnalytics] = useState(null);

  // Notifications
  const [notifications, setNotifications] = useState([]);
  const [showNotifications, setShowNotifications] = useState(false);

  // Modals & Selection
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestEvents, setRequestEvents] = useState([]);
  const [requestDocuments, setRequestDocuments] = useState([]);
  const [showDetailModal, setShowDetailModal] = useState(false);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
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

  // Auth Modal State
  const [showAuthModal, setShowAuthModal] = useState(false);
  const [authMode, setAuthMode] = useState('login'); // 'login' or 'register'
  const [authEmail, setAuthEmail] = useState('');
  const [authPassword, setAuthPassword] = useState('');
  const [authFullName, setAuthFullName] = useState('');

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  useEffect(() => {
    loadUser();
    loadCatalogue();
  }, []);

  useEffect(() => {
    if (currentUser) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 20000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  useEffect(() => {
    if (currentUser) {
      if (activeTab === 'citizen') loadCitizenData();
      if (activeTab === 'officer') loadOfficerData();
      if (activeTab === 'supervisor') loadSupervisorData();
    }
  }, [currentUser, activeTab]);

  const loadUser = async () => {
    const token = getToken();
    if (!token) return;
    try {
      const user = await api.getMe();
      setCurrentUser(user);
    } catch {
      setToken(null);
      setCurrentUser(null);
    }
  };

  const loadCatalogue = async () => {
    try {
      const [sList, oList] = await Promise.all([api.getServices(), api.getOffices()]);
      setServices(sList || []);
      setOffices(oList || []);
      if (sList?.length > 0) setNewReqServiceCode(sList[0].code);
      if (oList?.length > 0) setApptOfficeCode(oList[0].code);
    } catch (e) {
      console.error('Failed to load catalogue:', e);
    }
  };

  const loadNotifications = async () => {
    try {
      const data = await api.getNotifications();
      setNotifications(data || []);
    } catch (e) {
      console.error('Failed to load notifications:', e);
    }
  };

  const loadCitizenData = async () => {
    setLoading(true);
    try {
      const [reqs, appts] = await Promise.all([
        api.getRequests(),
        api.getAppointments()
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
    showToast('Signed out successfully');
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
      if (user.role === 'SUPERVISOR') setActiveTab('supervisor');
      else if (user.role === 'OFFICER') setActiveTab('officer');
      else setActiveTab('citizen');
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Tracking
  const handleTrackSubmit = async (e) => {
    if (e) e.preventDefault();
    if (!trackRef.trim()) return;
    setTrackingLoading(true);
    setTrackError('');
    setTrackResult(null);
    try {
      const data = await api.trackReference(trackRef.trim());
      setTrackResult(data);
    } catch (e) {
      setTrackError(e.message || 'Reference not found');
    } finally {
      setTrackingLoading(false);
    }
  };

  // Detail Modal
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

  // Document Upload
  const handleUploadDocument = async (e) => {
    e.preventDefault();
    if (!selectedFile || !selectedRequest) return;
    setUploadingDoc(true);
    try {
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

  // Verify Document
  const handleVerifyDocument = async (docId, status) => {
    try {
      await api.verifyDocument(docId, status, docReviewComment || undefined);
      showToast(`Document marked as ${status}`);
      setDocReviewComment('');
      if (selectedRequest) {
        const docs = await api.getRequestDocuments(selectedRequest.id);
        setRequestDocuments(docs);
      }
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  // Submit New Request
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      const res = await api.createRequest(newReqServiceCode, newReqNotes || undefined);
      showToast(`Service request created: ${res.reference}`);
      setShowNewRequestModal(false);
      setNewReqNotes('');
      loadCitizenData();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Book Appointment
  const handleCheckAvailability = async (officeCode, date) => {
    if (!officeCode || !date) return;
    try {
      const res = await api.getAvailability(officeCode, date);
      setAvailableSlots(res?.slots || []);
    } catch (e) {
      setAvailableSlots([]);
      showToast(e.message, 'error');
    }
  };

  const handleBookAppointment = async (e) => {
    e.preventDefault();
    try {
      setLoading(true);
      await api.bookAppointment(apptOfficeCode, apptDate, apptSlot);
      showToast('Appointment booked successfully!');
      setShowAppointmentModal(false);
      loadCitizenData();
    } catch (e) {
      showToast(e.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Transition Request
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

  // Assign Officer
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

  // Manual SLA Scan
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

  // Acknowledge Alert
  const handleAckAlert = async (id) => {
    try {
      await api.ackAlert(id);
      showToast('Alert acknowledged');
      loadSupervisorData();
    } catch (e) {
      showToast(e.message, 'error');
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  const getStatusBadge = (status) => {
    switch (status) {
      case 'SUBMITTED':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-sky-50 text-sky-700 border border-sky-200"><span className="w-1.5 h-1.5 rounded-full bg-sky-500"></span>Submitted</span>;
      case 'UNDER_REVIEW':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-blue-50 text-blue-700 border border-blue-200"><span className="w-1.5 h-1.5 rounded-full bg-blue-500 animate-pulse"></span>Under Review</span>;
      case 'NEEDS_INFO':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-amber-50 text-amber-700 border border-amber-200"><PauseCircle className="w-3.5 h-3.5 text-amber-500" />Needs Info (Clock Paused)</span>;
      case 'APPROVED':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-emerald-50 text-emerald-700 border border-emerald-200"><CheckCircle2 className="w-3.5 h-3.5 text-emerald-600" />Approved</span>;
      case 'COMPLETED':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-purple-50 text-purple-700 border border-purple-200"><Award className="w-3.5 h-3.5 text-purple-600" />Completed</span>;
      case 'REJECTED':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-rose-50 text-rose-700 border border-rose-200"><XCircle className="w-3.5 h-3.5 text-rose-600" />Rejected</span>;
      case 'CANCELLED':
        return <span className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-slate-600 border border-slate-200">Cancelled</span>;
      default:
        return <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800">{status}</span>;
    }
  };

  return (
    <div className="min-h-screen flex flex-col bg-mesh text-slate-800">
      {/* Toast Notification */}
      {toast && (
        <div className="fixed bottom-6 right-6 z-50 animate-bounce">
          <div className={`flex items-center gap-3 px-5 py-3.5 rounded-xl shadow-2xl text-sm font-semibold border ${
            toast.type === 'error'
              ? 'bg-rose-900/95 text-rose-50 border-rose-700 shadow-rose-900/40'
              : 'bg-slate-900/95 text-white border-slate-700 shadow-slate-950/40'
          }`}>
            {toast.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-400" /> : <CheckCircle2 className="w-5 h-5 text-emerald-400" />}
            {toast.message}
          </div>
        </div>
      )}

      {/* Top Government Banner */}
      <div className="bg-navy-950 text-slate-300 text-xs px-6 py-2 border-b border-slate-800/80 flex flex-wrap items-center justify-between gap-4">
        <div className="flex items-center gap-3">
          <span className="flex items-center gap-1.5 text-emerald-400 font-medium">
            <span className="w-2 h-2 rounded-full bg-emerald-500 animate-ping"></span>
            SLA Daemon Active
          </span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Sunday–Friday Business Calendar</span>
          <span className="text-slate-600">|</span>
          <span className="text-slate-400">Tamper-Evident QR Verification</span>
        </div>

        {/* Quick Demo Switcher */}
        <div className="flex items-center gap-2">
          <span className="text-slate-400 font-medium hidden sm:inline">1-Click Demo Login:</span>
          <button
            onClick={() => handleQuickDemoLogin('citizen1@example.org', 'citizen')}
            className="px-2.5 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
          >
            👤 Citizen
          </button>
          <button
            onClick={() => handleQuickDemoLogin('officer1@example.org', 'officer')}
            className="px-2.5 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
          >
            👮 Officer
          </button>
          <button
            onClick={() => handleQuickDemoLogin('supervisor@example.org', 'supervisor')}
            className="px-2.5 py-0.5 rounded-md bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-medium transition"
          >
            👔 Supervisor
          </button>
        </div>
      </div>

      {/* Main Glass Navbar */}
      <header className="sticky top-0 z-40 glass-panel border-b border-slate-200/80 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-20 flex items-center justify-between gap-6">
          {/* Brand Logo */}
          <div className="flex items-center gap-3.5 cursor-pointer" onClick={() => setActiveTab('track')}>
            <div className="w-11 h-11 rounded-xl bg-gradient-to-tr from-brand-700 to-brand-500 flex items-center justify-center text-white shadow-glow-primary">
              <ShieldCheck className="w-6 h-6" />
            </div>
            <div>
              <div className="text-lg font-extrabold text-slate-900 tracking-tight flex items-center gap-2">
                Citizen Service Desk
                <span className="text-[10px] uppercase font-bold tracking-wider px-2 py-0.5 rounded bg-brand-100 text-brand-700">Official</span>
              </div>
              <p className="text-xs text-slate-500 font-medium">Public Service & SLA Processing Portal</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="hidden md:flex items-center gap-1.5 bg-slate-100/80 p-1.5 rounded-2xl border border-slate-200/60">
            <button
              onClick={() => setActiveTab('track')}
              className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                activeTab === 'track'
                  ? 'bg-white text-brand-700 shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
              }`}
            >
              <Search className="w-4 h-4" />
              Public Tracking
            </button>

            {(!currentUser || currentUser.role === 'CITIZEN') && (
              <button
                onClick={() => {
                  if (!currentUser) setShowAuthModal(true);
                  else setActiveTab('citizen');
                }}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'citizen'
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <User className="w-4 h-4" />
                Citizen Portal
              </button>
            )}

            {currentUser?.role === 'OFFICER' && (
              <button
                onClick={() => setActiveTab('officer')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'officer'
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <Briefcase className="w-4 h-4" />
                Officer Queue
              </button>
            )}

            {currentUser?.role === 'SUPERVISOR' && (
              <button
                onClick={() => setActiveTab('supervisor')}
                className={`flex items-center gap-2 px-4 py-2 rounded-xl text-sm font-semibold transition-all ${
                  activeTab === 'supervisor'
                    ? 'bg-white text-brand-700 shadow-sm'
                    : 'text-slate-600 hover:text-slate-900 hover:bg-white/50'
                }`}
              >
                <BarChart3 className="w-4 h-4" />
                Supervisor Radar
              </button>
            )}
          </nav>

          {/* User & Notification Controls */}
          <div className="flex items-center gap-3">
            {currentUser && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="relative p-2.5 rounded-xl border border-slate-200 bg-white hover:bg-slate-50 text-slate-700 transition"
                >
                  <Bell className="w-5 h-5" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-5 h-5 rounded-full bg-rose-500 text-white text-[11px] font-bold flex items-center justify-center animate-pulse">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-3 w-80 sm:w-96 rounded-2xl glass-panel shadow-2xl p-4 border border-slate-200 z-50">
                    <div className="flex items-center justify-between pb-3 border-b border-slate-100">
                      <div className="font-bold text-slate-900 text-sm flex items-center gap-2">
                        <Bell className="w-4 h-4 text-brand-600" />
                        In-App Notifications
                        <span className="text-xs bg-slate-100 text-slate-700 px-2 py-0.5 rounded-full font-semibold">
                          {notifications.length}
                        </span>
                      </div>
                      {unreadCount > 0 && (
                        <button
                          onClick={async () => {
                            await api.readAllNotifications();
                            loadNotifications();
                          }}
                          className="text-xs text-brand-600 font-semibold hover:underline"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>

                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100 mt-2">
                      {notifications.length === 0 ? (
                        <div className="py-8 text-center text-xs text-slate-400">
                          No notifications yet.
                        </div>
                      ) : (
                        notifications.map((n) => (
                          <div
                            key={n.id}
                            className={`p-3 text-xs transition rounded-lg ${
                              !n.is_read ? 'bg-brand-50/70 font-medium' : 'text-slate-600 hover:bg-slate-50'
                            }`}
                          >
                            <div className="flex items-start justify-between gap-2">
                              <span className="font-semibold text-slate-800">{n.title}</span>
                              {!n.is_read && (
                                <button
                                  onClick={async () => {
                                    await api.readNotification(n.id);
                                    loadNotifications();
                                  }}
                                  className="text-[11px] text-brand-600 font-bold hover:underline shrink-0"
                                >
                                  Read
                                </button>
                              )}
                            </div>
                            <p className="text-slate-600 mt-1">{n.message}</p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {new Date(n.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                            </span>
                          </div>
                        ))
                      )}
                    </div>
                  </div>
                )}
              </div>
            )}

            {currentUser ? (
              <div className="flex items-center gap-3 bg-white pl-3.5 pr-2 py-1.5 rounded-2xl border border-slate-200/80 shadow-sm">
                <div className="text-right">
                  <div className="text-xs font-bold text-slate-900 leading-tight">{currentUser.full_name}</div>
                  <span className="text-[10px] font-semibold uppercase px-1.5 py-0.5 rounded bg-slate-100 text-slate-600">
                    {currentUser.role}
                  </span>
                </div>
                <button
                  onClick={handleLogout}
                  title="Sign out"
                  className="p-2 rounded-xl text-slate-400 hover:text-rose-600 hover:bg-rose-50 transition"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <button
                onClick={() => setShowAuthModal(true)}
                className="flex items-center gap-2 px-5 py-2.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-sm shadow-md transition"
              >
                <LogIn className="w-4 h-4" />
                Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Body */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* PUBLIC TRACKING VIEW */}
        {activeTab === 'track' && (
          <div className="space-y-10">
            {/* Hero Search Section */}
            <div className="relative rounded-3xl bg-gradient-to-br from-navy-900 via-navy-800 to-slate-900 text-white p-8 sm:p-14 overflow-hidden shadow-2xl border border-slate-800">
              <div className="absolute -right-20 -bottom-20 w-96 h-96 bg-brand-500/10 rounded-full blur-3xl pointer-events-none"></div>
              <div className="absolute -left-20 -top-20 w-80 h-80 bg-emerald-500/10 rounded-full blur-3xl pointer-events-none"></div>

              <div className="relative z-10 max-w-2xl mx-auto text-center space-y-4">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-brand-500/20 text-brand-300 text-xs font-semibold border border-brand-500/30">
                  <Sparkles className="w-3.5 h-3.5" />
                  Statutory Public Service Tracking
                </div>
                <h1 className="text-3xl sm:text-5xl font-extrabold tracking-tight">
                  Track Your Application in Real-Time
                </h1>
                <p className="text-slate-300 text-sm sm:text-base leading-relaxed">
                  Enter your official application reference number below to view instant milestone progress, due dates, and verified completion status without exposing citizen personal data.
                </p>

                {/* Search Bar */}
                <form onSubmit={handleTrackSubmit} className="mt-8 flex flex-col sm:flex-row gap-3 items-stretch">
                  <div className="relative flex-1">
                    <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. SR-2026-000001"
                      value={trackRef}
                      onChange={(e) => setTrackRef(e.target.value.toUpperCase())}
                      className="w-full pl-12 pr-4 py-4 rounded-2xl bg-white/10 backdrop-blur-md border border-white/20 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-brand-400 text-base font-semibold tracking-wide"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={trackingLoading || !trackRef.trim()}
                    className="px-8 py-4 rounded-2xl bg-brand-500 hover:bg-brand-600 active:scale-95 text-white font-bold text-base shadow-glow-primary transition disabled:opacity-50 flex items-center justify-center gap-2"
                  >
                    {trackingLoading ? <RefreshCw className="w-5 h-5 animate-spin" /> : 'Inspect Status'}
                    <ArrowRight className="w-5 h-5" />
                  </button>
                </form>

                {/* Sample Reference Pills */}
                <div className="pt-2 flex items-center justify-center gap-2 flex-wrap text-xs text-slate-400">
                  <span>Try sample references:</span>
                  <button
                    type="button"
                    onClick={() => { setTrackRef('SR-2026-000001'); setTimeout(() => handleTrackSubmit(), 100); }}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-brand-300 font-mono transition"
                  >
                    SR-2026-000001
                  </button>
                  <button
                    type="button"
                    onClick={() => { setTrackRef('SR-2026-000002'); setTimeout(() => handleTrackSubmit(), 100); }}
                    className="px-2.5 py-1 rounded-lg bg-white/10 hover:bg-white/20 text-brand-300 font-mono transition"
                  >
                    SR-2026-000002
                  </button>
                </div>
              </div>
            </div>

            {/* Tracking Result Display */}
            {trackError && (
              <div className="p-6 rounded-2xl bg-rose-50 border border-rose-200 text-rose-700 flex items-center gap-3">
                <AlertCircle className="w-6 h-6 shrink-0" />
                <span className="font-semibold">{trackError}</span>
              </div>
            )}

            {trackResult && (
              <div className="glass-panel p-8 sm:p-10 rounded-3xl border border-slate-200 shadow-xl space-y-8 animate-fadeIn">
                <div className="flex flex-wrap items-center justify-between gap-4 pb-6 border-b border-slate-200/80">
                  <div>
                    <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Official Reference</span>
                    <div className="text-2xl sm:text-3xl font-extrabold text-slate-900 font-mono flex items-center gap-3">
                      {trackResult.reference}
                      <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">Verified</span>
                    </div>
                  </div>
                  <div>
                    {getStatusBadge(trackResult.status)}
                  </div>
                </div>

                {/* 4-Step Visual Stepper */}
                <div className="relative py-4">
                  <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                    {[
                      { step: 'SUBMITTED', title: '1. Registered', desc: 'File lodged in system' },
                      { step: 'UNDER_REVIEW', title: '2. Under Review', desc: 'Officer validation' },
                      { step: 'APPROVED', title: '3. Approved', desc: 'Statutory verification' },
                      { step: 'COMPLETED', title: '4. Completed', desc: 'Resolution & Certificate' },
                    ].map((item, idx) => {
                      const stages = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'COMPLETED'];
                      const currentIdx = stages.indexOf(trackResult.status);
                      const isPast = currentIdx >= idx;
                      const isCurrent = trackResult.status === item.step;

                      return (
                        <div
                          key={item.step}
                          className={`p-4 rounded-2xl border transition ${
                            isCurrent
                              ? 'bg-brand-50/80 border-brand-300 ring-2 ring-brand-400/30'
                              : isPast
                              ? 'bg-slate-50 border-slate-200'
                              : 'bg-white/40 border-dashed border-slate-200 opacity-60'
                          }`}
                        >
                          <div className="flex items-center gap-2 mb-1.5">
                            <span className={`w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold ${
                              isPast ? 'bg-brand-600 text-white' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {idx + 1}
                            </span>
                            <span className="font-bold text-sm text-slate-900">{item.title}</span>
                          </div>
                          <p className="text-xs text-slate-500 pl-8">{item.desc}</p>
                        </div>
                      );
                    })}
                  </div>
                </div>

                {/* Details Grid */}
                <div className="grid grid-cols-1 sm:grid-cols-3 gap-6 p-6 rounded-2xl bg-slate-50/80 border border-slate-200/80">
                  <div>
                    <span className="text-xs text-slate-500 block font-medium">Service Catalogue</span>
                    <span className="text-sm font-bold text-slate-900">{trackResult.service_name}</span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block font-medium">Lodged Date</span>
                    <span className="text-sm font-bold text-slate-900 font-mono">
                      {new Date(trackResult.submitted_at).toLocaleDateString([], { dateStyle: 'medium' })}
                    </span>
                  </div>
                  <div>
                    <span className="text-xs text-slate-500 block font-medium">Target Statutory Due Date</span>
                    <span className="text-sm font-bold text-brand-700 font-mono">
                      {new Date(trackResult.due_date).toLocaleDateString([], { dateStyle: 'medium' })}
                    </span>
                  </div>
                </div>

                {/* Zero PII Notice */}
                <div className="flex items-center gap-2 text-xs text-slate-500">
                  <ShieldCheck className="w-4 h-4 text-emerald-600 shrink-0" />
                  <span>Public Privacy Guard: No citizen names, identification numbers, or contact details are exposed in public tracking.</span>
                </div>
              </div>
            )}
          </div>
        )}

        {/* CITIZEN PORTAL */}
        {activeTab === 'citizen' && currentUser && (
          <div className="space-y-8 animate-fadeIn">
            {/* Welcome & Actions Header */}
            <div className="flex flex-wrap items-center justify-between gap-4 p-8 rounded-3xl bg-gradient-to-r from-brand-600 to-brand-800 text-white shadow-xl">
              <div>
                <span className="text-xs font-bold uppercase tracking-wider text-brand-200">Citizen Self-Service Portal</span>
                <h2 className="text-2xl sm:text-3xl font-extrabold mt-1">Hello, {currentUser.full_name}</h2>
                <p className="text-sm text-brand-100 mt-1">Manage applications, submit supporting documents, and book counter appointments.</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowNewRequestModal(true)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-white text-brand-800 hover:bg-brand-50 font-bold text-sm shadow-md transition active:scale-95"
                >
                  <PlusCircle className="w-4 h-4 text-brand-600" />
                  New Request
                </button>
                <button
                  onClick={() => setShowAppointmentModal(true)}
                  className="flex items-center gap-2 px-5 py-3 rounded-xl bg-brand-700/80 hover:bg-brand-700 text-white border border-brand-500/50 font-bold text-sm transition active:scale-95"
                >
                  <Calendar className="w-4 h-4" />
                  Book Appointment
                </button>
              </div>
            </div>

            {/* Applications List */}
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">My Service Applications</h3>
                  <p className="text-xs text-slate-500">Track and manage your submitted applications</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                  {requestsList.length} Total
                </span>
              </div>

              {requestsList.length === 0 ? (
                <div className="py-12 text-center text-slate-400 text-sm">
                  You haven't submitted any service requests yet.
                </div>
              ) : (
                <div className="grid grid-cols-1 gap-4">
                  {requestsList.map((req) => (
                    <div
                      key={req.id}
                      className="p-5 rounded-2xl bg-white border border-slate-200/80 hover:border-brand-300 hover:shadow-md transition flex flex-wrap items-center justify-between gap-4"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-3">
                          <span className="font-mono text-sm font-bold text-slate-900">{req.reference}</span>
                          {getStatusBadge(req.status)}
                        </div>
                        <div className="text-sm font-semibold text-slate-700">{req.service_name}</div>
                        <div className="text-xs text-slate-400">
                          Due Date: <span className="font-mono font-medium text-slate-600">{new Date(req.due_date).toLocaleDateString()}</span>
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        {req.status === 'COMPLETED' && (
                          <a
                            href={api.getCertificateDownloadUrl(req.id)}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition"
                          >
                            <Award className="w-3.5 h-3.5" />
                            Certificate (PDF)
                          </a>
                        )}

                        <button
                          onClick={() => openRequestDetail(req)}
                          className="flex items-center gap-1.5 px-3.5 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs transition"
                        >
                          <Eye className="w-3.5 h-3.5" />
                          View File & Docs
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Appointments Section */}
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">My Office Appointments</h3>
                  <p className="text-xs text-slate-500">Reserved counter attendance timeslots</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-slate-100 text-slate-700">
                  {appointmentsList.length} Scheduled
                </span>
              </div>

              {appointmentsList.length === 0 ? (
                <div className="py-8 text-center text-slate-400 text-sm">
                  No appointments scheduled.
                </div>
              ) : (
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {appointmentsList.map((a) => (
                    <div key={a.id} className="p-5 rounded-2xl bg-white border border-slate-200 space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="text-xs font-bold px-2 py-0.5 rounded bg-brand-50 text-brand-700 font-mono">
                          {a.office_code}
                        </span>
                        <span className={`text-xs font-bold px-2 py-0.5 rounded ${
                          a.status === 'BOOKED' ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'
                        }`}>
                          {a.status}
                        </span>
                      </div>
                      <div>
                        <div className="font-bold text-sm text-slate-800">{a.office_name}</div>
                        <div className="text-xs text-slate-500 flex items-center gap-1.5 mt-1 font-mono">
                          <Calendar className="w-3.5 h-3.5 text-slate-400" />
                          {a.appointment_date} | {a.slot_start} - {a.slot_end}
                        </div>
                      </div>
                      {a.status === 'BOOKED' && (
                        <button
                          onClick={async () => {
                            if (window.confirm('Cancel this appointment?')) {
                              await api.cancelAppointment(a.id);
                              showToast('Appointment cancelled');
                              loadCitizenData();
                            }
                          }}
                          className="w-full text-center py-1.5 rounded-lg border border-rose-200 hover:bg-rose-50 text-rose-600 font-semibold text-xs transition"
                        >
                          Cancel Appointment
                        </button>
                      )}
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>
        )}

        {/* OFFICER QUEUE */}
        {activeTab === 'officer' && currentUser?.role === 'OFFICER' && (
          <div className="space-y-8 animate-fadeIn">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Assigned Processing Queue</h2>
                <p className="text-sm text-slate-500">Service requests assigned to your desk for review and verification</p>
              </div>
              <button
                onClick={loadOfficerData}
                className="flex items-center gap-2 px-4 py-2 rounded-xl bg-white border border-slate-200 hover:bg-slate-50 text-slate-700 text-xs font-bold shadow-sm transition"
              >
                <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                Refresh Queue
              </button>
            </div>

            <div className="grid grid-cols-1 gap-4">
              {requestsList.length === 0 ? (
                <div className="glass-panel p-12 text-center text-slate-400 text-sm rounded-3xl border border-slate-200">
                  No active requests assigned to you.
                </div>
              ) : (
                requestsList.map((req) => (
                  <div
                    key={req.id}
                    className="glass-panel p-6 rounded-2xl border border-slate-200/80 hover:shadow-md transition flex flex-wrap items-center justify-between gap-4"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-3">
                        <span className="font-mono text-base font-extrabold text-slate-900">{req.reference}</span>
                        {getStatusBadge(req.status)}
                      </div>
                      <div className="text-sm font-semibold text-slate-800">{req.service_name}</div>
                      <div className="text-xs text-slate-400">
                        Statutory Due Date: <span className="font-mono font-medium text-slate-600">{new Date(req.due_date).toLocaleDateString()}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openRequestDetail(req)}
                        className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs shadow-sm transition"
                      >
                        Inspect & Process
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        )}

        {/* SUPERVISOR RADAR & EXECUTIVE ANALYTICS */}
        {activeTab === 'supervisor' && currentUser?.role === 'SUPERVISOR' && (
          <div className="space-y-8 animate-fadeIn">
            {/* Header with Manual SLA Scan Trigger */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Executive Command & Delay Radar</h2>
                <p className="text-sm text-slate-500">Live statutory SLA compliance telemetry and delay alert escalation</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={handleManualScan}
                  className="flex items-center gap-2 px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white text-xs font-bold shadow-md transition"
                >
                  <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin' : ''}`} />
                  Run SLA Scan
                </button>
              </div>
            </div>

            {/* KPI Cards */}
            {analytics && (
              <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
                <div className="glass-panel p-6 rounded-2xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">SLA Compliance Rate</span>
                  <div className="text-3xl font-extrabold text-emerald-600 mt-2 font-mono">
                    {analytics.sla_compliance_rate}%
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block">Resolved within business days</span>
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Total Applications</span>
                  <div className="text-3xl font-extrabold text-slate-900 mt-2 font-mono">
                    {analytics.total_requests}
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block">Completed: {analytics.completed_requests}</span>
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">In-Progress Queue</span>
                  <div className="text-3xl font-extrabold text-blue-600 mt-2 font-mono">
                    {analytics.pending_requests}
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block">Active files under review</span>
                </div>

                <div className="glass-panel p-6 rounded-2xl border border-slate-200">
                  <span className="text-xs text-slate-500 font-bold uppercase tracking-wider block">Overdue Breaches</span>
                  <div className="text-3xl font-extrabold text-rose-600 mt-2 font-mono">
                    {analytics.overdue_requests}
                  </div>
                  <span className="text-xs text-slate-400 mt-1 block">Requires supervisor intervention</span>
                </div>
              </div>
            )}

            {/* Delay Reports Table */}
            <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Active Delay Escalation Radar</h3>
                  <p className="text-xs text-slate-500">Applications flagged by SLA scanner for attention</p>
                </div>
                <span className="text-xs font-semibold px-2.5 py-1 rounded-full bg-rose-50 text-rose-700 font-mono">
                  {delayReports.length} Flagged
                </span>
              </div>

              {delayReports.length === 0 ? (
                <div className="py-8 text-center text-emerald-600 text-sm font-semibold flex items-center justify-center gap-2">
                  <CheckCircle2 className="w-5 h-5" />
                  All active applications are currently operating within SLA targets!
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs">
                    <thead>
                      <tr className="border-b border-slate-200 text-slate-400 uppercase font-semibold">
                        <th className="py-3 px-4">Reference</th>
                        <th className="py-3 px-4">Service</th>
                        <th className="py-3 px-4">Due Date</th>
                        <th className="py-3 px-4">Delay Severity</th>
                        <th className="py-3 px-4">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {delayReports.map((d) => (
                        <tr key={d.reference} className="hover:bg-slate-50">
                          <td className="py-3.5 px-4 font-mono font-bold text-slate-900">{d.reference}</td>
                          <td className="py-3.5 px-4 font-medium text-slate-700">{d.service_name}</td>
                          <td className="py-3.5 px-4 font-mono text-slate-600">{new Date(d.due_date).toLocaleDateString()}</td>
                          <td className="py-3.5 px-4">
                            <div className="flex items-center gap-1.5 flex-wrap">
                              {d.delay_levels.map((lvl) => (
                                <span
                                  key={lvl}
                                  className={`px-2.5 py-0.5 rounded text-[11px] font-bold ${
                                    lvl === 'CRITICAL_200'
                                      ? 'bg-rose-100 text-rose-700 animate-pulse'
                                      : lvl === 'BREACH_100'
                                      ? 'bg-orange-100 text-orange-700'
                                      : 'bg-amber-100 text-amber-700'
                                  }`}
                                >
                                  {lvl}
                                </span>
                              ))}
                            </div>
                          </td>
                          <td className="py-3.5 px-4">
                            <button
                              onClick={() => {
                                const found = requestsList.find(r => r.reference === d.reference);
                                if (found) openRequestDetail(found);
                              }}
                              className="px-3 py-1 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold text-xs"
                            >
                              Inspect
                            </button>
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
              <div className="glass-panel p-6 sm:p-8 rounded-3xl border border-slate-200 shadow-sm space-y-6">
                <h3 className="text-lg font-bold text-slate-900">Officer Workload & Caseload Distribution</h3>
                <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                  {analytics.officers.map((off) => (
                    <div key={off.officer_id} className="p-4 rounded-2xl bg-white border border-slate-200 space-y-2">
                      <div className="font-bold text-sm text-slate-900">{off.officer_name}</div>
                      <div className="text-xs text-slate-400 font-mono">{off.email}</div>
                      <div className="grid grid-cols-3 gap-2 pt-2 text-center border-t border-slate-100">
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Assigned</span>
                          <span className="font-mono font-bold text-slate-800 text-sm">{off.assigned_requests}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Done</span>
                          <span className="font-mono font-bold text-emerald-600 text-sm">{off.completed_requests}</span>
                        </div>
                        <div>
                          <span className="text-[10px] text-slate-400 block font-semibold">Overdue</span>
                          <span className="font-mono font-bold text-rose-600 text-sm">{off.overdue_requests}</span>
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
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-3xl w-full max-h-[90vh] overflow-y-auto shadow-2xl border border-slate-200 p-6 sm:p-8 space-y-6">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100">
              <div>
                <span className="text-xs font-bold text-slate-400 uppercase font-mono">Application Details</span>
                <h3 className="text-2xl font-extrabold text-slate-900 font-mono flex items-center gap-3">
                  {selectedRequest.reference}
                  {getStatusBadge(selectedRequest.status)}
                </h3>
              </div>
              <button
                onClick={() => setShowDetailModal(false)}
                className="p-2 rounded-xl text-slate-400 hover:text-slate-700 hover:bg-slate-100"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Actions Toolbar for Officer & Supervisor */}
            <div className="flex flex-wrap gap-2 pt-2">
              {(currentUser?.role === 'OFFICER' || currentUser?.role === 'SUPERVISOR') && (
                <button
                  onClick={() => setShowTransitionModal(true)}
                  className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-sm transition"
                >
                  Update Workflow Status
                </button>
              )}

              {currentUser?.role === 'SUPERVISOR' && (
                <button
                  onClick={() => setShowAssignModal(true)}
                  className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-900 text-white font-bold text-xs transition"
                >
                  Assign Officer
                </button>
              )}

              {selectedRequest.status === 'COMPLETED' && (
                <a
                  href={api.getCertificateDownloadUrl(selectedRequest.id)}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-1.5 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-600 text-white font-bold text-xs shadow-sm transition"
                >
                  <Award className="w-4 h-4" />
                  Official Certificate (PDF)
                </a>
              )}
            </div>

            {/* Document Upload & Verification Section */}
            <div className="space-y-4 pt-4 border-t border-slate-100">
              <div className="flex items-center justify-between">
                <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                  <FileText className="w-4 h-4 text-brand-600" />
                  Supporting Documents ({requestDocuments.length})
                </h4>
              </div>

              {/* Upload input for citizen or staff */}
              <form onSubmit={handleUploadDocument} className="flex items-center gap-3">
                <input
                  type="file"
                  accept=".pdf,.png,.jpg,.jpeg"
                  onChange={(e) => setSelectedFile(e.target.files[0])}
                  className="text-xs file:mr-3 file:py-2 file:px-4 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-slate-100 file:text-slate-700 hover:file:bg-slate-200"
                />
                <button
                  type="submit"
                  disabled={!selectedFile || uploadingDoc}
                  className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs transition disabled:opacity-40"
                >
                  {uploadingDoc ? 'Uploading...' : 'Upload'}
                </button>
              </form>

              {/* Document list with verification controls */}
              <div className="space-y-2 mt-3">
                {requestDocuments.map((doc) => (
                  <div key={doc.id} className="p-3.5 rounded-xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-3 text-xs">
                    <div>
                      <span className="font-semibold text-slate-800">{doc.filename}</span>
                      <span className="text-slate-400 ml-2">({(doc.file_size / 1024).toFixed(1)} KB)</span>
                      <div className="mt-1">
                        <span className={`px-2 py-0.5 rounded text-[10px] font-bold ${
                          doc.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-700' :
                          doc.status === 'REJECTED' ? 'bg-rose-100 text-rose-700' :
                          'bg-amber-100 text-amber-700'
                        }`}>
                          {doc.status}
                        </span>
                        {doc.review_comment && (
                          <span className="text-slate-500 ml-2">Note: {doc.review_comment}</span>
                        )}
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <a
                        href={api.getDocumentDownloadUrl(doc.id)}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="px-3 py-1.5 rounded-lg bg-white border border-slate-200 hover:bg-slate-100 text-slate-700 font-semibold"
                      >
                        Download
                      </a>

                      {(currentUser?.role === 'OFFICER' || currentUser?.role === 'SUPERVISOR') && doc.status === 'PENDING' && (
                        <div className="flex items-center gap-1.5">
                          <button
                            onClick={() => handleVerifyDocument(doc.id, 'VERIFIED')}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-700 text-white font-bold"
                          >
                            Verify
                          </button>
                          <button
                            onClick={() => handleVerifyDocument(doc.id, 'REJECTED')}
                            className="px-3 py-1.5 rounded-lg bg-rose-600 hover:bg-rose-700 text-white font-bold"
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

            {/* Audit Events Trail */}
            <div className="space-y-3 pt-4 border-t border-slate-100">
              <h4 className="font-bold text-sm text-slate-900 flex items-center gap-2">
                <Clock className="w-4 h-4 text-brand-600" />
                Statutory Audit Trail
              </h4>
              <div className="max-h-52 overflow-y-auto space-y-2 text-xs">
                {requestEvents.map((ev) => (
                  <div key={ev.id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 space-y-1">
                    <div className="flex items-center justify-between">
                      <span className="font-semibold text-slate-800">
                        {ev.from_status} ➔ <span className="font-bold text-brand-700">{ev.to_status}</span>
                      </span>
                      <span className="text-slate-400 font-mono">
                        {new Date(ev.created_at).toLocaleString()}
                      </span>
                    </div>
                    {ev.reason && <p className="text-slate-600">Reason: {ev.reason}</p>}
                    <span className="text-[10px] text-slate-400">Actor: {ev.actor_name || 'System / Citizen'}</span>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* NEW REQUEST MODAL */}
      {showNewRequestModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-extrabold text-slate-900">New Service Application</h3>
              <button onClick={() => setShowNewRequestModal(false)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Select Service</label>
                <select
                  value={newReqServiceCode}
                  onChange={(e) => setNewReqServiceCode(e.target.value)}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {services.map((s) => (
                    <option key={s.code} value={s.code}>
                      {s.name} ({s.sla_working_days} working days SLA)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Notes / Purpose (Optional)</label>
                <textarea
                  rows={3}
                  value={newReqNotes}
                  onChange={(e) => setNewReqNotes(e.target.value)}
                  placeholder="e.g. Required for urgent overseas business travel"
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm focus:outline-none focus:ring-2 focus:ring-brand-500"
                ></textarea>
              </div>

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowNewRequestModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* BOOK APPOINTMENT MODAL */}
      {showAppointmentModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-lg w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-extrabold text-slate-900">Book Counter Appointment</h3>
              <button onClick={() => setShowAppointmentModal(false)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookAppointment} className="space-y-4">
              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Office Location</label>
                <select
                  value={apptOfficeCode}
                  onChange={(e) => {
                    setApptOfficeCode(e.target.value);
                    handleCheckAvailability(e.target.value, apptDate);
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                >
                  {offices.map((o) => (
                    <option key={o.code} value={o.code}>
                      {o.name} ({o.code})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1.5">Date (Sunday–Friday)</label>
                <input
                  type="date"
                  value={apptDate}
                  onChange={(e) => {
                    setApptDate(e.target.value);
                    handleCheckAvailability(apptOfficeCode, e.target.value);
                  }}
                  className="w-full px-4 py-3 rounded-xl border border-slate-200 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-brand-500"
                />
              </div>

              {availableSlots.length > 0 && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1.5">Available 30-Minute Slots</label>
                  <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                    {availableSlots.map((s) => (
                      <button
                        key={s.slot_start}
                        type="button"
                        disabled={s.places_left <= 0}
                        onClick={() => setApptSlot(s.slot_start)}
                        className={`p-2.5 rounded-xl border text-xs font-semibold text-left transition ${
                          apptSlot === s.slot_start
                            ? 'bg-brand-600 text-white border-brand-600'
                            : s.places_left > 0
                            ? 'bg-white hover:bg-slate-50 border-slate-200 text-slate-800'
                            : 'bg-slate-100 text-slate-400 border-slate-200 opacity-50 cursor-not-allowed'
                        }`}
                      >
                        <div>{s.slot_start} - {s.slot_end}</div>
                        <span className="text-[10px] block font-mono">
                          {s.places_left > 0 ? `${s.places_left} places left` : 'Fully Booked'}
                        </span>
                      </button>
                    ))}
                  </div>
                </div>
              )}

              <div className="flex items-center justify-end gap-3 pt-3">
                <button
                  type="button"
                  onClick={() => setShowAppointmentModal(false)}
                  className="px-5 py-2.5 rounded-xl border border-slate-200 text-slate-700 font-semibold text-xs hover:bg-slate-50"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={!apptSlot || loading}
                  className="px-5 py-2.5 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs shadow-md transition disabled:opacity-40"
                >
                  Confirm Appointment
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* TRANSITION MODAL */}
      {showTransitionModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Transition Workflow Status</h3>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Target Status</label>
              <select
                value={transitionTarget}
                onChange={(e) => setTransitionTarget(e.target.value)}
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold"
              >
                <option value="">Select Target Status...</option>
                <option value="UNDER_REVIEW">UNDER_REVIEW</option>
                <option value="NEEDS_INFO">NEEDS_INFO (Pauses SLA Clock)</option>
                <option value="APPROVED">APPROVED</option>
                <option value="COMPLETED">COMPLETED (Generates Certificate)</option>
                <option value="REJECTED">REJECTED</option>
              </select>
            </div>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Reason / Note</label>
              <input
                type="text"
                value={transitionReason}
                onChange={(e) => setTransitionReason(e.target.value)}
                placeholder="e.g. Verified supporting citizenship document"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowTransitionModal(false)}
                className="px-4 py-2 rounded-xl border text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleTransition}
                disabled={!transitionTarget || loading}
                className="px-4 py-2 rounded-xl bg-brand-600 hover:bg-brand-700 text-white font-bold text-xs"
              >
                Confirm Move
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ASSIGN OFFICER MODAL */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 shadow-2xl border border-slate-200 space-y-4">
            <h3 className="text-lg font-bold text-slate-900">Assign Request to Officer</h3>
            <div>
              <label className="text-xs font-bold text-slate-700 block mb-1">Officer User ID</label>
              <input
                type="number"
                value={assignOfficerId}
                onChange={(e) => setAssignOfficerId(e.target.value)}
                placeholder="e.g. 2"
                className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm"
              />
            </div>
            <div className="flex items-center justify-end gap-2 pt-2">
              <button
                onClick={() => setShowAssignModal(false)}
                className="px-4 py-2 rounded-xl border text-xs font-semibold"
              >
                Cancel
              </button>
              <button
                onClick={handleAssignOfficer}
                disabled={!assignOfficerId || loading}
                className="px-4 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}

      {/* AUTH MODAL */}
      {showAuthModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-slate-950/50 backdrop-blur-sm animate-fadeIn">
          <div className="bg-white rounded-3xl max-w-md w-full p-6 sm:p-8 shadow-2xl border border-slate-200 space-y-6">
            <div className="flex items-center justify-between">
              <h3 className="text-xl font-extrabold text-slate-900">
                {authMode === 'login' ? 'Sign In to Portal' : 'Citizen Registration'}
              </h3>
              <button onClick={() => setShowAuthModal(false)} className="p-1.5 text-slate-400 hover:text-slate-700">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleAuthSubmit} className="space-y-4">
              {authMode === 'register' && (
                <div>
                  <label className="text-xs font-bold text-slate-700 block mb-1">Full Legal Name</label>
                  <input
                    type="text"
                    required
                    value={authFullName}
                    onChange={(e) => setAuthFullName(e.target.value)}
                    placeholder="e.g. John Citizen"
                    className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold"
                  />
                </div>
              )}

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Email Address</label>
                <input
                  type="email"
                  required
                  value={authEmail}
                  onChange={(e) => setAuthEmail(e.target.value)}
                  placeholder="name@example.org"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold"
                />
              </div>

              <div>
                <label className="text-xs font-bold text-slate-700 block mb-1">Password</label>
                <input
                  type="password"
                  required
                  value={authPassword}
                  onChange={(e) => setAuthPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full px-4 py-2.5 rounded-xl border border-slate-200 text-sm font-semibold"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full py-3 rounded-xl bg-slate-900 hover:bg-slate-800 text-white font-bold text-sm shadow-md transition"
              >
                {authMode === 'login' ? 'Sign In' : 'Create Account'}
              </button>

              <div className="text-center pt-2">
                <button
                  type="button"
                  onClick={() => setAuthMode(authMode === 'login' ? 'register' : 'login')}
                  className="text-xs text-brand-600 font-semibold hover:underline"
                >
                  {authMode === 'login' ? "Don't have an account? Register here" : 'Already registered? Sign in'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
