import { useEffect, useState, useMemo } from 'react';
import { Link } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { useAuth } from '../context/AuthContext';
import { getProfile, updateProfile, changePassword } from '../api/profile';
import { getMyLostItems } from '../api/lostItems';
import { getMyFoundItems } from '../api/foundItems';
import { getMyClaims } from '../api/claims';
import { Alert, RoleBadge, AnimatedNumber, ButtonSpinner, PageLoading } from '../components/Ui';

/**
 * CampusFind AI — Real Database-Backed Profile System
 * -------------------------------------------------------------
 * Connected directly to the ASP.NET Core EF Core backend (/api/profile).
 * All data belongs to the authenticated user retrieved via JWT token.
 * Unpopulated fields remain genuinely empty (null) with no fake DB data.
 */

const emptyProfile = {
  email: '',
  role: 'Student',
  fullName: null,
  university: null,
  department: null,
  jobTitle: null,
  semester: null,
  studentId: null,
  phone: null,
  bio: null,
  avatarUrl: null,
};

export default function ProfilePage() {
  const { user, logout } = useAuth();

  // Profile data from backend
  const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [pageError, setPageError] = useState('');

  // Active Tab: 'overview' | 'security'
  const [activeTab, setActiveTab] = useState('overview');

  // Edit Profile Modal state
  const [isEditModalOpen, setIsEditModalOpen] = useState(false);
  const [editFormData, setEditFormData] = useState({ ...emptyProfile });
  const [savingProfile, setSavingProfile] = useState(false);
  const [profileSuccessMsg, setProfileSuccessMsg] = useState('');
  const [profileErrorMsg, setProfileErrorMsg] = useState('');

  // Change Password state
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordSuccessMsg, setPasswordSuccessMsg] = useState('');
  const [passwordErrorMsg, setPasswordErrorMsg] = useState('');

  // Live activity metrics from genuine database records
  const [activityStats, setActivityStats] = useState({
    lostCount: 0,
    foundCount: 0,
    claimsCount: 0,
    trustPoints: 100,
    loading: true,
  });

  // Load real profile and activity data on mount
  useEffect(() => {
    let cancelled = false;

    async function loadData() {
      setLoading(true);
      setPageError('');

      try {
        const [profileRes, lostRes, foundRes, claimsRes] = await Promise.allSettled([
          getProfile(),
          getMyLostItems(),
          getMyFoundItems(),
          getMyClaims(),
        ]);

        if (cancelled) return;

        if (profileRes.status === 'fulfilled' && profileRes.value) {
          setProfile({ ...emptyProfile, ...profileRes.value });
        } else if (profileRes.status === 'rejected') {
          setPageError(profileRes.reason?.message || 'Could not load your profile from the server.');
        }

        const lostCount = lostRes.status === 'fulfilled' && Array.isArray(lostRes.value) ? lostRes.value.length : 0;
        const foundCount = foundRes.status === 'fulfilled' && Array.isArray(foundRes.value) ? foundRes.value.length : 0;
        const claimsCount = claimsRes.status === 'fulfilled' && Array.isArray(claimsRes.value) ? claimsRes.value.length : 0;
        const calculatedPoints = 100 + (foundCount * 25) + (claimsCount * 15);

        setActivityStats({
          lostCount,
          foundCount,
          claimsCount,
          trustPoints: calculatedPoints,
          loading: false,
        });
      } catch (err) {
        if (!cancelled) setPageError(err.message || 'An unexpected error occurred.');
      } finally {
        if (!cancelled) setLoading(false);
      }
    }

    loadData();
    return () => { cancelled = true; };
  }, []);

  // Compute profile completeness dynamically from real stored fields
  const completeness = useMemo(() => {
    let score = 0;
    if (profile.fullName?.trim()) score += 20;
    if (profile.email?.trim()) score += 20;
    if (profile.university?.trim()) score += 15;
    if (profile.department?.trim()) score += 15;
    if (profile.studentId?.trim() || profile.jobTitle?.trim()) score += 10;
    if (profile.phone?.trim()) score += 10;
    if (profile.bio?.trim()) score += 10;
    return Math.min(100, score);
  }, [profile]);

  // Open Edit Modal with current server data
  function handleOpenEdit() {
    setEditFormData({
      fullName: profile.fullName || '',
      university: profile.university || '',
      department: profile.department || '',
      jobTitle: profile.jobTitle || '',
      semester: profile.semester || '',
      studentId: profile.studentId || '',
      phone: profile.phone || '',
      bio: profile.bio || '',
    });
    setProfileErrorMsg('');
    setIsEditModalOpen(true);
  }

  // Save profile to database via backend API
  async function handleSaveProfile(e) {
    e.preventDefault();
    setSavingProfile(true);
    setProfileErrorMsg('');
    setProfileSuccessMsg('');

    try {
      const payload = {
        fullName: editFormData.fullName?.trim() || null,
        university: editFormData.university?.trim() || null,
        department: editFormData.department?.trim() || null,
        jobTitle: editFormData.jobTitle?.trim() || null,
        semester: editFormData.semester?.trim() || null,
        studentId: editFormData.studentId?.trim() || null,
        phone: editFormData.phone?.trim() || null,
        bio: editFormData.bio?.trim() || null,
      };

      const updated = await updateProfile(payload);
      setProfile(prev => ({ ...prev, ...updated }));
      setIsEditModalOpen(false);
      setProfileSuccessMsg('Profile updated successfully.');
      setTimeout(() => setProfileSuccessMsg(''), 5000);
    } catch (err) {
      setProfileErrorMsg(err.message || 'Could not save profile changes. Please verify the input.');
    } finally {
      setSavingProfile(false);
    }
  }

  // Update password via backend API
  async function handleSavePassword(e) {
    e.preventDefault();
    setPasswordErrorMsg('');
    setPasswordSuccessMsg('');

    if (passwords.newPassword.length < 8) {
      setPasswordErrorMsg('Your new password must be at least 8 characters long.');
      return;
    }
    if (!/[A-Z]/.test(passwords.newPassword) || !/[a-z]/.test(passwords.newPassword) || !/[0-9]/.test(passwords.newPassword)) {
      setPasswordErrorMsg('New password requires at least one uppercase letter, one lowercase letter, and one digit.');
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordErrorMsg('The new passwords do not match.');
      return;
    }

    setSavingPassword(true);
    try {
      await changePassword({
        currentPassword: passwords.currentPassword,
        newPassword: passwords.newPassword,
      });
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordSuccessMsg('Your password has been changed successfully.');
      setTimeout(() => setPasswordSuccessMsg(''), 5000);
    } catch (err) {
      setPasswordErrorMsg(err.message || 'Could not update password. Please check your current password.');
    } finally {
      setSavingPassword(false);
    }
  }

  if (loading) {
    return (
      <div className="page-container-profile">
        <PageLoading label="Loading your verified profile…" />
      </div>
    );
  }

  const isOfficerOrAdmin = profile.role === 'SecurityOfficer' || profile.role === 'Administrator';
  const displayName = profile.fullName || profile.email?.split('@')[0] || user?.email?.split('@')[0] || 'Campus Member';
  const initials = displayName
    .split(' ')
    .filter(Boolean)
    .slice(0, 2)
    .map(w => w[0])
    .join('')
    .toUpperCase() || 'CM';

  return (
    <div className="page-container-profile">
      <Alert type="error">{pageError}</Alert>

      {/* ── Status Feedback Alert ─────────────────────────────── */}
      <AnimatePresence>
        {profileSuccessMsg && (
          <motion.div
            initial={{ opacity: 0, y: -10 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            style={{ marginBottom: 20 }}
          >
            <Alert type="success">{profileSuccessMsg}</Alert>
          </motion.div>
        )}
      </AnimatePresence>

      {/* ── 1. Profile Identity Hero with Orbit Motif ─────────── */}
      <motion.div
        className="profile-hero"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        {/* Ambient Orbit Decorative Geometry */}
        <div style={{
          position: 'absolute', width: 260, height: 260, borderRadius: '50%',
          border: '1.5px solid rgba(143,162,138,0.18)', top: -80, right: 80, pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: 140, height: 140, borderRadius: '50%',
          border: '1.5px dashed rgba(200,169,107,0.22)', top: -20, right: 140, pointerEvents: 'none',
        }} />
        <div style={{
          position: 'absolute', width: 8, height: 8, borderRadius: '50%',
          background: 'var(--accent)', top: 40, right: 230, boxShadow: '0 0 8px var(--accent)', pointerEvents: 'none',
        }} />

        {/* Left: Avatar + Identity Info */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 24, flexWrap: 'wrap', zIndex: 1 }}>
          {/* Avatar Component */}
          <div className="profile-avatar-wrap" title={displayName}>
            <div className="profile-avatar">
              <span>{initials}</span>
            </div>
          </div>

          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4, flexWrap: 'wrap' }}>
              <h1 style={{ fontSize: 'clamp(1.5rem, 2.8vw, 2.1rem)', margin: 0 }}>{displayName}</h1>
              <RoleBadge role={profile.role} />
            </div>
            <p className="text-sm text-secondary" style={{ marginBottom: 6 }}>
              {profile.email} {profile.department ? `· ${profile.department}` : ''}
            </p>
            <div style={{ display: 'flex', alignItems: 'center', gap: 12, fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              <span>🏛️ {profile.university || 'Affiliated Campus'}</span>
              <span>·</span>
              <span>Account Status: Active</span>
            </div>
          </div>
        </div>

        {/* Right: Edit Profile CTA Action */}
        <div style={{ zIndex: 1 }}>
          <motion.button
            className="btn btn-primary btn-md"
            onClick={handleOpenEdit}
            whileHover={{ scale: 1.02, y: -1 }}
            whileTap={{ scale: 0.97 }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7"/><path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z"/>
            </svg>
            Edit Profile <span className="btn-arrow">→</span>
          </motion.button>
        </div>
      </motion.div>

      {/* ── 2. Profile Completeness Indicator ─────────────────── */}
      <motion.div
        className="profile-completeness-card"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.08, duration: 0.4 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 10, flexWrap: 'wrap', gap: 8 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            <span style={{ fontSize: '1rem', color: 'var(--primary-deep)' }}>✦</span>
            <span style={{ fontWeight: 800, fontSize: '0.92rem', fontFamily: 'var(--font-display)', color: 'var(--text-primary)' }}>
              Profile Completeness
            </span>
          </div>
          <span style={{ fontWeight: 800, fontSize: '0.95rem', color: 'var(--primary-deep)', fontFamily: 'var(--font-display)' }}>
            {completeness}% Complete
          </span>
        </div>

        {/* Progress bar */}
        <div style={{ width: '100%', height: 8, background: 'var(--surface-tinted)', borderRadius: 999, overflow: 'hidden', marginBottom: 12 }}>
          <motion.div
            style={{ height: '100%', background: 'linear-gradient(90deg, var(--primary), var(--accent))', borderRadius: 999 }}
            initial={{ width: 0 }}
            animate={{ width: `${completeness}%` }}
            transition={{ duration: 0.8, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>

        <p className="text-xs text-muted">
          {completeness >= 100
            ? 'Your campus identity is complete. All academic credentials are saved in the database.'
            : 'Complete your department and university details to make lost & found matching and ownership verification smoother.'}
        </p>
      </motion.div>

      {/* ── 3. Tabs Navigation ─────────────────────────────────── */}
      <div className="tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'overview' ? 'active' : ''}`}
          onClick={() => setActiveTab('overview')}
        >
          Academic Details &amp; Activity
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          Password &amp; Security
        </button>
      </div>

      {/* ── 4. Tab 1: Academic Details & Activity ─────────────── */}
      {activeTab === 'overview' && (
        <div style={{ display: 'grid', gap: 28 }}>
          {/* Live Activity Metric Stats */}
          <div className="stat-grid">
            <Link to="/lost-items?tab=mine" style={{ textDecoration: 'none' }}>
              <motion.div
                className="stat-card"
                whileHover={{ y: -2 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: 'var(--radius-md)',
                  background: 'rgba(143,162,138,0.16)', display: 'grid', placeItems: 'center',
                  marginBottom: 8, color: 'var(--primary-deep)', border: '1px solid rgba(143,162,138,0.25)',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
                  </svg>
                </div>
                <div className="label">Lost Reports</div>
                <div className="value">
                  <AnimatedNumber value={activityStats.lostCount} />
                </div>
                <div className="sub">Reports filed by you</div>
                <span className="stat-link">View reports →</span>
              </motion.div>
            </Link>

            <Link to="/found-items" style={{ textDecoration: 'none' }}>
              <motion.div
                className="stat-card"
                whileHover={{ y: -2 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: 'var(--radius-md)',
                  background: 'rgba(143,162,138,0.16)', display: 'grid', placeItems: 'center',
                  marginBottom: 8, color: 'var(--primary-deep)', border: '1px solid rgba(143,162,138,0.25)',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/><polyline points="16 3 12 7 8 3"/>
                  </svg>
                </div>
                <div className="label">Found Logs</div>
                <div className="value">
                  <AnimatedNumber value={activityStats.foundCount} />
                </div>
                <div className="sub">Items logged on campus</div>
                <span className="stat-link">Browse directory →</span>
              </motion.div>
            </Link>

            <Link to="/my-claims" style={{ textDecoration: 'none' }}>
              <motion.div
                className="stat-card accent"
                whileHover={{ y: -2 }}
                transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              >
                <div style={{
                  width: 42, height: 42, borderRadius: 'var(--radius-md)',
                  background: 'var(--accent-bg)', display: 'grid', placeItems: 'center',
                  marginBottom: 8, color: 'var(--accent-deep)', border: '1px solid var(--accent-border)',
                }}>
                  <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M9 11l3 3L22 4"/><path d="M21 12v7a2 2 0 01-2 2H5a2 2 0 01-2-2V5a2 2 0 012-2h11"/>
                  </svg>
                </div>
                <div className="label">Active Claims</div>
                <div className="value">
                  <AnimatedNumber value={activityStats.claimsCount} />
                </div>
                <div className="sub">Property ownership claims</div>
                <span className="stat-link">Track status →</span>
              </motion.div>
            </Link>
          </div>

          {/* Structured Academic & Personal Information */}
          <div className="card card-pad-lg">
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
              <div>
                <h3 style={{ fontSize: '1.2rem', marginBottom: 4 }}>Academic &amp; Personal Details</h3>
                <p className="text-sm text-muted">Verified profile data stored in the CampusFind database.</p>
              </div>
              <button
                type="button"
                className="btn btn-secondary btn-sm"
                onClick={handleOpenEdit}
              >
                Edit Information
              </button>
            </div>

            <div className="profile-info-grid">
              {/* Full Name */}
              <div className="profile-info-item">
                <div className="profile-info-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/>
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-muted font-bold" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                    Full Name
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: profile.fullName ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {profile.fullName || (
                      <span style={{ fontStyle: 'italic', cursor: 'pointer', textDecoration: 'underline' }} onClick={handleOpenEdit}>
                        + Add full name
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* University Email (Read-only) */}
              <div className="profile-info-item">
                <div className="profile-info-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/>
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-muted font-bold" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                    University Email (Account ID)
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                    {profile.email || '—'}
                  </div>
                </div>
              </div>

              {/* University / Institute */}
              <div className="profile-info-item">
                <div className="profile-info-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M12 2L2 7l10 5 10-5-10-5z"/><path d="M2 17l10 5 10-5"/><path d="M2 12l10 5 10-5"/>
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-muted font-bold" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                    University / Institute
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: profile.university ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {profile.university || (
                      <span style={{ fontStyle: 'italic', cursor: 'pointer', textDecoration: 'underline' }} onClick={handleOpenEdit}>
                        + Add university
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Department & Faculty */}
              <div className="profile-info-item">
                <div className="profile-info-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M3 21h18"/><path d="M5 21V5a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v16"/><line x1="9" y1="9" x2="15" y2="9"/>
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-muted font-bold" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                    Department &amp; Faculty
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: profile.department ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {profile.department || (
                      <span style={{ fontStyle: 'italic', cursor: 'pointer', textDecoration: 'underline' }} onClick={handleOpenEdit}>
                        + Add department
                      </span>
                    )}
                  </div>
                </div>
              </div>

              {/* Student ID or Job Title */}
              {isOfficerOrAdmin ? (
                <div className="profile-info-item">
                  <div className="profile-info-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="2" y="7" width="20" height="14" rx="2" ry="2"/><path d="M16 21V5a2 2 0 0 0-2-2h-4a2 2 0 0 0-2 2v16"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs text-muted font-bold" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                      Official Designation / Job Title
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: profile.jobTitle ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {profile.jobTitle || (
                        <span style={{ fontStyle: 'italic', cursor: 'pointer', textDecoration: 'underline' }} onClick={handleOpenEdit}>
                          + Add job title
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="profile-info-item">
                  <div className="profile-info-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <rect x="3" y="4" width="18" height="16" rx="2"/><line x1="7" y1="8" x2="17" y2="8"/><line x1="7" y1="12" x2="13" y2="12"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs text-muted font-bold" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                      Student ID Number
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: profile.studentId ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {profile.studentId || (
                        <span style={{ fontStyle: 'italic', cursor: 'pointer', textDecoration: 'underline' }} onClick={handleOpenEdit}>
                          + Add student ID
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Semester / Year */}
              {!isOfficerOrAdmin && (
                <div className="profile-info-item">
                  <div className="profile-info-icon">
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
                    </svg>
                  </div>
                  <div>
                    <div className="text-xs text-muted font-bold" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                      Semester / Academic Year
                    </div>
                    <div style={{ fontWeight: 700, fontSize: '0.95rem', color: profile.semester ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                      {profile.semester || (
                        <span style={{ fontStyle: 'italic', cursor: 'pointer', textDecoration: 'underline' }} onClick={handleOpenEdit}>
                          + Add semester
                        </span>
                      )}
                    </div>
                  </div>
                </div>
              )}

              {/* Contact Phone */}
              <div className="profile-info-item">
                <div className="profile-info-icon">
                  <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <path d="M22 16.92v3a2 2 0 0 1-2.18 2 19.79 19.79 0 0 1-8.63-3.07 19.5 19.5 0 0 1-6-6 19.79 19.79 0 0 1-3.07-8.67A2 2 0 0 1 4.11 2h3a2 2 0 0 1 2 1.72 12.84 12.84 0 0 0 .7 2.81 2 2 0 0 1-.45 2.11L8.09 9.91a16 16 0 0 0 6 6l1.27-1.27a2 2 0 0 1 2.11-.45 12.84 12.84 0 0 0 2.81.7A2 2 0 0 1 22 16.92z"/>
                  </svg>
                </div>
                <div>
                  <div className="text-xs text-muted font-bold" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 2 }}>
                    Contact Phone Number
                  </div>
                  <div style={{ fontWeight: 700, fontSize: '0.95rem', color: profile.phone ? 'var(--text-primary)' : 'var(--text-muted)' }}>
                    {profile.phone || (
                      <span style={{ fontStyle: 'italic', cursor: 'pointer', textDecoration: 'underline' }} onClick={handleOpenEdit}>
                        + Add phone number
                      </span>
                    )}
                  </div>
                </div>
              </div>
            </div>

            {/* Bio Card */}
            <div style={{ marginTop: 20, padding: '16px 18px', background: 'var(--surface-card-alt)', borderRadius: 'var(--radius-lg)', border: '1px solid var(--border)' }}>
              <div className="text-xs text-muted font-bold" style={{ textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 6 }}>
                Campus Bio &amp; Activity Notes
              </div>
              <p style={{ margin: 0, fontSize: '0.92rem', lineHeight: 1.6, color: profile.bio ? 'var(--text-secondary)' : 'var(--text-muted)' }}>
                {profile.bio || (
                  <span style={{ fontStyle: 'italic', cursor: 'pointer', textDecoration: 'underline' }} onClick={handleOpenEdit}>
                    + Add a short bio or notes about your typical campus spots
                  </span>
                )}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* ── 5. Tab 2: Password & Security ─────────────────────── */}
      {activeTab === 'security' && (
        <div style={{ display: 'grid', gap: 24 }}>
          {/* Change Password Card */}
          <motion.div
            className="card card-pad-lg"
            initial={{ opacity: 0, y: 8 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3 }}
          >
            <h3 style={{ fontSize: '1.25rem', marginBottom: 4 }}>Change Account Password</h3>
            <p className="text-sm text-muted" style={{ marginBottom: 20 }}>
              Update your login password. Must include uppercase, lowercase, numbers, and at least 8 characters.
            </p>

            <Alert type="error">{passwordErrorMsg}</Alert>
            <Alert type="success">{passwordSuccessMsg}</Alert>

            <form onSubmit={handleSavePassword} style={{ display: 'grid', gap: 18 }}>
              <div className="form-field">
                <label htmlFor="currentPassword">Current Password</label>
                <input
                  id="currentPassword"
                  type="password"
                  required
                  autoComplete="current-password"
                  value={passwords.currentPassword}
                  onChange={(e) => setPasswords({ ...passwords, currentPassword: e.target.value })}
                />
              </div>

              <div className="form-row">
                <div className="form-field">
                  <label htmlFor="newPassword">New Password</label>
                  <input
                    id="newPassword"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={passwords.newPassword}
                    onChange={(e) => setPasswords({ ...passwords, newPassword: e.target.value })}
                  />
                </div>

                <div className="form-field">
                  <label htmlFor="confirmPassword">Confirm New Password</label>
                  <input
                    id="confirmPassword"
                    type="password"
                    required
                    autoComplete="new-password"
                    value={passwords.confirmPassword}
                    onChange={(e) => setPasswords({ ...passwords, confirmPassword: e.target.value })}
                  />
                </div>
              </div>

              <div style={{ marginTop: 6 }}>
                <button
                  type="submit"
                  className="btn btn-secondary btn-md"
                  disabled={savingPassword}
                >
                  {savingPassword && <ButtonSpinner />}
                  {savingPassword ? 'Updating Password…' : 'Update Password'}
                </button>
              </div>
            </form>
          </motion.div>

          {/* Account Session Actions */}
          <div className="card card-pad-lg">
            <h3 style={{ fontSize: '1.2rem', marginBottom: 4 }}>Account Session</h3>
            <p className="text-sm text-muted" style={{ marginBottom: 20 }}>
              Safely end your authenticated session on this browser.
            </p>

            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 16 }}>
              <div>
                <div style={{ fontWeight: 700, fontSize: '0.95rem', color: 'var(--text-primary)' }}>
                  Sign Out of CampusFind AI
                </div>
                <div className="text-xs text-muted" style={{ marginTop: 2 }}>
                  Signed in as <strong>{profile.email}</strong>
                </div>
              </div>
              <button
                type="button"
                className="btn btn-outline-danger btn-sm"
                onClick={logout}
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* ── 6. Edit Profile Modal ─────────────────────────────── */}
      <AnimatePresence>
        {isEditModalOpen && (
          <div
            style={{
              position: 'fixed',
              inset: 0,
              background: 'rgba(28, 35, 26, 0.60)',
              backdropFilter: 'blur(6px)',
              WebkitBackdropFilter: 'blur(6px)',
              display: 'grid',
              placeItems: 'center',
              zIndex: 1000,
              padding: 20,
            }}
            onClick={() => !savingProfile && setIsEditModalOpen(false)}
          >
            <motion.div
              className="card card-pad-lg"
              style={{
                width: '100%',
                maxWidth: 620,
                maxHeight: '90vh',
                overflowY: 'auto',
                boxShadow: 'var(--shadow-elevated)',
              }}
              initial={{ opacity: 0, scale: 0.95, y: 14 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.95, y: 10 }}
              transition={{ duration: 0.22, ease: [0.22, 1, 0.36, 1] }}
              onClick={(e) => e.stopPropagation()}
            >
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 20 }}>
                <div>
                  <h2 style={{ fontSize: '1.35rem', margin: 0 }}>Edit Campus Profile</h2>
                  <p className="text-xs text-muted" style={{ marginTop: 3 }}>
                    Update your verified academic information in the database.
                  </p>
                </div>
                <button
                  type="button"
                  onClick={() => setIsEditModalOpen(false)}
                  disabled={savingProfile}
                  style={{
                    background: 'var(--surface-tinted)',
                    border: 'none',
                    borderRadius: '50%',
                    width: 32,
                    height: 32,
                    display: 'grid',
                    placeItems: 'center',
                    cursor: 'pointer',
                    color: 'var(--text-secondary)',
                  }}
                  aria-label="Close dialog"
                >
                  ✕
                </button>
              </div>

              <Alert type="error">{profileErrorMsg}</Alert>

              <form onSubmit={handleSaveProfile} style={{ display: 'grid', gap: 16 }}>
                {/* Full Name */}
                <div className="form-field">
                  <label htmlFor="edit-fullName">Full Name</label>
                  <input
                    id="edit-fullName"
                    type="text"
                    maxLength={120}
                    value={editFormData.fullName}
                    onChange={(e) => setEditFormData({ ...editFormData, fullName: e.target.value })}
                    placeholder="Ex: Masrafi Iqbal"
                  />
                </div>

                {/* University / Institute */}
                <div className="form-field">
                  <label htmlFor="edit-university">University / Institute</label>
                  <input
                    id="edit-university"
                    type="text"
                    maxLength={150}
                    value={editFormData.university}
                    onChange={(e) => setEditFormData({ ...editFormData, university: e.target.value })}
                    placeholder="Ex: Ahsanullah University of Science and Technology"
                  />
                </div>

                {/* Department & Student ID / Job Title */}
                <div className="form-row">
                  <div className="form-field">
                    <label htmlFor="edit-department">Department &amp; Faculty</label>
                    <input
                      id="edit-department"
                      type="text"
                      maxLength={120}
                      value={editFormData.department}
                      onChange={(e) => setEditFormData({ ...editFormData, department: e.target.value })}
                      placeholder="Ex: Computer Science &amp; Engineering"
                    />
                  </div>

                  {isOfficerOrAdmin ? (
                    <div className="form-field">
                      <label htmlFor="edit-jobTitle">Designation / Job Title</label>
                      <input
                        id="edit-jobTitle"
                        type="text"
                        maxLength={120}
                        value={editFormData.jobTitle}
                        onChange={(e) => setEditFormData({ ...editFormData, jobTitle: e.target.value })}
                        placeholder="Ex: Senior Security Officer"
                      />
                    </div>
                  ) : (
                    <div className="form-field">
                      <label htmlFor="edit-studentId">Student ID Number</label>
                      <input
                        id="edit-studentId"
                        type="text"
                        maxLength={50}
                        value={editFormData.studentId}
                        onChange={(e) => setEditFormData({ ...editFormData, studentId: e.target.value })}
                        placeholder="Ex: 2026-12345"
                      />
                    </div>
                  )}
                </div>

                {/* Semester & Phone */}
                <div className={isOfficerOrAdmin ? '' : 'form-row'}>
                  {!isOfficerOrAdmin && (
                    <div className="form-field">
                      <label htmlFor="edit-semester">Semester / Year</label>
                      <input
                        id="edit-semester"
                        type="text"
                        maxLength={40}
                        value={editFormData.semester}
                        onChange={(e) => setEditFormData({ ...editFormData, semester: e.target.value })}
                        placeholder="Ex: 6th Semester / 3rd Year"
                      />
                    </div>
                  )}

                  <div className="form-field">
                    <label htmlFor="edit-phone">Contact Phone Number</label>
                    <input
                      id="edit-phone"
                      type="tel"
                      maxLength={30}
                      value={editFormData.phone}
                      onChange={(e) => setEditFormData({ ...editFormData, phone: e.target.value })}
                      placeholder="Ex: +880 17XXXXXXXX"
                    />
                  </div>
                </div>

                {/* Bio */}
                <div className="form-field">
                  <label htmlFor="edit-bio">Campus Bio &amp; Activity Notes</label>
                  <textarea
                    id="edit-bio"
                    rows="3"
                    maxLength={500}
                    value={editFormData.bio}
                    onChange={(e) => setEditFormData({ ...editFormData, bio: e.target.value })}
                    placeholder="Ex: CSE student, active around library and campus cafeteria"
                  />
                </div>

                <div style={{ display: 'flex', justifyContent: 'flex-end', gap: 12, marginTop: 12 }}>
                  <button
                    type="button"
                    className="btn btn-secondary"
                    disabled={savingProfile}
                    onClick={() => setIsEditModalOpen(false)}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={savingProfile}
                  >
                    {savingProfile && <ButtonSpinner />}
                    {savingProfile ? 'Saving…' : 'Save Changes'} <span className="btn-arrow">→</span>
                  </button>
                </div>
              </form>
            </motion.div>
          </div>
        )}
      </AnimatePresence>
    </div>
  );
}
