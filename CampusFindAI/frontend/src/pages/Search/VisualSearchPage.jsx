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

      {state === 'idle' && (
        <section className="vs-idle-showcase" aria-label="Visual search information and workflow">
          {/* Status & Capability Strip */}
          <div className="vs-status-strip">
            <div className="vs-status-pill">
              <span className="vs-status-dot" />
              <span>AI VISION MATCH ENGINE READY</span>
            </div>
            <div className="vs-status-specs">
              <span>512-DIM VECTOR EMBEDDING</span>
              <span>·</span>
              <span>IN-MEMORY COSINE MATCHING</span>
              <span>·</span>
              <span>ZERO LOGGED FACIAL DATA</span>
            </div>
          </div>

          {/* 3-Step Pipeline */}
          <div className="vs-pipeline-section">
            <div className="vs-section-heading">
              <h3>How Visual Match Works</h3>
              <span className="vs-section-tag">Neural Pipeline</span>
            </div>
            <div className="vs-steps-grid">
              <div className="vs-step-card">
                <div className="vs-step-card-header">
                  <span className="vs-step-num">STEP 01</span>
                  <div className="vs-step-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M23 19a2 2 0 0 1-2 2H3a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h4l2-3h6l2 3h4a2 2 0 0 1 2 2z"/>
                      <circle cx="12" cy="13" r="4"/>
                    </svg>
                  </div>
                </div>
                <h4>Foreground Segmentation</h4>
                <p>Normalizes lighting, crops campus backgrounds, and isolates the target object boundaries.</p>
              </div>

              <div className="vs-step-card">
                <div className="vs-step-card-header">
                  <span className="vs-step-num">STEP 02</span>
                  <div className="vs-step-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/>
                    </svg>
                  </div>
                </div>
                <h4>Feature Vectorization</h4>
                <p>Extracts color histograms, texture signatures, contours, and logo markings into neural vectors.</p>
              </div>

              <div className="vs-step-card">
                <div className="vs-step-card-header">
                  <span className="vs-step-num">STEP 03</span>
                  <div className="vs-step-icon">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z"/>
                      <polyline points="9 12 11 14 15 10"/>
                    </svg>
                  </div>
                </div>
                <h4>Campus Registry Check</h4>
                <p>Ranks similarity against active found-item photos cataloged by security posts in real time.</p>
              </div>
            </div>
          </div>

          {/* Supported Item Categories */}
          <div className="vs-categories-section">
            <div className="vs-section-heading">
              <h3>Commonly Identified Campus Items</h3>
              <span className="vs-section-tag">Category Index</span>
            </div>
            <div className="vs-categories-grid">
              <span className="vs-cat-chip">📱 Smartphones &amp; Cables</span>
              <span className="vs-cat-chip">🎒 Backpacks &amp; Totes</span>
              <span className="vs-cat-chip">🔑 Keys &amp; Student IDs</span>
              <span className="vs-cat-chip">🎧 Earbuds &amp; Headphones</span>
              <span className="vs-cat-chip">💻 Laptops &amp; Chargers</span>
              <span className="vs-cat-chip">🧥 Jackets &amp; Umbrellas</span>
              <span className="vs-cat-chip">📚 Notebooks &amp; Calculators</span>
              <span className="vs-cat-chip">🕶️ Glasses &amp; Wallets</span>
            </div>
          </div>

          {/* Photo Tips for Best Match */}
          <div className="vs-tips-card">
            <div className="vs-section-heading">
              <h3>Photo Tips for Higher Match Accuracy</h3>
              <span className="vs-section-tag">Best Practices</span>
            </div>
            <div className="vs-tips-grid">
              <div className="vs-tip-item">
                <span className="vs-tip-badge">☀️</span>
                <div>
                  <strong>Natural Lighting:</strong> Avoid dark rooms or harsh flash glare reflecting off glass/metal.
                </div>
              </div>
              <div className="vs-tip-item">
                <span className="vs-tip-badge">📦</span>
                <div>
                  <strong>Clean Background:</strong> Place item on a contrasting desk or flat surface without clutter.
                </div>
              </div>
              <div className="vs-tip-item">
                <span className="vs-tip-badge">🏷</span>
                <div>
                  <strong>Distinctive Features:</strong> Capture stickers, keychain charms, scratches, or wear marks.
                </div>
              </div>
              <div className="vs-tip-item">
                <span className="vs-tip-badge">📐</span>
                <div>
                  <strong>70%+ Frame Fill:</strong> Ensure the item fills the photo rather than being a tiny speck.
                </div>
              </div>
            </div>
          </div>


        </section>
      )}
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
