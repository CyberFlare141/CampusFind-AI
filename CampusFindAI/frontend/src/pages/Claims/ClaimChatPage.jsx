import { useEffect, useRef, useState } from 'react';
import { Link, useParams } from 'react-router-dom';
import { HubConnectionBuilder, LogLevel } from '@microsoft/signalr';
import { Alert, ButtonSpinner, PageLoading, SlideIn } from '../../components/Ui';
import { API_BASE_URL, formatBangladeshDate, getToken } from '../../api/client';
import { getClaimChatMessages, markClaimChatRead, sendClaimChatMessage } from '../../api/claimChat';

const hubUrl = `${API_BASE_URL.replace(/\/api\/?$/, '')}/hubs/claim-chat`;
const formatTime = value => formatBangladeshDate(value, { hour: 'numeric', minute: '2-digit', timeZone: 'Asia/Dhaka' });

export default function ClaimChatPage() {
  const { claimId } = useParams();
  const [chat, setChat] = useState(null);
  const [messages, setMessages] = useState([]);
  const [nextBefore, setNextBefore] = useState(null);
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(true);
  const [sending, setSending] = useState(false);
  const [loadingOlder, setLoadingOlder] = useState(false);
  const [error, setError] = useState('');
  const bottomRef = useRef(null);

  const load = async () => {
    const response = await getClaimChatMessages(claimId);
    setChat(response.conversation);
    setMessages(response.messages || []);
    setNextBefore(response.nextBefore);
    await markClaimChatRead(claimId);
  };

  useEffect(() => {
    let disposed = false;
    let connection;
    load().catch(requestError => { if (!disposed) setError(requestError.message); }).finally(() => { if (!disposed) setLoading(false); });
    connection = new HubConnectionBuilder().withUrl(hubUrl, { accessTokenFactory: getToken }).withAutomaticReconnect().configureLogging(LogLevel.Warning).build();
    connection.on('MessageReceived', message => {
      setMessages(current => current.some(existing => existing.id === message.id) ? current : [...current, message]);
      markClaimChatRead(claimId).catch(() => {});
    });
    connection.start().then(() => connection.invoke('JoinClaimChat', claimId)).catch(() => {});
    return () => { disposed = true; connection?.stop(); };
  }, [claimId]);

  useEffect(() => { bottomRef.current?.scrollIntoView({ behavior: 'smooth' }); }, [messages.length]);

  async function loadOlder() {
    if (!nextBefore) return;
    setLoadingOlder(true);
    try {
      const response = await getClaimChatMessages(claimId, nextBefore);
      setMessages(current => [...response.messages, ...current]);
      setNextBefore(response.nextBefore);
    } catch (requestError) { setError(requestError.message); }
    finally { setLoadingOlder(false); }
  }

  async function send(event) {
    event.preventDefault();
    if (!text.trim() || sending || chat?.isReadOnly) return;
    setSending(true); setError('');
    try {
      const message = await sendClaimChatMessage(claimId, text.trim());
      setMessages(current => current.some(existing => existing.id === message.id) ? current : [...current, message]);
      setText('');
    } catch (requestError) { setError(requestError.message); }
    finally { setSending(false); }
  }

  if (loading) return <PageLoading label="Opening private handover chat…" />;
  if (!chat) return <div className="page-container-form"><Alert type="error">{error || 'Chat is unavailable.'}</Alert><Link className="btn btn-secondary" to="/my-claims">Back to My Claims</Link></div>;
  return <div className="page-container-form claim-chat-page"><div className="card claim-chat-ticket" style={{ overflow: 'hidden' }}>
    <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--border)', display: 'flex', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}><div><Link className="back-link" to="/my-claims">← Back to My Claims</Link><h1 style={{ margin: '8px 0 4px' }}>Item Handover</h1><p className="text-secondary" style={{ margin: 0 }}>{chat.itemTitle} · Claim Approved</p></div><span className="badge badge-success">Private chat</span></div>
    <div className="claim-chat-thread" style={{ minHeight: 360, maxHeight: '55vh', overflowY: 'auto', padding: 24, background: 'var(--surface-card-alt)' }}>
      {nextBefore && <div style={{ textAlign: 'center', marginBottom: 16 }}><button className="btn btn-secondary btn-sm" onClick={loadOlder} disabled={loadingOlder}>{loadingOlder ? 'Loading…' : 'Load older messages'}</button></div>}
      {messages.length === 0 && <div className="text-secondary" style={{ textAlign: 'center', padding: '90px 16px' }}>No messages yet. Use this private chat only to arrange the physical handover.</div>}
      {messages.map(message => (
        <SlideIn key={message.id} from={message.isMine ? 'right' : 'left'} className={`claim-chat-message-row ${message.isMine ? 'is-mine' : ''}`}>
          <div className="claim-chat-message-wrap">
            <div className="claim-chat-sender">{message.isMine ? 'You' : chat.otherParticipantName}</div>
            <div className="claim-chat-bubble">{message.content}</div>
            <div className="claim-chat-time">{formatTime(message.sentAt)}</div>
          </div>
        </SlideIn>
      ))}
      <div ref={bottomRef} />
    </div>
    {chat.isReadOnly ? <div style={{ padding: 18, background: 'var(--success-bg)', color: 'var(--success)', fontWeight: 700 }}>✓ Item Successfully Returned — this conversation is now read-only.</div> : <form onSubmit={send} className="claim-chat-composer" style={{ padding: 16, borderTop: '1px solid var(--border)', display: 'flex', gap: 10 }}><textarea value={text} onChange={event => setText(event.target.value)} maxLength={1000} rows={2} placeholder="Type a message to arrange the handover…" style={{ flex: 1, minWidth: 0 }} /><button className="btn btn-primary" disabled={sending || !text.trim()}>{sending ? <ButtonSpinner /> : 'Send'}</button></form>}
    {error && <div style={{ padding: '0 16px 16px' }}><Alert type="error">{error}</Alert></div>}
  </div></div>;
}
