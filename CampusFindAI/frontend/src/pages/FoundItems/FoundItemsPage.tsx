import { useEffect, useState, type FormEvent } from 'react';
import { createFoundItem, getAllFoundItems, getMyFoundItems, type FoundItem } from '../../services/foundItemService';
import { getApiError } from '../../services/apiError';
import { Notice } from '../../components/Notice';

export function FoundItemsPage() {
  const [items, setItems] = useState<FoundItem[]>([]); const [mine, setMine] = useState<FoundItem[]>([]);
  const [title, setTitle] = useState(''); const [description, setDescription] = useState(''); const [foundAt, setFoundAt] = useState('');
  const [loading, setLoading] = useState(true); const [submitting, setSubmitting] = useState(false); const [error, setError] = useState(''); const [success, setSuccess] = useState('');
  async function load() { setLoading(true); try { const [all, own] = await Promise.all([getAllFoundItems(), getMyFoundItems()]); setItems(all); setMine(own); } catch (e) { setError(getApiError(e, 'Could not load found-item reports.')); } finally { setLoading(false); } }
  useEffect(() => { load(); }, []);
  async function submit(e: FormEvent<HTMLFormElement>) { e.preventDefault(); if (!title.trim()) { setError('Please enter an item title.'); return; } setSubmitting(true); setError(''); setSuccess(''); try { await createFoundItem({ title: title.trim(), description: description.trim() || undefined, foundAt: foundAt ? new Date(foundAt).toISOString() : undefined }); setTitle(''); setDescription(''); setFoundAt(''); setSuccess('Your found-item report has been submitted.'); await load(); } catch (e) { setError(getApiError(e, 'Could not submit your found-item report.')); } finally { setSubmitting(false); } }
  return <div className="content-grid"><section className="form-panel"><p className="eyebrow">Create a report</p><h1>Found an item?</h1><p className="muted">Log it here so its owner can submit a secure claim.</p>
    <form onSubmit={submit}><label>Item title<input value={title} onChange={(e) => setTitle(e.target.value)} required maxLength={160} placeholder="e.g. Blue water bottle" /></label><label>Description<textarea value={description} onChange={(e) => setDescription(e.target.value)} rows={5} maxLength={2000} placeholder="Colour, brand, identifying features, and where it was found" /></label><label>When did you find it?<input type="datetime-local" value={foundAt} onChange={(e) => setFoundAt(e.target.value)} /></label><button className="button" disabled={submitting}>{submitting ? 'Submitting...' : 'Report found item'}</button></form>
    {error && <Notice>{error}</Notice>}{success && <Notice type="success">{success}</Notice>}
  </section><section className="reports-panel"><div className="section-heading"><div><p className="eyebrow">Browse reports</p><h2>Found-item reports</h2></div><button className="button button-secondary" onClick={load} disabled={loading}>Refresh</button></div>
    {loading ? <p className="loading">Loading reports...</p> : <><FoundList title="All reports" items={items}/><FoundList title="My reports" items={mine}/></>}
  </section></div>;
}
function FoundList({ title, items }: { title: string; items: FoundItem[] }) { return <section className="report-section"><h3>{title}</h3>{items.length === 0 ? <p className="empty-state">No found-item reports yet.</p> : <div className="report-list">{items.map((item) => <article className="report-card" key={item.id}><div><h4>{item.title}</h4><p>{item.description || 'No description provided.'}</p><small>{item.foundAt ? `Found ${new Date(item.foundAt).toLocaleString()}` : 'Found time not specified'}</small></div></article>)}</div>}</section>; }
