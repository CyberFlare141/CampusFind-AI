import { useEffect, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { motion } from 'framer-motion';
import { getFoundItemById, getFounderVerification, saveFounderVerification } from '../../api/foundItems';
import { getFounderClaimChats } from '../../api/claimChat';
import { useAuth } from '../../context/AuthContext';
import { Alert, ButtonSpinner, FadeImage, PageLoading, StatusBadge, formatDate } from '../../components/Ui';
import { publicAssetUrl } from '../../api/client';

export default function FoundItemDetailPage() {
  const { id } = useParams();
  const { user } = useAuth();
  const [item, setItem] = useState(null);
  const [verification, setVerification] = useState(null);
  const [answers, setAnswers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [saving, setSaving] = useState(false);
  const [saveMessage, setSaveMessage] = useState('');
  const [claimChats, setClaimChats] = useState([]);

  useEffect(() => {
    let cancelled = false;
    async function load() {
      setLoading(true);
      try {
        const found = await getFoundItemById(id);
        if (cancelled) return;
        setItem(found);
        if (found.userId === user?.id) {
          const founderVerification = await getFounderVerification(id);
          if (cancelled) return;
          setVerification(founderVerification);
          setAnswers(founderVerification.questions.map(question => question.answer || ''));
          setClaimChats(await getFounderClaimChats(id));
        }
      } catch (requestError) {
        if (!cancelled) setError(requestError.message);
      } finally {
        if (!cancelled) setLoading(false);
      }
    }
    load();
    return () => { cancelled = true; };
  }, [id, user?.id]);

  async function saveVerification() {
    setSaveMessage('');
    setSaving(true);
    try {
      const updated = await saveFounderVerification(id, answers.map(answer => answer.trim()));
      setVerification(updated);
      setAnswers(updated.questions.map(question => question.answer || ''));
      setSaveMessage('Your private ownership-verification answers are ready for matched claims.');
    } catch (requestError) {
      setSaveMessage(requestError.message);
    } finally {
      setSaving(false);
    }
  }

  if (loading) return <div className="page-container-detail"><PageLoading label="Loading item details…" /></div>;
  if (error || !item) return <div className="page-container-detail"><Alert type="error">{error || 'Found item not found.'}</Alert><Link to="/found-items" className="btn btn-secondary">Back to Found Items</Link></div>;
  const isMine = item.userId === user?.id;

  return <div className="page-container-detail">
    <Link to="/found-items" className="back-link">← Back to Found Items</Link>
    <motion.article className="card card-pad-lg" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }}>
      {item.imageUrls?.[0] && <div style={{ width: '100%', height: 340, maxHeight: '60vw', borderRadius: 'var(--radius-xl)', marginBottom: 24, overflow: 'hidden' }}><FadeImage src={publicAssetUrl(item.imageUrls[0])} alt={`${item.title} found-item photo`} /></div>}
      <div style={{ display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><div><span className="eyebrow">Found item</span><h1>{item.title}</h1></div><StatusBadge status={item.status} /></div>
      <p className="text-secondary">{item.description || 'No public description provided.'}</p>
      <dl className="detail-list"><div><dt>Location</dt><dd>{item.locationName || item.locationDetails || 'Not specified'}</dd></div><div><dt>Date Found</dt><dd>{formatDate(item.foundAt)}</dd></div>{item.categoryName && <div><dt>Category</dt><dd>{item.categoryName}</dd></div>}</dl>
      {!isMine && <div style={{ marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--border)' }}><p className="text-secondary">Ownership claims can only be started from a matching lost-item report in <Link to="/my-matches">My AI Matches</Link>.</p></div>}
    </motion.article>

    {isMine && claimChats.length > 0 && <section className="card card-pad-lg" style={{ marginTop: 20 }}>
      <span className="eyebrow">Approved ownership claim</span><h2>Owner Verified ✓</h2>
      <p className="text-secondary">A Security Officer approved this ownership claim. Use private chat only to arrange the face-to-face handover.</p>
      {claimChats.map(chat => <div key={chat.claimId} style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, paddingTop: 12, flexWrap: 'wrap' }}><span className="text-sm">Verified owner: {chat.ownerName}</span><Link className="btn btn-primary" to={`/claims/${chat.claimId}/chat`}>💬 Chat with Owner{chat.unreadCount ? ` (${chat.unreadCount})` : ''}</Link></div>)}
    </section>}

    {isMine && verification && <section className="card card-pad-lg" style={{ marginTop: 20 }}>
      <span className="eyebrow">Private finder evidence</span><h2>Ownership Verification</h2>
      <p className="text-secondary">These answers are never shown to students. They are locked once a claim is active and are compared only by a Security Officer.</p>
      <Alert type={verification.isComplete ? 'success' : 'info'}>{verification.isComplete ? 'Verification status: Ready' : 'Verification status: Incomplete — answer all three questions to make matching claims available.'}</Alert>
      {verification.questions.map((question, index) => <div className="form-field" key={question.id} style={{ marginTop: 16 }}><label htmlFor={`founder-answer-${question.id}`}>Question {index + 1}: {question.question}</label><textarea id={`founder-answer-${question.id}`} rows={3} maxLength={1000} value={answers[index] || ''} onChange={event => setAnswers(values => values.map((value, answerIndex) => answerIndex === index ? event.target.value : value))} disabled={verification.isComplete} /><span className="hint">{(answers[index] || '').length}/1000 characters</span></div>)}
      {!verification.isComplete && <button type="button" className="btn btn-primary" style={{ marginTop: 18 }} disabled={saving || answers.some(answer => !answer.trim())} onClick={saveVerification}>{saving && <ButtonSpinner />}{saving ? 'Saving…' : 'Save Verification Answers'}</button>}
      {saveMessage && <div style={{ marginTop: 14 }}><Alert type={verification.isComplete ? 'success' : 'error'}>{saveMessage}</Alert></div>}
    </section>}
  </div>;
}
