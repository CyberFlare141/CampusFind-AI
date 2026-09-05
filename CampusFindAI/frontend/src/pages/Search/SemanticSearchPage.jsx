/**
 * SemanticSearchPage — CampusFind AI
 *
 * Allows students to search for lost/found items using natural human language.
 * The AI understands the query; the database remains the source of truth.
 *
 * States: idle → searching → results | no-results | ai-unavailable
 */

import { useState, useRef, useCallback, useEffect } from 'react';
import { Link, useSearchParams } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { semanticSearch } from '../../api/search';
import { publicAssetUrl } from '../../api/client';
import { formatDate } from '../../components/Ui';

/* ── Constants ────────────────────────────────────────────────── */
const EXAMPLE_QUERIES = [
  'black leather wallet near Block B yesterday',
  'blue bottle on 4th floor',
  'student ID near cafeteria',
  'black earbuds in Block C lab',
  'keys with red lanyard near the parking lot',
];

const SEARCH_STEPS = [
  { id: 'parse',    label: 'Identifying item and details' },
  { id: 'locate',   label: 'Locating campus area' },
  { id: 'date',     label: 'Resolving date and time' },
  { id: 'search',   label: 'Checking relevant reports' },
];

const INTENT_LABELS = {
  lost_item:  '🔍 Looking for a lost item',
  found_item: '📦 Searching found-item reports',
  unknown:    '🔎 Broad campus search',
};

/* ── Chip label helpers ──────────────────────────────────────── */
function buildChips(q) {
  if (!q) return [];
  const chips = [];
  if (q.item)     chips.push({ key: 'item',     label: `📦 ${q.item}` });
  if (q.color)    chips.push({ key: 'color',    label: `🎨 ${q.color}` });
  if (q.location) chips.push({ key: 'location', label: `📍 ${q.location}` });
  if (q.dateFrom || q.dateTo) {
    const d = q.dateFrom
      ? new Date(q.dateFrom).toLocaleDateString('en-US', { month: 'short', day: 'numeric' })
      : null;
    chips.push({ key: 'date', label: `📅 ${d ?? 'date range'}` });
  }
  if (q.category && q.category !== q.item)
    chips.push({ key: 'category', label: `🏷 ${q.category}` });
  return chips;
}

/* ── SVG Icons ────────────────────────────────────────────────── */
const SparkIcon = () => (
  <svg viewBox="0 0 24 24" width="16" height="16" fill="currentColor">
    <path d="M12 2l2.4 7.4H22l-6.2 4.5 2.4 7.4L12 17l-6.2 4.3 2.4-7.4L2 9.4h7.6z"/>
  </svg>
);

const SearchIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2"
    strokeLinecap="round" strokeLinejoin="round" width="22" height="22">
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const LostIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" style={{ width: 30, height: 30 }}>
    <circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/>
  </svg>
);

const FoundIcon = () => (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8"
    strokeLinecap="round" strokeLinejoin="round" style={{ width: 30, height: 30 }}>
    <path d="M20 7H4a2 2 0 0 0-2 2v10a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2z"/>
    <polyline points="16 3 12 7 8 3"/>
  </svg>
);

