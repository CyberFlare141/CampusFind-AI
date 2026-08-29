import { useEffect, useState } from 'react';
import { changePassword, getProfile, updateProfile } from '../api/profile';
import { Alert, ButtonSpinner, PageLoading, RoleBadge } from '../components/Ui';

const emptyProfile = {
  email: '', role: '', fullName: '', department: '', jobTitle: '', semester: '', studentId: '', phone: '',
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

  useEffect(() => {
    getProfile()
      .then((data) => setProfile({ ...emptyProfile, ...data }))
      .catch((err) => setProfileError(err.message))
      .finally(() => setLoading(false));
  }, []);

  function updateField(event) {
    const { name, value } = event.target;
    setProfile((current) => ({ ...current, [name]: value }));
  }

  async function saveProfile(event) {
    event.preventDefault();
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

  function updatePasswordField(event) {
    const { name, value } = event.target;
    setPasswords((current) => ({ ...current, [name]: value }));
  }

  async function savePassword(event) {
    event.preventDefault();
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
      setPasswordMessage('Your password has been changed.');
    } catch (err) {
      setPasswordError(err.message);
    } finally {
      setPasswordSaving(false);
    }
  }

  if (loading) return <PageLoading label="Loading your profile…" />;
  const isAdministrator = profile.role === 'Administrator';

  return (
    <div className="page-container page-container-narrow">
      <div className="page-header">
        <div>
          <span className="eyebrow">Account</span>
          <h1>My profile</h1>
          <p>Keep your campus information current so the Security Office can contact you when needed.</p>
        </div>
      </div>

      <section className="card card-pad profile-section">
        <div className="profile-account-row">
          <div>
            <h2>Personal information</h2>
            <p className="text-muted text-sm">Your email is tied to your sign-in account.</p>
          </div>
          <RoleBadge role={profile.role} />
        </div>
        <Alert type="error">{profileError}</Alert>
        <Alert type="success">{profileMessage}</Alert>
        <form onSubmit={saveProfile}>
          <div className="form-field">
            <label htmlFor="profile-email">Email address</label>
            <input id="profile-email" type="email" value={profile.email} disabled />
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
          <div className={isAdministrator ? 'form-row form-row-admin' : 'form-row'}>
            {!isAdministrator && <div className="form-field">
              <label htmlFor="studentId">Student ID</label>
              <input id="studentId" name="studentId" type="text" maxLength="50" value={profile.studentId || ''} onChange={updateField} placeholder="Your university ID" />
            </div>}
            <div className="form-field">
              <label htmlFor="phone">Phone number</label>
              <input id="phone" name="phone" type="tel" maxLength="30" value={profile.phone || ''} onChange={updateField} placeholder="e.g. +880 1XXXXXXXXX" />
            </div>
          </div>
          <button className="btn btn-primary" type="submit" disabled={saving}>
            {saving && <ButtonSpinner />}{saving ? 'Saving…' : 'Save profile'}
          </button>
        </form>
      </section>

      <section className="card card-pad profile-section">
        <h2>Change password</h2>
        <p className="text-muted text-sm">Use a unique password with at least 8 characters, including uppercase, lowercase, and a digit.</p>
        <Alert type="error">{passwordError}</Alert>
        <Alert type="success">{passwordMessage}</Alert>
        <form onSubmit={savePassword}>
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
          <button className="btn btn-secondary" type="submit" disabled={passwordSaving}>
            {passwordSaving && <ButtonSpinner />}{passwordSaving ? 'Changing…' : 'Change password'}
          </button>
        </form>
      </section>
    </div>
  );
}
