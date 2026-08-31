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
      setProfileMessage('Your profile has been updated successfully.');
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
    if (passwords.newPassword.length < 8) {
      setPasswordError('Your new password must be at least 8 characters.');
      return;
    }
    if (!/[A-Z]/.test(passwords.newPassword) || !/[a-z]/.test(passwords.newPassword) || !/[0-9]/.test(passwords.newPassword)) {
      setPasswordError('Your new password needs an uppercase letter, a lowercase letter, and a digit.');
      return;
    }
    if (passwords.newPassword !== passwords.confirmPassword) {
      setPasswordError('The new passwords do not match.');
      return;
    }
    setPasswordSaving(true);
    try {
      await changePassword(passwords);
      setPasswords({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setPasswordMessage('Your password has been changed successfully.');
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setPasswordSaving(false);
    }
  }

  if (loading) return <div className="page-container-profile"><PageLoading label="Loading your profile…" /></div>;

  const isAdministrator = profile.role === 'Administrator';
  const displayName = profile.fullName || profile.email?.split('@')[0] || 'User';
  const initials = displayName.slice(0, 2).toUpperCase();

  return (
    <div className="page-container-profile">
      {/* ── Profile Header Card ─────────────────────────────────── */}
      <motion.div
        className="card card-pad-lg"
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
        style={{ marginBottom: 28 }}
      >
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 24, flexWrap: 'wrap' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 20 }}>
            {/* Avatar */}
            <div style={{
              width: 76, height: 76,
              borderRadius: '50%',
              background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-deep) 100%)',
              display: 'grid', placeItems: 'center',
              fontSize: '1.6rem', fontWeight: 800,
              color: 'white',
              fontFamily: 'var(--font-display)',
              flexShrink: 0,
              boxShadow: 'var(--shadow-soft)',
              letterSpacing: '0.02em',
            }}>
              {initials}
            </div>
            <div>
              <h1 style={{ fontSize: 'clamp(1.5rem, 2.5vw, 2rem)', marginBottom: 4 }}>{displayName}</h1>
              <p className="text-sm text-muted" style={{ marginBottom: 8 }}>{profile.email}</p>
              <RoleBadge role={profile.role} />
            </div>
          </div>

          {/* Campus Reputation Banner */}
          {!isAdministrator && (
            <div style={{
              padding: '16px 22px',
              background: 'var(--surface-card-alt)',
              borderRadius: 'var(--radius-xl)',
              display: 'flex',
              alignItems: 'center',
              gap: 20,
              border: '1px solid var(--border)',
            }}>
              <div style={{ textAlign: 'center' }}>
                <p style={{ fontSize: '1.8rem', fontWeight: 800, fontFamily: 'var(--font-display)', color: 'var(--primary-deep)', lineHeight: 1 }}>
                  0
                </p>
                <p className="text-xs text-muted font-bold" style={{ marginTop: 3, textTransform: 'uppercase', letterSpacing: '0.06em' }}>
                  Trust Points
                </p>
              </div>
              <div style={{ width: 1, height: 36, background: 'var(--border)' }} />
              <div>
                <p className="text-sm font-bold text-primary" style={{ marginBottom: 2 }}>Campus Community Rating</p>
                <p className="text-xs text-muted">Earn trust points for reporting found items and prompt handovers</p>
              </div>
            </div>
          )}
        </div>
      </motion.div>

      {/* ── Tabs ──────────────────────────────────────────────── */}
      <div className="tabs">
        <button
          type="button"
          className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`}
          onClick={() => setActiveTab('info')}
        >
          Personal Info
        </button>
        <button
          type="button"
          className={`tab-btn ${activeTab === 'security' ? 'active' : ''}`}
          onClick={() => setActiveTab('security')}
        >
          Password &amp; Security
        </button>
      </div>

      {/* ── Personal Info Tab ─────────────────────────────────── */}
      {activeTab === 'info' && (
        <motion.div
          className="card card-pad-lg"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h2 style={{ fontSize: '1.25rem', marginBottom: 4 }}>Profile Details</h2>
          <p className="text-sm text-muted" style={{ marginBottom: 24 }}>
            Update your academic affiliation and contact information.
          </p>

          <Alert type="error">{profileError}</Alert>
          <Alert type="success">{profileMessage}</Alert>

          <form onSubmit={saveProfile} style={{ display: 'grid', gap: 20 }}>
            <div className="form-field">
              <label htmlFor="profile-email">Email Address</label>
              <input id="profile-email" type="email" value={profile.email} disabled style={{ opacity: 0.65, cursor: 'not-allowed' }} />
            </div>

            <div className="form-field">
              <label htmlFor="fullName">Full Name</label>
              <input
                id="fullName"
                name="fullName"
                type="text"
                maxLength="120"
                value={profile.fullName || ''}
                onChange={updateField}
                placeholder="e.g. Alex Morgan"
              />
            </div>

            <div className="form-row">
              <div className="form-field">
                <label htmlFor="department">Department</label>
                <input
                  id="department"
                  name="department"
                  type="text"
                  maxLength="120"
                  value={profile.department || ''}
                  onChange={updateField}
                  placeholder="e.g. Computer Science &amp; Engineering"
                />
              </div>

              {isAdministrator ? (
                <div className="form-field">
                  <label htmlFor="jobTitle">Job Title</label>
                  <input
                    id="jobTitle"
                    name="jobTitle"
                    type="text"
                    maxLength="120"
                    value={profile.jobTitle || ''}
                    onChange={updateField}
                    placeholder="e.g. Campus Security Lead"
                  />
                </div>
              ) : (
                <div className="form-field">
                  <label htmlFor="semester">Semester / Year</label>
                  <input
                    id="semester"
                    name="semester"
                    type="text"
                    maxLength="40"
                    value={profile.semester || ''}
                    onChange={updateField}
                    placeholder="e.g. 6th Semester / 3rd Year"
                  />
                </div>
              )}
            </div>

            <div className={isAdministrator ? '' : 'form-row'}>
              {!isAdministrator && (
                <div className="form-field">
                  <label htmlFor="studentId">Student ID</label>
                  <input
                    id="studentId"
                    name="studentId"
                    type="text"
                    maxLength="50"
                    value={profile.studentId || ''}
                    onChange={updateField}
                    placeholder="e.g. 2024-00123"
                  />
                </div>
              )}
              <div className="form-field">
                <label htmlFor="phone">Phone Number</label>
                <input
                  id="phone"
                  name="phone"
                  type="tel"
                  maxLength="30"
                  value={profile.phone || ''}
                  onChange={updateField}
                  placeholder="e.g. +1 (555) 019-2834"
                />
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <motion.button
                className="btn btn-primary btn-lg"
                type="submit"
                disabled={saving}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                {saving && <ButtonSpinner />}
                {saving ? 'Saving Changes…' : 'Save Profile Changes'}
              </motion.button>
            </div>
          </form>
        </motion.div>
      )}

      {/* ── Security Tab ─────────────────────────────────────── */}
      {activeTab === 'security' && (
        <motion.div
          className="card card-pad-lg"
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.3 }}
        >
          <h2 style={{ fontSize: '1.25rem', marginBottom: 4 }}>Update Password</h2>
          <p className="text-sm text-muted" style={{ marginBottom: 24 }}>
            Ensure your account uses a strong password with uppercase, lowercase, numbers, and at least 8 characters.
          </p>

          <Alert type="error">{passwordError}</Alert>
          <Alert type="success">{passwordMessage}</Alert>

          <form onSubmit={savePassword} style={{ display: 'grid', gap: 20 }}>
            <div className="form-field">
              <label htmlFor="currentPassword">Current Password</label>
              <input
                id="currentPassword"
                name="currentPassword"
                type="password"
                autoComplete="current-password"
                value={passwords.currentPassword}
                onChange={updatePasswordField}
                required
              />
            </div>
            <div className="form-row">
              <div className="form-field">
                <label htmlFor="newPassword">New Password</label>
                <input
                  id="newPassword"
                  name="newPassword"
                  type="password"
                  autoComplete="new-password"
                  value={passwords.newPassword}
                  onChange={updatePasswordField}
                  required
                />
              </div>
              <div className="form-field">
                <label htmlFor="confirmPassword">Confirm New Password</label>
                <input
                  id="confirmPassword"
                  name="confirmPassword"
                  type="password"
                  autoComplete="new-password"
                  value={passwords.confirmPassword}
                  onChange={updatePasswordField}
                  required
                />
              </div>
            </div>

            <div style={{ marginTop: 8 }}>
              <motion.button
                className="btn btn-secondary btn-lg"
                type="submit"
                disabled={passwordSaving}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                {passwordSaving && <ButtonSpinner />}
                {passwordSaving ? 'Updating Password…' : 'Update Password'}
              </motion.button>
            </div>
          </form>
        </motion.div>
      )}
    </div>
  );
}
