import { useState } from 'react';
import { Navigate, useNavigate } from 'react-router-dom';
import { createLostItem } from '../../api/lostItems';
import { useAuth } from '../../context/AuthContext';
import { Alert, ButtonSpinner } from '../../components/Ui';

function toDateTimeLocal(date) {
  const offset = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offset).toISOString().slice(0, 16);
}

export default function LostItemFormPage() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lostAt, setLostAt] = useState('');
  const [images, setImages] = useState([]);
  const [fieldErrors, setFieldErrors] = useState({});
  const [formError, setFormError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const latestDate = toDateTimeLocal(new Date());
  const earliest = new Date();
  earliest.setMonth(earliest.getMonth() - 6);
  const earliestDate = toDateTimeLocal(earliest);

  function validate() {
    const errors = {};
    if (!title.trim()) errors.title = 'Give your item a short, descriptive title.';
    else if (title.trim().length > 150) errors.title = 'Title must be under 150 characters.';
    if (lostAt && new Date(lostAt) > new Date()) errors.lostAt = 'The date lost can\u2019t be in the future.';
    else if (lostAt && new Date(lostAt) < earliest) errors.lostAt = 'Items can only be reported for the last six months.';
    setFieldErrors(errors);
    return Object.keys(errors).length === 0;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setFormError('');
    if (!validate()) return;

    setSubmitting(true);
    try {
      const created = await createLostItem({
        title: title.trim(),
        description: description.trim() || undefined,
        lostAt: lostAt ? new Date(lostAt).toISOString() : undefined,
        images,
      });
      navigate(`/lost-items/${created.id}`, { replace: true, state: { justCreated: true } });
    } catch (err) {
      setFormError(err.message);
    } finally {
      setSubmitting(false);
    }
  }

  if (user?.role === 'Administrator') return <Navigate to="/lost-items" replace />;

  return (
    <div className="page-container page-container-narrow">
      <div className="page-header">
        <div>
          <span className="eyebrow">Lost items</span>
          <h1>Report a Lost Item</h1>
          <p>Give as much detail as you can &mdash; it helps others recognize your item.</p>
        </div>
      </div>

      <div className="card card-pad">
        <Alert type="error">{formError}</Alert>

        <form onSubmit={handleSubmit} noValidate>
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
            />
            {fieldErrors.title && <span className="field-error">{fieldErrors.title}</span>}
          </div>

          <div className="form-field">
            <label htmlFor="description">Description</label>
            <textarea
              id="description"
              placeholder="Color, brand, distinguishing marks, what was inside, etc."
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={4}
            />
            <span className="hint">Optional, but more detail improves the chance of a match.</span>
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
            {fieldErrors.lostAt && <span className="field-error">{fieldErrors.lostAt}</span>}
            <span className="hint">Optional. Choose a date and time within the last six months.</span>
          </div>

          <ImageUpload files={images} onChange={setImages} />

          <div className="form-note">
            <strong>Note:</strong> Category and location tagging aren&apos;t available yet &mdash;
            the backend doesn&apos;t currently expose an endpoint to look up categories or campus
            locations, so those fields are left out of this form for now.
          </div>

          <div className="flex gap-12" style={{ marginTop: 8 }}>
            <button type="submit" className="btn btn-primary" disabled={submitting}>
              {submitting && <ButtonSpinner />}
              {submitting ? 'Submitting\u2026' : 'Submit Report'}
            </button>
            <button type="button" className="btn btn-ghost" onClick={() => navigate(-1)} disabled={submitting}>
              Cancel
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ImageUpload({ files, onChange }) {
  return <div className="form-field"><label htmlFor="report-images">Photos</label><input id="report-images" type="file" accept="image/*" multiple onChange={(event) => onChange(Array.from(event.target.files || []).slice(0, 4))} /><span className="hint">Optional. Add up to four clear photos to help AI matching.</span>{files.length > 0 && <span className="hint">{files.length} photo{files.length === 1 ? '' : 's'} selected.</span>}</div>;
}
