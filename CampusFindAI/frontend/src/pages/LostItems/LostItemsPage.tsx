import { useEffect, useState, type FormEvent } from 'react';
import { createLostItem, getAllLostItems, getMyLostItems, type LostItem } from '../../services/lostItemService';
import { getApiError } from '../../services/apiError';
import { Notice } from '../../components/Notice';

export function LostItemsPage() {
  const [items, setItems] = useState<LostItem[]>([]); const [mine, setMine] = useState<LostItem[]>([]);
  const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [lostAt, setLostAt] = useState('');
  const [loading, setLoading] = useState(true); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  async function load() { setLoading(true); try { const [all, own] = await Promise.all([getAllLostItems(), getMyLostItems()]); setItems(all); setMine(own); } catch (e) { setError(getApiError(e, 'Could not load lost-item reports.')); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); if (!title.trim()) { setError('Please enter an item title.'); return; } setSubmitting(true); setError(''); setSuccess(''); try { await createLostItem({ title: title.trim(), description: description.trim() || undefined, lostAt: lostAt ? new Date(lostAt).toISOString() : undefined }); setTitle(''); setDescription(''); setLostAt(''); setSuccess('Your lost-item report has been submitted.'); await load(); } catch (e) { setError(getApiError(e, 'Could not submit your lost-item report.')); } finally { setSubmitting(false); } }
  return <div className="content-grid"><section className="form-panel"><p className="eyebrow">Create a report</p><h1>Lost something?</h1><p className="muted">Share enough detail to help your campus community recognize it.</p>
    <form onSubmit={submit}><label>Item title<input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={160} placeholder="e.g. Black wallet" /></label><label>Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} maxLength={2000} placeholder="Colour, brand, identifying features, or where you last saw it" /></label><label>When did you lose it?<input type="datetime-local" value={lostAt} onChange={(e) => setLostAt(e.target.value)} /></label><button className="button" disabled={submitting}>{submitting ? 'Submitting...' : 'Report lost item'}</button></form>
    {error && <Notice>{error}</Notice>}{success && <Notice type="success">{success}</Notice>}
  </section><section className="reports-panel"><div className="section-heading"><div><p className="eyebrow">Browse reports</p><h2>Lost-item reports</h2></div><button className="button button-secondary" onClick={load} disabled={loading}>Refresh</button></div>
    {loading ? <p className="loading">Loading reports...</p> : <><ReportList title="All reports" items={items} timeKey="lostAt" /><ReportList title="My reports" items={mine} timeKey="lostAt" /></>}
  </section></div>;
}
function ReportList({ title, items, timeKey }: { title: string; items: LostItem[]; timeKey: 'lostAt' }) { return <section className="report-section"><h3>{title}</h3>{items.length === 0 ? <p className="empty-state">No lost-item reports yet.</p> : <div className="report-list">{items.map((item) => <article className="report-card" key={item.id}><div><h4>{item.title}</h4><p>{item.description || 'No description provided.'}</p><small>{item[timeKey] ? `Lost ${new Date(item[timeKey]!).toLocaleString()}` : 'Loss time not specified'}</small></div><span className="badge badge-pending">{item.status}</span></article>)}</div>}</section>; }
