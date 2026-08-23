import { useEffect, useRef, useState, type ChangeEvent } from 'react';

const maxFiles = 5;
const maxBytes = 5 * 1024 * 1024;
const allowedTypes = ['image/jpeg', 'image/png', 'image/webp'];

export function ImagePicker({ files, onChange, onError }: { files: File[]; onChange: (files: File[]) => void; onError: (message: string) => void }) {
  const [previews, setPreviews] = useState<{ file: File; url: string }[]>([]); const input = useRef<HTMLInputElement>(null);
  useEffect(() => { setPreviews(previous => { previous.forEach(item => URL.revokeObjectURL(item.url)); return files.map(file => ({ file, url: URL.createObjectURL(file) })); }); }, [files]);
  useEffect(() => () => previews.forEach(item => URL.revokeObjectURL(item.url)), [previews]);
  function select(event: ChangeEvent<HTMLInputElement>) { const selected = Array.from(event.target.files ?? []); if (files.length + selected.length > maxFiles) { onError(`You can add up to ${maxFiles} images.`); return; } if (selected.some(file => !allowedTypes.includes(file.type))) { onError('Only JPG, PNG, and WebP images are allowed.'); return; } if (selected.some(file => file.size > maxBytes)) { onError('Each image must be 5 MB or smaller.'); return; } onError(''); onChange([...files, ...selected]); event.target.value = ''; }
  return <fieldset className="image-picker"><legend>Photos <span className="muted">(optional, up to 5)</span></legend><input ref={input} className="visually-hidden" id="report-images" type="file" accept="image/jpeg,image/png,image/webp" multiple onChange={select} /><button className="button button-secondary" type="button" onClick={() => input.current?.click()}>Add photos</button><small>JPG, PNG, or WebP. Maximum 5 MB each.</small>{previews.length > 0 && <div className="image-preview-grid">{previews.map((preview, index) => <div className="image-preview" key={`${preview.file.name}-${index}`}><img src={preview.url} alt={`Selected image ${index + 1}`} /><button type="button" aria-label={`Remove selected image ${index + 1}`} onClick={() => onChange(files.filter((_, current) => current !== index))}>×</button></div>)}</div>}</fieldset>;
}
