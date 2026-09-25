import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { apiRequest, publicAssetUrl } from '../../api/client';
import { FadeImage } from '../../components/Ui';
import { validateReportImages } from '../../utils/imageValidation';

export default function VisualSearchPage() {
  const [file, setFile] = useState(null);
  const [preview, setPreview] = useState('');
  const [matches, setMatches] = useState([]);
  const [state, setState] = useState('idle');
  const [error, setError] = useState('');

  useEffect(() => () => { if (preview) URL.revokeObjectURL(preview); }, [preview]);
  function select(next) {
    if (preview) URL.revokeObjectURL(preview);
    if (next) {
      const { files, error: validationError } = validateReportImages([next]);
      if (validationError) { setFile(null); setPreview(''); setError(validationError); setMatches([]); setState('idle'); return; }
      next = files[0];
    }
    setFile(next); setPreview(next ? URL.createObjectURL(next) : '');
    setMatches([]); setError(''); setState('idle');
  }
  async function search(event) {
    event.preventDefault(); if (!file) return;
    const body = new FormData(); body.append('image', file);
    setState('searching'); setError('');
    try {
      const result = await apiRequest('/visual-search', { method: 'POST', body });
      setMatches(result.matches || []); setState('results');
    } catch (err) { setError(err.status >= 500 ? 'Visual search is temporarily unavailable. Please try again.' : (err.message || 'Visual search is temporarily unavailable. Please try again.')); setState('error'); }
  }
  return <main className="visual-search-page">
    <header className="visual-search-heading"><p className="eyebrow">IMAGE MATCHING</p><h1>Find an item by photo</h1><p>Upload a clear photo and we’ll compare it with images in found-item reports.</p></header>
    <form className="visual-search-upload" onSubmit={search}>
      <label className="visual-search-drop" htmlFor="visual-search-file">
        {preview ? <img className="visual-search-preview" src={preview} alt="Selected item" /> : <span className="visual-search-icon" aria-hidden="true">⌕</span>}
        <strong>{preview ? file.name : 'Choose a photo'}</strong><span>JPG, PNG, or WebP · up to 5 MB</span>
        <input id="visual-search-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => select(event.target.files?.[0] || null)} />
      </label>
      <div className="visual-search-actions">{file && <button type="button" className="button button-secondary" onClick={() => select(null)}>Remove photo</button>}<button className="button button-primary" disabled={!file || state === 'searching'}>{state === 'searching' ? 'Analyzing image and searching…' : 'Search found items'}</button></div>
    </form>
    {state === 'idle' && <p className="visual-search-note">Upload an image to search for visually similar items.</p>}
    {state === 'error' && <p className="visual-search-error" role="alert">{error || 'Visual search is temporarily unavailable. Please try again.'}</p>}
    {state === 'results' && <section className="visual-search-results"><h2>Possible matches</h2>{matches.length === 0 ? <p>No visually similar items found. Try another image with better lighting or a clearer view of the item.</p> : <div className="visual-search-grid">{matches.map(match => <article className="visual-search-card" key={match.foundItemId}><div className="visual-search-result-image"><FadeImage src={publicAssetUrl(match.imageUrl)} alt={`${match.title} found-item photo`} /></div><div><span className="visual-search-score">{match.similarityPercentage}% visual similarity</span><h3>{match.title}</h3><p>{match.description || 'Found item report'}</p><Link to={`/found-items/${match.foundItemId}`}>View found item</Link></div></article>)}</div>}</section>}
    <style>{`.visual-search-page{max-width:960px;margin:0 auto;padding:32px 20px 64px}.visual-search-heading{margin-bottom:24px}.visual-search-heading .eyebrow{font-size:.75rem;letter-spacing:.12em;color:var(--primary,#5b5bd6);font-weight:700}.visual-search-heading h1{margin:6px 0;font-size:clamp(1.7rem,4vw,2.5rem)}.visual-search-heading p,.visual-search-note{color:var(--text-muted,#667085)}.visual-search-upload{border:1px solid var(--border,#e4e7ec);border-radius:16px;padding:20px;background:var(--surface,#fff)}.visual-search-drop{min-height:240px;border:2px dashed var(--border,#d0d5dd);border-radius:12px;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:8px;cursor:pointer;text-align:center;padding:16px}.visual-search-drop input{position:absolute;width:1px;height:1px;opacity:0}.visual-search-icon{font-size:3rem;color:var(--primary,#5b5bd6)}.visual-search-preview{max-width:min(100%,320px);max-height:250px;object-fit:contain;border-radius:8px}.visual-search-drop span:last-of-type{color:var(--text-muted,#667085);font-size:.9rem}.visual-search-actions{display:flex;justify-content:flex-end;gap:10px;margin-top:16px;flex-wrap:wrap}.visual-search-actions button:disabled{opacity:.55;cursor:not-allowed}.visual-search-results{margin-top:32px}.visual-search-grid{display:grid;grid-template-columns:repeat(auto-fit,minmax(min(100%,280px),1fr));gap:16px}.visual-search-card{overflow:hidden;border:1px solid var(--border,#e4e7ec);border-radius:14px;background:var(--surface,#fff)}.visual-search-card>img{width:100%;height:210px;object-fit:cover;background:#f2f4f7}.visual-search-card>div{padding:16px}.visual-search-card h3{margin:8px 0}.visual-search-card p{color:var(--text-muted,#667085);overflow-wrap:anywhere}.visual-search-score{font-weight:700;color:var(--primary,#5b5bd6)}.visual-search-error{color:#b42318;padding:12px;background:#fef3f2;border-radius:8px}@media(max-width:520px){.visual-search-page{padding:20px 14px 44px}.visual-search-actions{justify-content:stretch}.visual-search-actions>*{flex:1}.visual-search-drop{min-height:190px}}`}</style>
  </main>;
}
