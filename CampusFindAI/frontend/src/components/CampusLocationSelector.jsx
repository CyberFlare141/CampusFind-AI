import { useEffect, useState } from 'react';
import { getBuildings, getFloors, getLocations } from '../api/reference';

export default function CampusLocationSelector({ value, onChange, errors = {} }) {
  const [buildings, setBuildings] = useState([]);
  const [floors, setFloors] = useState([]);
  const [locations, setLocations] = useState([]);
  const [loading, setLoading] = useState(true);
  const [loadingFloors, setLoadingFloors] = useState(false);
  const [loadingLocations, setLoadingLocations] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    getBuildings().then(setBuildings).catch(err => setError(err.message || 'Could not load campus blocks.')).finally(() => setLoading(false));
  }, []);

  async function chooseBuilding(buildingId) {
    onChange({ buildingId, floorId: '', locationId: '', locationDetails: value.locationDetails || '' });
    setFloors([]); setLocations([]);
    if (!buildingId) return;
    setLoadingFloors(true); setError('');
    try { setFloors(await getFloors(buildingId)); } catch (err) { setError(err.message || 'Could not load floors.'); } finally { setLoadingFloors(false); }
  }

  async function chooseFloor(floorId) {
    onChange({ ...value, floorId, locationId: '' });
    setLocations([]);
    if (!floorId) return;
    setLoadingLocations(true); setError('');
    try { setLocations(await getLocations(floorId)); } catch (err) { setError(err.message || 'Could not load locations.'); } finally { setLoadingLocations(false); }
  }

  return <div style={{ display: 'grid', gap: 16 }}>
    <div className="form-field"><label htmlFor="campus-building">Block *</label><select id="campus-building" value={value.buildingId} onChange={e => chooseBuilding(e.target.value)} disabled={loading}><option value="">{loading ? 'Loading blocks…' : 'Select a block'}</option>{buildings.map(building => <option key={building.id} value={building.id}>{building.name}</option>)}</select>{errors.buildingId && <span className="field-error">{errors.buildingId}</span>}</div>
    <div className="form-field"><label htmlFor="campus-floor">Floor *</label><select id="campus-floor" value={value.floorId} onChange={e => chooseFloor(e.target.value)} disabled={!value.buildingId || loadingFloors}><option value="">{!value.buildingId ? 'Select a block first' : loadingFloors ? 'Loading floors…' : floors.length ? 'Select a floor' : 'No floors available'}</option>{floors.map(floor => <option key={floor.id} value={floor.id}>{floor.name}</option>)}</select>{errors.floorId && <span className="field-error">{errors.floorId}</span>}</div>
    <div className="form-field"><label htmlFor="campus-location">Specific Location *</label><select id="campus-location" value={value.locationId} onChange={e => onChange({ ...value, locationId: e.target.value })} disabled={!value.floorId || loadingLocations}><option value="">{!value.floorId ? 'Select a floor first' : loadingLocations ? 'Loading locations…' : locations.length ? 'Select a specific location' : 'No locations available'}</option>{locations.map(location => <option key={location.id} value={location.id}>{location.name}</option>)}</select>{errors.locationId && <span className="field-error">{errors.locationId}</span>}</div>
    <div className="form-field"><label htmlFor="campus-details">Additional Details (Optional)</label><input id="campus-details" type="text" maxLength={200} value={value.locationDetails || ''} onChange={e => onChange({ ...value, locationDetails: e.target.value })} placeholder="Near Room 503 / beside the lift" /><span className="hint">{(value.locationDetails || '').length}/200</span></div>
    {error && <span className="field-error">{error}</span>}
  </div>;
}
