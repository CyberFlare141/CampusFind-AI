import { useCallback, useEffect, useState } from 'react';
import { Bar, BarChart, CartesianGrid, Cell, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { Alert, AnimatedNumber, EmptyState, PageLoading, SkeletonCard } from '../components/Ui';
import { formatBangladeshDate } from '../api/client';
import { getAnalytics } from '../api/adminAnalytics';

const STATUS_COLORS = ['#166534', '#0F766E', '#7C6CC4', '#dc2626', '#d97706'];
const RANGE_LABELS = { 1: 'Today', 7: 'Last 7 days', 30: 'Last 30 days', 90: 'Last 90 days', 365: 'Last year' };
const KPI_LABELS = { lost: 'Lost Reports', found: 'Found Reports', claims: 'Claims', returned: 'Returned Items', users: 'Users' };

export default function AdminAnalyticsPage() {
  const [overview, setOverview] = useState(null); const [items, setItems] = useState(null); const [claims, setClaims] = useState(null);
  const [locations, setLocations] = useState([]); const [users, setUsers] = useState(null); const [range, setRange] = useState('30');
  const [period, setPeriod] = useState(null); const [error, setError] = useState(''); const [loading, setLoading] = useState(true); const [exporting, setExporting] = useState(false);

  const load = useCallback(async () => {
    setLoading(true); setError('');
    const to = new Date(); const from = new Date(); from.setDate(from.getDate() - Number(range));
    const filters = { from: from.toISOString(), to: to.toISOString() };
    try {
      const [nextOverview, nextItems, nextClaims, nextLocations, nextUsers] = await Promise.all([
        getAnalytics('overview', filters), getAnalytics('items', filters), getAnalytics('claims', filters), getAnalytics('locations', filters), getAnalytics('users', filters),
      ]);
      setOverview(nextOverview); setItems(nextItems); setClaims(nextClaims); setLocations(nextLocations || []); setUsers(nextUsers); setPeriod({ from, to });
    } catch (err) { setError("Analytics couldn't be loaded. Please try again."); }
    finally { setLoading(false); }
  }, [range]);

  useEffect(() => { load(); }, [load]);

  async function exportCsv() {
    if (!items || !period || exporting) return;
    setExporting(true);
    try {
      const rows = [['Period', 'Lost Reports', 'Found Reports'], ...(items.monthly || []).map(row => [monthLabel(row), row.lost, row.found])];
      const csv = rows.map(row => row.map(csvCell).join(',')).join('\r\n');
      const link = document.createElement('a');
      link.href = URL.createObjectURL(new Blob([csv], { type: 'text/csv;charset=utf-8' }));
      link.download = `campusfind-analytics-${fileDate(period.from)}-to-${fileDate(period.to)}.csv`;
      link.click(); URL.revokeObjectURL(link.href);
    } finally { setExporting(false); }
  }

  const activityData = overview ? [{ label: 'Lost Reports', count: overview.lost || 0, color: '#d97706' }, { label: 'Found Reports', count: overview.found || 0, color: '#166534' }] : [];
  const categories = items?.categories || []; const statuses = claims?.status || [];
  const hasAnalyticsData = activityData.some(row => row.count > 0) || categories.length > 0 || statuses.length > 0 || locations.length > 0;

  if (loading && !overview) return <AnalyticsSkeleton />;
  return <section className="page-container admin-analytics-page">
    <header className="page-header analytics-header"><div><span className="eyebrow">Administration</span><h1>Platform Analytics</h1><p>CampusFind activity from the application database.</p></div></header>
    <div className="analytics-controls"><label htmlFor="analytics-range">Date range<select id="analytics-range" value={range} onChange={event => setRange(event.target.value)}><option value="1">Today</option><option value="7">Last 7 days</option><option value="30">Last 30 days</option><option value="90">Last 90 days</option><option value="365">Last year</option></select></label><button className="btn btn-secondary" onClick={exportCsv} disabled={!items || loading || exporting}>{exporting ? 'Exporting...' : 'Export CSV'}</button></div>
    {period && <p className="analytics-period"><strong>Selected period:</strong> {RANGE_LABELS[range]} · {formatPeriod(period)}</p>}
    {loading && <p className="analytics-refreshing" role="status">Updating analytics for the selected period...</p>}
    {error ? <div className="analytics-error"><Alert type="error">{error}</Alert><button className="btn btn-secondary" onClick={load}>Try again</button></div> : <>
      <AnalyticsSection title="Overview"><div className="analytics-kpis">{Object.entries(KPI_LABELS).map(([key, label]) => <MetricCard key={key} label={label} value={formatCount(overview?.[key])} animatedValue={overview?.[key]} />)}</div></AnalyticsSection>
      <AnalyticsSection title="Performance"><div className="analytics-secondary-kpis"><MetricCard label="Active Users" value={formatCount(users?.active)} animatedValue={users?.active} hint="Distinct users who signed in during this period" /><MetricCard label="Recovery Rate" value={formatPercent(claims?.recoveryRate)} hint="Returned claims out of completed claim decisions" /><MetricCard label="Avg. Resolution Time" value={formatResolution(claims?.averageResolutionHours, claims?.reviewedClaims)} hint="Claim created to security review decision" /></div></AnalyticsSection>
      {!hasAnalyticsData ? <EmptyState title="No activity for this period" message="Choose another date range to review CampusFind activity." /> : <>
        <AnalyticsSection title="Report Activity"><div className="analytics-charts"><ChartCard title="Lost vs Found Reports" emptyMessage="No report activity for this period." hasData={activityData.some(row => row.count > 0)} rows={activityData}><BarChart data={activityData}><CartesianGrid strokeDasharray="3 3" vertical={false} /><XAxis dataKey="label" /><YAxis allowDecimals={false} width={30} /><Tooltip formatter={value => [formatCount(value), 'Reports']} /><Bar dataKey="count" radius={[6, 6, 0, 0]}>{activityData.map(row => <Cell key={row.label} fill={row.color} />)}</Bar></BarChart></ChartCard><ChartCard title="Category Distribution" emptyMessage="No category data for this period." hasData={categories.length > 0} rows={categories}><BarChart data={categories} layout="vertical" margin={{ left: 12 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} /><Tooltip formatter={value => [formatCount(value), 'Reports']} /><Bar dataKey="count" fill="#0F766E" radius={[0, 6, 6, 0]} /></BarChart></ChartCard></div></AnalyticsSection>
        <AnalyticsSection title="Claims & Recovery"><div className="analytics-charts"><ChartCard title="Claim Status" emptyMessage="No claims for this period." hasData={statuses.length > 0} rows={statuses}><BarChart data={statuses} layout="vertical" margin={{ left: 12 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="status" width={100} tick={{ fontSize: 12 }} /><Tooltip formatter={value => [formatCount(value), 'Claims']} /><Bar dataKey="count" radius={[0, 6, 6, 0]}>{statuses.map((row, index) => <Cell key={row.status} fill={STATUS_COLORS[index % STATUS_COLORS.length]} />)}</Bar></BarChart></ChartCard><ChartCard title="Top Locations" emptyMessage="No location activity for this period. Try selecting a different date range." hasData={locations.length > 0} rows={locations}><BarChart data={locations} layout="vertical" margin={{ left: 12 }}><CartesianGrid strokeDasharray="3 3" horizontal={false} /><XAxis type="number" allowDecimals={false} /><YAxis type="category" dataKey="name" width={120} tick={{ fontSize: 12 }} /><Tooltip formatter={value => [formatCount(value), 'Reports']} /><Bar dataKey="count" fill="#7C6CC4" radius={[0, 6, 6, 0]} /></BarChart></ChartCard></div></AnalyticsSection>
      </>}
    </>}
  </section>;
}

function AnalyticsSection({ title, children }) { return <section className="analytics-section"><h2>{title}</h2>{children}</section>; }
function MetricCard({ label, value, animatedValue, hint }) { return <article className="card analytics-kpi"><span>{label}</span><strong>{animatedValue == null ? value : <AnimatedNumber value={animatedValue} formatter={formatCount} />}</strong>{hint && <small>{hint}</small>}</article>; }
function ChartCard({ title, emptyMessage, hasData, rows, children }) { return <article className="card analytics-chart"><h3>{title}</h3>{hasData ? <><div className="analytics-chart-canvas"><ResponsiveContainer width="100%" height="100%">{children}</ResponsiveContainer></div><ul className="analytics-chart-values">{rows.map(row => <li key={row.name || row.status || row.label}><span>{row.name || row.status || row.label}</span><strong>{formatCount(row.count)}</strong></li>)}</ul></> : <div className="analytics-chart-empty"><p>{emptyMessage}</p></div>}</article>; }
function AnalyticsSkeleton() { return <section className="page-container admin-analytics-page"><header className="page-header"><div><span className="eyebrow">Administration</span><h1>Platform Analytics</h1></div></header><div className="analytics-kpis">{Array.from({ length: 5 }, (_, index) => <SkeletonCard key={index} />)}</div></section>; }
function formatCount(value) { return new Intl.NumberFormat('en-BD').format(Number(value) || 0); }
function formatPercent(value) { const number = Number(value) || 0; return `${number.toLocaleString('en-BD', { maximumFractionDigits: 1 })}%`; }
function formatResolution(hours, reviewedClaims) { if (!reviewedClaims) return 'No reviewed claims'; const minutes = Math.round((Number(hours) || 0) * 60); if (minutes < 60) return `${minutes} min`; if (minutes < 48 * 60) return `${(minutes / 60).toLocaleString('en-BD', { maximumFractionDigits: 1 })} hr`; return `${(minutes / 1440).toLocaleString('en-BD', { maximumFractionDigits: 1 })} days`; }
function monthLabel(row) { return new Intl.DateTimeFormat('en-BD', { month: 'short', year: 'numeric', timeZone: 'Asia/Dhaka' }).format(new Date(Date.UTC(row.year, row.month - 1, 1))); }
function formatPeriod(period) { return `${formatBangladeshDate(period.from, { month: 'short', day: 'numeric' })} – ${formatBangladeshDate(period.to, { month: 'short', day: 'numeric', year: 'numeric' })}`; }
function fileDate(date) { return date.toISOString().slice(0, 10); }
function csvCell(value) { const text = String(value ?? ''); return /[",\r\n]/.test(text) ? `"${text.replaceAll('"', '""')}"` : text; }
