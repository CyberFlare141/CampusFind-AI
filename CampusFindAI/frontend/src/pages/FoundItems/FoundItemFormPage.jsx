import { useRef, useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { motion, AnimatePresence } from 'framer-motion';
import { createFoundItem } from '../../api/foundItems';
import { useAuth } from '../../context/AuthContext';
import { Alert, ButtonSpinner, SuccessCheck } from '../../components/Ui';

function toDateTimeLocal(date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

const STEPS = ['Item Info', 'Where & When', 'Photos', 'Review'];

/* ── Step Indicator ──────────────────────────────────────────── */
function StepIndicator({ current, total, labels }) {
  return (
    <div className="step-indicator" style={{ marginBottom: 36 }}>
      {Array.from({ length: total }).map((_, i) => (
        <div key={i} className="step-item" style={{ flexDirection: 'column', alignItems: 'center', flex: i < total - 1 ? '1' : '0' }}>
          <div style={{ display: 'flex', alignItems: 'center', width: '100%' }}>
            <motion.div
              className={`step-dot ${i < current ? 'done' : i === current ? 'active' : ''}`}
              animate={{ scale: i === current ? 1.08 : 1 }}
              transition={{ type: 'spring', stiffness: 300 }}
            >
              {i < current ? '✓' : i + 1}
            </motion.div>
            {i < total - 1 && <div className={`step-line ${i < current ? 'done' : ''}`} />}
          </div>
          <span className={`step-label ${i <= current ? (i < current ? 'done' : 'active') : ''}`} style={{ marginTop: 8 }}>
            {labels[i]}
          </span>
        </div>
      ))}
    </div>
  );
}

export default function FoundItemFormPage() {
  const { user } = useAuth();
  const navigate = useNavigate();

  const [step, setStep] = useState(0);
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [foundAt, setFoundAt] = useState('');
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
    if (!title.trim()) errors.title = 'Give the item a clear, descriptive title.';
    else if (title.trim().length > 150) errors.title = 'Title must be under 150 characters.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function validateStep1() {
    const errors = {};
    if (foundAt && new Date(foundAt) > new Date()) errors.foundAt = "The date found cannot be in the future.";
    else if (foundAt && new Date(foundAt) < earliest) errors.foundAt = 'Items can only be reported for the last six months.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  function nextStep() {
    let valid = true;
    if (step === 0) valid = validateStep0();
    if (step === 1) valid = validateStep1();
    if (valid) setStep(s => s + 1);
  }

  function prevStep() { setFieldErrors({}); setStep(s => s - 1); }

  function handleFiles(files) {
    const selected = Array.from(files).slice(0, 4);
    setImages(selected);
    setPreviews(selected.map(f => URL.createObjectURL(f)));
  }

  async function handleSubmit() {
    setFormError('');
    setSubmitting(true);
    try {
      const created = await createFoundItem({
        title: title.trim(),
        description: description.trim() || undefined,
        foundAt: foundAt ? new Date(foundAt).toISOString() : undefined,
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

  if (user?.role === 'Administrator') return <Navigate to="/found-items" replace />;

  /* ── Success State ─────────────────────────────────────────── */
  if (submitted) {
    return (
      <div className="page-container-form">
        <motion.div
          className="card card-pad-lg"
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
          style={{ textAlign: 'center', padding: '48px 32px' }}
        >
          <SuccessCheck size={72} />
          <h2 style={{ marginTop: 20, marginBottom: 8 }}>Found Item Logged!</h2>
          <p className="text-secondary" style={{ marginBottom: 28, maxWidth: 440, margin: '0 auto 28px' }}>
            Thank you for turning in this item. Your report is recorded and ready for Security Office verification.
          </p>

          <div style={{
            background: 'var(--warning-bg)',
            border: '1px solid rgba(138, 96, 16, 0.25)',
            borderRadius: 'var(--radius-xl)',
            padding: '20px 24px',
            textAlign: 'left',
            marginBottom: 28,
          }}>
            <p style={{ fontWeight: 700, color: 'var(--warning)', marginBottom: 4, fontSize: '0.95rem' }}>
              ⏳ Pending Security Review
            </p>
            <p style={{ fontSize: '0.88rem', color: 'var(--warning)', lineHeight: 1.6 }}>
              Campus Security will verify the entry before matching it with prospective claimants.
            </p>
          </div>

          <div style={{ display: 'flex', gap: 12, justifyContent: 'center', flexWrap: 'wrap' }}>
            <button className="btn btn-primary btn-lg" onClick={() => navigate(`/found-items/${createdId}`)}>
              View My Report →
            </button>
            <button className="btn btn-secondary btn-lg" onClick={() => navigate('/found-items')}>
              Browse Found Catalog
            </button>
          </div>
        </motion.div>
      </div>
    );
  }

  return (
    <div className="page-container-form">
      <motion.div
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
      >
        <span className="eyebrow">Found Item Intake</span>
        <h1 style={{ marginBottom: 6 }}>Report a Found Item</h1>
        <p className="text-secondary" style={{ marginBottom: 28 }}>
          Thank you for taking the time to log found property and help it reach its rightful owner.
        </p>

        <StepIndicator current={step} total={STEPS.length} labels={STEPS} />

        <Alert type="error">{formError}</Alert>

        <div className="card card-pad-lg">
          <AnimatePresence mode="wait">
            {step === 0 && (
              <motion.div
                key="step0"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: 'grid', gap: 20 }}
              >
                <div>
                  <h3 style={{ marginBottom: 4 }}>What item did you find?</h3>
                  <p className="text-sm text-muted">Provide general identifiers, but leave specific confidential details for claimant verification</p>
                </div>
                <div className="form-field">
                  <label htmlFor="f-title">Item Title *</label>
                  <input
                    id="f-title"
                    type="text"
                    placeholder="e.g. Silver iPhone 14 with blue silicone case"
                    value={title}
                    onChange={(e) => setTitle(e.target.value)}
                    className={fieldErrors.title ? 'input-error' : ''}
                    maxLength={150}
                    autoFocus
                  />
                  {fieldErrors.title && <span className="field-error">{fieldErrors.title}</span>}
                </div>
                <div className="form-field">
                  <label htmlFor="f-description">General Description</label>
                  <textarea
                    id="f-description"
                    placeholder="Color, brand, general condition, where on campus you found it, etc."
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    rows={4}
                  />
                  <span className="hint">Avoid publicly disclosing private contents (e.g. cash amount or full credit card names).</span>
                </div>
              </motion.div>
            )}

            {step === 1 && (
              <motion.div
                key="step1"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: 'grid', gap: 20 }}
              >
                <div>
                  <h3 style={{ marginBottom: 4 }}>Where &amp; when was it found?</h3>
                  <p className="text-sm text-muted">Helps AI correlate with lost reports filed around the same timeframe</p>
                </div>
                <div className="form-field">
                  <label htmlFor="f-foundAt">Date and Time Found</label>
                  <input
                    id="f-foundAt"
                    type="datetime-local"
                    value={foundAt}
                    onChange={(e) => setFoundAt(e.target.value)}
                    className={fieldErrors.foundAt ? 'input-error' : ''}
                    min={earliestDate}
                    max={latestDate}
                  />
                  {fieldErrors.foundAt
                    ? <span className="field-error">{fieldErrors.foundAt}</span>
                    : <span className="hint">Choose a date within the last 6 months.</span>
                  }
                </div>
                <div style={{ padding: '14px 18px', background: 'var(--surface-card-alt)', borderRadius: 'var(--radius-md)', border: '1px solid var(--border)', fontSize: '0.875rem', color: 'var(--text-secondary)' }}>
                  📍 Campus building location tags will be integrated with university map markers.
                </div>
              </motion.div>
            )}

            {step === 2 && (
              <motion.div
                key="step2"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: 'grid', gap: 20 }}
              >
                <div>
                  <h3 style={{ marginBottom: 4 }}>Attach Photos</h3>
                  <p className="text-sm text-muted">Clear photos assist Security and claimants in identifying the object</p>
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
                  <div style={{ fontSize: '2.2rem', marginBottom: 8 }}>📷</div>
                  <p className="font-semibold text-secondary" style={{ marginBottom: 4 }}>
                    Click to select photos or drag &amp; drop
                  </p>
                  <p className="text-xs text-muted">PNG, JPG, WebP · Max 4 photos</p>
                  <input
                    ref={fileRef}
                    type="file"
                    accept="image/*"
                    multiple
                    onChange={(e) => handleFiles(e.target.files)}
                    style={{ display: 'none' }}
                    id="f-report-images"
                  />
                </div>
                {previews.length > 0 && (
                  <div>
                    <p className="text-sm font-semibold" style={{ marginBottom: 10 }}>
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
                              setImages(images.filter((_, j) => j !== i));
                              setPreviews(previews.filter((_, j) => j !== i));
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

            {step === 3 && (
              <motion.div
                key="step3"
                initial={{ opacity: 0, x: 20 }}
                animate={{ opacity: 1, x: 0 }}
                exit={{ opacity: 0, x: -20 }}
                transition={{ duration: 0.3, ease: [0.22, 1, 0.36, 1] }}
                style={{ display: 'grid', gap: 20 }}
              >
                <div>
                  <h3 style={{ marginBottom: 4 }}>Review Found Report Summary</h3>
                  <p className="text-sm text-muted">Verify details before submission</p>
                </div>
                <div style={{ display: 'grid', gap: 12 }}>
                  {[
                    { label: 'Item Title', value: title || '—' },
                    { label: 'Description', value: description || 'Not provided' },
                    { label: 'Date Found', value: foundAt ? new Date(foundAt).toLocaleString() : 'Not specified' },
                    { label: 'Photos', value: `${previews.length} photo${previews.length !== 1 ? 's' : ''} attached` },
                  ].map(({ label, value }) => (
                    <div key={label} style={{
                      display: 'flex', alignItems: 'flex-start', gap: 14,
                      padding: '14px 18px', background: 'var(--surface-card-alt)',
                      borderRadius: 'var(--radius-md)', border: '1px solid var(--border)',
                    }}>
                      <span style={{ color: 'var(--primary-deep)', fontWeight: 800, flexShrink: 0 }}>✓</span>
                      <div>
                        <p style={{ fontSize: '0.72rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.08em', color: 'var(--text-muted)', marginBottom: 2 }}>{label}</p>
                        <p style={{ fontSize: '0.92rem', color: 'var(--text-primary)', fontWeight: 600 }}>{value}</p>
                      </div>
                    </div>
                  ))}
                </div>
                <div style={{ padding: '14px 18px', background: 'rgba(138, 96, 16, 0.08)', borderRadius: 'var(--radius-md)', borderLeft: '4px solid var(--warning)' }}>
                  <p style={{ fontSize: '0.88rem', color: 'var(--warning)', fontWeight: 600 }}>
                    ⏳ This report will be reviewed by the Security Office before being displayed publicly.
                  </p>
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          <div style={{ display: 'flex', gap: 12, marginTop: 32, justifyContent: 'space-between' }}>
            <button type="button" className="btn btn-ghost" onClick={step === 0 ? () => navigate('/found-items') : prevStep} disabled={submitting}>
              {step === 0 ? 'Cancel' : '← Back'}
            </button>
            {step < STEPS.length - 1 ? (
              <motion.button type="button" className="btn btn-primary" onClick={nextStep} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                Continue →
              </motion.button>
            ) : (
              <motion.button type="button" className="btn btn-primary btn-lg" onClick={handleSubmit} disabled={submitting} whileHover={{ scale: 1.02 }} whileTap={{ scale: 0.97 }}>
                {submitting && <ButtonSpinner />}
                {submitting ? 'Submitting…' : 'Submit Found Report'}
              </motion.button>
            )}
          </div>
        </div>
      </motion.div>
    </div>
  );
}
