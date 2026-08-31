import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { createLostItem } from '../../api/lostItems';
import { useAuth } from '../../context/AuthContext';
import { Alert, ButtonSpinner, SuccessCheck } from '../../components/Ui';

function toDateTimeLocal(date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const STEPS = ['Item Info', 'Where & When', 'Photos', 'Review'];

/* ── Step indicator ──────────────────────────────────────────── */
function StepIndicator({ current, total, labels }) {
  return (
    <div className="step-indicator" style={{ marginBottom: 40 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="step-item" style={{ flexDirection: 'column', alignItems: 'center', flex: i < total - 1 ? '1' : '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <motion.div
              className={`step-dot ${i < current ? 'done' : i === current ? 'active' : ''}`}
              animate={{ scale: i === current ? 1.1 : 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              {i < current ? '✓' : i + 1}
            </motion.div>
            {i < total - 1 && (
              <div className={`step-line ${i < current ? 'done' : ''}`} />
            )}
          </div>
          <span className={`step-label ${i <= current ? (i < current ? 'done' : 'active') : ''}`}
            style={{ marginTop: 6 }}>
            {labels[i]}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function LostItemFormPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lostAt, setLostAt] = useState('');
  const [images, setImages] = useState([]);
  const [previews, setPreviews] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [submitted, setSubmitted] = useState(false);
  const [createdId, setCreatedId] = useState(null);
  const fileRef = useRef();

  const latestDate = toDateTimeLocal(new Date());
  const earliest = new Date();
  earliest.setMonth(earliest.getMonth() - 6);
  const earliestDate = toDateTimeLocal(earliest);

  function validateStep0() {
    const errors = {};
    if (!title.trim()) errors.title = 'Give your item a short, descriptive title.';
    else if (title.trim().length > 150) errors.title = 'Title must be under 150 characters.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateStep1() {
    const errors = {};
    if (lostAt && new Date(lostAt) > new Date()) errors.lostAt = "The date lost can't be in the future.";
    else if (lostAt && new Date(lostAt) < earliest) errors.lostAt = 'Items can only be reported for the last six months.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function nextStep() {
    let valid = true;
    if (step === 0) valid = validateStep0();
    if (step === 1) valid = validateStep1();
    if (valid) setStep(s => s + 1);
  }

  function prevStep() {
    setFieldErrors({});
    setStep(s => s - 1);
  }

  function handleFiles(files) {
    const selected = Array.from(files).slice(0, 4);
    setImages(selected);
    const urls = selected.map(f => URL.createObjectURL(f));
    setPreviews(urls);
  }

  async function handleSubmit() {
    setFormError('');
    setSubmitting(true);
    try {
      const created = await createLostItem({
        title: title.trim(),
        description: description.trim() || undefined,
        lostAt: lostAt ? new Date(lostAt).toISOString() : undefined,
        images,
      });
      setCreatedId(created.id);
      setSubmitted(true);
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (user?.role === 'Administrator') return <Navigate to="/lost-items" replace />;

  /* ── Success state ──────────────────────────────────────────── */
  if (submitted) {
    return (
      <div className="page-container page-container-narrow">
        <motion.div
          className="card card-pad"
          initial={{ opacity: 0, scale: 0.95 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ textAlign: 'center', padding: '48px 32px' }}
        >
          <SuccessCheck size={72} />
          <h2 style={{ marginTop: 20, marginBottom: 8 }}>Report Submitted!</h2>
          <p className="text-secondary" style={{ marginBottom: 32 }}>
            We're now scanning for potential matches using AI.
            You'll be notified as soon as we find something.
          </p>

          {/* AI matching progress */}
          <div style={{
            background: 'linear-gradient(135deg, var(--primary) 0%, var(--primary-deep) 100%)',
            borderRadius: 'var(--radius-lg)',
            padding: 20,
            color: 'white',
            textAlign: 'left',
            marginBottom: 28,
          }}>
            <p style={{ fontSize: '0.75rem', fontWeight: 700, letterSpacing: '0.1em', textTransform: 'uppercase', color: 'rgba(255,255,255,0.8)', marginBottom: 12 }}>
              ✦ AI Matching Active
            </p>
            <div style={{ height: 6, background: 'rgba(255,255,255,0.25)', borderRadius: 999, overflow: 'hidden', marginBottom: 8 }}>
              <motion.div
                style={{ height: '100%', background: 'rgba(255,255,255,0.85)', borderRadius: 999 }}
                initial={{ width: 0 }}
                animate={{ width: '72%' }}
                transition={{ delay: 0.5, duration: 1.8, ease: [0.22, 1, 0.36, 1] }}
              />
            </div>
            <p style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
              Scanning campus database for matches…
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary" onClick={() => navigate(`/lost-items/${createdId}`)}>
              View my report
            </button>
            <button className="btn btn-secondary" onClick={() => navigate('/lost-items')}>
              Browse all items
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="page-container page-container-narrow">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="eyebrow">Lost Items</span>
        <h1 style={{ marginBottom: 6 }}>Report a Lost Item</h1>
        <p className="text-secondary" style={{ marginBottom: 32 }}>
          Give as much detail as you can — it helps our AI find a match.
        </p>

        <StepIndicator current={step} total={STEPS.length} labels={STEPS} />

        <Alert type="error">{formError}</Alert>

        <div className="card card-pad">
          <AnimatePresence mode="wait">
            {/* ── Step 0: Item Info ─────────────────────────────── */}
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: 'grid', gap: 20 }}
              >
                <div>
                  <h3 style={{ marginBottom: 4 }}>What did you lose?</h3>
                  <p className="text-sm text-muted">Be descriptive — color, brand, size, contents</p>
                </div>
                <div className="form-field">
                  <label htmlFor="title">Item title *</label>
                  <input
                    id="title"
                    type="text"
                    placeholder="e.g. Black North Face backpack"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={fieldErrors.title ? 'input-error' : ''}
                    maxLength={150}
                    autoFocus
                  />
                  {fieldErrors.title && <span className="field-error">{fieldErrors.title}</span>}
                </div>
                <div className="form-field">
                  <label htmlFor="description">Description</label>
                  <textarea
                    id="description"
                    placeholder="Color, brand, distinguishing marks, what was inside, serial numbers, etc."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                  <span className="hint">More detail significantly improves your chance of an AI match.</span>
                </div>
              </motion.div>
            )}

            {/* ── Step 1: Where & When ──────────────────────────── */}
            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: 'grid', gap: 20 }}
              >
                <div>
                  <h3 style={{ marginBottom: 4 }}>Where &amp; when did you lose it?</h3>
                  <p className="text-sm text-muted">Narrowing down the time and location helps AI matching</p>
                </div>
                <div className="form-field">
                  <label htmlFor="lostAt">When did you lose it?</label>
                  <input
                    id="lostAt"
                    type="datetime-local"
                    value={lostAt}
                    onChange={(e) => setLostAt(e.target.value)}
                    className={fieldErrors.lostAt ? 'input-error' : ''}
                    min={earliestDate}
                    max={latestDate}
                  />
                  {fieldErrors.lostAt
                    ? <span className="field-error">{fieldErrors.lostAt}</span>
                    : <span className="hint">Optional. Choose a date and time within the last six months.</span>
                  }
                </div>
                <div className="form-note">
                  📍 Location tagging will be available once campus location data is integrated.
                </div>
              </motion.div>
            )}

            {/* ── Step 2: Photos ────────────────────────────────── */}
            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: 'grid', gap: 20 }}
              >
                <div>
                  <h3 style={{ marginBottom: 4 }}>Add photos</h3>
                  <p className="text-sm text-muted">Clear photos significantly improve AI image-matching accuracy</p>
                </div>

                <div
                  className="image-upload-area"
                  onClick={() => fileRef.current?.click()}
                  onDragOver={(e) => { e.preventDefault(); e.currentTarget.classList.add('drag-over'); }}
                  onDragLeave={(e) => e.currentTarget.classList.remove('drag-over')}
                  onDrop={(e) => { e.preventDefault(); e.currentTarget.classList.remove('drag-over'); handleFiles(e.dataTransfer.files); }}
                  role="button"
                  tabIndex={0}
                  onKeyDown={(e) => e.key === 'Enter' && fileRef.current?.click()}
                  aria-label="Upload photos"
                >
                  <div style={{ fontSize: '2rem', marginBottom: 8 }}>📷</div>
                  <p className="font-semibold text-secondary">Click to upload or drag and drop</p>
                  <p className="text-sm text-muted">PNG, JPG up to 10MB · Max 4 photos</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFiles(e.target.files)}
                    style={{ display: 'none' }}
                    id="report-images"
                  />
                </div>

                {previews.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold" style={{ marginBottom: 8 }}>
                      {previews.length} photo{previews.length > 1 ? 's' : ''} selected
                    </p>
                    <div className="image-preview-grid">
                      {previews.map((src, i) => (
                        <div key={i} className="image-preview">
                          <img src={src} alt={`Preview ${i + 1}`} />
                          <button
                            className="image-preview-remove"
                            type="button"
                            onClick={() => {
                              const imgs = images.filter((_, j) => j !== i);
                              const prvs = previews.filter((_, j) => j !== i);
                              setImages(imgs);
                              setPreviews(prvs);
                            }}
                            aria-label={`Remove photo ${i + 1}`}
                          >
                            ×
                          </button>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
              </motion.div>
            )}

            {/* ── Step 3: Review ────────────────────────────────── */}
            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 24 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -24 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: 'grid', gap: 20 }}
              >
                <div>
                  <h3 style={{ marginBottom: 4 }}>Review your report</h3>
                  <p className="text-sm text-muted">Check your details before submitting</p>
                </div>

                <div style={{ display: 'grid', gap: 12 }}>
                  {[
                    { icon: '✓', label: 'Item', value: title || '—' },
                    { icon: '✓', label: 'Description', value: description || 'Not provided' },
                    { icon: '✓', label: 'Date lost', value: lostAt ? new Date(lostAt).toLocaleString() : 'Not specified' },
                    { icon: '✓', label: 'Photos', value: `${previews.length} photo${previews.length !== 1 ? 's' : ''} attached` },
                  ].map(({ icon, label, value }) => (
                    <div key={label} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 12,
                      padding: '12px 16px', background: 'rgba(199,234,187,0.35)',
                      borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                    }}>
                      <span style={{ color: 'var(--success)', fontWeight: 700, flexShrink: 0 }}>{icon}</span>
                      <div>
                        <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.07em', color: 'var(--text-secondary)', marginBottom: 2 }}>
                          {label}
                        </p>
                        <p style={{ fontSize: '0.9rem', color: 'var(--text-primary)' }}>{value}</p>
                      </div>
                    </div>
                  ))}
                </div>

                {previews.length > 0 && (
                  <div className="image-preview-grid">
                    {previews.map((src, i) => (
                      <div key={i} className="image-preview">
                        <img src={src} alt={`Preview ${i + 1}`} />
                      </div>
                    ))}
                  </div>
                )}

                <div style={{ padding: '14px 16px', background: 'rgba(29,78,216,0.06)', borderRadius: 'var(--radius-md)', borderLeft: '3px solid var(--info)' }}>
                  <p style={{ fontSize: '0.875rem', color: 'var(--info)', fontWeight: 500 }}>
                    ✦ AI matching will automatically start scanning for potential matches after submission.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {/* ── Navigation buttons ───────────────────────────────── */}
          <div style={{ display: 'flex', gap: 12, marginTop: 32, justifyContent: 'space-between' }}>
            <button
              type="button"
              className="btn btn-ghost"
              onClick={step === 0 ? () => navigate('/lost-items') : prevStep}
              disabled={submitting}
            >
              {step === 0 ? 'Cancel' : '← Back'}
            </button>
            {step < STEPS.length - 1 ? (
              <motion.button
                type="button"
                className="btn btn-primary"
                onClick={nextStep}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                Continue →
              </motion.button>
            ) : (
              <motion.button
                type="button"
                className="btn btn-primary btn-lg"
                onClick={handleSubmit}
                disabled={submitting}
                whileHover={{ scale: 1.02 }}
                whileTap={{ scale: 0.97 }}
              >
                {submitting && <ButtonSpinner />}
                {submitting ? 'Submitting…' : '🔍 Submit Report'}
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
