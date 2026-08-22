import { useEffect, useState } from 'react';
import type { FormEvent } from 'react';
import {
  createFoundItem,
  getMyFoundItems,
  type FoundItem,
} from '../../services/foundItemService';

export function FoundItemsPage() {
  const [items, setItems] = useState<FoundItem[]>([]);

  const [title, setTitle] = useState('');
  const [description, setDescription] = useState('');
  const [foundAt, setFoundAt] = useState('');

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState('');

  async function loadItems() {
    try {
      const data = await getMyFoundItems();
      setItems(data);
    } catch {
      setMessage('Could not load your found items.');
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

      await createFoundItem({
        title: title.trim(),
        description: description.trim() || undefined,
        foundAt: foundAt
          ? new Date(foundAt).toISOString()
          : undefined,
      });

      setTitle('');
      setDescription('');
      setFoundAt('');

      setMessage('Found item reported successfully.');

      await loadItems();
    } catch {
      setMessage('Could not create found item.');
    } finally {
      setLoading(false);
    }
  }

  return (
    <main>
      <h1>Report Found Item</h1>

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
          <label htmlFor="foundAt">
            When did you find it?
          </label>

          <br />

          <input
            id="foundAt"
            type="datetime-local"
            value={foundAt}
            onChange={(event) => setFoundAt(event.target.value)}
          />
        </div>

        <br />

        <button type="submit" disabled={loading}>
          {loading ? 'Submitting...' : 'Report Found Item'}
        </button>
      </form>

      {message && <p>{message}</p>}

      <hr />

      <h2>My Found Items</h2>

      {items.length === 0 ? (
        <p>You have not reported any found items yet.</p>
      ) : (
        <ul>
          {items.map((item) => (
            <li key={item.id}>
              <strong>{item.title}</strong>

              <p>{item.description}</p>

              <small>
                Found:{' '}
                {item.foundAt
                  ? new Date(item.foundAt).toLocaleString()
                  : 'Not specified'}
              </small>
            </li>
          ))}
        </ul>
      )}
    </main>
  );
}