import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getMapItems, getMapHotspots } from '../api/campusMap';
import { getCategories } from '../api/reference';
import { formatBangladeshDate } from '../api/client';

const center = [23.7734, 90.3912];
const coords = {
  'Block A': [23.77365, 90.39085],
  'Block B': [23.77315, 90.39085],
  'Block C': [23.77365, 90.39155],
  'Block D': [23.77315, 90.39155],
};
const pin = color => L.divIcon({
  className: '',
  html: `<span style="display:block;width:18px;height:18px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 1px 5px #555"></span>`,
  iconSize: [18, 18],
  iconAnchor: [9, 9],
});
const campusPin = L.divIcon({
  className: '',
  html: '<span style="display:block;width:24px;height:24px;border-radius:50% 50% 50% 0;transform:rotate(-45deg);background:#166534;border:3px solid white;box-shadow:0 1px 6px #555"></span>',
  iconSize: [24, 24],
  iconAnchor: [12, 24],
});

export default function CampusMapPage() {
  const [items, setItems] = useState([]);
  const [hotspots, setHotspots] = useState([]);
  const [categories, setCategories] = useState([]);
  const [type, setType] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [status, setStatus] = useState('');
  const [error, setError] = useState('');

  useEffect(() => {
    getMapItems({ type, categoryId, status }).then(setItems).catch(e => setError(e.message));
    getMapHotspots().then(setHotspots).catch(() => {});
    getCategories().then(setCategories).catch(() => {});
  }, [type, categoryId, status]);

  return (
    <section className="page-container campus-map-page">
      <header className="page-header campus-map-header">
        <div>
          <span className="eyebrow campus-map-kicker">Campus location board</span>
          <h1>AUST Campus Map</h1>
          <p>Ahsanullah University of Science and Technology · Tejgaon, Dhaka, Bangladesh</p>
        </div>
      </header>

      <div className="campus-map-toolbar" aria-label="Map filters and report actions">
        <div className="campus-map-filters">
          <select className="campus-map-filter" aria-label="Item type" value={type} onChange={e => setType(e.target.value)}>
            <option value="">All reports</option>
            <option value="lost">Lost</option>
            <option value="found">Found</option>
          </select>
          <select className="campus-map-filter" aria-label="Category" value={categoryId} onChange={e => setCategoryId(e.target.value)}>
            <option value="">All categories</option>
            {categories.map(category => <option key={category.id} value={category.id}>{category.name}</option>)}
          </select>
          <select className="campus-map-filter" aria-label="Status" value={status} onChange={e => setStatus(e.target.value)}>
            <option value="">All statuses</option>
            <option>Open</option>
            <option>Available</option>
            <option>Returned</option>
            <option>Closed</option>
          </select>
        </div>
        <div className="campus-map-actions">
          <Link className="btn btn-primary" to="/lost-items/new">Report lost</Link>
          <Link className="btn btn-secondary" to="/found-items/new">Report found</Link>
        </div>
      </div>

      {error && <p className="campus-map-error" role="alert">{error}</p>}

      <div className="campus-map-board">
        <MapContainer className="campus-map-canvas" center={center} zoom={17} scrollWheelZoom>
          <TileLayer
            attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap contributors</a>'
            url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
          />
          <Marker position={center} icon={campusPin}>
            <Popup>
              <div className="campus-map-popup campus-map-popup--campus">
                <strong>Ahsanullah University of Science and Technology</strong>
                <span>Tejgaon, Dhaka, Bangladesh</span>
                <small>Campus pin is approximate</small>
              </div>
            </Popup>
          </Marker>
          {Object.entries(coords).map(([name, position]) => (
            <CircleMarker key={name} center={position} radius={8}>
              <Popup>
                <span className="campus-map-popup campus-map-popup--block">
                  {name} <small>(approximate)</small>
                </span>
              </Popup>
            </CircleMarker>
          ))}
          {items.map(item => {
            const position = coords[item.buildingName] || center;
            return (
              <Marker key={`${item.type}-${item.id}`} position={position} icon={pin(item.type === 'lost' ? '#dc2626' : '#16a34a')}>
                <Popup>
                  <div className="campus-map-popup campus-map-popup--item">
                    <strong>{item.title}</strong>
                    <span>{item.category} · {item.buildingName || item.locationName}</span>
                    <small>{item.status} · {formatBangladeshDate(item.createdAt, { dateStyle: 'medium' })}</small>
                    <Link className="campus-map-popup-link" to={`/${item.type}-items/${item.id}`}>View item</Link>
                  </div>
                </Popup>
              </Marker>
            );
          })}
        </MapContainer>
      </div>

      <p className="campus-map-summary text-sm text-muted">
        Hotspots: {hotspots.map(hotspot => `${hotspot.buildingName} (${hotspot.count})`).join(' · ') || 'No reports yet'}. Building positions are approximate.
      </p>
    </section>
  );
}
