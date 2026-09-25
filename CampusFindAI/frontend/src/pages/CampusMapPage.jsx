import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { MapContainer, TileLayer, Marker, Popup, CircleMarker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { getMapItems, getMapHotspots } from '../api/campusMap';
import { getCategories } from '../api/reference';
import { formatBangladeshDate } from '../api/client';

const center = [23.7734, 90.3912];
const coords = { 'Block A':[23.77365,90.39085], 'Block B':[23.77315,90.39085], 'Block C':[23.77365,90.39155], 'Block D':[23.77315,90.39155] };
const pin = color => L.divIcon({ className: '', html: `<span style="display:block;width:18px;height:18px;border-radius:50%;background:${color};border:3px solid white;box-shadow:0 1px 5px #555"></span>`, iconSize:[18,18], iconAnchor:[9,9] });
export default function CampusMapPage() {
  const [items,setItems]=useState([]); const [hotspots,setHotspots]=useState([]); const [categories,setCategories]=useState([]); const [type,setType]=useState(''); const [categoryId,setCategoryId]=useState(''); const [status,setStatus]=useState(''); const [error,setError]=useState('');
  useEffect(()=>{ getMapItems({type,categoryId,status}).then(setItems).catch(e=>setError(e.message)); getMapHotspots().then(setHotspots).catch(()=>{}); getCategories().then(setCategories).catch(()=>{}); },[type,categoryId,status]);
  return <section className="page-container"><header className="page-header"><h1>Campus map</h1><p>Lost and found reports around AUST</p></header>
    <div style={{display:'flex',gap:10,marginBottom:12,flexWrap:'wrap'}}><select aria-label="Item type" value={type} onChange={e=>setType(e.target.value)}><option value="">All reports</option><option value="lost">Lost</option><option value="found">Found</option></select><select aria-label="Category" value={categoryId} onChange={e=>setCategoryId(e.target.value)}><option value="">All categories</option>{categories.map(x=><option key={x.id} value={x.id}>{x.name}</option>)}</select><select aria-label="Status" value={status} onChange={e=>setStatus(e.target.value)}><option value="">All statuses</option><option>Open</option><option>Available</option><option>Returned</option><option>Closed</option></select><Link className="btn btn-primary" to="/lost-items/new">Report lost</Link><Link className="btn btn-secondary" to="/found-items/new">Report found</Link></div>
    {error&&<p role="alert">{error}</p>}<div style={{height:'min(68vh,700px)',minHeight:400,borderRadius:16,overflow:'hidden'}}><MapContainer center={center} zoom={17} style={{height:'100%',width:'100%'}}><TileLayer attribution='&copy; OpenStreetMap contributors' url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
      {Object.entries(coords).map(([name,position])=><CircleMarker key={name} center={position} radius={8}><Popup>{name} <small>(approximate)</small></Popup></CircleMarker>)}
      {items.map(item=>{const position=coords[item.buildingName]||center;return <Marker key={`${item.type}-${item.id}`} position={position} icon={pin(item.type==='lost'?'#dc2626':'#16a34a')}><Popup><strong>{item.title}</strong><br/>{item.category} · {item.buildingName||item.locationName}<br/>{item.status} · {formatBangladeshDate(item.createdAt,{dateStyle:'medium'})}<br/><Link to={`/${item.type}-items/${item.id}`}>View item</Link></Popup></Marker>})}
    </MapContainer></div><p className="text-sm text-muted">Hotspots: {hotspots.map(x=>`${x.buildingName} (${x.count})`).join(' · ')||'No reports yet'}. Building positions are approximate.</p></section>;
}
