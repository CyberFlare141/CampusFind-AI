import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  createLostItem,
  getMyLostItems,
  type LostItem,
} from '../../services/lostItemService';

export function LostItemsPage() {
  const [items, setItems] = useState<LostItem[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [lostAt, setLostAt] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function loadItems() {
    try {
      const data = await getMyLostItems();
      setItems(data);
    } catch {
      setMessage('Could not load your lost items.');
    }
  }

  useEffect(() => {
    loadItems();
  }, []);

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!title.trim()) {
      setMessage('Item title is required.');
      return;
    }

    try {
      setLoading(true);
      setMessage('');

      await createLostItem({
        title: title.trim(),
        description: description.trim() || undefined,
        lostAt: lostAt
          ? new Date(lostAt).toISOString()
          : undefined,
      });

      setTitle('');
      setDescription('');
      setLostAt('');

      setMessage('Lost item reported successfully.');

      await loadItems();
    } catch {
      setMessage('Could not create lost item.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>Report Lost Item</h1>

      <form onSubmit={handleSubmit}>
        <div>
          <label htmlFor="title">
            Item title
          </label>

          <br />

          <input
            id="title"
            type="text"
            value={title}
            onChange={(event) => setTitle(event.target.value)}
            placeholder="e.g. Black Wallet"
          />
        </div>

        <br />

        <div>
          <label htmlFor="description">
            Description
          </label>

          <br />

          <textarea
            id="description"
            value={description}
            onChange={(event) =>
              setDescription(event.target.value)
            }
            placeholder="Describe the item..."
            rows={5}
          />
        </div>

        <br />

        <div>
          <label htmlFor="lostAt">
            When did you lose it?
          </label>

          <br />

          <input
            id="lostAt"
            type="datetime-local"
            value={lostAt}
            onChange={(event) => setLostAt(event.target.value)}
          />
        </div>

        <br />

        <button type="submit" disabled={loading}>
          {loading ? 'Submitting...' : 'Report Lost Item'}
        </button>
      </form>

      {message && <p>{message}</p>}

      <hr />

      <h2>My Lost Items</h2>

      {items.length === 0 ? (
        <p>You have not reported any lost items yet.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong>

              <p>{item.description}</p>

              <small>
                Status: {item.status}
              </small>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}