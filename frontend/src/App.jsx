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
  FileSpreadsheet
} from 'lucide-react';
import { api, setToken, getToken } from './api';

export default function App() {
  const [currentUser, setCurrentUser] = useState(null);
  const [activeTab, setActiveTab] = useState('track'); // 'track', 'citizen', 'officer', 'supervisor'
  const [loading, setLoading] = useState(false);
  const [toast, setToast] = useState(null);

  // Reference tracking state
  const [trackRef, setTrackRef] = useState('');
  const [trackResult, setTrackResult] = useState(null);
  const [trackError, setTrackError] = useState('');

  // Catalogue data
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

  // Modals & Active selections
  const [selectedRequest, setSelectedRequest] = useState(null);
  const [requestEvents, setRequestEvents] = useState([]);
  const [requestDocuments, setRequestDocuments] = useState([]);
  const [showNewRequestModal, setShowNewRequestModal] = useState(false);
  const [showAppointmentModal, setShowAppointmentModal] = useState(false);
  const [showTransitionModal, setShowTransitionModal] = useState(false);
  const [transitionTarget, setTransitionTarget] = useState('');
  const [transitionReason, setTransitionReason] = useState('');
  const [showAssignModal, setShowAssignModal] = useState(false);
  const [assignOfficerId, setAssignOfficerId] = useState('');

  // Form states for new requests & appointments
  const [newReqServiceCode, setNewReqServiceCode] = useState('');
  const [newReqNotes, setNewReqNotes] = useState('');
  const [apptOfficeCode, setApptOfficeCode] = useState('');
  const [apptDate, setApptDate] = useState('');
  const [apptSlot, setApptSlot] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);

  // Document upload state
  const [selectedFile, setSelectedFile] = useState(null);
  const [uploadingDoc, setUploadingDoc] = useState(false);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 4000);
  };

  // Initial load
  useEffect(() => {
    loadUser();
    loadCatalogue();
  }, []);

  // Polling notifications every 20 seconds when logged in
  useEffect(() => {
    if (currentUser) {
      loadNotifications();
      const interval = setInterval(loadNotifications, 20000);
      return () => clearInterval(interval);
    }
  }, [currentUser]);

  // Load contextual data on user / tab change
  useEffect(() => {
    if (currentUser) {
      if (activeTab === 'citizen') {
        loadCitizenData();
      } else if (activeTab === 'officer') {
        loadOfficerData();
      } else if (activeTab === 'supervisor') {
        loadSupervisorData();
      }
    }
  }, [currentUser, activeTab]);

  const loadUser = async () => {
    if (!getToken()) return;
    try {
      const user = await api.getMe();
      setCurrentUser(user);
      if (user.role === 'SUPERVISOR') setActiveTab('supervisor');
      else if (user.role === 'OFFICER') setActiveTab('officer');
      else setActiveTab('citizen');
    } catch (err) {
      setToken(null);
      setCurrentUser(null);
    }
  };

  const loadNotifications = async () => {
    try {
      const notifs = await api.getNotifications();
      setNotifications(notifs || []);
    } catch (e) {
      // ignore in background
    }
  };

  const handleMarkAllNotificationsRead = async () => {
    try {
      await api.readAllNotifications();
      loadNotifications();
      showToast('All notifications marked as read');
    } catch (e) {
      console.error(e);
    }
  };

  const loadCatalogue = async () => {
    try {
      const [svc, off] = await Promise.all([api.getServices(), api.getOffices()]);
      setServices(svc || []);
      setOffices(off || []);
      if (svc.length > 0) setNewReqServiceCode(svc[0].code);
      if (off.length > 0) setApptOfficeCode(off[0].code);
    } catch (err) {
      console.error(err);
    }
  };

  const handleFastLogin = async (email, password) => {
    setLoading(true);
    try {
      const res = await api.login(email, password);
      setToken(res.access_token);
      const user = await api.getMe();
      setCurrentUser(user);
      showToast(`Logged in as ${user.full_name} (${user.role})`);
      if (user.role === 'SUPERVISOR') setActiveTab('supervisor');
      else if (user.role === 'OFFICER') setActiveTab('officer');
      else setActiveTab('citizen');
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleLogout = () => {
    setToken(null);
    setCurrentUser(null);
    setNotifications([]);
    setActiveTab('track');
    showToast('Logged out');
  };

  // Public Track
  const handleTrackSubmit = async (e) => {
    e.preventDefault();
    if (!trackRef.trim()) return;
    setLoading(true);
    setTrackError('');
    setTrackResult(null);
    try {
      const res = await api.trackReference(trackRef.trim());
      setTrackResult(res);
    } catch (err) {
      setTrackError(err.message || 'Reference number not found');
    } finally {
      setLoading(false);
    }
  };

  // Citizen data loader
  const loadCitizenData = async () => {
    setLoading(true);
    try {
      const [reqs, appts] = await Promise.all([
        api.getRequests(),
        api.getAppointments()
      ]);
      setRequestsList(reqs || []);
      setAppointmentsList(appts || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Officer data loader
  const loadOfficerData = async () => {
    setLoading(true);
    try {
      const reqs = await api.getRequests();
      setRequestsList(reqs || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Supervisor data loader
  const loadSupervisorData = async () => {
    setLoading(true);
    try {
      const [reqs, alrts, reps, anlyt] = await Promise.all([
        api.getRequests(),
        api.getAlerts(),
        api.getDelayReport(),
        api.getExecutiveAnalytics()
      ]);
      setRequestsList(reqs || []);
      setAlertsList(alrts || []);
      setDelayReports(reps || []);
      setAnalytics(anlyt || null);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  // Trigger alert scan
  const handleTriggerScan = async () => {
    setLoading(true);
    try {
      const res = await api.scanAlerts();
      showToast(`Scan complete: ${res.scanned_requests} checked, ${res.new_alerts} new alerts generated!`);
      loadSupervisorData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Acknowledge alert
  const handleAckAlert = async (id) => {
    try {
      await api.ackAlert(id);
      showToast('Alert acknowledged');
      loadSupervisorData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // View request detail
  const handleViewRequest = async (id) => {
    setLoading(true);
    try {
      const [detail, evts, docs] = await Promise.all([
        api.getRequestDetail(id),
        api.getRequestEvents(id),
        api.getRequestDocuments(id).catch(() => [])
      ]);
      setSelectedRequest(detail);
      setRequestEvents(evts || []);
      setRequestDocuments(docs || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Document upload handler
  const handleDocumentUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile || !selectedRequest) return;
    setUploadingDoc(true);
    try {
      await api.uploadDocument(selectedRequest.id, selectedFile);
      showToast(`Uploaded document: ${selectedFile.name}`);
      setSelectedFile(null);
      const docs = await api.getRequestDocuments(selectedRequest.id);
      setRequestDocuments(docs || []);
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setUploadingDoc(false);
    }
  };

  // Verify document handler
  const handleVerifyDocument = async (docId, status) => {
    try {
      await api.verifyDocument(docId, status, status === 'VERIFIED' ? 'Verified valid' : 'Rejected illegible');
      showToast(`Document marked as ${status}`);
      if (selectedRequest) {
        const docs = await api.getRequestDocuments(selectedRequest.id);
        setRequestDocuments(docs || []);
      }
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  // Transition request
  const handleExecuteTransition = async () => {
    if (!selectedRequest || !transitionTarget) return;
    setLoading(true);
    try {
      await api.transitionRequest(selectedRequest.id, transitionTarget, transitionReason);
      showToast(`State changed to ${transitionTarget}`);
      setShowTransitionModal(false);
      setTransitionReason('');
      handleViewRequest(selectedRequest.id);
      if (currentUser?.role === 'SUPERVISOR') loadSupervisorData();
      else if (currentUser?.role === 'OFFICER') loadOfficerData();
      else loadCitizenData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Assign officer
  const handleExecuteAssign = async () => {
    if (!selectedRequest || !assignOfficerId) return;
    setLoading(true);
    try {
      await api.assignOfficer(selectedRequest.id, parseInt(assignOfficerId));
      showToast('Officer assigned successfully');
      setShowAssignModal(false);
      handleViewRequest(selectedRequest.id);
      loadSupervisorData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Create new request
  const handleCreateRequest = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const res = await api.createRequest(newReqServiceCode, newReqNotes);
      showToast(`Request submitted! Reference: ${res.reference}`);
      setShowNewRequestModal(false);
      setNewReqNotes('');
      loadCitizenData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Fetch slot availability when office or date changes
  useEffect(() => {
    if (apptOfficeCode && apptDate) {
      api.getAvailability(apptOfficeCode, apptDate)
        .then(res => setAvailableSlots(res.slots || []))
        .catch(() => setAvailableSlots([]));
    }
  }, [apptOfficeCode, apptDate]);

  // Book appointment
  const handleBookAppointment = async (e) => {
    e.preventDefault();
    if (!apptSlot) {
      showToast('Please select a time slot', 'error');
      return;
    }
    setLoading(true);
    try {
      await api.bookAppointment(apptOfficeCode, apptDate, apptSlot);
      showToast('Appointment booked successfully!');
      setShowAppointmentModal(false);
      setApptSlot('');
      loadCitizenData();
    } catch (err) {
      showToast(err.message, 'error');
    } finally {
      setLoading(false);
    }
  };

  // Cancel appointment
  const handleCancelAppointment = async (id) => {
    if (!window.confirm('Cancel this appointment?')) return;
    try {
      await api.cancelAppointment(id);
      showToast('Appointment cancelled');
      loadCitizenData();
    } catch (err) {
      showToast(err.message, 'error');
    }
  };

  const unreadCount = notifications.filter(n => !n.is_read).length;

  return (
    <div className="min-h-screen bg-slate-50 flex flex-col font-sans">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed bottom-6 right-6 z-50 px-5 py-3 rounded-2xl shadow-xl border flex items-center gap-3 transition-all ${
          toast.type === 'error' ? 'bg-rose-50 text-rose-800 border-rose-200' : 'bg-emerald-50 text-emerald-800 border-emerald-200'
        }`}>
          {toast.type === 'error' ? <AlertCircle className="w-5 h-5 text-rose-600" /> : <CheckCircle2 className="w-5 h-5 text-emerald-600" />}
          <span className="text-sm font-semibold">{toast.message}</span>
        </div>
      )}

      {/* Top Banner & Fast Role Switcher */}
      <div className="bg-slate-900 text-slate-300 border-b border-slate-800 text-xs py-2 px-6">
        <div className="max-w-7xl mx-auto flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-2">
            <span className="inline-block w-2 h-2 rounded-full bg-emerald-400 animate-pulse"></span>
            <span className="font-semibold text-slate-200">Continuous SLA Daemon Active</span>
            <span className="text-slate-500">•</span>
            <span>Sunday–Friday Workdays • Digital PDF QR Verification</span>
          </div>
          <div className="flex items-center gap-2">
            <span className="text-slate-400 mr-1">One-Click Switch:</span>
            <button
              onClick={() => handleFastLogin('citizen1@example.org', 'demo-password-1')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-sky-400 rounded-lg font-medium transition"
            >
              Citizen (Jane)
            </button>
            <button
              onClick={() => handleFastLogin('officer1@example.org', 'demo-password-1')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-amber-400 rounded-lg font-medium transition"
            >
              Officer (Alex)
            </button>
            <button
              onClick={() => handleFastLogin('supervisor@example.org', 'demo-password-1')}
              className="px-2.5 py-1 bg-slate-800 hover:bg-slate-700 text-rose-400 rounded-lg font-medium transition"
            >
              Supervisor
            </button>
            {currentUser && (
              <button
                onClick={handleLogout}
                className="px-2 py-1 bg-red-950/60 hover:bg-red-900 text-red-300 rounded-lg font-medium flex items-center gap-1 transition ml-2"
              >
                <LogOut className="w-3 h-3" /> Log out
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Main Navigation Header */}
      <header className="bg-white border-b border-slate-200 sticky top-0 z-40 shadow-sm">
        <div className="max-w-7xl mx-auto px-6 h-16 flex items-center justify-between">
          <div className="flex items-center gap-3 cursor-pointer" onClick={() => setActiveTab('track')}>
            <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-sky-700 to-sky-500 text-white flex items-center justify-center font-bold shadow-md shadow-sky-600/20">
              <Building2 className="w-6 h-6" />
            </div>
            <div>
              <h1 className="text-lg font-bold text-slate-900 leading-tight">Citizen Service Desk</h1>
              <p className="text-xs text-slate-500 font-medium">Public Counter Operations & Verification</p>
            </div>
          </div>

          {/* Navigation Tabs */}
          <nav className="flex items-center gap-1 bg-slate-100 p-1 rounded-xl">
            <button
              onClick={() => setActiveTab('track')}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                activeTab === 'track' ? 'bg-white text-slate-900 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <Search className="w-4 h-4" />
              Public Tracking
            </button>
            <button
              onClick={() => {
                if (!currentUser) handleFastLogin('citizen1@example.org', 'demo-password-1');
                setActiveTab('citizen');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                activeTab === 'citizen' ? 'bg-white text-sky-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <User className="w-4 h-4" />
              Citizen Desk
            </button>
            <button
              onClick={() => {
                if (!currentUser || currentUser.role === 'CITIZEN') handleFastLogin('officer1@example.org', 'demo-password-1');
                setActiveTab('officer');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                activeTab === 'officer' ? 'bg-white text-amber-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <UserCheck className="w-4 h-4" />
              Officer Queue
            </button>
            <button
              onClick={() => {
                if (!currentUser || currentUser.role !== 'SUPERVISOR') handleFastLogin('supervisor@example.org', 'demo-password-1');
                setActiveTab('supervisor');
              }}
              className={`px-4 py-2 rounded-lg text-sm font-semibold transition flex items-center gap-2 ${
                activeTab === 'supervisor' ? 'bg-white text-rose-600 shadow-sm' : 'text-slate-600 hover:text-slate-900'
              }`}
            >
              <ShieldAlert className="w-4 h-4" />
              Supervisor Radar
            </button>
          </nav>

          {/* User & Notification Controls */}
          <div className="flex items-center gap-3">
            {currentUser && (
              <div className="relative">
                <button
                  onClick={() => setShowNotifications(!showNotifications)}
                  className="w-9 h-9 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 flex items-center justify-center transition relative"
                >
                  <Bell className="w-4 h-4" />
                  {unreadCount > 0 && (
                    <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white rounded-full text-[10px] font-extrabold flex items-center justify-center animate-bounce">
                      {unreadCount}
                    </span>
                  )}
                </button>

                {/* Notifications Dropdown */}
                {showNotifications && (
                  <div className="absolute right-0 mt-2 w-80 bg-white rounded-2xl shadow-2xl border border-slate-200 py-2 z-50 animate-in fade-in zoom-in-95 duration-150">
                    <div className="px-4 py-2 border-b border-slate-100 flex items-center justify-between">
                      <span className="text-xs font-bold text-slate-900">Notifications ({unreadCount} new)</span>
                      {unreadCount > 0 && (
                        <button
                          onClick={handleMarkAllNotificationsRead}
                          className="text-[11px] font-semibold text-sky-600 hover:text-sky-700"
                        >
                          Mark all read
                        </button>
                      )}
                    </div>
                    <div className="max-h-72 overflow-y-auto divide-y divide-slate-100">
                      {notifications.length === 0 ? (
                        <div className="p-4 text-center text-xs text-slate-400">No notifications yet.</div>
                      ) : (
                        notifications.map((n) => (
                          <div key={n.id} className={`p-3 text-xs transition ${n.is_read ? 'bg-white' : 'bg-sky-50/50'}`}>
                            <p className="font-bold text-slate-900">{n.title}</p>
                            <p className="text-slate-600 mt-0.5">{n.message}</p>
                            <span className="text-[10px] text-slate-400 mt-1 block">
                              {new Date(n.created_at).toLocaleTimeString()}
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
              <div className="flex items-center gap-2.5">
                <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-slate-800 to-slate-700 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                  {currentUser.full_name[0]}
                </div>
                <div className="hidden sm:block text-right">
                  <p className="text-xs font-bold text-slate-900">{currentUser.full_name}</p>
                  <span className={`text-[10px] uppercase font-bold tracking-wider px-1.5 py-0.5 rounded ${
                    currentUser.role === 'SUPERVISOR' ? 'bg-rose-100 text-rose-700' :
                    currentUser.role === 'OFFICER' ? 'bg-amber-100 text-amber-700' : 'bg-sky-100 text-sky-700'
                  }`}>
                    {currentUser.role}
                  </span>
                </div>
              </div>
            ) : (
              <button
                onClick={() => handleFastLogin('citizen1@example.org', 'demo-password-1')}
                className="text-sm font-semibold text-sky-600 hover:text-sky-700 flex items-center gap-1.5 bg-sky-50 px-3 py-1.5 rounded-xl"
              >
                <LogIn className="w-4 h-4" /> Sign In
              </button>
            )}
          </div>
        </div>
      </header>

      {/* Main Content Area */}
      <main className="flex-1 max-w-7xl w-full mx-auto px-6 py-8">
        {/* ===================== TAB 1: PUBLIC TRACKING & CATALOG ===================== */}
        {activeTab === 'track' && (
          <div className="space-y-10">
            {/* Hero / Tracking Search */}
            <div className="bg-gradient-to-br from-slate-950 via-slate-900 to-sky-950 rounded-3xl p-8 sm:p-12 text-white relative overflow-hidden shadow-2xl">
              <div className="relative z-10 max-w-2xl">
                <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-sky-500/20 text-sky-300 text-xs font-semibold mb-4 border border-sky-400/20">
                  <ShieldAlert className="w-3.5 h-3.5" /> High-Integrity State Machine • Zero PII Leakage
                </div>
                <h2 className="text-3xl sm:text-4xl font-extrabold tracking-tight mb-3">
                  Public Verification & Application Tracking
                </h2>
                <p className="text-slate-300 text-sm sm:text-base mb-8">
                  Track state machine progression, dynamic SLA pause times, and verify tamper-evident digital certificates directly from the official register.
                </p>

                <form onSubmit={handleTrackSubmit} className="flex gap-2">
                  <div className="relative flex-1">
                    <Search className="w-5 h-5 absolute left-4 top-1/2 -translate-y-1/2 text-slate-400" />
                    <input
                      type="text"
                      placeholder="e.g. SR-2026-000001"
                      value={trackRef}
                      onChange={(e) => setTrackRef(e.target.value)}
                      className="w-full bg-white/10 border border-white/20 rounded-2xl pl-12 pr-4 py-3.5 text-white placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-sky-400 backdrop-blur font-mono text-base"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={loading}
                    className="px-6 py-3.5 bg-sky-500 hover:bg-sky-400 text-white font-bold rounded-2xl shadow-lg shadow-sky-500/30 transition flex items-center gap-2"
                  >
                    Track <ArrowRight className="w-4 h-4" />
                  </button>
                </form>

                {trackError && (
                  <div className="mt-4 p-3 bg-red-500/20 border border-red-500/30 rounded-xl text-red-200 text-sm flex items-center gap-2">
                    <AlertCircle className="w-4 h-4 flex-shrink-0" /> {trackError}
                  </div>
                )}
              </div>
            </div>

            {/* Public Tracking Result Card */}
            {trackResult && (
              <div className="bg-white rounded-3xl p-6 sm:p-8 border border-slate-200 shadow-sm animate-in fade-in duration-300">
                <div className="flex flex-wrap items-center justify-between border-b border-slate-100 pb-5 mb-6 gap-4">
                  <div>
                    <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Application Reference</span>
                    <h3 className="text-2xl font-bold font-mono text-slate-900">{trackResult.reference}</h3>
                    <p className="text-sm text-slate-600 font-medium mt-0.5">{trackResult.service_name}</p>
                  </div>
                  <div className="text-right">
                    <span className="text-xs uppercase font-bold text-slate-400 tracking-wider">Current Status</span>
                    <div className="mt-1">
                      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold ${
                        trackResult.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                        trackResult.status === 'NEEDS_INFO' ? 'bg-amber-100 text-amber-800' :
                        trackResult.status === 'REJECTED' || trackResult.status === 'CANCELLED' ? 'bg-rose-100 text-rose-800' :
                        'bg-sky-100 text-sky-800'
                      }`}>
                        {trackResult.status === 'NEEDS_INFO' && <PauseCircle className="w-3.5 h-3.5" />}
                        {trackResult.status}
                      </span>
                    </div>
                  </div>
                </div>

                {/* State Progress Stepper */}
                <div className="mb-6">
                  <div className="grid grid-cols-4 gap-2">
                    {['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'COMPLETED'].map((step, idx) => {
                      const order = ['SUBMITTED', 'UNDER_REVIEW', 'APPROVED', 'COMPLETED'];
                      const currentIdx = order.indexOf(trackResult.status);
                      const isPast = currentIdx >= idx;
                      const isCurrent = trackResult.status === step;
                      return (
                        <div key={step} className="text-center">
                          <div className={`h-2 rounded-full mb-2 ${
                            isCurrent ? 'bg-sky-600' : isPast ? 'bg-emerald-500' : 'bg-slate-200'
                          }`}></div>
                          <span className={`text-[11px] font-bold uppercase tracking-wider ${
                            isCurrent ? 'text-sky-700' : isPast ? 'text-slate-800' : 'text-slate-400'
                          }`}>
                            {step.replace('_', ' ')}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4 bg-slate-50 p-4 rounded-2xl border border-slate-100 text-sm">
                  <div>
                    <span className="text-slate-500 text-xs">Submitted Date:</span>
                    <p className="font-semibold text-slate-800">{new Date(trackResult.submitted_at).toLocaleString()}</p>
                  </div>
                  <div>
                    <span className="text-slate-500 text-xs">Expected SLA Due Date:</span>
                    <p className="font-semibold text-slate-800">{new Date(trackResult.due_date).toLocaleString()}</p>
                  </div>
                </div>
              </div>
            )}

            {/* Service Catalogue Grid */}
            <div>
              <div className="flex items-center justify-between mb-5">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Official Service Catalogue</h3>
                  <p className="text-xs text-slate-500">Government service categories and guaranteed working-day SLAs</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-5">
                {services.map((svc) => (
                  <div key={svc.id} className="bg-white rounded-2xl p-5 border border-slate-200 hover:border-sky-300 transition shadow-sm hover:shadow-md">
                    <div className="w-10 h-10 rounded-xl bg-sky-50 text-sky-600 flex items-center justify-center font-bold mb-4">
                      <FileText className="w-5 h-5" />
                    </div>
                    <h4 className="font-bold text-slate-900 text-base mb-1">{svc.name}</h4>
                    <p className="text-xs text-slate-500 mb-4 line-clamp-2">{svc.description}</p>
                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs">
                      <span className="text-slate-400 font-medium">Turnaround SLA</span>
                      <span className="font-bold text-sky-700 bg-sky-50 px-2 py-0.5 rounded">
                        {svc.sla_working_days} working days
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            </div>

            {/* Offices & Appointment Availability */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 border border-slate-200 shadow-sm">
              <div className="flex flex-wrap items-center justify-between gap-4 mb-6">
                <div>
                  <h3 className="text-lg font-bold text-slate-900">Branch Office Counters</h3>
                  <p className="text-xs text-slate-500">Operating hours 10:00 – 17:00, Sunday to Friday</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-5">
                {offices.map((office) => (
                  <div key={office.id} className="p-5 rounded-2xl bg-slate-50 border border-slate-200 flex flex-col justify-between">
                    <div>
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-mono text-xs font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded">
                          {office.code}
                        </span>
                        <span className="text-xs font-medium text-emerald-700 bg-emerald-100 px-2 py-0.5 rounded">
                          Capacity: {office.capacity_per_slot}/slot
                        </span>
                      </div>
                      <h4 className="font-bold text-slate-900 text-base">{office.name}</h4>
                      <p className="text-xs text-slate-500 flex items-center gap-1.5 mt-1">
                        <MapPin className="w-3.5 h-3.5 text-slate-400" /> {office.address}
                      </p>
                    </div>

                    <button
                      onClick={() => {
                        setApptOfficeCode(office.code);
                        if (!currentUser) handleFastLogin('citizen1@example.org', 'demo-password-1');
                        setActiveTab('citizen');
                        setShowAppointmentModal(true);
                      }}
                      className="mt-5 w-full py-2.5 bg-white hover:bg-sky-50 border border-slate-200 hover:border-sky-300 text-sky-600 font-bold rounded-xl text-xs transition flex items-center justify-center gap-1.5 shadow-sm"
                    >
                      <Calendar className="w-3.5 h-3.5" /> Book 30-min Slot
                    </button>
                  </div>
                ))}
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 2: CITIZEN DESK ===================== */}
        {activeTab === 'citizen' && (
          <div className="space-y-8">
            {/* Header Actions */}
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Citizen Application Portal</h2>
                <p className="text-sm text-slate-500">Track files, upload verified documents, and manage counter appointments</p>
              </div>
              <div className="flex items-center gap-3">
                <button
                  onClick={() => setShowNewRequestModal(true)}
                  className="px-4 py-2.5 bg-sky-600 hover:bg-sky-500 text-white font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-sm"
                >
                  <PlusCircle className="w-4 h-4" /> Submit Service Request
                </button>
                <button
                  onClick={() => setShowAppointmentModal(true)}
                  className="px-4 py-2.5 bg-white hover:bg-slate-50 border border-slate-300 text-slate-700 font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-sm"
                >
                  <Calendar className="w-4 h-4" /> Book Appointment
                </button>
              </div>
            </div>

            {/* My Requests Section */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-base">My Service Applications</h3>
                <button onClick={loadCitizenData} className="text-slate-400 hover:text-slate-600">
                  <RefreshCw className="w-4 h-4" />
                </button>
              </div>

              {requestsList.length === 0 ? (
                <div className="p-10 text-center text-slate-400 text-sm">
                  No service requests found. Click "Submit Service Request" above to create one.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-400 text-xs uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3">Reference</th>
                        <th className="px-6 py-3">Service</th>
                        <th className="px-6 py-3">Submitted</th>
                        <th className="px-6 py-3">Target Due Date</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {requestsList.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50/70 transition">
                          <td className="px-6 py-4 font-mono font-bold text-slate-900">{req.reference}</td>
                          <td className="px-6 py-4 font-medium text-slate-700">{req.service_name}</td>
                          <td className="px-6 py-4 text-slate-500 text-xs">{new Date(req.submitted_at).toLocaleDateString()}</td>
                          <td className="px-6 py-4 text-slate-600 text-xs font-semibold">{new Date(req.due_date).toLocaleDateString()}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                              req.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                              req.status === 'NEEDS_INFO' ? 'bg-amber-100 text-amber-800' :
                              req.status === 'CANCELLED' || req.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' :
                              'bg-sky-100 text-sky-800'
                            }`}>
                              {req.status === 'NEEDS_INFO' && <PauseCircle className="w-3 h-3" />}
                              {req.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleViewRequest(req.id)}
                              className="text-xs font-bold text-sky-600 hover:text-sky-700 bg-sky-50 px-3 py-1.5 rounded-lg transition"
                            >
                              Manage & Docs
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              )}
            </div>

            {/* My Appointments Section */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <h3 className="font-bold text-slate-900 text-base">My Booked Appointments</h3>
              </div>

              {appointmentsList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  You have no scheduled appointments. Book a 30-min slot using the button above.
                </div>
              ) : (
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 p-5">
                  {appointmentsList.map((appt) => (
                    <div key={appt.id} className="p-4 rounded-xl border border-slate-200 bg-slate-50/50 flex flex-col justify-between">
                      <div>
                        <div className="flex items-center justify-between mb-2">
                          <span className="font-mono text-xs font-bold bg-sky-100 text-sky-800 px-2 py-0.5 rounded">
                            {appt.office_code}
                          </span>
                          <span className={`text-[10px] font-bold px-2 py-0.5 rounded uppercase ${
                            appt.status === 'BOOKED' ? 'bg-emerald-100 text-emerald-800' : 'bg-slate-200 text-slate-600'
                          }`}>
                            {appt.status}
                          </span>
                        </div>
                        <h4 className="font-bold text-slate-900 text-sm">{appt.office_name}</h4>
                        <p className="text-xs text-slate-600 mt-1 flex items-center gap-1 font-semibold">
                          <Clock className="w-3.5 h-3.5 text-slate-400" />
                          {appt.appointment_date} • {appt.slot_start} – {appt.slot_end}
                        </p>
                      </div>

                      {appt.status === 'BOOKED' && (
                        <button
                          onClick={() => handleCancelAppointment(appt.id)}
                          className="mt-4 text-xs font-bold text-rose-600 hover:text-rose-700 bg-rose-50 hover:bg-rose-100 py-1.5 rounded-lg transition"
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

        {/* ===================== TAB 3: OFFICER DESK ===================== */}
        {activeTab === 'officer' && (
          <div className="space-y-8">
            <div className="flex items-center justify-between">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Officer Workstation</h2>
                <p className="text-sm text-slate-500">Review documents, inspect citizen uploads, and progress applications</p>
              </div>
              <button onClick={loadOfficerData} className="px-3 py-2 bg-white border border-slate-200 text-slate-700 rounded-xl text-xs font-semibold flex items-center gap-1.5 shadow-sm">
                <RefreshCw className="w-3.5 h-3.5" /> Refresh Queue
              </button>
            </div>

            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-sm">
                  <thead className="bg-slate-50 text-slate-400 text-xs uppercase font-semibold border-b border-slate-200">
                    <tr>
                      <th className="px-6 py-3">Reference</th>
                      <th className="px-6 py-3">Service Name</th>
                      <th className="px-6 py-3">Status</th>
                      <th className="px-6 py-3">Due Date</th>
                      <th className="px-6 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {requestsList.length === 0 ? (
                      <tr>
                        <td colSpan="5" className="p-8 text-center text-slate-400">
                          No files currently assigned to your account.
                        </td>
                      </tr>
                    ) : (
                      requestsList.map((req) => (
                        <tr key={req.id} className="hover:bg-slate-50 transition">
                          <td className="px-6 py-4 font-mono font-bold text-slate-900">{req.reference}</td>
                          <td className="px-6 py-4 font-semibold text-slate-700">{req.service_name}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-flex items-center gap-1 px-2.5 py-1 rounded-full text-xs font-bold ${
                              req.status === 'COMPLETED' ? 'bg-emerald-100 text-emerald-800' :
                              req.status === 'NEEDS_INFO' ? 'bg-amber-100 text-amber-800' :
                              req.status === 'APPROVED' ? 'bg-indigo-100 text-indigo-800' :
                              'bg-sky-100 text-sky-800'
                            }`}>
                              {req.status === 'NEEDS_INFO' && <PauseCircle className="w-3 h-3" />}
                              {req.status}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs font-semibold text-slate-600">
                            {new Date(req.due_date).toLocaleDateString()}
                          </td>
                          <td className="px-6 py-4 text-right">
                            <button
                              onClick={() => handleViewRequest(req.id)}
                              className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 text-white rounded-lg text-xs font-bold transition shadow-sm"
                            >
                              Verify & Process
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </div>
        )}

        {/* ===================== TAB 4: SUPERVISOR RADAR ===================== */}
        {activeTab === 'supervisor' && (
          <div className="space-y-8">
            <div className="flex flex-wrap items-center justify-between gap-4">
              <div>
                <h2 className="text-2xl font-bold text-slate-900">Executive Command Center & Radar</h2>
                <p className="text-sm text-slate-500">Real-time SLA analytics, automated delay detection, and caseload balancing</p>
              </div>
              <button
                onClick={handleTriggerScan}
                disabled={loading}
                className="px-5 py-2.5 bg-rose-600 hover:bg-rose-500 text-white font-bold rounded-xl text-sm transition flex items-center gap-2 shadow-lg shadow-rose-600/20"
              >
                <AlertTriangle className="w-4 h-4" /> Trigger Immediate SLA Scan
              </button>
            </div>

            {/* Radar Metric Cards */}
            <div className="grid grid-cols-1 md:grid-cols-4 gap-5">
              <div className="bg-white rounded-2xl p-5 border border-slate-200 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase font-bold text-sky-600 tracking-wider">SLA Compliance</span>
                  <Award className="w-5 h-5 text-sky-500" />
                </div>
                <div className="text-3xl font-extrabold text-slate-900">
                  {analytics ? `${analytics.sla_compliance_rate}%` : '100%'}
                </div>
                <p className="text-xs text-slate-400 mt-1">On-time completed files</p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-amber-200 bg-amber-50/20 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase font-bold text-amber-600 tracking-wider">Due Soon (24h)</span>
                  <Clock className="w-5 h-5 text-amber-500" />
                </div>
                <div className="text-3xl font-extrabold text-slate-900">
                  {delayReports.filter(r => r.level === 'DUE_SOON').length}
                </div>
                <p className="text-xs text-slate-500 mt-1">Files nearing target SLA deadline</p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-rose-200 bg-rose-50/20 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase font-bold text-rose-600 tracking-wider">Overdue</span>
                  <AlertCircle className="w-5 h-5 text-rose-500" />
                </div>
                <div className="text-3xl font-extrabold text-slate-900">
                  {delayReports.filter(r => r.level === 'OVERDUE').length}
                </div>
                <p className="text-xs text-slate-500 mt-1">Past due files requiring intervention</p>
              </div>

              <div className="bg-white rounded-2xl p-5 border border-purple-200 bg-purple-50/20 shadow-sm flex flex-col justify-between">
                <div className="flex items-center justify-between mb-2">
                  <span className="text-xs uppercase font-bold text-purple-600 tracking-wider">Escalated (&gt;48h)</span>
                  <ShieldAlert className="w-5 h-5 text-purple-500" />
                </div>
                <div className="text-3xl font-extrabold text-slate-900">
                  {delayReports.filter(r => r.level === 'ESCALATED').length}
                </div>
                <p className="text-xs text-slate-500 mt-1">Critical SLA breach escalated to management</p>
              </div>
            </div>

            {/* Officer Caseload & Service Performance Analytics */}
            {analytics && (
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Officer Workload Distribution */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <TrendingUp className="w-5 h-5 text-sky-600" />
                    <h3 className="font-bold text-slate-900 text-sm">Officer Caseload & Performance</h3>
                  </div>
                  <div className="space-y-3">
                    {analytics.officers.map((off) => (
                      <div key={off.officer_id} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs">
                        <div className="flex items-center justify-between mb-1.5 font-bold text-slate-900">
                          <span>{off.officer_name} ({off.email})</span>
                          <span className="text-slate-500">{off.assigned_requests} total assigned</span>
                        </div>
                        <div className="flex items-center gap-4 text-slate-600 text-[11px]">
                          <span className="text-emerald-700 font-semibold">{off.completed_requests} completed</span>
                          <span className={off.overdue_requests > 0 ? 'text-rose-600 font-bold' : 'text-slate-400'}>
                            {off.overdue_requests} overdue
                          </span>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>

                {/* Service Turnaround Analytics */}
                <div className="bg-white rounded-2xl border border-slate-200 p-5 shadow-sm">
                  <div className="flex items-center gap-2 mb-4">
                    <BarChart3 className="w-5 h-5 text-indigo-600" />
                    <h3 className="font-bold text-slate-900 text-sm">Service Turnaround Efficiency</h3>
                  </div>
                  <div className="space-y-3">
                    {analytics.services.map((svc) => (
                      <div key={svc.service_code} className="p-3 rounded-xl bg-slate-50 border border-slate-100 text-xs flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900">{svc.service_name}</p>
                          <span className="text-slate-400 text-[11px]">{svc.total_requests} submitted ({svc.completed_requests} finished)</span>
                        </div>
                        <div className="text-right">
                          <span className="font-mono font-extrabold text-sky-700 text-sm">{svc.avg_completion_hours}h</span>
                          <p className="text-[10px] text-slate-400">Avg completion time</p>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}

            {/* Active Delay Alerts List */}
            <div className="bg-white rounded-2xl border border-slate-200 overflow-hidden shadow-sm">
              <div className="p-5 border-b border-slate-100 flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <AlertCircle className="w-5 h-5 text-rose-600" />
                  <h3 className="font-bold text-slate-900 text-base">Active Delay Alerts</h3>
                </div>
                <span className="text-xs text-slate-400 font-semibold">{alertsList.length} alert(s)</span>
              </div>

              {alertsList.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">
                  No active alerts. The continuous background daemon scans open requests every 60 seconds.
                </div>
              ) : (
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-sm">
                    <thead className="bg-slate-50 text-slate-400 text-xs uppercase font-semibold border-b border-slate-200">
                      <tr>
                        <th className="px-6 py-3">Reference</th>
                        <th className="px-6 py-3">Level</th>
                        <th className="px-6 py-3">Triggered Time</th>
                        <th className="px-6 py-3">Status</th>
                        <th className="px-6 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100">
                      {alertsList.map((alert) => (
                        <tr key={alert.id} className="hover:bg-slate-50">
                          <td className="px-6 py-4 font-mono font-bold text-slate-900">{alert.reference}</td>
                          <td className="px-6 py-4">
                            <span className={`inline-block px-2.5 py-1 rounded text-xs font-extrabold ${
                              alert.level === 'ESCALATED' ? 'bg-purple-100 text-purple-800' :
                              alert.level === 'OVERDUE' ? 'bg-rose-100 text-rose-800' : 'bg-amber-100 text-amber-800'
                            }`}>
                              {alert.level}
                            </span>
                          </td>
                          <td className="px-6 py-4 text-xs text-slate-500">
                            {new Date(alert.created_at).toLocaleString()}
                          </td>
                          <td className="px-6 py-4 text-xs">
                            {alert.acknowledged ? (
                              <span className="text-emerald-600 font-bold flex items-center gap-1">
                                <Check className="w-3.5 h-3.5" /> Acknowledged
                              </span>
                            ) : (
                              <span className="text-rose-600 font-bold">Unacknowledged</span>
                            )}
                          </td>
                          <td className="px-6 py-4 text-right">
                            {!alert.acknowledged && (
                              <button
                                onClick={() => handleAckAlert(alert.id)}
                                className="px-3 py-1 bg-slate-900 hover:bg-slate-800 text-white rounded-lg text-xs font-semibold transition"
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
          </div>
        )}
      </main>

      {/* ===================== MODAL: REQUEST DETAILS, ATTACHMENTS & CERTIFICATE ===================== */}
      {selectedRequest && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-2xl rounded-3xl shadow-2xl border border-slate-200 overflow-hidden max-h-[92vh] flex flex-col animate-in zoom-in-95 duration-200">
            {/* Modal Header */}
            <div className="p-6 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
              <div>
                <span className="font-mono text-xs font-bold text-sky-700 bg-sky-100 px-2 py-0.5 rounded">
                  {selectedRequest.reference}
                </span>
                <h3 className="text-xl font-bold text-slate-900 mt-1">{selectedRequest.service_name}</h3>
              </div>
              <button
                onClick={() => setSelectedRequest(null)}
                className="w-8 h-8 rounded-full bg-slate-200/60 hover:bg-slate-200 flex items-center justify-center text-slate-500"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Modal Body */}
            <div className="p-6 overflow-y-auto space-y-6">
              {/* Status Banner */}
              <div className="p-4 rounded-2xl bg-slate-50 border border-slate-200 flex flex-wrap items-center justify-between gap-4">
                <div>
                  <span className="text-xs text-slate-400 font-semibold uppercase">Current State</span>
                  <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-base font-extrabold text-slate-900">{selectedRequest.status}</span>
                    {selectedRequest.paused_at && (
                      <span className="text-xs bg-amber-100 text-amber-800 font-bold px-2 py-0.5 rounded flex items-center gap-1">
                        <PauseCircle className="w-3.5 h-3.5" /> SLA Clock Paused
                      </span>
                    )}
                  </div>
                </div>

                <div className="text-right">
                  <span className="text-xs text-slate-400 font-semibold uppercase">SLA Due Date</span>
                  <p className="text-sm font-bold text-slate-800 mt-0.5">
                    {new Date(selectedRequest.due_date).toLocaleString()}
                  </p>
                </div>
              </div>

              {/* Digital Certificate Download Banner (if COMPLETED) */}
              {selectedRequest.status === 'COMPLETED' && (
                <div className="p-5 rounded-2xl bg-gradient-to-r from-emerald-900 to-slate-900 text-white flex items-center justify-between shadow-lg">
                  <div>
                    <div className="flex items-center gap-1.5 text-amber-400 text-xs font-bold uppercase tracking-wider">
                      <Award className="w-4 h-4" /> Tamper-Evident Digital Certificate
                    </div>
                    <h4 className="font-bold text-base mt-0.5">Official Completion Document</h4>
                    <p className="text-xs text-slate-300">Features cryptographic QR-code linking to public tracking</p>
                  </div>
                  <a
                    href={api.getCertificateDownloadUrl(selectedRequest.id)}
                    target="_blank"
                    rel="noreferrer"
                    className="px-4 py-2.5 bg-emerald-500 hover:bg-emerald-400 text-slate-950 font-bold text-xs rounded-xl shadow-md transition flex items-center gap-2 flex-shrink-0"
                  >
                    <Download className="w-4 h-4" /> Download PDF
                  </a>
                </div>
              )}

              {/* Citizen & Officer details */}
              <div className="grid grid-cols-2 gap-4 text-xs">
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold uppercase">Applicant Citizen</span>
                  <p className="font-bold text-slate-900 text-sm mt-1">{selectedRequest.citizen_name}</p>
                </div>
                <div className="p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold uppercase">Assigned Caseworker</span>
                  <p className="font-bold text-slate-900 text-sm mt-1">
                    {selectedRequest.assigned_officer_name || <span className="text-amber-600">Unassigned</span>}
                  </p>
                </div>
              </div>

              {selectedRequest.notes && (
                <div className="text-xs p-3.5 rounded-xl bg-slate-50 border border-slate-100">
                  <span className="text-slate-400 font-semibold uppercase">Application Notes</span>
                  <p className="text-slate-700 mt-1 italic font-medium">{selectedRequest.notes}</p>
                </div>
              )}

              {/* Attached Documents & Upload Section */}
              <div className="pt-2 border-t border-slate-100">
                <div className="flex items-center justify-between mb-3">
                  <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider">
                    Attached Identity & Verification Documents
                  </h4>
                </div>

                {/* Upload Form */}
                <form onSubmit={handleDocumentUpload} className="mb-4 flex items-center gap-2 bg-slate-50 p-2.5 rounded-2xl border border-slate-200">
                  <input
                    type="file"
                    accept=".pdf,image/*"
                    onChange={(e) => setSelectedFile(e.target.files[0])}
                    className="text-xs text-slate-600 file:mr-3 file:py-1.5 file:px-3 file:rounded-xl file:border-0 file:text-xs file:font-semibold file:bg-sky-100 file:text-sky-700 hover:file:bg-sky-200"
                  />
                  <button
                    type="submit"
                    disabled={!selectedFile || uploadingDoc}
                    className="px-3.5 py-1.5 bg-sky-600 hover:bg-sky-500 disabled:opacity-50 text-white rounded-xl text-xs font-bold transition flex items-center gap-1.5 ml-auto flex-shrink-0"
                  >
                    <UploadCloud className="w-3.5 h-3.5" /> Upload
                  </button>
                </form>

                {/* Documents List */}
                <div className="space-y-2">
                  {requestDocuments.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No documents attached yet.</p>
                  ) : (
                    requestDocuments.map((doc) => (
                      <div key={doc.id} className="p-3 rounded-xl bg-slate-50 border border-slate-200 flex items-center justify-between text-xs">
                        <div className="flex items-center gap-2.5">
                          <FileCheck className="w-4 h-4 text-sky-600 flex-shrink-0" />
                          <div>
                            <p className="font-bold text-slate-900">{doc.filename}</p>
                            <span className={`text-[10px] font-bold px-1.5 py-0.2 rounded uppercase ${
                              doc.status === 'VERIFIED' ? 'bg-emerald-100 text-emerald-800' :
                              doc.status === 'REJECTED' ? 'bg-rose-100 text-rose-800' : 'bg-slate-200 text-slate-600'
                            }`}>
                              {doc.status}
                            </span>
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <a
                            href={api.getDocumentDownloadUrl(doc.id)}
                            target="_blank"
                            rel="noreferrer"
                            className="text-sky-600 hover:text-sky-700 font-bold flex items-center gap-1 px-2.5 py-1 bg-white border border-slate-200 rounded-lg text-xs"
                          >
                            <Download className="w-3 h-3" /> View
                          </a>

                          {(currentUser?.role === 'OFFICER' || currentUser?.role === 'SUPERVISOR') && doc.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleVerifyDocument(doc.id, 'VERIFIED')}
                                className="px-2.5 py-1 bg-emerald-600 text-white rounded-lg font-bold text-xs hover:bg-emerald-500"
                              >
                                Verify
                              </button>
                              <button
                                onClick={() => handleVerifyDocument(doc.id, 'REJECTED')}
                                className="px-2.5 py-1 bg-rose-600 text-white rounded-lg font-bold text-xs hover:bg-rose-500"
                              >
                                Reject
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>

              {/* State Machine Action Buttons */}
              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-2.5">Workflow Actions</h4>
                <div className="flex flex-wrap gap-2">
                  {currentUser?.role === 'SUPERVISOR' && (
                    <button
                      onClick={() => setShowAssignModal(true)}
                      className="px-3.5 py-2 bg-indigo-50 hover:bg-indigo-100 text-indigo-700 rounded-xl text-xs font-bold transition flex items-center gap-1.5"
                    >
                      <Users className="w-3.5 h-3.5" /> Assign Officer
                    </button>
                  )}

                  {selectedRequest.status === 'SUBMITTED' && (currentUser?.role === 'OFFICER' || currentUser?.role === 'SUPERVISOR') && (
                    <button
                      onClick={() => { setTransitionTarget('UNDER_REVIEW'); setShowTransitionModal(true); }}
                      className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition"
                    >
                      Start Review (UNDER_REVIEW)
                    </button>
                  )}

                  {selectedRequest.status === 'UNDER_REVIEW' && (currentUser?.role === 'OFFICER' || currentUser?.role === 'SUPERVISOR') && (
                    <>
                      <button
                        onClick={() => { setTransitionTarget('NEEDS_INFO'); setShowTransitionModal(true); }}
                        className="px-3.5 py-2 bg-amber-500 hover:bg-amber-400 text-white rounded-xl text-xs font-bold transition flex items-center gap-1"
                      >
                        <PauseCircle className="w-3.5 h-3.5" /> Request Info (Pause SLA)
                      </button>
                      <button
                        onClick={() => { setTransitionTarget('APPROVED'); setShowTransitionModal(true); }}
                        className="px-3.5 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-bold transition"
                      >
                        Approve Request
                      </button>
                      <button
                        onClick={() => { setTransitionTarget('REJECTED'); setShowTransitionModal(true); }}
                        className="px-3.5 py-2 bg-rose-600 hover:bg-rose-500 text-white rounded-xl text-xs font-bold transition"
                      >
                        Reject
                      </button>
                    </>
                  )}

                  {selectedRequest.status === 'NEEDS_INFO' && (
                    <button
                      onClick={() => { setTransitionTarget('UNDER_REVIEW'); setShowTransitionModal(true); }}
                      className="px-3.5 py-2 bg-sky-600 hover:bg-sky-500 text-white rounded-xl text-xs font-bold transition"
                    >
                      Submit Requested Info (Resume SLA)
                    </button>
                  )}

                  {selectedRequest.status === 'APPROVED' && (currentUser?.role === 'OFFICER' || currentUser?.role === 'SUPERVISOR') && (
                    <button
                      onClick={() => { setTransitionTarget('COMPLETED'); setShowTransitionModal(true); }}
                      className="px-3.5 py-2 bg-emerald-700 hover:bg-emerald-600 text-white rounded-xl text-xs font-bold transition"
                    >
                      Complete & Deliver
                    </button>
                  )}

                  {(selectedRequest.status === 'SUBMITTED' || selectedRequest.status === 'NEEDS_INFO') && currentUser?.role === 'CITIZEN' && (
                    <button
                      onClick={() => { setTransitionTarget('CANCELLED'); setShowTransitionModal(true); }}
                      className="px-3.5 py-2 bg-rose-100 hover:bg-rose-200 text-rose-700 rounded-xl text-xs font-bold transition"
                    >
                      Cancel Application
                    </button>
                  )}
                </div>
              </div>

              {/* Event Audit History Timeline */}
              <div className="pt-2 border-t border-slate-100">
                <h4 className="text-xs uppercase font-bold text-slate-400 tracking-wider mb-3">Immutable Audit Trail</h4>
                <div className="space-y-3 relative before:absolute before:inset-0 before:left-3 before:w-0.5 before:bg-slate-200">
                  {requestEvents.map((evt) => (
                    <div key={evt.id} className="relative pl-8 text-xs">
                      <div className="absolute left-1.5 top-1.5 w-3.5 h-3.5 rounded-full bg-white border-2 border-sky-600"></div>
                      <div className="bg-slate-50 p-3 rounded-xl border border-slate-100">
                        <div className="flex items-center justify-between font-semibold text-slate-800">
                          <span>
                            {evt.from_status} <span className="text-slate-400">→</span> {evt.to_status}
                          </span>
                          <span className="text-slate-400 text-[10px]">{new Date(evt.created_at).toLocaleTimeString()}</span>
                        </div>
                        {evt.reason && <p className="text-slate-600 mt-1 italic">"{evt.reason}"</p>}
                        <span className="text-slate-400 text-[10px] mt-1 block">Actor: {evt.actor_name}</span>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: SUBMIT NEW REQUEST ===================== */}
      {showNewRequestModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-md rounded-3xl p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <h3 className="font-bold text-slate-900 text-lg">New Service Application</h3>
              <button onClick={() => setShowNewRequestModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Select Service</label>
                <select
                  value={newReqServiceCode}
                  onChange={(e) => setNewReqServiceCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {services.map((s) => (
                    <option key={s.id} value={s.code}>
                      {s.name} ({s.sla_working_days} working days SLA)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Applicant Notes / Purpose</label>
                <textarea
                  rows="3"
                  placeholder="e.g. Passport renewal for university studies abroad"
                  value={newReqNotes}
                  onChange={(e) => setNewReqNotes(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-sm focus:outline-none focus:ring-2 focus:ring-sky-500"
                ></textarea>
              </div>

              <div className="pt-2 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowNewRequestModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 text-sm rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 font-bold text-white text-sm rounded-xl transition shadow-sm"
                >
                  Submit Application
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: BOOK APPOINTMENT ===================== */}
      {showAppointmentModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-lg rounded-3xl p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200 max-h-[90vh] overflow-y-auto">
            <div className="flex items-center justify-between pb-4 border-b border-slate-100 mb-5">
              <div>
                <h3 className="font-bold text-slate-900 text-lg">Book 30-Minute Counter Slot</h3>
                <p className="text-xs text-slate-500">Sunday to Friday • Max 30 days in advance</p>
              </div>
              <button onClick={() => setShowAppointmentModal(false)} className="text-slate-400 hover:text-slate-600">
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleBookAppointment} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Select Office</label>
                <select
                  value={apptOfficeCode}
                  onChange={(e) => setApptOfficeCode(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                >
                  {offices.map((o) => (
                    <option key={o.id} value={o.code}>
                      {o.name} ({o.capacity_per_slot} per slot)
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Appointment Date</label>
                <input
                  type="date"
                  value={apptDate}
                  onChange={(e) => setApptDate(e.target.value)}
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
                />
              </div>

              {/* Slot Grid */}
              {apptDate && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase mb-2">Select 30-min Slot</label>
                  {availableSlots.length === 0 ? (
                    <p className="text-xs text-slate-400 italic">No available slots on this date or office closed.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {availableSlots.map((s) => {
                        const isFull = s.places_left <= 0;
                        const isSelected = apptSlot === s.slot_start;
                        return (
                          <button
                            key={s.slot_start}
                            type="button"
                            disabled={isFull}
                            onClick={() => setApptSlot(s.slot_start)}
                            className={`p-2.5 rounded-xl text-left border text-xs transition ${
                              isSelected
                                ? 'bg-sky-600 text-white border-sky-600 font-bold'
                                : isFull
                                ? 'bg-slate-100 text-slate-400 border-slate-200 cursor-not-allowed'
                                : 'bg-slate-50 hover:bg-sky-50 text-slate-700 border-slate-200'
                            }`}
                          >
                            <div className="font-semibold">{s.slot_start} – {s.slot_end}</div>
                            <div className={`text-[10px] mt-0.5 ${isSelected ? 'text-sky-100' : isFull ? 'text-slate-400' : 'text-emerald-600 font-bold'}`}>
                              {isFull ? 'Fully Booked' : `${s.places_left} left`}
                            </div>
                          </button>
                        );
                      })}
                    </div>
                  )}
                </div>
              )}

              <div className="pt-3 flex gap-2">
                <button
                  type="button"
                  onClick={() => setShowAppointmentModal(false)}
                  className="flex-1 py-2.5 bg-slate-100 hover:bg-slate-200 font-bold text-slate-700 text-sm rounded-xl transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={loading || !apptSlot}
                  className="flex-1 py-2.5 bg-sky-600 hover:bg-sky-500 font-bold text-white text-sm rounded-xl transition disabled:opacity-50"
                >
                  Confirm Booking
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ===================== MODAL: TRANSITION CONFIRMATION ===================== */}
      {showTransitionModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <h3 className="font-bold text-slate-900 text-lg mb-1">Confirm Transition</h3>
            <p className="text-xs text-slate-500 mb-4">
              Moving request state to <span className="font-bold text-slate-900">{transitionTarget}</span>
            </p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Reason / Officer Note</label>
              <textarea
                rows="2"
                placeholder="e.g. Identity documents verified against official database"
                value={transitionReason}
                onChange={(e) => setTransitionReason(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl p-3 text-xs focus:outline-none focus:ring-2 focus:ring-sky-500"
              ></textarea>
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowTransitionModal(false)}
                className="flex-1 py-2 bg-slate-100 font-bold text-slate-700 text-xs rounded-xl"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleExecuteTransition}
                disabled={loading}
                className="flex-1 py-2 bg-slate-900 hover:bg-slate-800 text-white font-bold text-xs rounded-xl transition"
              >
                Confirm Move
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ===================== MODAL: ASSIGN OFFICER ===================== */}
      {showAssignModal && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="bg-white w-full max-w-sm rounded-3xl p-6 shadow-2xl border border-slate-200 animate-in zoom-in-95 duration-200">
            <h3 className="font-bold text-slate-900 text-lg mb-1">Assign Caseworker</h3>
            <p className="text-xs text-slate-500 mb-4">Assign an officer to handle this file</p>

            <div className="mb-4">
              <label className="block text-xs font-bold text-slate-700 uppercase mb-1">Officer User ID</label>
              <input
                type="number"
                placeholder="e.g. 2 (Officer Alex)"
                value={assignOfficerId}
                onChange={(e) => setAssignOfficerId(e.target.value)}
                className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2.5 text-sm font-semibold focus:outline-none focus:ring-2 focus:ring-sky-500"
              />
            </div>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setShowAssignModal(false)}
                className="flex-1 py-2 bg-slate-100 font-bold text-slate-700 text-xs rounded-xl"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={handleExecuteAssign}
                disabled={loading || !assignOfficerId}
                className="flex-1 py-2 bg-sky-600 hover:bg-sky-500 text-white font-bold text-xs rounded-xl transition"
              >
                Assign
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