/* ── Step Indicator (during search) ──────────────────────────── */
function SearchStepIndicator({ activeStep }) {
  return (
    <div className="ss-steps">
      {SEARCH_STEPS.map((step, i) => {
        const done    = i < activeStep;
        const current = i === activeStep;
        return (
          <motion.div
            key={step.id}
            className={`ss-step ${done ? 'ss-step--done' : ''} ${current ? 'ss-step--active' : ''}`}
            initial={{ opacity: 0, x: -8 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{ delay: i * 0.18, duration: 0.3 }}
          >
            <div className="ss-step-dot">
              {done ? '✓' : current ? <motion.span
                animate={{ opacity: [1, 0.3, 1] }}
                transition={{ repeat: Infinity, duration: 0.9 }}
              >✦</motion.span> : '○'}
            </div>
            <span className="ss-step-label">{step.label}</span>
          </motion.div>
        );
      })}
    </div>
  );
}

/* ── Filter chip (removable) ──────────────────────────────────── */
function FilterChip({ label, onRemove }) {
  return (
    <motion.span
      className="ss-chip"
      initial={{ opacity: 0, scale: 0.8 }}
      animate={{ opacity: 1, scale: 1 }}
      exit={{ opacity: 0, scale: 0.8 }}
      transition={{ duration: 0.18, ease: [0.22, 1, 0.36, 1] }}
      layout
    >
      {label}
      <button
        type="button"
        className="ss-chip-remove"
        onClick={onRemove}
        aria-label={`Remove ${label} filter`}
      >×</button>
    </motion.span>
  );
}

/* ── Result Card ──────────────────────────────────────────────── */
function SearchResultCard({ item, index }) {
  const isLost     = item.type === 'lost';
  const image      = item.imageUrls?.[0];
  const basePath   = isLost ? '/lost-items' : '/found-items';
  const scoreColor = item.relevanceScore >= 60
    ? 'var(--primary-deep)'
    : item.relevanceScore >= 30
      ? 'var(--primary)'
      : 'var(--text-muted)';

  return (
    <motion.div
      initial={{ opacity: 0, y: 12 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ delay: Math.min(index * 0.05, 0.3), duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
    >
      <Link to={`${basePath}/${item.id}`} className="item-card ss-result-card" aria-label={item.title}>
        {/* Image */}
        <div className="item-card-image">
          {image ? (
            <img src={publicAssetUrl(image)} alt={item.title} loading="lazy" />
          ) : (
            <div className="item-card-image-placeholder">
              {isLost ? <LostIcon /> : <FoundIcon />}
            </div>
          )}
          <span className={`badge ${isLost ? 'badge-warning' : 'badge-success'} item-card-status`}>
            <span className="badge-dot" aria-hidden="true" />
            {isLost ? 'LOST' : 'FOUND'}
          </span>
          {/* Relevance score badge */}
          <span
            className="item-card-score"
            style={{ background: 'rgba(0,0,0,0.55)', backdropFilter: 'blur(6px)' }}
            title="Relevance score"
          >
            {Math.round(item.relevanceScore)}% relevance
          </span>
        </div>

        {/* Body */}
        <div className="item-card-body">
          <div className="item-card-title">{item.title}</div>
          {item.description && (
            <p className="text-xs text-muted" style={{
              lineHeight: 1.5, overflow: 'hidden',
              display: '-webkit-box', WebkitLineClamp: 2, WebkitBoxOrient: 'vertical'
            }}>
              {item.description}
            </p>
          )}
          <div className="item-card-meta">
            {(item.locationDetails || item.locationName) && (
              <div className="item-card-meta-row">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z"/><circle cx="12" cy="10" r="3"/>
                </svg>
                <span>{item.locationDetails || item.locationName}</span>
              </div>
            )}
            {item.categoryName && (
              <div className="item-card-meta-row">
                <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                  <path d="M20.59 13.41l-7.17 7.17a2 2 0 01-2.83 0L2 12V2h10l8.59 8.59a2 2 0 010 2.82z"/>
                  <line x1="7" y1="7" x2="7.01" y2="7"/>
                </svg>
                <span>{item.categoryName}</span>
              </div>
            )}
            <div className="item-card-meta-row">
              <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/>
              </svg>
              <span>{formatDate(item.date)}</span>
            </div>
          </div>
        </div>

        {/* Footer */}
        <div className="item-card-footer">
          <span
            className="text-xs font-bold"
            style={{ color: scoreColor }}
          >
            {item.relevanceScore >= 60 ? '✦ Strong match' : item.relevanceScore >= 30 ? 'Possible match' : 'Partial match'}
          </span>
          <span className="text-xs font-semibold" style={{ color: 'var(--primary-deep)' }}>
            Details →
          </span>
        </div>
      </Link>
    </motion.div>
  );
}

/* ── Main Page ─────────────────────────────────────────────────── */
export default function SemanticSearchPage() {
  const [query, setQuery]               = useState('');
  const [inputFocused, setInputFocused] = useState(false);
  const [state, setState]               = useState('idle'); // idle | searching | results | no-results | ai-unavailable
  const [result, setResult]             = useState(null);
  const [error, setError]               = useState('');
  const [searchStep, setSearchStep]     = useState(0);
  const [activeChips, setActiveChips]   = useState([]);
  const [lastQuery, setLastQuery]       = useState('');
  const inputRef = useRef(null);
  const abortRef = useRef(null);
  const [searchParams] = useSearchParams();

  // Auto-populate and trigger search when navigated from top-bar
  useEffect(() => {
    const q = searchParams.get('q');
    if (q && q.trim()) {
      setQuery(q.trim());
      // Defer so state settles before we submit
      const t = setTimeout(() => {
        handleSearch(null, q.trim());
      }, 80);
      return () => clearTimeout(t);
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  /* ── simulate step animation during search ──────────────────── */
  const animateSteps = useCallback(() => {
    let step = 0;
    setSearchStep(0);
    const iv = setInterval(() => {
      step++;
      setSearchStep(s => Math.min(s + 1, SEARCH_STEPS.length - 1));
      if (step >= SEARCH_STEPS.length - 1) clearInterval(iv);
    }, 600);
    return iv;
  }, []);

  /* ── submit handler ─────────────────────────────────────────── */
  async function handleSearch(e, overrideQuery) {
    e?.preventDefault();
    const q = (overrideQuery ?? query).trim();
    if (!q) return;


    // Cancel any pending request
    abortRef.current?.abort();
    abortRef.current = new AbortController();

    setState('searching');
    setError('');
    setResult(null);
    setLastQuery(q);
    const iv = animateSteps();

    try {
      const data = await semanticSearch(q);
      clearInterval(iv);

      if (data.results.length === 0) {
        setState('no-results');
      } else {
        setState('results');
        setActiveChips(buildChips(data.interpretedQuery));
      }
      setResult(data);
    } catch (err) {
      clearInterval(iv);
      if (err.name === 'AbortError') return;

      // Distinguish network/AI unavailable from other errors
      if (err.status === 0) {
        setState('ai-unavailable');
      } else {
        setState('no-results');
        setError(err.message || 'Search failed. Please try again.');
      }
    }
  }

  function handleExampleClick(text) {
    setQuery(text);
    setInputFocused(false);
    inputRef.current?.focus();
  }

  function handleKeyDown(e) {
    if (e.key === 'Enter') handleSearch(e);
  }

  function resetSearch() {
    setState('idle');
    setResult(null);
    setActiveChips([]);
    setQuery('');
    setError('');
    setTimeout(() => inputRef.current?.focus(), 100);
  }

  /* ── Render ─────────────────────────────────────────────────── */
  return (
    <div className="page-container-wide ss-page">

      {/* ── Page header ───────────────────────────────────────── */}
      <motion.div
        className="page-header"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <div>
          <span className="eyebrow">CampusFind AI</span>
          <h1 style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <span style={{ color: 'var(--primary)', fontSize: '1.1em' }}>✦</span>
            AI Semantic Search
          </h1>
          <p className="text-secondary">
            Describe the item, where you saw it, or when it went missing. CampusFind AI searches reports by meaning, not just exact words.
          </p>
        </div>
      </motion.div>

      {/* ── Search Box ────────────────────────────────────────── */}
      <motion.div
        className="ss-search-container"
        initial={{ opacity: 0, y: 14 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
      >
        <form onSubmit={handleSearch} className="ss-search-form">
          <motion.div
            className={`ss-search-wrap ${inputFocused ? 'ss-search-wrap--focused' : ''}`}
            animate={inputFocused
              ? { boxShadow: '0 0 0 3px rgba(132, 177, 121, 0.3), 0 8px 32px rgba(132, 177, 121, 0.12)' }
              : { boxShadow: '0 2px 8px rgba(0,0,0,0.06)' }}
            transition={{ duration: 0.22 }}
          >
            <span className="ss-search-spark">✦</span>
            <input
              ref={inputRef}
              id="ss-query-input"
              type="text"
              className="ss-search-input"
              placeholder="e.g. black wallet near the library yesterday…"
              value={query}
              onChange={e => setQuery(e.target.value)}
              onKeyDown={handleKeyDown}
              onFocus={() => setInputFocused(true)}
              onBlur={() => setInputFocused(false)}
              aria-label="Natural language search query"
              autoComplete="off"
              disabled={state === 'searching'}
            />
            <motion.button
              type="submit"
              className="ss-search-btn"
              disabled={!query.trim() || state === 'searching'}
              whileHover={{ scale: 1.04 }}
              whileTap={{ scale: 0.96 }}
              aria-label="Search"
            >
              {state === 'searching' ? (
                <motion.span
                  animate={{ rotate: 360 }}
                  transition={{ duration: 1, repeat: Infinity, ease: 'linear' }}
                  style={{ display: 'block', width: 20, height: 20 }}
                >
                  ✦
                </motion.span>
              ) : (
                <SearchIcon />
              )}
            </motion.button>
          </motion.div>

          {/* AI label */}
          <div className="ss-ai-label">
            <span className="ss-ai-dot" />
            <span>✦ AI Search — powered by Gemini</span>
            <span className="ss-ai-sep">·</span>
            <span>Search-on-submit, not keystroke</span>
          </div>
        </form>

        {/* Example queries (idle only) */}
        <AnimatePresence>
          {state === 'idle' && (
            <motion.div
              className="ss-examples"
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              transition={{ duration: 0.25 }}
            >
              <span className="ss-examples-label">Try:</span>
              {EXAMPLE_QUERIES.map(q => (
                <motion.button
                  key={q}
                  type="button"
                  className="ai-suggestion-chip"
                  onClick={() => handleExampleClick(q)}
                  whileHover={{ y: -2 }}
                  whileTap={{ scale: 0.96 }}
                >
                  <span className="spark">✦</span>
                  <span>{q}</span>
                </motion.button>
              ))}
            </motion.div>
          )}
        </AnimatePresence>
      </motion.div>

      {/* ── State: Searching ──────────────────────────────────── */}
      <AnimatePresence mode="wait">
        {state === 'searching' && (
          <motion.div
            key="searching"
            className="ss-searching-panel"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="ss-searching-header">
              <motion.div
                className="ss-pulse"
                animate={{ scale: [1, 1.12, 1], opacity: [0.7, 1, 0.7] }}
                transition={{ repeat: Infinity, duration: 1.4 }}
              >
                ✦
              </motion.div>
              <span>Understanding your search…</span>
            </div>
            <div className="ss-searching-query">"{lastQuery}"</div>
            <SearchStepIndicator activeStep={searchStep} />
          </motion.div>
        )}

        {/* ── State: AI-understood chips + results ─────────────── */}
        {state === 'results' && result && (
          <motion.div
            key="results"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.3 }}
          >
            {/* ── AI interpreted panel ── */}
            {result.aiInterpreted && activeChips.length > 0 ? (
              <motion.div
                className="ss-intent-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.35 }}
              >
                <div className="ss-intent-header">
                  <span className="ss-intent-icon">✦</span>
                  <span>AI understood your search</span>
                  {result.interpretedQuery?.intent && (
                    <span className="ss-intent-badge">
                      {INTENT_LABELS[result.interpretedQuery.intent] ?? result.interpretedQuery.intent}
                    </span>
                  )}
                  <span className="ss-intent-conf">
                    {Math.round((result.interpretedQuery?.confidence ?? 0) * 100)}% confident
                  </span>
                </div>
                <div className="ss-chips">
                  <AnimatePresence>
                    {activeChips.map(chip => (
                      <FilterChip
                        key={chip.key}
                        label={chip.label}
                        onRemove={() => setActiveChips(c => c.filter(x => x.key !== chip.key))}
                      />
                    ))}
                  </AnimatePresence>
                </div>
              </motion.div>
            ) : (
              /* ── Keyword fallback banner (no Gemini key / AI unavailable) ── */
              <motion.div
                className="ss-fallback-panel"
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ duration: 0.3 }}
              >
                <span className="ss-fallback-icon">⌕</span>
                <div className="ss-fallback-body">
                  <span className="ss-fallback-label">Keyword search</span>
                  <span className="ss-fallback-query">"{lastQuery}"</span>
                </div>
                <span className="ss-fallback-tip">
                  Add a Gemini API key for smarter results
                </span>
              </motion.div>
            )}

            {/* Result meta */}
            <div className="ss-results-meta">
              <span className="text-sm font-medium" style={{ color: 'var(--primary-deep)' }}>
                {result.totalResults} result{result.totalResults !== 1 ? 's' : ''} found
              </span>
              <button type="button" className="ss-new-search" onClick={resetSearch}>
                ← New search
              </button>
            </div>

            {/* Results grid */}
            <div className="item-grid">
              {result.results.map((item, i) => (
                <SearchResultCard key={item.id} item={item} index={i} />
              ))}
            </div>
          </motion.div>
        )}

        {/* ── State: No results ────────────────────────────────── */}
        {state === 'no-results' && (
          <motion.div
            key="noresults"
            className="ss-empty-panel"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="ss-empty-icon">🔍</div>
            <h2 className="ss-empty-title">We couldn't find a strong match for that description.</h2>
            {result?.interpretedQuery && (
              <div className="ss-chips ss-chips--center" style={{ marginBottom: 16 }}>
                {buildChips(result.interpretedQuery).map(c => (
                  <span key={c.key} className="ss-chip ss-chip--static">{c.label}</span>
                ))}
              </div>
            )}
            <p className="ss-empty-msg">
              Try changing the wording, removing a detail, or browsing the campus catalogs while new reports arrive.
            </p>
            {error && <p className="text-sm" style={{ color: 'var(--danger)', marginTop: 8 }}>{error}</p>}
            <div style={{ display: 'flex', gap: 10, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-primary" onClick={resetSearch}>Try a different search</button>
              <Link to="/found-items" className="btn btn-secondary">Browse found items</Link>
              <Link to="/lost-items/new" className="btn btn-secondary">Report a lost item</Link>
            </div>
          </motion.div>
        )}

        {/* ── State: AI unavailable ────────────────────────────── */}
        {state === 'ai-unavailable' && (
          <motion.div
            key="unavailable"
            className="ss-empty-panel"
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35 }}
          >
            <div className="ss-empty-icon">⚡</div>
            <h2 className="ss-empty-title">Cannot reach the server</h2>
            <p className="ss-empty-msg">
              The CampusFind AI server appears to be offline.<br />
              Please make sure the backend is running, then try again.
            </p>
            <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
              <button type="button" className="btn btn-primary" onClick={handleSearch}>
                Retry
              </button>
              <button type="button" className="btn btn-secondary" onClick={resetSearch}>
                Clear
              </button>
            </div>
          </motion.div>
        )}

        {/* ── State: Idle (hero) ───────────────────────────────── */}
        {state === 'idle' && (
          <motion.div
            key="idle"
            className="ss-idle-hero"
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -10 }}
            transition={{ delay: 0.2, duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
          >
            <div className="ss-idle-motif">
              <motion.div
                className="ss-idle-ring ss-idle-ring--1"
                animate={{ rotate: 360 }}
                transition={{ duration: 18, repeat: Infinity, ease: 'linear' }}
              />
              <motion.div
                className="ss-idle-ring ss-idle-ring--2"
                animate={{ rotate: -360 }}
                transition={{ duration: 26, repeat: Infinity, ease: 'linear' }}
              />
              <span className="ss-idle-spark">✦</span>
            </div>

            <h2 className="ss-idle-heading">Search the campus naturally</h2>
            <div className="ss-how-grid">
              {[
                { icon: '💬', title: 'Describe naturally', desc: 'Type what you lost or found in plain English — no special keywords needed.' },
                { icon: '🧠', title: 'AI understands', desc: 'Gemini AI extracts item, location, date, and category from your sentence.' },
                { icon: '🗄', title: 'Database search', desc: 'Matching reports are fetched from the campus database and ranked by relevance.' },
                { icon: '✦', title: 'Ranked results', desc: 'Results are ordered by confidence — exact matches appear first.' },
              ].map((card, i) => (
                <motion.div
                  key={card.title}
                  className="ss-how-card"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.3 + i * 0.1, duration: 0.35 }}
                  whileHover={{ y: -3, transition: { duration: 0.2 } }}
                >
                  <span className="ss-how-icon">{card.icon}</span>
                  <strong className="ss-how-title">{card.title}</strong>
                  <p className="ss-how-desc">{card.desc}</p>
                </motion.div>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
