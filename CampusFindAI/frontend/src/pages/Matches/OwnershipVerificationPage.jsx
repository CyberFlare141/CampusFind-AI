import { useEffect, useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { Alert, PageLoading } from '../../components/Ui';
import { startOwnershipVerification, submitOwnershipVerification } from '../../api/ownershipVerification';

function draftKey(matchId) {
  return `campusfind.ownershipVerificationDraft.${matchId}`;
}

export default function OwnershipVerificationPage() {
  const { matchId } = useParams();
  const navigate = useNavigate();
  const [verification, setVerification] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [step, setStep] = useState(0);
  const [error, setError] = useState('');
  const [result, setResult] = useState(null);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    let active = true;
    startOwnershipVerification(matchId)
      .then(response => {
        if (!active) return;
        const questions = response.questions || [];
        let restoredAnswers = questions.map(() => '');
        let restoredStep = 0;
        try {
          const draft = JSON.parse(sessionStorage.getItem(draftKey(matchId)) || 'null');
          if (Array.isArray(draft?.answers)) {
            restoredAnswers = questions.map((_, index) => typeof draft.answers[index] === 'string' ? draft.answers[index] : '');
          }
          if (Number.isInteger(draft?.step)) restoredStep = Math.max(0, Math.min(draft.step, Math.max(0, questions.length - 1)));
        } catch {
          sessionStorage.removeItem(draftKey(matchId));
        }
        setVerification(response);
        setAnswers(restoredAnswers);
        setStep(restoredStep);
      })
      .catch(responseError => { if (active) setError(responseError.message); });
    return () => { active = false; };
  }, [matchId]);

  const saveDraft = (nextAnswers, nextStep) => {
    sessionStorage.setItem(draftKey(matchId), JSON.stringify({ answers: nextAnswers, step: nextStep }));
  };

  const updateAnswer = value => {
    const nextAnswers = answers.map((answer, index) => index === step ? value : answer);
    setAnswers(nextAnswers);
    saveDraft(nextAnswers, step);
  };

  const moveToStep = nextStep => {
    setStep(nextStep);
    saveDraft(answers, nextStep);
  };

  const submit = async () => {
    setError('');
    setSaving(true);
    try {
      const response = await submitOwnershipVerification(matchId, answers.map(answer => answer.trim()));
      sessionStorage.removeItem(draftKey(matchId));
      setResult(response);
    } catch (submitError) {
      setError(submitError.message);
    } finally {
      setSaving(false);
    }
  };

  if (error && !verification) return <div className="page-container-form"><Alert type="error">{error}</Alert><Link className="btn btn-secondary" to="/my-matches">Back to My AI Matches</Link></div>;
  if (!verification) return <PageLoading label="Preparing ownership verification…" />;
  if (result) return <div className="page-container-form"><div className="card card-pad-lg" style={{ textAlign: 'center' }}><span className="eyebrow">Ownership Verification</span><h1>Verification submitted</h1><p className="text-secondary">{result.message}</p><p style={{ fontWeight: 700 }}>Status: Pending Security Review</p><Link className="btn btn-primary" to="/my-matches">Return to My AI Matches</Link></div></div>;

  const question = verification.questions[step];
  return <div className="page-container-form"><div className="card card-pad-lg"><span className="eyebrow">Secure ownership gate</span><h1>Ownership Verification</h1><p className="text-secondary">Answer details that only the real owner would reasonably know. Your answers are sent to Security for manual review.</p><p className="hint">Unsubmitted answers are saved in this browser session and can be resumed from My AI Matches.</p><div style={{ margin: '28px 0 10px', fontWeight: 700 }}>Question {step + 1} of {verification.questions.length}</div><div className="progress-track"><div className="progress-fill" style={{ width: `${((step + 1) / verification.questions.length) * 100}%` }} /></div><h2 style={{ marginTop: 28 }}>{question.question}</h2><textarea aria-label={`Answer to question ${step + 1}`} value={answers[step]} onChange={event => updateAnswer(event.target.value)} maxLength={1000} rows={6} placeholder="Enter your answer" /><p className="hint">{answers[step].length}/1000 characters</p><Alert type="error">{error}</Alert><div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, marginTop: 24 }}>{step ? <button className="btn btn-secondary" onClick={() => moveToStep(step - 1)}>Back</button> : <button className="btn btn-secondary" onClick={() => navigate('/my-matches')}>Save & exit</button>}{step < verification.questions.length - 1 ? <button className="btn btn-primary" disabled={!answers[step].trim()} onClick={() => moveToStep(step + 1)}>Next</button> : <button className="btn btn-primary" disabled={saving || answers.some(answer => !answer.trim())} onClick={submit}>{saving ? 'Submitting…' : 'Submit for Security Review'}</button>}</div></div></div>;
}
