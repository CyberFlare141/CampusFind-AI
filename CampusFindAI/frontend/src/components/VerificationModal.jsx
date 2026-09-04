import { useEffect, useState } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { getOrGenerateVerification, submitVerificationAnswers } from '../api/claims';
import { Alert, ButtonSpinner } from './Ui';

export default function VerificationModal({ claim, isOpen, onClose, onComplete }) {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [questions, setQuestions] = useState([]);
  const [currentStep, setCurrentStep] = useState(0);
  const [answers, setAnswers] = useState([]);
  const [submitting, setSubmitting] = useState(false);
  const [completed, setCompleted] = useState(false);
  const [result, setResult] = useState(null);
  const [attemptsRemaining, setAttemptsRemaining] = useState(null);
  const [fallbackMessage, setFallbackMessage] = useState('');

  useEffect(() => {
    if (!isOpen || !claim?.id) return;

    let active = true;
    async function load() {
      setLoading(true);
      setError('');
      setCompleted(false);
      setResult(null);
      setCurrentStep(0);
      try {
        const data = await getOrGenerateVerification(claim.id);
        if (!active) return;
        setQuestions(data.questions || []);
        setAnswers(new Array((data.questions || []).length).fill(''));
        setAttemptsRemaining(Math.max(0, data.maxAttempts - data.attemptCount));

        if (data.isSubmitted) {
          setCompleted(true);
        }
        if (data.fallbackUsed && data.message) {
          setFallbackMessage(data.message);
        }
      } catch (err) {
        if (active) setError(err.message || 'Failed to initialize verification.');
      } finally {
        if (active) setLoading(false);
      }
    }

    load();
    return () => { active = false; };
  }, [isOpen, claim?.id]);

  if (!isOpen) return null;

  function handleAnswerChange(val) {
    setAnswers(prev => {
      const next = [...prev];
      next[currentStep] = val;
      return next;
    });
  }

  function handleNext(e) {
    e?.preventDefault();
    if (currentStep < questions.length - 1) {
      setCurrentStep(prev => prev + 1);
    }
  }

  function handlePrev() {
    if (currentStep > 0) {
      setCurrentStep(prev => prev - 1);
    }
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    setSubmitting(true);
    try {
      const res = await submitVerificationAnswers(claim.id, answers);
      setResult(res);
      setAttemptsRemaining(res.attemptsRemaining);
      setCompleted(true);
      if (onComplete) {
        onComplete(res);
      }
    } catch (err) {
      setError(err.message || 'Submission failed. Please try again.');
    } finally {
      setSubmitting(false);
    }
  }

  const isCurrentAnswerEmpty = !answers[currentStep]?.trim();
  const allAnswered = questions.length > 0 && answers.every(a => a && a.trim().length > 0);

  return (
    <div
      style={{
        position: 'fixed',
        inset: 0,
        zIndex: 1000,
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        padding: '16px',
        backgroundColor: 'rgba(31, 41, 55, 0.45)',
        backdropFilter: 'blur(4px)',
      }}
      onClick={(e) => { if (e.target === e.currentTarget && !submitting) onClose(); }}
    >
      <motion.div
        role="dialog"
        aria-modal="true"
        aria-labelledby="modal-verification-title"
        initial={{ opacity: 0, scale: 0.95, y: 16 }}
        animate={{ opacity: 1, scale: 1, y: 0 }}
        exit={{ opacity: 0, scale: 0.95, y: 16 }}
        transition={{ duration: 0.28, ease: [0.22, 1, 0.36, 1] }}
        style={{
          width: '100%',
          maxWidth: '560px',
          background: 'var(--verify-bg, #E8F5BD)',
          border: '1.5px solid var(--verify-primary, #84B179)',
          borderRadius: '20px',
          boxShadow: '0 20px 45px rgba(31, 41, 55, 0.2)',
          color: 'var(--verify-text, #1F2937)',
          overflow: 'hidden',
          display: 'flex',
          flexDirection: 'column',
        }}
      >
        {/* ── Modal Header ─────────────────────────────────────── */}
        <div
          style={{
            padding: '20px 24px',
            background: 'var(--verify-surface, #C7EABB)',
            borderBottom: '1px solid rgba(132, 177, 121, 0.35)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'space-between',
          }}
        >
          <div>
            <span
              style={{
                display: 'inline-block',
                fontSize: '0.72rem',
                fontWeight: 800,
                letterSpacing: '0.08em',
                textTransform: 'uppercase',
                color: '#2d5a27',
                marginBottom: 2,
              }}
            >
              Anti-Theft Protection
            </span>
            <h2
              id="modal-verification-title"
              style={{
                margin: 0,
                fontSize: '1.25rem',
                fontWeight: 700,
                color: 'var(--verify-text, #1F2937)',
              }}
            >
              Ownership Verification
            </h2>
            <p style={{ margin: 0, fontSize: '0.82rem', color: '#4B5563' }}>
              Item: <strong>{claim?.foundItemTitle || 'Found Item'}</strong>
            </p>
          </div>

          {!submitting && (
            <button
              type="button"
              onClick={onClose}
              aria-label="Close"
              style={{
                background: 'none',
                border: 'none',
                cursor: 'pointer',
                color: '#4B5563',
                padding: '6px',
                borderRadius: '8px',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'center',
              }}
            >
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
                <line x1="18" y1="6" x2="6" y2="18" /><line x1="6" y1="6" x2="18" y2="18" />
              </svg>
            </button>
          )}
        </div>

        {/* ── Modal Body ───────────────────────────────────────── */}
        <div style={{ padding: '24px' }}>
          <Alert type="error">{error}</Alert>

          {loading ? (
            <div style={{ textAlign: 'center', padding: '40px 0' }}>
              <ButtonSpinner />
              <p style={{ marginTop: 14, fontSize: '0.92rem', color: '#374151', fontWeight: 600 }}>
                Generating verification questions with AI…
              </p>
              <p style={{ fontSize: '0.8rem', color: '#6B7280' }}>
                Analyzing distinctive item characteristics securely.
              </p>
            </div>
          ) : completed ? (
            /* ── Post-Completion View ────────────────────────────── */
            <motion.div
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.3 }}
              style={{ textAlign: 'center', padding: '12px 0 8px' }}
            >
              <div
                style={{
                  width: 58,
                  height: 58,
                  borderRadius: '50%',
                  background: 'var(--verify-primary, #84B179)',
                  color: '#FFFFFF',
                  fontSize: '1.8rem',
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'center',
                  margin: '0 auto 16px',
                  boxShadow: '0 6px 16px rgba(132, 177, 121, 0.45)',
                }}
              >
                ✓
              </div>

              <h3 style={{ fontSize: '1.25rem', marginBottom: 6, color: '#1F2937' }}>
                Verification submitted ✓
              </h3>
              <p style={{ fontSize: '0.92rem', color: '#4B5563', maxWidth: '380px', margin: '0 auto 24px', lineHeight: 1.5 }}>
                Your answers are being reviewed by campus security.
              </p>

              {/* 4-Step Claim Status Timeline */}
              <div
                style={{
                  background: 'var(--verify-surface, #C7EABB)',
                  borderRadius: '14px',
                  padding: '16px 20px',
                  marginBottom: 24,
                  textAlign: 'left',
                  border: '1px solid rgba(132, 177, 121, 0.4)',
                }}
              >
                <div style={{ fontSize: '0.75rem', fontWeight: 800, textTransform: 'uppercase', letterSpacing: '0.07em', color: '#2d5a27', marginBottom: 12 }}>
                  Claim Status
                </div>
                <div style={{ display: 'grid', gap: 10, fontSize: '0.9rem' }}>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#1F2937', fontWeight: 600 }}>
                    <span style={{ color: '#2d5a27', fontSize: '1.1rem' }}>●</span> Submitted
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#1F2937', fontWeight: 700 }}>
                    <span style={{ color: '#2d5a27', fontSize: '1.1rem' }}>●</span> Verification complete
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6B7280', fontWeight: 500 }}>
                    <span style={{ color: '#9CA3AF', fontSize: '1.1rem' }}>○</span> Approved
                  </div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 10, color: '#6B7280', fontWeight: 500 }}>
                    <span style={{ color: '#9CA3AF', fontSize: '1.1rem' }}>○</span> Handover
                  </div>
                </div>
              </div>

              <button
                type="button"
                className="btn btn-primary"
                onClick={onClose}
                style={{
                  background: 'var(--verify-primary, #84B179)',
                  borderColor: 'var(--verify-primary, #84B179)',
                  color: '#1F2937',
                  fontWeight: 700,
                  width: '100%',
                  padding: '12px',
                }}
              >
                Done
              </button>
            </motion.div>
          ) : questions.length === 0 ? (
            /* ── Fallback Notice if no questions generated ────────── */
            <div style={{ textAlign: 'center', padding: '24px 0' }}>
              <div style={{ fontSize: '2rem', marginBottom: 12 }}>🛡️</div>
              <h3 style={{ fontSize: '1.1rem', marginBottom: 8 }}>
                AI verification is temporarily unavailable.
              </h3>
              <p style={{ fontSize: '0.88rem', color: '#4B5563', marginBottom: 20 }}>
                Security staff can manually verify the claim. Please bring a student ID or purchase receipt when visiting the Security Office.
              </p>
              <button type="button" className="btn btn-secondary" onClick={onClose}>
                Close
              </button>
            </div>
          ) : (
            /* ── Step-by-Step Question Flow ───────────────────────── */
            <form onSubmit={handleSubmit}>
              {fallbackMessage && (
                <div
                  style={{
                    padding: '10px 14px',
                    borderRadius: '8px',
                    background: 'rgba(255, 255, 255, 0.7)',
                    fontSize: '0.82rem',
                    color: '#4B5563',
                    marginBottom: 16,
                    border: '1px solid rgba(132, 177, 121, 0.4)',
                  }}
                >
                  ℹ️ {fallbackMessage}
                </div>
              )}

              {/* Step indicator */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginBottom: 14,
                }}
              >
                <span
                  style={{
                    fontSize: '0.82rem',
                    fontWeight: 700,
                    textTransform: 'uppercase',
                    letterSpacing: '0.06em',
                    color: '#2d5a27',
                  }}
                >
                  Question {currentStep + 1} of {questions.length}
                </span>

                {attemptsRemaining !== null && (
                  <span style={{ fontSize: '0.78rem', color: '#4B5563', fontWeight: 600 }}>
                    Attempts remaining: {attemptsRemaining}
                  </span>
                )}
              </div>

              {/* Progress bar */}
              <div
                style={{
                  height: 4,
                  width: '100%',
                  background: 'rgba(132, 177, 121, 0.25)',
                  borderRadius: 2,
                  overflow: 'hidden',
                  marginBottom: 20,
                }}
              >
                <div
                  style={{
                    height: '100%',
                    width: `${((currentStep + 1) / questions.length) * 100}%`,
                    background: 'var(--verify-primary, #84B179)',
                    transition: 'width 0.3s ease',
                  }}
                />
              </div>

              {/* Animated Question Card */}
              <AnimatePresence mode="wait">
                <motion.div
                  key={currentStep}
                  initial={{ opacity: 0, x: 14 }}
                  animate={{ opacity: 1, x: 0 }}
                  exit={{ opacity: 0, x: -14 }}
                  transition={{ duration: 0.24, ease: [0.22, 1, 0.36, 1] }}
                >
                  <label
                    htmlFor={`verify-answer-${currentStep}`}
                    style={{
                      display: 'block',
                      fontSize: '1.08rem',
                      fontWeight: 700,
                      color: 'var(--verify-text, #1F2937)',
                      lineHeight: 1.45,
                      marginBottom: 14,
                    }}
                  >
                    {questions[currentStep]?.question}
                  </label>

                  <textarea
                    id={`verify-answer-${currentStep}`}
                    rows={3}
                    placeholder="Your answer (describe details only the rightful owner would know)…"
                    value={answers[currentStep] || ''}
                    onChange={(e) => handleAnswerChange(e.target.value)}
                    disabled={submitting}
                    autoFocus
                    style={{
                      width: '100%',
                      padding: '12px 14px',
                      borderRadius: '12px',
                      border: '1.5px solid var(--verify-primary, #84B179)',
                      background: '#FFFFFF',
                      fontSize: '0.95rem',
                      color: '#1F2937',
                      outline: 'none',
                      resize: 'vertical',
                      boxShadow: 'inset 0 1px 3px rgba(0,0,0,0.06)',
                    }}
                  />
                  <span
                    style={{
                      display: 'block',
                      marginTop: 6,
                      fontSize: '0.78rem',
                      color: '#6B7280',
                    }}
                  >
                    Provide as much specific distinguishing detail as you recall.
                  </span>
                </motion.div>
              </AnimatePresence>

              {/* Navigation Buttons */}
              <div
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  marginTop: 24,
                  paddingTop: 16,
                  borderTop: '1px solid rgba(132, 177, 121, 0.3)',
                }}
              >
                <button
                  type="button"
                  className="btn btn-ghost"
                  onClick={handlePrev}
                  disabled={currentStep === 0 || submitting}
                  style={{ visibility: currentStep === 0 ? 'hidden' : 'visible' }}
                >
                  ← Previous
                </button>

                {currentStep < questions.length - 1 ? (
                  <button
                    type="button"
                    className="btn btn-primary"
                    onClick={handleNext}
                    disabled={isCurrentAnswerEmpty}
                    style={{
                      background: 'var(--verify-primary, #84B179)',
                      borderColor: 'var(--verify-primary, #84B179)',
                      color: '#1F2937',
                      fontWeight: 700,
                    }}
                  >
                    Next Question →
                  </button>
                ) : (
                  <button
                    type="submit"
                    className="btn btn-primary"
                    disabled={!allAnswered || submitting}
                    style={{
                      background: 'var(--verify-primary, #84B179)',
                      borderColor: 'var(--verify-primary, #84B179)',
                      color: '#1F2937',
                      fontWeight: 700,
                      display: 'flex',
                      alignItems: 'center',
                      gap: 8,
                    }}
                  >
                    {submitting && <ButtonSpinner />}
                    {submitting ? 'Verifying…' : 'Submit Verification'}
                  </button>
                )}
              </div>
            </form>
          )}
        </div>
      </motion.div>
    </div>
  );
}
