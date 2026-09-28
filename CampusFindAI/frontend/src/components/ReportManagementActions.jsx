import { useState } from 'react';
import { Link } from 'react-router-dom';
import { archiveLostItem, deleteLostItem, reopenLostItem, resolveLostItem } from '../api/lostItems';
import { archiveFoundItem, deleteFoundItem, reopenFoundItem } from '../api/foundItems';

const copy = {
  resolve: ['Mark this item as resolved?', 'This report will stop appearing in active matching results. You can reopen it later.'],
  archive: ['Archive this report?', 'It will remain stored in your reports but will be hidden from active search and matching.'],
  reopen: ['Reopen this report?', 'It will return to active search and matching where the workflow permits it.'],
  delete: ['Delete this report?', 'This permanently removes a report with no claim or match history. This cannot be undone.'],
};

export default function ReportManagementActions({ item, type, onChanged }) {
  const [pending, setPending] = useState(null);
  const [error, setError] = useState('');
  const [busy, setBusy] = useState(false);
  const lost = type === 'lost';
  const status = item.status;
  const actions = lost
    ? status === 'Open' ? ['edit', 'resolve', 'archive', 'delete'] : status === 'Resolved' ? ['reopen', 'archive', 'delete'] : status === 'Archived' ? ['reopen', 'delete'] : []
    : status === 'Available' ? ['edit', 'archive', 'delete'] : status === 'Archived' ? ['reopen', 'delete'] : [];

  if (!actions.length) return null;

  const labels = { edit: 'Edit', resolve: 'Mark Resolved', archive: 'Archive', reopen: 'Reopen', delete: 'Delete' };

  async function confirm() {
    setBusy(true);
    setError('');
    try {
      const api = lost
        ? { resolve: resolveLostItem, archive: archiveLostItem, reopen: reopenLostItem, delete: deleteLostItem }
        : { archive: archiveFoundItem, reopen: reopenFoundItem, delete: deleteFoundItem };
      await api[pending](item.id);
      setPending(null);
      onChanged();
    } catch (err) { setError(err.message); }
    finally { setBusy(false); }
  }

  return (
    <>
      <div className="report-actions">
        {actions.map(action => action === 'edit' ? (
          <Link key={action} className="btn btn-sm btn-secondary" to={`/${type}-items/${item.id}/edit`}>Edit</Link>
        ) : (
          <button key={action} type="button" className={`btn btn-sm ${action === 'delete' ? 'btn-danger' : action === 'resolve' ? 'btn-primary' : 'btn-secondary'}`} onClick={() => setPending(action)}>{labels[action]}</button>
        ))}
      </div>
      {pending && (
        <div role="dialog" aria-modal="true" aria-labelledby="report-action-title" className="report-action-backdrop">
          <div className="report-action-sheet">
            <span className="ticket-code">Report action</span>
            <h2 id="report-action-title">{copy[pending][0]}</h2>
            <p className="text-secondary">{copy[pending][1]}</p>
            {error && <p className="report-action-error">{error}</p>}
            <div className="report-action-controls">
              <button className="btn btn-ghost" disabled={busy} onClick={() => { setPending(null); setError(''); }}>Cancel</button>
              <button className={`btn ${pending === 'delete' ? 'btn-danger' : 'btn-primary'}`} disabled={busy} onClick={confirm}>{busy ? 'Working...' : 'Confirm'}</button>
            </div>
          </div>
        </div>
      )}
    </>
  );
}
