import { useEffect, useState } from 'react';
import { motion } from 'framer-motion';
import { changePassword, getProfile, updateProfile } from '../api/profile';
import { Alert, ButtonSpinner, PageLoading, RoleBadge } from '../components/Ui';

const emptyProfile = {
  email: '', role: '', fullName: '', department: '',
  jobTitle: '', semester: '', studentId: '', phone: '',
};

export default function ProfilePage() {
  const [profile, setProfile] = useState(emptyProfile);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [profileMessage, setProfileMessage] = useState('');
  const [profileError, setProfileError] = useState('');
  const [passwords, setPasswords] = useState({ currentPassword: '', newPassword: '', confirmPassword: '' });
  const [passwordSaving, setPasswordSaving] = useState(false);
  const [passwordMessage, setPasswordMessage] = useState('');
  const [passwordError, setPasswordError] = useState('');
  const [activeTab, setActiveTab] = useState('info');

  useEffect(() => {
    getProfile()
      .then(data => setProfile({ ...emptyProfile, ...data }))
      .catch(err => setProfileError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function updateField(e) {
    const { name, value } = e.target;
    setProfile(cur => ({ ...cur, [name]: value }));
  }

  async function saveProfile(e) {
    e.preventDefault();
    setSaving(true);
    setProfileError('');
    setProfileMessage('');
    try {
      const saved = await updateProfile(profile);
      setProfile({ ...emptyProfile, ...saved });
      setProfileMessage('Your profile has been updated.');
    } catch (err) {
      setProfileError(err.message);
    } finally {
      setSaving(false);
    }
  }

  function updatePasswordField(e) {
    const { name, value } = e.target;
    setPasswords(cur => ({ ...cur, [name]: value }));
  }

  async function savePassword(e) {
    e.preventDefault();
    setPasswordError('');
    setPasswordMessage('');
    if (passwords.newPassword.length < 8) { setPasswordError('Your new password must be at least 8 characters.'); return; }
    if (!/[A-Z]/.test(passwords.newPassword) || !/[a-z]/.test(passwords.newPassword) || !/[0-9]/.test(passwords.newPassword)) { setPasswordError('Your new password needs an uppercase letter, a lowercase letter, and a digit.'); return; }
    if (passwords.newPassword !== passwords.confirmPassword) { setPasswordError('The new passwords do not match.'); return; }
    setPasswordSaving(true);
    try {
      await changePassword(passwords);
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordMessage('Your password has been changed.');
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setPasswordSaving(false);
    }
  }

  if (loading) return <PageLoading label="Loading your profile…" />;
  const isAdministrator = profile.role === 'Administrator';

  const displayName = profile.fullName || profile.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="page-container page-container-narrow">
      {/* ── Profile header ─────────────────────────────────────── */}
      <motion.div
        className="card card-pad"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{ marginBottom: 24 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 20, flexWrap: 'wrap' }}>
          {/* Avatar */}
          <div style={{
            width: 72, height: 72,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-deep) 100%)',
            display: 'grid', placeItems: 'center',
            fontSize: '1.5rem', fontWeight: 800,
            color: 'white',
            fontFamily: 'var(--font-display)',
            flexShrink: 0,
            boxShadow: '0 4px 16px rgba(132,177,121,0.4)',
          }}>
            {initials}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <h2 style={{ fontSize: '1.3rem', marginBottom: 4 }}>{displayName}</h2>
            <p className="text-sm text-muted" style={{ marginBottom: 8 }}>{profile.email}</p>
            <RoleBadge role={profile.role} />
          </div>
        </div>

        {/* Trust score (decorative for students) */}
        {!isAdministrator && (
          <div style={{
            marginTop: 20,
            padding: '14px 18px',
            background: 'rgba(132,177,121,0.12)',
            borderRadius: 'var(--radius-md)',
            display: 'flex',
            alignItems: 'center',
            gap: 16,
          }}>
            <div style={{ textAlign: 'center' }}>
              <p style={{ fontSize: '1.6rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--primary-deep)', lineHeight: 1 }}>0</p>
              <p className="text-xs text-muted" style={{ marginTop: 2 }}>Trust Points</p>
            </div>
            <div style={{ width: 1, height: 32, background: 'var(--border)' }} />
            <div>
              <p className="text-sm font-semibold" style={{ marginBottom: 2 }}>Campus Reputation</p>
              <p className="text-xs text-muted">Return items to earn trust points and badges</p>
            </div>
          </div>
        )}
      </motion.div>

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div className="tabs" style={{ marginBottom: 24 }}>
        <button type="button" className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>Personal Info</button>
        <button type="button" className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`} onClick={() => setActiveTab('security')}>Security</button>
      </div>

      {/* ── Personal info tab ─────────────────────────────────── */}
      {activeTab === 'info' && (
        <motion.div
          className="card card-pad profile-section"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h2 style={{ fontSize: '1.1rem', marginBottom: 4 }}>Personal information</h2>
          <p className="text-sm text-muted" style={{ marginBottom: 20 }}>Your email is tied to your sign-in account.</p>
          <Alert type="error">{profileError}</Alert>
          <Alert type="success">{profileMessage}</Alert>
          <form onSubmit={saveProfile} style={{ display: 'grid', gap: 16 }}>
            <div className="form-field">
              <label htmlFor="profile-email">Email address</label>
              <input id="profile-email" type="email" value={profile.email} disabled style={{ opacity: 0.6 }} />
            </div>
            <div className="form-field">
              <label htmlFor="fullName">Full name</label>
              <input id="fullName" name="fullName" type="text" maxLength="120" value={profile.fullName || ''} onChange={updateField} placeholder="Your full name" />
            </div>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="department">Department</label>
                <input id="department" name="department" type="text" maxLength="120" value={profile.department || ''} onChange={updateField} placeholder="e.g. Computer Science" />
              </div>
              {isAdministrator ? (
                <div className="form-field">
                  <label htmlFor="jobTitle">Title</label>
                  <input id="jobTitle" name="jobTitle" type="text" maxLength="120" value={profile.jobTitle || ''} onChange={updateField} placeholder="e.g. System Administrator" />
                </div>
              ) : (
                <div className="form-field">
                  <label htmlFor="semester">Semester</label>
                  <input id="semester" name="semester" type="text" maxLength="40" value={profile.semester || ''} onChange={updateField} placeholder="e.g. 6th" />
                </div>
              )}
            </div>
            <div className={isAdministrator ? '' : 'form-row'}>
              {!isAdministrator && (
                <div className="form-field">
                  <label htmlFor="studentId">Student ID</label>
                  <input id="studentId" name="studentId" type="text" maxLength="50" value={profile.studentId || ''} onChange={updateField} placeholder="Your university ID" />
                </div>
              )}
              <div className="form-field">
                <label htmlFor="phone">Phone number</label>
                <input id="phone" name="phone" type="tel" maxLength="30" value={profile.phone || ''} onChange={updateField} placeholder="e.g. +880 1XXXXXXXXX" />
              </div>
            </div>
            <motion.button className="btn btn-primary" type="submit" disabled={saving} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} style={{ width: 'fit-content' }}>
              {saving && <ButtonSpinner />}{saving ? 'Saving…' : 'Save profile'}
            </motion.button>
          </form>
        </motion.div>
      )}

      {/* ── Security tab ─────────────────────────────────────── */}
      {activeTab === 'security' && (
        <motion.div
          className="card card-pad profile-section"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h2 style={{ fontSize: '1.1rem', marginBottom: 4 }}>Change password</h2>
          <p className="text-sm text-muted" style={{ marginBottom: 20 }}>Use a unique password with at least 8 characters, including uppercase, lowercase, and a digit.</p>
          <Alert type="error">{passwordError}</Alert>
          <Alert type="success">{passwordMessage}</Alert>
          <form onSubmit={savePassword} style={{ display: 'grid', gap: 16 }}>
            <div className="form-field">
              <label htmlFor="currentPassword">Current password</label>
              <input id="currentPassword" name="currentPassword" type="password" autoComplete="current-password" value={passwords.currentPassword} onChange={updatePasswordField} required />
            </div>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="newPassword">New password</label>
                <input id="newPassword" name="newPassword" type="password" autoComplete="new-password" value={passwords.newPassword} onChange={updatePasswordField} required />
              </div>
              <div className="form-field">
                <label htmlFor="confirmPassword">Confirm new password</label>
                <input id="confirmPassword" name="confirmPassword" type="password" autoComplete="new-password" value={passwords.confirmPassword} onChange={updatePasswordField} required />
              </div>
            </div>
            <motion.button className="btn btn-secondary" type="submit" disabled={passwordSaving} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }} style={{ width: 'fit-content' }}>
              {passwordSaving && <ButtonSpinner />}{passwordSaving ? 'Changing…' : 'Change password'}
            </motion.button>
          </form>
        </motion.div>
      )}
    </div>
  );
}
