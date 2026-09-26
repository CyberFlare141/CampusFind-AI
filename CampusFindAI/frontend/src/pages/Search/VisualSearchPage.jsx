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
      if (validationError) {
        setFile(null);
        setPreview('');
        setError(validationError);
        setMatches([]);
        setState('idle');
        return;
      }
      next = files[0];
    }
    setFile(next);
    setPreview(next ? URL.createObjectURL(next) : '');
    setMatches([]);
    setError('');
    setState('idle');
  }

  async function search(event) {
    event.preventDefault();
    if (!file) return;

    const body = new FormData();
    body.append('image', file);
    setState('searching');
    setError('');
    try {
      const result = await apiRequest('/visual-search', { method: 'POST', body });
      setMatches(result.matches || []);
      setState('results');
    } catch (err) {
      setError(err.status >= 500 ? 'Visual search is temporarily unavailable. Please try again.' : (err.message || 'Visual search is temporarily unavailable. Please try again.'));
      setState('error');
    }
  }

  return (
    <main className={`page-container page-container-narrow visual-search-page visual-search-page--${state}`}>
      <header className="visual-search-heading visual-search-header">
        <span className="visual-search-kicker">Visual match search</span>
        <h1>Find an item by photo</h1>
        <p>Upload a clear photo and we’ll compare it with images in found-item reports.</p>
      </header>

      <form className={`visual-search-upload visual-search-tag ${preview ? 'visual-search-tag--selected' : ''}`} onSubmit={search}>
        <label className="visual-search-drop visual-search-dropzone" htmlFor="visual-search-file">
          <span className="visual-search-tag-hole" aria-hidden="true" />
          <span className="visual-search-drop-media">
            {preview ? (
              <img className="visual-search-preview" src={preview} alt="Selected item" />
            ) : (
              <span className="visual-search-icon" aria-hidden="true">⌕</span>
            )}
          </span>
          <span className="visual-search-drop-copy">
            <strong>{preview ? file?.name : 'Choose a photo'}</strong>
            <span>JPG, PNG, or WebP · up to 5 MB</span>
          </span>
          <input id="visual-search-file" type="file" accept="image/jpeg,image/png,image/webp" onChange={event => select(event.target.files?.[0] || null)} />
          {state === 'searching' && <span className="visual-search-scan" aria-hidden="true" />}
        </label>
        <div className="visual-search-actions">
          {file && <button type="button" className="btn btn-secondary" onClick={() => select(null)}>Remove photo</button>}
          <button className="btn btn-primary" disabled={!file || state === 'searching'}>
            {state === 'searching' ? 'Analyzing image and searching…' : 'Search found items'}
          </button>
        </div>
      </form>

      {state === 'idle' && <p className="visual-search-note">Upload an image to search for visually similar items.</p>}
      {state === 'searching' && <p className="visual-search-searching" role="status">Reading visual clues and checking found-item reports…</p>}
      {state === 'error' && <p className="visual-search-error" role="alert">{error || 'Visual search is temporarily unavailable. Please try again.'}</p>}
      {state === 'results' && (
        <section className="visual-search-results" aria-live="polite">
          <header className="visual-search-results-header">
            <div>
              <span className="visual-search-kicker">Match ticket</span>
              <h2>Possible matches</h2>
            </div>
            <span className="visual-search-results-count">{matches.length} found</span>
          </header>
          {matches.length === 0 ? (
            <p className="visual-search-empty">No visually similar items found. Try another image with better lighting or a clearer view of the item.</p>
          ) : (
            <div className="visual-search-grid">
              {matches.map((match, index) => (
                <article
                  className="visual-search-card visual-search-card--enter"
                  key={match.foundItemId}
                  style={{ '--visual-search-index': index }}
                >
                  <div className="visual-search-card-media visual-search-result-image">
                    <FadeImage src={publicAssetUrl(match.imageUrl)} alt={`${match.title} found-item photo`} />
                  </div>
                  <div className="visual-search-card-body">
                    <span className="visual-search-score">{match.similarityPercentage}% visual similarity</span>
                    <h3>{match.title}</h3>
                    <p>{match.description || 'Found item report'}</p>
                    <Link className="visual-search-card-link" to={`/found-items/${match.foundItemId}`}>View found item</Link>
                  </div>
                </article>
              ))}
            </div>
          )}
        </section>
      )}
    </main>
  );
}
