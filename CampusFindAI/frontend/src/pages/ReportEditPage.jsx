import { useEffect, useState } from 'react';
import { Link, Navigate, useNavigate, useParams } from 'react-router-dom';
import { Alert, ButtonSpinner, PageLoading } from '../components/Ui';
import { getCategories } from '../api/reference';
import { getLostItemById, updateLostItem } from '../api/lostItems';
import { getFoundItemById, updateFoundItem } from '../api/foundItems';
import { useAuth } from '../context/AuthContext';

function localDate(value) {
  if (!value) return '';
  const date = new Date(value); const offset = date.getTimezoneOffset() * 60000;
  return new Date(date - offset).toISOString().slice(0, 16);
}

export default function ReportEditPage({ type }) {
  const { id } = useParams(); const navigate = useNavigate(); const { user } = useAuth();
  const [item, setItem] = useState(null); const [categories, setCategories] = useState([]); const [error, setError] = useState(''); const [saving, setSaving] = useState(false);
  const [form, setForm] = useState({ title: '', description: '', date: '', categoryId: '', locationDetails: '' }); const [images, setImages] = useState([]);
  const isLost = type === 'lost'; const dateKey = isLost ? 'lostAt' : 'foundAt'; const get = isLost ? getLostItemById : getFoundItemById;
  useEffect(() => { Promise.all([get(id), getCategories()]).then(([report, cats]) => { setItem(report); setCategories(cats); setForm({ title: report.title || '', description: report.description || '', date: localDate(report[dateKey]), categoryId: report.categoryId || '', locationDetails: report.locationDetails || '' }); }).catch(err => setError(err.message)); }, [id, dateKey]);
  if (error && !item) return <div className="page-container-detail"><Alert type="error">{error}</Alert></div>;
  if (!item) return <PageLoading label="Loading report…" />;
  if (item.userId !== user?.id) return <Navigate to={`/${type}-items/${id}`} replace />;
  if (isLost ? item.status !== 'Open' : item.status !== 'Available') return <div className="page-container-detail"><Alert type="info">This report can no longer be edited because it is not active.</Alert><Link className="btn btn-secondary" to={`/${type}-items/${id}`}>Back to report</Link></div>;
  async function submit(event) { event.preventDefault(); setSaving(true); setError(''); try { const payload = { title: form.title, description: form.description, categoryId: form.categoryId || null, locationDetails: form.locationDetails, images, [dateKey]: form.date || null }; await (isLost ? updateLostItem(id, payload) : updateFoundItem(id, payload)); navigate(`/${type}-items?tab=mine`); } catch (err) { setError(err.message); } finally { setSaving(false); } }
  return <div className="page-container-detail"><Link className="back-link" to={`/${type}-items/${id}`}>← Back to report</Link><div className="card card-pad-lg"><h1>Edit {isLost ? 'Lost' : 'Found'} Report</h1><p className="text-secondary" style={{ marginBottom: 24 }}>Update the public report details. Existing photos are retained; selected photos are added.</p><form onSubmit={submit} style={{ display: 'grid', gap: 18 }}><Alert type="error">{error}</Alert><div className="form-field"><label htmlFor="title">Title</label><input id="title" maxLength="150" required value={form.title} onChange={e => setForm({ ...form, title: e.target.value })} /></div><div className="form-field"><label htmlFor="description">Description</label><textarea id="description" rows="4" value={form.description} onChange={e => setForm({ ...form, description: e.target.value })} /></div><div className="form-grid"><div className="form-field"><label htmlFor="category">Category</label><select id="category" required value={form.categoryId} onChange={e => setForm({ ...form, categoryId: e.target.value })}><option value="">Select category</option>{categories.map(c => <option key={c.id} value={c.id}>{c.name}</option>)}</select></div><div className="form-field"><label htmlFor="date">Date {isLost ? 'Lost' : 'Found'}</label><input id="date" type="datetime-local" value={form.date} onChange={e => setForm({ ...form, date: e.target.value })} /></div></div><div className="form-field"><label htmlFor="location">Location details</label><textarea id="location" maxLength="200" rows="3" value={form.locationDetails} onChange={e => setForm({ ...form, locationDetails: e.target.value })} /><span className="hint">Maximum 200 characters.</span></div><div className="form-field"><label htmlFor="images">Add photos (optional)</label><input id="images" type="file" accept="image/*" multiple onChange={e => setImages(Array.from(e.target.files || []))} /></div>{!isLost && <p className="text-sm text-muted">Private ownership-verification details are protected and cannot be viewed or changed here.</p>}<div style={{ display: 'flex', gap: 12 }}><button className="btn btn-primary" disabled={saving}>{saving && <ButtonSpinner />}{saving ? 'Saving…' : 'Save Changes'}</button><Link className="btn btn-ghost" to={`/${type}-items/${id}`}>Cancel</Link></div></form></div></div>;
}
