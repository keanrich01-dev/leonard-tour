import { useCallback, useEffect, useRef, useState } from 'react';
import {
  Activity, ArrowDownRight, ArrowLeft, ArrowRight, ArrowUpRight, BadgeCheck, Bell, BookOpen,
  CalendarDays, Check, CheckCircle2, ChevronDown, ChevronLeft, ChevronRight, CircleAlert,
  Clock3, Compass, CreditCard, Download, Eye, EyeOff, FileClock, Filter, Globe2, KeyRound,
  LayoutDashboard, LifeBuoy, LogOut, Menu, MessageCircle, MessageSquareText, MoreHorizontal,
  Package, Pencil, Plus, RefreshCw, Search, Shield, ShieldCheck, Sparkles, Star, TrendingUp,
  Users, Wallet, X, XCircle
} from 'lucide-react';
import './admin.css';

const API_BASE = (import.meta.env.VITE_API_BASE_URL || 'http://localhost:8000').replace(/\/$/, '');
const money = (value, currency = 'USD') => {
  const n = Number(value || 0);
  try { return new Intl.NumberFormat('en-US', { style: 'currency', currency, maximumFractionDigits: 0 }).format(n); }
  catch { return `${currency} ${n.toLocaleString()}`; }
};
const mediaUrl = (value) => {
  if (!value) return '';
  if (/^https?:\/\//i.test(value)) return value;
  if (value.startsWith('/media/')) return `${API_BASE}${value}`;
  if (value.startsWith('/')) return `${API_BASE}${value}`;
  return `${API_BASE}/media/${value.replace(/^\//, '')}`;
};
const dateText = (value, options = { day: 'numeric', month: 'short', year: 'numeric' }) => {
  if (!value) return '—';
  const d = new Date(value);
  return Number.isNaN(d.getTime()) ? '—' : new Intl.DateTimeFormat('en-GB', options).format(d);
};
const cap = (value = '') => String(value).replaceAll('_', ' ').replace(/\b\w/g, (m) => m.toUpperCase());
const errorMessage = (payload, fallback = 'Something went wrong. Please try again.') => {
  const detail = payload?.detail;
  if (Array.isArray(detail)) return detail.map((x) => x.msg || JSON.stringify(x)).join(' · ');
  return detail || payload?.message || fallback;
};

function StatusBadge({ value }) {
  const state = String(value || 'unknown').toLowerCase().replaceAll(' ', '_');
  return <span className={`mk-badge mk-badge-${state}`}>{cap(state)}</span>;
}
function Avatar({ name = 'Leonard Tour', size = 'md' }) {
  const initials = String(name).trim().split(/\s+/).slice(0, 2).map((s) => s[0]).join('').toUpperCase() || 'LT';
  return <span className={`mk-avatar mk-avatar-${size}`}>{initials}</span>;
}
function PageTitle({ eyebrow, title, description, actions }) {
  return <div className="mk-page-title"><div><div className="mk-eyebrow">{eyebrow}</div><h1>{title}</h1>{description && <p>{description}</p>}</div>{actions && <div className="mk-page-actions">{actions}</div>}</div>;
}

function tanzaniaGreetingPeriod() {
  const parts = new Intl.DateTimeFormat('en-GB', { timeZone: 'Africa/Dar_es_Salaam', hour: '2-digit', hourCycle: 'h23' }).formatToParts(new Date());
  const hour = Number(parts.find((part) => part.type === 'hour')?.value ?? 12);
  return hour < 12 ? 'morning' : hour < 17 ? 'afternoon' : 'evening';
}
function Loading({ label = 'Loading workspace' }) { return <div className="mk-loading"><span className="mk-spinner" />{label}</div>; }
function ErrorNotice({ children, onRetry }) { return <div className="mk-error"><CircleAlert size={18} /><span>{children}</span>{onRetry && <button onClick={onRetry}>Retry</button>}</div>; }
function EmptyState({ icon: Icon = Package, title, body }) { return <div className="mk-empty"><span><Icon size={23} /></span><h3>{title}</h3><p>{body}</p></div>; }
function Panel({ title, subtitle, action, children, className = '' }) {
  return <section className={`mk-panel ${className}`}><div className="mk-panel-head"><div><h2>{title}</h2>{subtitle && <p>{subtitle}</p>}</div>{action}</div>{children}</section>;
}
function SearchBox({ value, onChange, placeholder = 'Search records...' }) {
  return <label className="mk-search"><Search size={16} /><input value={value} onChange={(e) => onChange(e.target.value)} placeholder={placeholder} /></label>;
}
function IconButton({ title, onClick, children, disabled = false, danger = false }) {
  return <button className={`mk-icon-btn${danger ? ' is-danger' : ''}`} type="button" title={title} aria-label={title} onClick={onClick} disabled={disabled}>{children}</button>;
}

export default function AdminApp() {
  const csrfRef = useRef('');
  const [stage, setStage] = useState('checking');
  const [user, setUser] = useState(null);
  const [authEmail, setAuthEmail] = useState('');
  const [mfaSetup, setMfaSetup] = useState(null);
  const [recoveryCodes, setRecoveryCodes] = useState([]);
  const [authError, setAuthError] = useState('');
  const [view, setView] = useState(() => { const current = window.location.pathname.split('/')[2] || 'dashboard'; return current === 'login' ? 'dashboard' : current; });
  const [mobileNav, setMobileNav] = useState(false);
  const [toast, setToast] = useState(null);
  const bootStartedRef = useRef(false);

  const rememberCsrf = useCallback((value) => {
    csrfRef.current = value || '';
  }, []);

  const api = useCallback(async (path, options = {}) => {
    const method = (options.method || 'GET').toUpperCase();
    const headers = { Accept: 'application/json', ...(options.headers || {}) };
    if (options.body !== undefined && !(options.body instanceof FormData)) headers['Content-Type'] = 'application/json';
    if (!['GET', 'HEAD', 'OPTIONS'].includes(method) && csrfRef.current) headers['X-CSRF-Token'] = csrfRef.current;
    const response = await fetch(`${API_BASE}${path}`, {
      method, credentials: 'include', headers,
      body: options.body === undefined ? undefined : (options.body instanceof FormData ? options.body : JSON.stringify(options.body)),
    });
    const text = await response.text();
    let payload = null;
    try { payload = text ? JSON.parse(text) : null; } catch { payload = { detail: text || `HTTP ${response.status}` }; }
    if (!response.ok) throw new Error(errorMessage(payload, `Request failed (${response.status})`));
    return payload;
  }, []);

  const showToast = useCallback((message, kind = 'success') => {
    setToast({ message, kind });
    window.setTimeout(() => setToast(null), 3600);
  }, []);

  const startMfaSetup = useCallback(async () => {
    const data = await api('/api/admin/auth/mfa/setup', { method: 'POST', body: {} });
    setMfaSetup(data);
    setStage('setup');
  }, [api]);

  const loadMe = useCallback(async () => {
    const data = await api('/api/admin/auth/me');
    rememberCsrf(data.csrf_token);
    if (data.user?.mfa_verified) {
      setUser(data.user);
      setStage('app');
      if (['/admin', '/admin/', '/admin/login'].includes(window.location.pathname)) {
        window.history.replaceState({}, '', '/admin/dashboard');
        setView('dashboard');
      }
      return;
    }
    setAuthEmail(data.user?.email || '');
    if (data.user?.mfa_enabled) setStage('mfa');
    else await startMfaSetup();
  }, [api, rememberCsrf, startMfaSetup]);

  useEffect(() => {
    // React StrictMode replays effects during development. Keep the first in-flight
    // session check alive so the second replay cannot leave the screen stuck loading.
    if (bootStartedRef.current) return undefined;
    bootStartedRef.current = true;
    (async () => {
      try {
        const data = await api('/api/admin/auth/me');
        rememberCsrf(data.csrf_token);
        if (data.user?.mfa_verified) {
          setUser(data.user);
          setStage('app');
          if (['/admin', '/admin/', '/admin/login'].includes(window.location.pathname)) {
            window.history.replaceState({}, '', '/admin/dashboard');
          }
        } else if (data.user?.mfa_enabled) {
          setAuthEmail(data.user.email);
          setStage('mfa');
        } else {
          setAuthEmail(data.user?.email || '');
          await startMfaSetup();
        }
      } catch {
        setStage('login');
      }
    })();
    return undefined;
  }, [api, rememberCsrf, startMfaSetup]);

  useEffect(() => {
    const onPop = () => setView(window.location.pathname.split('/')[2] || 'dashboard');
    window.addEventListener('popstate', onPop);
    return () => window.removeEventListener('popstate', onPop);
  }, []);

  const navigate = (next) => {
    const target = `/admin/${next}`;
    if (window.location.pathname !== target) window.history.pushState({}, '', target);
    setView(next);
    setMobileNav(false);
  };

  const handleLogin = async (email, password) => {
    setAuthError('');
    try {
      const data = await api('/api/admin/auth/login', { method: 'POST', body: { email, password } });
      rememberCsrf(data.csrf_token);
      setAuthEmail(data.user?.email || email);
      if (data.mfa_required) setStage('mfa');
      else if (data.mfa_setup_required) await startMfaSetup();
      else await loadMe();
    } catch (error) { setAuthError(error.message); }
  };

  const handleMfa = async (code) => {
    setAuthError('');
    try {
      const data = await api('/api/admin/auth/mfa/verify', { method: 'POST', body: { code } });
      rememberCsrf(data.csrf_token);
      await loadMe();
    } catch (error) { setAuthError(error.message); }
  };

  const handleEnableMfa = async (code) => {
    setAuthError('');
    try {
      const data = await api('/api/admin/auth/mfa/enable', { method: 'POST', body: { code } });
      rememberCsrf(data.csrf_token);
      setRecoveryCodes(data.recovery_codes || []);
      setStage('recovery');
    } catch (error) { setAuthError(error.message); }
  };

  const finishRecovery = async () => {
    try { await loadMe(); navigate('dashboard'); }
    catch (error) { setAuthError(error.message); }
  };

  const logout = async () => {
    try { await api('/api/admin/auth/logout', { method: 'POST', body: {} }); } catch { /* Session may already have expired. */ }
    rememberCsrf(''); setUser(null); setStage('login'); setView('dashboard');
    window.history.replaceState({}, '', '/admin/login');
  };

  if (stage !== 'app' || !user) {
    return <AuthScreen stage={stage} email={authEmail} error={authError} onLogin={handleLogin}
      onVerify={handleMfa} onEnable={handleEnableMfa} setup={mfaSetup} recoveryCodes={recoveryCodes}
      onFinishRecovery={finishRecovery} />;
  }

  const permission = (name) => (user.permissions || []).includes(name);
  const navGroups = [
    { label: 'Workspace', items: [{ id: 'dashboard', label: 'Overview', icon: LayoutDashboard }] },
    { label: 'Insights', items: [{ id: 'reports', label: 'Reports', icon: TrendingUp, perm: 'reports.read' }] },
    { label: 'Operations', items: [
      { id: 'bookings', label: 'Bookings', icon: CalendarDays, perm: 'bookings.read' },
      { id: 'inquiries', label: 'Inquiries', icon: MessageSquareText, perm: 'inquiries.read' },
    ] },
    { label: 'Experience', items: [
      { id: 'packages', label: 'Safari packages', icon: Compass, perm: 'packages.read' },
      { id: 'payments', label: 'Payments', icon: Wallet, perm: 'payments.read' },
      { id: 'testimonials', label: 'Guest reviews', icon: Star, perm: 'testimonials.moderate' },
      { id: 'content', label: 'Blog CMS', icon: BookOpen, perm: 'blogs.manage' },
    ] },
    { label: 'Governance', items: [
      { id: 'team', label: 'Team & access', icon: Users, perm: 'users.manage' },
      { id: 'activity', label: 'Audit trail', icon: FileClock, perm: 'audit.read' },
      { id: 'settings', label: 'Security settings', icon: ShieldCheck },
    ] },
  ];
  const activeItem = navGroups.flatMap((g) => g.items).find((item) => item.id === view) || navGroups[0].items[0];

  return <div className="mk-admin-root">
    <aside className={`mk-sidebar${mobileNav ? ' is-open' : ''}`}>
      <div className="mk-brand"><span className="mk-brand-mark"><Compass size={23} /></span><span><strong>LEONARD</strong><small>TOUR <i>CONTROL</i></small></span></div>
      <div className="mk-workspace-label">COMPANY WORKSPACE</div>
      <div className="mk-workspace-card"><span className="mk-workspace-icon">M</span><span><strong>Leonard Tour</strong><small>Business workspace</small></span><ChevronDown size={14} /></div>
      <nav className="mk-side-nav" aria-label="Admin navigation">
        {navGroups.map((group) => <div className="mk-nav-group" key={group.label}>
          <div className="mk-nav-group-label">{group.label}</div>
          {group.items.filter((item) => !item.perm || permission(item.perm)).map((item) => {
            const Icon = item.icon;
            return <button key={item.id} className={`mk-nav-link${view === item.id ? ' is-active' : ''}${item.coming ? ' is-coming' : ''}`}
              onClick={() => navigate(item.id)}>
              <Icon size={17} strokeWidth={1.8} /><span>{item.label}</span>{item.coming && <em>SOON</em>}
              {item.id === 'inquiries' && <span className="mk-nav-dot" />}
            </button>;
          })}
        </div>)}
      </nav>
      <div className="mk-sidebar-bottom">
        <div className="mk-help-card"><span><LifeBuoy size={18} /></span><div><strong>Need a hand?</strong><small>Workspace support</small></div><ArrowUpRight size={14} /></div>
        <div className="mk-sidebar-user"><Avatar name="Leonard Tour Admin" /><span><strong>Leonard Tour Admin</strong><small>{cap(user.role)}</small></span><button onClick={logout} title="Sign out"><LogOut size={16} /></button></div>
      </div>
    </aside>

    <div className="mk-main-area">
      <header className="mk-topbar">
        <button className="mk-mobile-menu" onClick={() => setMobileNav((v) => !v)} aria-label="Toggle navigation"><Menu size={20} /></button>
        <div className="mk-breadcrumb"><span>Workspace</span><ChevronRight size={14} /><strong>{activeItem.label}</strong></div>
        <div className="mk-topbar-actions"><a className="mk-return-site" href="/" title="Return to website">View website <ArrowUpRight size={15} /></a><span className="mk-secure-indicator"><ShieldCheck size={14} /> Secure workspace</span>
          <button className="mk-top-icon" title="Notifications"><Bell size={18} /><i /></button>
          <div className="mk-top-user"><Avatar name="Leonard Tour Admin" size="sm" /><span><strong>Leonard Tour Admin</strong><small>{cap(user.role)}</small></span><ChevronDown size={14} /></div>
        </div>
      </header>
      <main className="mk-main-content">
        {view === 'dashboard' && <Dashboard api={api} navigate={navigate} user={user} />}
        {view === 'reports' && permission('reports.read') && <Reports api={api} />}
        {view === 'bookings' && permission('bookings.read') && <Bookings api={api} canWrite={permission('bookings.write')} showToast={showToast} />}
        {view === 'inquiries' && permission('inquiries.read') && <Inquiries api={api} canWrite={permission('inquiries.write')} showToast={showToast} />}
        {view === 'packages' && permission('packages.read') && <Packages api={api} canWrite={permission('packages.write')} showToast={showToast} />}
        {view === 'payments' && (user.permissions || []).includes('payments.read') && <Payments api={api} showToast={showToast} />}
        {view === 'testimonials' && permission('testimonials.moderate') && <Testimonials api={api} showToast={showToast} />}
        {view === 'team' && permission('users.manage') && <Team api={api} showToast={showToast} currentUserId={user.id} />}
        {view === 'activity' && permission('audit.read') && <ActivityLog api={api} />}
        {view === 'settings' && <SecuritySettings api={api} showToast={showToast} />}
        {view === 'content' && permission('blogs.manage') && <ContentStudio api={api} showToast={showToast} />}
        {({ reports: 'reports.read', bookings: 'bookings.read', inquiries: 'inquiries.read', packages: 'packages.read', payments: 'payments.read', testimonials: 'testimonials.moderate', content: 'blogs.manage', team: 'users.manage', activity: 'audit.read' })[view] && !permission(({ reports: 'reports.read', bookings: 'bookings.read', inquiries: 'inquiries.read', packages: 'packages.read', payments: 'payments.read', testimonials: 'testimonials.moderate', content: 'blogs.manage', team: 'users.manage', activity: 'audit.read' })[view]) && <EmptyState icon={ShieldCheck} title="Access restricted" body="Your staff role does not include permission to view this workspace section." />}
        {!['dashboard','reports','bookings','inquiries','packages','payments','testimonials','team','activity','settings','content'].includes(view) && <EmptyState icon={Compass} title="Page not found" body="Choose a section from the navigation to continue." />}
      </main>
      <footer className="mk-admin-footer"><span>© {new Date().getFullYear()} Leonard Tour</span><span><Shield size={13} /> Private company workspace <i /> Built for thoughtful travel</span></footer>
    </div>
    {mobileNav && <button className="mk-mobile-scrim" onClick={() => setMobileNav(false)} aria-label="Close navigation" />}
    {toast && <div className={`mk-toast mk-toast-${toast.kind}`}><CheckCircle2 size={17} />{toast.message}</div>}
  </div>;
}

function AuthScreen({ stage, email, error, onLogin, onVerify, onEnable, setup, recoveryCodes, onFinishRecovery }) {
  const [form, setForm] = useState({ email: email || '', password: '' });
  const [code, setCode] = useState('');
  const [busy, setBusy] = useState(false);
  useEffect(() => { if (email) setForm((v) => ({ ...v, email })); }, [email]);
  const submit = async (event) => {
    event.preventDefault(); setBusy(true);
    try {
      if (stage === 'login') await onLogin(form.email, form.password);
      if (stage === 'mfa') await onVerify(code.trim());
      if (stage === 'setup') await onEnable(code.trim());
    } finally { setBusy(false); }
  };
  if (stage === 'checking') return <div className="mk-auth-loading"><span className="mk-spinner" /><p>Securing your workspace…</p></div>;
  return <div className="mk-auth-screen"><div className="mk-auth-art"><div className="mk-auth-art-grid" /><div className="mk-auth-brand"><span><Compass size={25} /></span><div><strong>LEONARD</strong><small>TOUR</small></div></div>
    <div className="mk-auth-art-copy"><div className="mk-auth-kicker"><Sparkles size={14} /> PRIVATE COMPANY WORKSPACE</div><h1>Every journey,<br /><em>beautifully managed.</em></h1><p>One considered workspace for your guests, journeys, bookings and the people who make it all happen.</p><div className="mk-auth-art-foot"><span><ShieldCheck size={15} /> Protected access</span><span><Globe2 size={15} /> Tanzania · Worldwide</span></div></div>
    <div className="mk-auth-contour contour-one" /><div className="mk-auth-contour contour-two" /><div className="mk-auth-contour contour-three" />
  </div><div className="mk-auth-panel"><div className="mk-auth-panel-inner">
    <div className="mk-auth-small-brand"><span><Compass size={21} /></span><strong>Leonard <i>Tour Control</i></strong></div>
    {stage === 'recovery' ? <>
      <div className="mk-auth-step">SECURITY SETUP COMPLETE</div><h2>Save your recovery codes.</h2><p className="mk-auth-desc">These codes can each be used once if you lose access to your authenticator. They will not be shown again.</p>
      <div className="mk-recovery-grid">{recoveryCodes.map((item) => <code key={item}>{item}</code>)}</div>
      <button className="mk-primary-btn mk-full-btn" onClick={onFinishRecovery}>I have saved my codes <ArrowRight size={17} /></button>
    </> : stage === 'setup' ? <>
      <div className="mk-auth-step">ONE-TIME SECURITY ENROLMENT</div><h2>Protect your account.</h2><p className="mk-auth-desc">Add this account to Google Authenticator, Microsoft Authenticator or another TOTP app using the secret below.</p>
      <div className="mk-secret-box"><small>YOUR AUTHENTICATOR SECRET</small><strong>{setup?.secret || 'Preparing secret…'}</strong></div>
      <ol className="mk-auth-steps"><li>Open your authenticator app and add an account manually.</li><li>Enter the secret above and choose time-based verification.</li><li>Enter the current six-digit code to finish setup.</li></ol>
      <form onSubmit={submit}><label className="mk-field-label">AUTHENTICATOR CODE</label><input className="mk-input mk-code-input" inputMode="numeric" autoComplete="one-time-code" maxLength={6} value={code} onChange={(e) => setCode(e.target.value.replace(/\D/g, '').slice(0, 6))} placeholder="000000" required /><button className="mk-primary-btn mk-full-btn" disabled={busy || code.length !== 6}>{busy ? 'Verifying…' : 'Enable secure access'} <ArrowRight size={17} /></button></form>
    </> : stage === 'mfa' ? <>
      <div className="mk-auth-step">IDENTITY VERIFICATION</div><h2>Welcome back.</h2><p className="mk-auth-desc">Enter the six-digit code from your authenticator app to continue to the workspace.</p>
      <form onSubmit={submit}><label className="mk-field-label">AUTHENTICATOR OR RECOVERY CODE</label><input className="mk-input mk-code-input" autoFocus autoComplete="one-time-code" value={code} onChange={(e) => setCode(e.target.value.replace(/[^0-9A-Za-z-]/g, '').slice(0, 12))} placeholder="000000" required /><button className="mk-primary-btn mk-full-btn" disabled={busy || code.length < 6}>{busy ? 'Verifying…' : 'Verify and continue'} <ArrowRight size={17} /></button></form>
    </> : <>
      <div className="mk-auth-step">WELCOME TO YOUR WORKSPACE</div><h2>Sign in to manage<br />the extraordinary.</h2><p className="mk-auth-desc">Use your company staff account to access the Leonard Tour operations workspace.</p>
      <form onSubmit={submit} className="mk-login-form"><label className="mk-field-label">WORK EMAIL</label><input className="mk-input" type="email" autoComplete="username" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} placeholder="name@company.com" required /><label className="mk-field-label">PASSWORD</label><input className="mk-input" type="password" autoComplete="current-password" value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} placeholder="Enter your password" required /><div className="mk-login-meta"><span><ShieldCheck size={14} /> MFA protected</span><span>Authorised staff only</span></div><button className="mk-primary-btn mk-full-btn" disabled={busy}>{busy ? 'Signing in…' : 'Enter workspace'} <ArrowRight size={17} /></button></form>
    </>}
    {error && <div className="mk-auth-error"><CircleAlert size={16} />{error}</div>}
    <div className="mk-auth-bottom"><span>© {new Date().getFullYear()} Leonard Tour</span><span>Secure access <i /> Privacy protected</span></div>
  </div></div></div>;
}

function Dashboard({ api, navigate, user }) {
  const [data, setData] = useState(null); const [error, setError] = useState(''); const [busy, setBusy] = useState(true);
  const [greetingPeriod, setGreetingPeriod] = useState(tanzaniaGreetingPeriod);
  useEffect(() => {
    const timer = window.setInterval(() => setGreetingPeriod(tanzaniaGreetingPeriod()), 60000);
    return () => window.clearInterval(timer);
  }, []);
  const load = useCallback(async () => { setBusy(true); setError(''); try { setData(await api('/api/admin/overview')); } catch (e) { setError(e.message); } finally { setBusy(false); } }, [api]);
  useEffect(() => { load(); }, [load]);
  const stats = data ? [
    ['Total bookings', data.bookings_total, CalendarDays, 'bookings', 'bookings.read'],
    ['New inquiries', data.inquiries_new, MessageCircle, 'inquiries', 'inquiries.read'],
    ['Published packages', data.packages_published, Compass, 'packages', 'packages.read'],
    ['Pending payments', data.payments_pending, Wallet, 'payments', 'payments.read'],
  ].filter((item) => item[1] !== null) : [];
  const maxBookings = Math.max(1, ...(data?.bookings_by_month || []).map((x) => x.value));
  return <>
    <PageTitle eyebrow="YOUR BUSINESS AT A GLANCE" title={`Good ${greetingPeriod}, Leonard Tour Admin.`}
      description="A clear view of the journeys, guests and activity shaping Leonard Tour today."
      actions={<button className="mk-secondary-btn" onClick={load}><RefreshCw size={15} /> Refresh data</button>} />
    {error && <ErrorNotice onRetry={load}>{error}</ErrorNotice>}
    {busy && !data ? <Loading /> : <>
      <div className="mk-welcome-strip"><div className="mk-welcome-copy"><span className="mk-welcome-badge"><Sparkles size={13} /> YOUR OPERATIONS, IN SYNC</span><h2>Make every guest experience<br /><em>feel effortless.</em></h2><p>Stay close to your guests, keep journeys moving and make confident decisions from one place.</p></div><div className="mk-welcome-art"><div className="mk-sun" /><div className="mk-mountain mountain-a" /><div className="mk-mountain mountain-b" /><div className="mk-mountain mountain-c" /><div className="mk-welcome-caption"><span>01 / TANZANIA</span><strong>Wild by nature.<br />Thoughtful by design.</strong></div></div></div>
      <div className="mk-section-caption"><span>LIVE PERFORMANCE</span><small>Operational snapshot · {dateText(new Date(), { day: 'numeric', month: 'long', year: 'numeric' })}</small></div>
      <div className="mk-stat-grid">{stats.map(([label, value, Icon, target], i) => <button className={`mk-stat-card stat-${i}`} key={label} onClick={() => navigate(target)}><span className="mk-stat-icon"><Icon size={18} /></span><span className="mk-stat-label">{label}</span><strong>{Number(value).toLocaleString()}</strong><small>View details <ArrowUpRight size={12} /></small></button>)}</div>
      <div className="mk-dashboard-grid">
        {(user.permissions || []).includes('reports.read') && <Panel title="Booking momentum" subtitle="New bookings across the last six months" className="mk-chart-panel"><div className="mk-chart-topline"><strong>{data?.bookings_total ?? '—'}</strong><span>Total recorded bookings</span></div><div className="mk-bar-chart">{(data?.bookings_by_month || []).map((item) => <div className="mk-bar-item" key={item.month}><div className="mk-bar-value">{item.value}</div><div className="mk-bar-track"><span style={{ height: `${Math.max(4, (item.value / maxBookings) * 100)}%` }} /></div><small>{item.month}</small></div>)}</div></Panel>}
        {(user.permissions || []).includes('payments.read') && <Panel title="Payments received" subtitle="Verified gateway payments · separate currencies"><div className="mk-revenue-list">{(data?.revenue_received || []).length ? data.revenue_received.map((item) => <div className="mk-revenue-line" key={item.currency}><span className="mk-currency-chip">{item.currency}</span><strong>{money(item.amount, item.currency)}</strong><BadgeCheck size={17} /></div>) : <div className="mk-soft-empty"><Wallet size={22} /><span>Verified payment totals will appear here.</span></div>}</div><div className="mk-revenue-trends">{(data?.revenue_by_month || []).map((series) => { const peak = Math.max(1, ...series.months.map((x) => x.value)); return <div className="mk-revenue-series" key={series.currency}><div className="mk-revenue-series-head"><strong>{series.currency}</strong><small>Monthly verified receipts</small></div><div className="mk-mini-chart">{series.months.map((item) => <div key={item.month} title={`${series.currency} ${item.month}: ${item.value.toLocaleString()}`} style={{ height: `${Math.max(4, (item.value / peak) * 100)}%` }} />)}</div><div className="mk-mini-chart-labels">{series.months.map((item) => <small key={item.month}>{item.month}</small>)}</div></div>; })}</div></Panel>}
      </div>
      <div className="mk-dashboard-grid mk-dashboard-grid-lower">
        <Panel title="Recent bookings" subtitle="The latest guest activity" action={<button className="mk-text-btn" onClick={() => navigate('bookings')}>All bookings <ArrowRight size={14} /></button>}>
          {data?.recent_bookings?.length ? <div className="mk-list-rows">{data.recent_bookings.map((row) => <div className="mk-booking-row" key={row.id}><Avatar name={row.customer_name} size="sm" /><div className="mk-row-main"><strong>{row.customer_name}</strong><small>{row.reference} · {dateText(row.created_at || row.travel_date, { day: 'numeric', month: 'short' })}</small></div><div className="mk-row-end"><strong>{money(row.total, row.currency)}</strong><StatusBadge value={row.status} /></div></div>)}</div> : <EmptyState icon={CalendarDays} title="No bookings yet" body="New guest bookings will appear here as soon as they arrive." />}
        </Panel>
        {(user.permissions || []).includes('reports.read') && <Panel title="Most requested journeys" subtitle="Ranked by bookings to date" action={<button className="mk-text-btn" onClick={() => navigate('packages')}>View packages <ArrowRight size={14} /></button>}>
          {data?.popular_packages?.length ? <div className="mk-popular-list">{data.popular_packages.map((row, i) => <div className="mk-popular-row" key={row.id}><span className="mk-rank">0{i + 1}</span><div><strong>{row.title}</strong><small>{row.slug}</small></div><b>{row.bookings}</b></div>)}</div> : <EmptyState icon={Compass} title="Insights are taking shape" body="Package popularity will appear when bookings are recorded." />}
        </Panel>}
      </div>
      {data?.recent_activity?.length > 0 && <Panel title="Recent workspace activity" subtitle="Security and operational changes"><div className="mk-activity-list">{data.recent_activity.map((row) => <div className="mk-activity-row" key={row.id}><span><Activity size={15} /></span><div><strong>{cap(row.action)}</strong><small>{row.entity_type} {row.entity_id ? `#${row.entity_id}` : ''}</small></div><time>{dateText(row.created_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</time></div>)}</div></Panel>}
    </>}
  </>;
}


function Reports({ api }) {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try { setData(await api('/api/admin/overview')); }
    catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [api]);
  useEffect(() => { load(); }, [load]);
  const exportCsv = () => {
    if (!data) return;
    const rows = [['Report', 'Period', 'Metric', 'Value', 'Currency']];
    (data.bookings_by_month || []).forEach((item) => rows.push(['Bookings', item.month, 'New bookings', item.value, '']));
    (data.revenue_by_month || []).forEach((series) => series.months.forEach((item) => rows.push(['Verified revenue', item.month, 'Payments received', item.value, series.currency])));
    (data.revenue_received || []).forEach((item) => rows.push(['Verified revenue', 'All time', 'Total received', item.amount, item.currency]));
    (data.popular_packages || []).forEach((item, index) => rows.push(['Package performance', `Rank ${index + 1}`, item.title, item.bookings, 'Bookings']));
    const csv = rows.map((row) => row.map((cell) => `"${String(cell ?? '').replaceAll('"', '""')}"`).join(',')).join('\r\n');
    const blob = new Blob([`\uFEFF${csv}`], { type: 'text/csv;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    link.href = url; link.download = `leonard-tour-report-${new Date().toISOString().slice(0, 10)}.csv`;
    document.body.appendChild(link); link.click(); link.remove(); URL.revokeObjectURL(url);
  };
  const totalBookings = data?.bookings_total ?? 0;
  return <>
    <PageTitle eyebrow="BUSINESS INTELLIGENCE" title="Reports & insights"
      description="Review booking activity, verified receipts and the journeys guests are choosing. Financial figures remain separated by currency."
      actions={<><button className="mk-secondary-btn" onClick={load}><RefreshCw size={15} /> Refresh</button><button className="mk-primary-btn" onClick={exportCsv} disabled={!data}><Download size={15} /> Export CSV</button></>} />
    {error && <ErrorNotice onRetry={load}>{error}</ErrorNotice>}
    {loading && !data ? <Loading label="Preparing business reports" /> : <>
      <div className="mk-kpi-inline mk-report-kpis">
        <div><small>All bookings</small><strong>{Number(data?.bookings_total || 0).toLocaleString()}</strong></div>
        <div><small>Confirmed journeys</small><strong>{Number(data?.bookings_confirmed || 0).toLocaleString()}</strong></div>
        <div><small>Published packages</small><strong>{Number(data?.packages_published || 0).toLocaleString()}</strong></div>
        <div><small>Verified payments</small><strong>{Number(data?.payments_paid || 0).toLocaleString()}</strong></div>
      </div>
      <div className="mk-dashboard-grid">
        <Panel title="Booking activity" subtitle="New bookings recorded in each of the last six months">
          <div className="mk-report-months">{(data?.bookings_by_month || []).map((item) => <div className="mk-report-month" key={item.month}><span>{item.value}</span><div><i style={{ height: `${Math.max(3, item.value / Math.max(1, ...data.bookings_by_month.map((x) => x.value)) * 100)}%` }} /></div><small>{item.month}</small></div>)}</div>
          <p className="mk-report-caption">Current bookings recorded: <strong>{Number(totalBookings).toLocaleString()}</strong></p>
        </Panel>
        <Panel title="Verified receipts" subtitle="Gateway-confirmed payments only; each currency is shown independently">
          {(data?.revenue_received || []).length ? <div className="mk-revenue-list">{data.revenue_received.map((item) => <div className="mk-revenue-line" key={item.currency}><span className="mk-currency-chip">{item.currency}</span><strong>{money(item.amount, item.currency)}</strong><BadgeCheck size={17} /></div>)}</div> : <EmptyState icon={Wallet} title="No verified receipts yet" body="Confirmed payments will appear here after the provider verification succeeds." />}
        </Panel>
      </div>
      <div className="mk-dashboard-grid mk-dashboard-grid-lower mk-report-lower">
        {(data?.revenue_by_month || []).map((series) => <Panel key={series.currency} title={`${series.currency} monthly receipts`} subtitle="Monthly totals after gateway verification"><div className="mk-report-table">{series.months.map((item) => <div key={item.month}><span>{item.month}</span><strong>{money(item.value, series.currency)}</strong></div>)}</div></Panel>)}
        <Panel title="Most requested journeys" subtitle="Ranked by recorded bookings">{(data?.popular_packages || []).length ? <div className="mk-popular-list">{data.popular_packages.map((row, index) => <div className="mk-popular-row" key={row.id}><span className="mk-rank">0{index + 1}</span><div><strong>{row.title}</strong><small>{row.slug}</small></div><b>{row.bookings}</b></div>)}</div> : <EmptyState icon={Compass} title="Not enough data yet" body="Package ranking appears as bookings are recorded." />}</Panel>
      </div>
    </>}
  </>;
}

function Bookings({ api, canWrite, showToast }) {
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const [status, setStatus] = useState('all'); const [search, setSearch] = useState(''); const [selected, setSelected] = useState(null); const [detail, setDetail] = useState(null);
  const load = useCallback(async () => { setLoading(true); setError(''); try { const path = `/api/admin/bookings?limit=200${status !== 'all' ? `&status=${status}` : ''}`; setRows(await api(path)); } catch (e) { setError(e.message); } finally { setLoading(false); } }, [api, status]);
  useEffect(() => { load(); }, [load]);
  const open = async (row) => { setSelected(row); setDetail(null); try { setDetail(await api(`/api/admin/bookings/${row.id}`)); } catch (e) { setError(e.message); } };
  const filtered = rows.filter((row) => `${row.reference} ${row.customer_name} ${row.customer_email}`.toLowerCase().includes(search.toLowerCase()));
  const save = async (payload) => { try { const updated = await api(`/api/admin/bookings/${detail.id}`, { method: 'PATCH', body: payload }); setRows((items) => items.map((x) => x.id === updated.id ? { ...x, ...updated } : x)); setDetail(updated); setSelected(updated); updated.warning ? showToast(updated.warning, 'error') : showToast('Booking details updated.'); load(); } catch (e) { showToast(e.message, 'error'); } };
  return <>
    <PageTitle eyebrow="GUEST OPERATIONS" title="Bookings" description="Keep every guest journey organised, from first reservation to final departure." actions={<button className="mk-secondary-btn" onClick={load}><RefreshCw size={15} /> Refresh</button>} />
    <div className="mk-kpi-inline"><div><small>All bookings</small><strong>{rows.length}</strong></div><div><small>Pending</small><strong>{rows.filter((x) => x.status === 'pending').length}</strong></div><div><small>Confirmed</small><strong>{rows.filter((x) => x.status === 'confirmed').length}</strong></div></div>
    <Panel title="Booking register" subtitle="Select a booking to inspect the guest and payment details" action={<span className="mk-live-label"><i /> LIVE DATABASE</span>}>
      <div className="mk-table-toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Search reference, guest or email" /><div className="mk-filter-wrap"><Filter size={14} /><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All statuses</option><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select></div></div>
      {error && <ErrorNotice onRetry={load}>{error}</ErrorNotice>}
      {loading ? <Loading label="Loading bookings" /> : filtered.length ? <div className="mk-table-scroll"><table className="mk-table"><thead><tr><th>Booking reference</th><th>Guest</th><th>Travel date</th><th>Guests</th><th>Booking value</th><th>Status</th><th /></tr></thead><tbody>{filtered.map((row) => <tr key={row.id} onClick={() => open(row)} className="mk-click-row"><td><strong className="mk-reference">{row.reference}</strong><small className="mk-cell-sub">Created {dateText(row.created_at)}</small></td><td><div className="mk-guest-cell"><Avatar name={row.customer_name} size="xs" /><span><strong>{row.customer_name}</strong><small>{row.customer_email}</small></span></div></td><td>{dateText(row.travel_date, { day: 'numeric', month: 'short', year: 'numeric' })}</td><td>{row.adults} adults{row.children ? ` · ${row.children} children` : ''}</td><td><strong>{money(row.total, row.currency)}</strong><small className="mk-cell-sub">Paid {money(row.paid, row.currency)}</small></td><td><StatusBadge value={row.status} /></td><td><ChevronRight size={16} /></td></tr>)}</tbody></table></div> : <EmptyState icon={CalendarDays} title="No bookings match" body="Try another status or search term." />}
    </Panel>
    {detail && selected && <BookingDrawer row={detail} canWrite={canWrite} onClose={() => { setSelected(null); setDetail(null); }} onSave={save} />}
  </>;
}

function BookingDrawer({ row, canWrite, onClose, onSave }) {
  const [status, setStatus] = useState(row.status); const [notes, setNotes] = useState(row.notes || ''); const [busy, setBusy] = useState(false);
  const total = Number(row.total || 0); const paid = Number(row.paid || 0);
  const submit = async () => { setBusy(true); await onSave({ status, notes }); setBusy(false); };
  return <div className="mk-drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><aside className="mk-drawer"><div className="mk-drawer-head"><div><small>BOOKING DETAIL</small><h2>{row.reference}</h2></div><IconButton title="Close" onClick={onClose}><X size={18} /></IconButton></div>
    <div className="mk-drawer-scroll"><div className="mk-detail-status"><StatusBadge value={row.status} /><span>Created {dateText(row.created_at)}</span></div>
      <div className="mk-detail-block"><h3>Guest information</h3><div className="mk-detail-grid"><div><small>Full name</small><strong>{row.customer_name}</strong></div><div><small>Email</small><strong>{row.customer_email}</strong></div><div><small>Phone / WhatsApp</small><strong>{row.customer_phone || '—'}</strong></div><div><small>Country</small><strong>{row.country || '—'}</strong></div></div></div>
      <div className="mk-detail-block"><h3>Journey details</h3><div className="mk-detail-grid"><div><small>Travel date</small><strong>{dateText(row.travel_date)}</strong></div><div><small>Travellers</small><strong>{row.adults} adults · {row.children} children</strong></div><div><small>Currency</small><strong>{row.currency}</strong></div><div><small>Package ID</small><strong>#{row.package_id}</strong></div></div></div>
      <div className="mk-payment-summary"><div><span>Total booking value</span><strong>{money(total, row.currency)}</strong></div><div><span>Verified payments</span><strong className="is-green">{money(paid, row.currency)}</strong></div><div><span>Balance outstanding</span><strong>{money(Math.max(0, total - paid), row.currency)}</strong></div><div className="mk-progress"><span style={{ width: `${total > 0 ? Math.min(100, paid / total * 100) : 0}%` }} /></div></div>
      {row.payments?.length > 0 && <div className="mk-detail-block"><h3>Payment attempts</h3>{row.payments.map((p) => <div className="mk-payment-attempt" key={p.id}><span><strong>{cap(p.kind)}</strong><small>{p.provider} · {p.method || 'Method pending'}</small></span><span><strong>{money(p.amount, p.currency)}</strong><StatusBadge value={p.status} /></span></div>)}</div>}
      <div className="mk-detail-block"><h3>Internal operations</h3>{canWrite ? <><label className="mk-field-label">BOOKING STATUS</label><select className="mk-input" value={status} onChange={(e) => setStatus(e.target.value)}><option value="pending">Pending</option><option value="confirmed">Confirmed</option><option value="completed">Completed</option><option value="cancelled">Cancelled</option></select><label className="mk-field-label">INTERNAL NOTES</label><textarea className="mk-input mk-textarea" value={notes} onChange={(e) => setNotes(e.target.value)} placeholder="Add a private operational note…" /></> : <p className="mk-readonly-note">You have view-only access to this booking.</p>}</div>
    </div>{canWrite && <div className="mk-drawer-foot"><button className="mk-secondary-btn" onClick={onClose}>Close</button><button className="mk-primary-btn" onClick={submit} disabled={busy}>{busy ? 'Saving…' : 'Save changes'} <Check size={16} /></button></div>}</aside></div>;
}

function Inquiries({ api, canWrite, showToast }) {
  const [rows, setRows] = useState([]); const [status, setStatus] = useState('all'); const [search, setSearch] = useState(''); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [selected, setSelected] = useState(null);
  const load = useCallback(async () => { setLoading(true); setError(''); try { const params = new URLSearchParams({ limit: '200' }); if (status !== 'all') params.set('status', status); if (search.trim()) params.set('q', search.trim()); setRows(await api(`/api/admin/inquiries?${params}`)); } catch (e) { setError(e.message); } finally { setLoading(false); } }, [api, status, search]);
  useEffect(() => { const t = setTimeout(load, 180); return () => clearTimeout(t); }, [load]);
  const updateStatus = async (row, next) => { try { await api(`/api/admin/inquiries/${row.id}`, { method: 'PATCH', body: { status: next } }); showToast(`Inquiry marked ${cap(next).toLowerCase()}.`); load(); setSelected(null); } catch (e) { showToast(e.message, 'error'); } };
  return <><PageTitle eyebrow="GUEST RELATIONSHIPS" title="Inquiries" description="Turn curious travellers into confident guests with clear, timely follow-up." actions={<button className="mk-secondary-btn" onClick={load}><RefreshCw size={15} /> Refresh</button>} />
    <Panel title="Guest enquiries" subtitle="Messages submitted through the website" action={<span className="mk-live-label"><i /> LIVE DATABASE</span>}>
      <div className="mk-table-toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Search guest, email or message" /><div className="mk-filter-wrap"><Filter size={14} /><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All enquiries</option><option value="new">New</option><option value="in_progress">In progress</option><option value="replied">Replied</option><option value="converted">Converted</option><option value="closed">Closed</option></select></div></div>
      {error && <ErrorNotice onRetry={load}>{error}</ErrorNotice>}
      {loading ? <Loading label="Loading enquiries" /> : rows.length ? <div className="mk-table-scroll"><table className="mk-table"><thead><tr><th>Guest</th><th>Interested in</th><th>Language</th><th>Travellers</th><th>Received</th><th>Status</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.id} className="mk-click-row" onClick={() => setSelected(row)}><td><div className="mk-guest-cell"><Avatar name={row.name} size="xs" /><span><strong>{row.name}</strong><small>{row.email}</small></span></div></td><td>{row.package_title || 'General enquiry'}</td><td><span className="mk-category-pill">{String(row.language || 'en').toUpperCase()}</span></td><td>{row.travelers || '—'}</td><td>{dateText(row.created_at)}</td><td><StatusBadge value={row.status} /></td><td><ChevronRight size={16} /></td></tr>)}</tbody></table></div> : <EmptyState icon={MessageSquareText} title="No enquiries found" body="New website enquiries will arrive here for your team to follow up." />}
    </Panel>
    {selected && <div className="mk-drawer-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setSelected(null)}><aside className="mk-drawer"><div className="mk-drawer-head"><div><small>GUEST ENQUIRY #{selected.id}</small><h2>{selected.name}</h2></div><IconButton title="Close" onClick={() => setSelected(null)}><X size={18} /></IconButton></div><div className="mk-drawer-scroll"><div className="mk-detail-status"><StatusBadge value={selected.status} /><span>{dateText(selected.created_at)}</span></div><div className="mk-detail-block"><h3>Contact details</h3><div className="mk-detail-grid"><div><small>Email</small><strong>{selected.email}</strong></div><div><small>WhatsApp</small><strong>{selected.whatsapp || '—'}</strong></div><div><small>Country</small><strong>{selected.country || '—'}</strong></div><div><small>Language</small><strong>{String(selected.language || 'en').toUpperCase()}</strong></div><div><small>Travellers</small><strong>{selected.travelers || '—'}</strong></div></div></div><div className="mk-detail-block"><h3>Journey of interest</h3><strong>{selected.package_title || 'General enquiry'}</strong></div><div className="mk-message-card"><small>MESSAGE FROM GUEST</small><p>{selected.message}</p></div>{canWrite && <div className="mk-detail-block"><h3>Update follow-up stage</h3><div className="mk-status-actions">{['in_progress','replied','converted','closed'].map((next) => <button key={next} className={`mk-status-action${selected.status === next ? ' is-current' : ''}`} onClick={() => updateStatus(selected, next)}>{cap(next)}</button>)}</div></div>}</div><div className="mk-drawer-foot"><a className="mk-secondary-btn" href={`mailto:${encodeURIComponent(selected.email)}?subject=${encodeURIComponent('Your Leonard Tour enquiry')}`}><MessageCircle size={15} /> Reply by email</a><button className="mk-primary-btn" onClick={() => setSelected(null)}>Done <Check size={16} /></button></div></aside></div>}
  </>;
}

function blankPackage() {
  return { slug: '', category: 'safari', type: 'camping', duration_days: 6, title: '', badge: '',
    hero_image: '', gallery_images: [], price_from_usd: '', price_from_tzs: '', sort_order: 0,
    is_published: false, route: '', overview: '', destinations: [], itinerary: [], inclusions: [],
    exclusions: [], child_pricing_rules: {}, pricing_options: [] };
}
function PackageEditor({ initial, api, onClose, onSaved, showToast }) {
  const [draft, setDraft] = useState(() => ({ ...blankPackage(), ...(initial || {}),
    gallery_images: initial?.gallery_images || [], destinations: initial?.destinations || [],
    itinerary: initial?.itinerary || [], inclusions: initial?.inclusions || [],
    exclusions: initial?.exclusions || [], pricing_options: initial?.pricing_options || [] }));
  const [saving, setSaving] = useState(false); const [uploading, setUploading] = useState(false); const [error, setError] = useState('');
  const set = (key, value) => setDraft((v) => ({ ...v, [key]: value }));
  const upload = async (files, gallery = false) => {
    if (!files?.length) return;
    setUploading(true); setError('');
    try {
      const paths = [];
      for (const file of Array.from(files)) {
        const form = new FormData(); form.append('file', file);
        const result = await api('/api/admin/packages/media', { method: 'POST', body: form });
        paths.push(result.path);
      }
      if (gallery) set('gallery_images', [...draft.gallery_images, ...paths]);
      else set('hero_image', paths[0]);
      showToast(`${paths.length} image${paths.length > 1 ? 's' : ''} uploaded.`);
    } catch (e) { setError(e.message); }
    finally { setUploading(false); }
  };
  const updateDay = (index, key, value) => setDraft((v) => ({ ...v, itinerary: v.itinerary.map((day, i) => i === index ? { ...day, [key]: value } : day) }));
  const addDay = () => setDraft((v) => ({ ...v, itinerary: [...v.itinerary, { day: v.itinerary.length + 1, title: '', description: '' }] }));
  const removeDay = (index) => setDraft((v) => ({ ...v, itinerary: v.itinerary.filter((_, i) => i !== index).map((day, i) => ({ ...day, day: i + 1 })) }));
  const addTier = () => setDraft((v) => ({ ...v, pricing_options: [...v.pricing_options, { currency: 'USD', pax_min: 1, pax_max: null, amount_per_person: '' }] }));
  const updateTier = (index, key, value) => setDraft((v) => ({ ...v, pricing_options: v.pricing_options.map((tier, i) => i === index ? { ...tier, [key]: value } : tier) }));
  const removeTier = (index) => setDraft((v) => ({ ...v, pricing_options: v.pricing_options.filter((_, i) => i !== index) }));
  const save = async (event) => {
    event.preventDefault(); setSaving(true); setError('');
    const payload = { ...draft,
      badge: draft.badge || null, hero_image: draft.hero_image || null,
      price_from_usd: draft.price_from_usd === '' ? null : draft.price_from_usd,
      price_from_tzs: draft.price_from_tzs === '' ? null : draft.price_from_tzs,
      pricing_options: draft.pricing_options.filter((x) => x.amount_per_person !== '' && Number(x.pax_min) > 0).map((x) => ({
        ...x, pax_min: Number(x.pax_min), pax_max: x.pax_max === '' || x.pax_max === null ? null : Number(x.pax_max),
      })),
    };
    try {
      const result = initial?.id
        ? await api(`/api/admin/packages/${initial.id}`, { method: 'PATCH', body: payload })
        : await api('/api/admin/packages', { method: 'POST', body: payload });
      showToast(initial?.id ? 'Package changes saved.' : 'New package created as a draft.');
      onSaved(result);
    } catch (e) { setError(e.message); }
    finally { setSaving(false); }
  };
  const lines = (items) => (items || []).join('\n');
  return <div className="mk-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && onClose()}><form className="mk-modal mk-package-modal" onSubmit={save}>
    <div className="mk-package-editor-head"><div><small>{initial?.id ? `PACKAGE EDITOR · #${initial.id}` : 'PACKAGE EDITOR · NEW JOURNEY'}</small><h2>{initial?.id ? 'Refine this journey' : 'Create a new journey'}</h2><p>One well-maintained package becomes a clear promise to every guest.</p></div><IconButton title="Close editor" onClick={onClose}><X size={18} /></IconButton></div>
    {error && <div className="mk-inline-error mk-package-error">{error}</div>}
    <div className="mk-editor-section"><div className="mk-editor-section-title"><span>01</span><div><strong>Journey identity</strong><small>The details guests see across the website.</small></div></div>
      <div className="mk-editor-grid"><div className="mk-editor-wide"><label className="mk-field-label">PACKAGE TITLE</label><input className="mk-input" value={draft.title} onChange={(e) => set('title', e.target.value)} required minLength={2} /></div>
        <div><label className="mk-field-label">URL SLUG</label><input className="mk-input" value={draft.slug} onChange={(e) => set('slug', e.target.value.toLowerCase().replace(/[^a-z0-9-]/g, '-'))} required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" /></div>
        <div><label className="mk-field-label">CATEGORY</label><select className="mk-input" value={draft.category} onChange={(e) => set('category', e.target.value)}><option value="safari">Safari</option><option value="climbing">Climbing</option><option value="beach">Island / Beach</option></select></div>
        <div><label className="mk-field-label">PACKAGE TYPE</label><input className="mk-input" value={draft.type} onChange={(e) => set('type', e.target.value)} required /></div>
        <div><label className="mk-field-label">DURATION (DAYS)</label><input className="mk-input" type="number" min="1" max="90" value={draft.duration_days} onChange={(e) => set('duration_days', Number(e.target.value))} required /></div>
        <div><label className="mk-field-label">BADGE</label><input className="mk-input" placeholder="FEATURED / POPULAR" value={draft.badge || ''} onChange={(e) => set('badge', e.target.value)} /></div>
        <div><label className="mk-field-label">DISPLAY ORDER</label><input className="mk-input" type="number" min="0" value={draft.sort_order} onChange={(e) => set('sort_order', Number(e.target.value))} /></div>
        <div className="mk-editor-wide"><label className="mk-field-label">SHORT ROUTE / DESTINATION LINE</label><input className="mk-input" value={draft.route || ''} onChange={(e) => set('route', e.target.value)} placeholder="Arusha · Tarangire · Serengeti" /></div>
        <div className="mk-editor-wide"><label className="mk-field-label">OVERVIEW</label><textarea className="mk-input mk-textarea mk-editor-overview" value={draft.overview || ''} onChange={(e) => set('overview', e.target.value)} placeholder="Describe the experience, its rhythm and what makes this journey distinctive…" /></div>
        <div className="mk-editor-wide"><label className="mk-field-label">DESTINATIONS · ONE PER LINE</label><textarea className="mk-input mk-editor-lines" value={lines(draft.destinations)} onChange={(e) => set('destinations', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))} placeholder={'Tarangire National Park\nSerengeti National Park'} /></div>
      </div>
    </div>
    <div className="mk-editor-section"><div className="mk-editor-section-title"><span>02</span><div><strong>Photography</strong><small>Use original, correctly licensed destination images.</small></div></div>
      <div className="mk-editor-grid"><div className="mk-editor-wide"><label className="mk-field-label">HERO IMAGE PATH</label><div className="mk-upload-row"><input className="mk-input" value={draft.hero_image || ''} onChange={(e) => set('hero_image', e.target.value)} placeholder="/media/packages/your-image.jpg" /><label className="mk-upload-btn">{uploading ? 'Uploading…' : 'Upload image'}<input type="file" accept="image/jpeg,image/png,image/webp" onChange={(e) => upload(e.target.files)} disabled={uploading} /></label></div>{draft.hero_image && <div className="mk-image-preview"><img src={mediaUrl(draft.hero_image)} alt="Package hero preview" onError={(e) => { e.currentTarget.style.display = 'none'; }} /><span>{draft.hero_image}</span></div>}</div>
        <div className="mk-editor-wide"><label className="mk-field-label">GALLERY IMAGES · ONE PATH PER LINE</label><textarea className="mk-input mk-editor-lines" value={lines(draft.gallery_images)} onChange={(e) => set('gallery_images', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))} placeholder={'/media/packages/gallery-1.jpg\nhttps://example.com/image-2.jpg'} /><label className="mk-upload-btn mk-upload-inline">Add gallery photos<input type="file" multiple accept="image/jpeg,image/png,image/webp" onChange={(e) => upload(e.target.files, true)} disabled={uploading} /></label></div>
      </div>
    </div>
    <div className="mk-editor-section"><div className="mk-editor-section-title"><span>03</span><div><strong>Day-by-day itinerary</strong><small>Each day is unique to this package. Keep the details specific and accurate.</small></div><button type="button" className="mk-small-action" onClick={addDay}><Plus size={13} /> Add day</button></div>
      <div className="mk-itinerary-editor">{draft.itinerary.length ? draft.itinerary.map((day, index) => <div className="mk-itinerary-edit-card" key={`${day.day || index}-${index}`}><div className="mk-itinerary-edit-top"><span>DAY {index + 1}</span><button type="button" className="mk-remove-link" onClick={() => removeDay(index)}>Remove</button></div><div className="mk-editor-grid"><div className="mk-editor-wide"><label className="mk-field-label">DAY TITLE</label><input className="mk-input" value={day.title || ''} onChange={(e) => updateDay(index, 'title', e.target.value)} placeholder="Arrival in Arusha" /></div><div className="mk-editor-wide"><label className="mk-field-label">DAY DESCRIPTION</label><textarea className="mk-input mk-editor-lines" value={day.description || ''} onChange={(e) => updateDay(index, 'description', e.target.value)} placeholder="Describe the activities, travel and experience for this day…" /></div></div></div>) : <div className="mk-itinerary-empty">No itinerary days yet. Add the actual day-by-day plan for this package.</div>}</div>
    </div>
    <div className="mk-editor-section"><div className="mk-editor-section-title"><span>04</span><div><strong>Pricing & inclusions</strong><small>Prices are per person and stored by currency and group size.</small></div></div>
      <div className="mk-editor-grid"><div><label className="mk-field-label">FROM PRICE · USD</label><input className="mk-input" type="number" min="0" step="0.01" value={draft.price_from_usd ?? ''} onChange={(e) => set('price_from_usd', e.target.value)} /></div><div><label className="mk-field-label">FROM PRICE · TZS</label><input className="mk-input" type="number" min="0" step="1" value={draft.price_from_tzs ?? ''} onChange={(e) => set('price_from_tzs', e.target.value)} /></div>
        <div className="mk-editor-wide"><div className="mk-tier-heading"><label className="mk-field-label">GROUP-SIZE PRICE TIERS</label><button type="button" className="mk-text-btn" onClick={addTier}><Plus size={13} /> Add tier</button></div>{draft.pricing_options.map((tier, index) => <div className="mk-tier-row" key={index}><select className="mk-input" value={tier.currency} onChange={(e) => updateTier(index, 'currency', e.target.value)}><option>USD</option><option>TZS</option><option>EUR</option></select><input className="mk-input" type="number" min="1" value={tier.pax_min} onChange={(e) => updateTier(index, 'pax_min', e.target.value)} aria-label="Minimum travellers" /><input className="mk-input" type="number" min="1" value={tier.pax_max ?? ''} onChange={(e) => updateTier(index, 'pax_max', e.target.value)} placeholder="No max" aria-label="Maximum travellers" /><input className="mk-input" type="number" min="0.01" step="0.01" value={tier.amount_per_person} onChange={(e) => updateTier(index, 'amount_per_person', e.target.value)} placeholder="Per person" aria-label="Per person price" /><button type="button" className="mk-icon-btn" onClick={() => removeTier(index)} title="Remove tier"><X size={15} /></button></div>)}{!draft.pricing_options.length && <p className="mk-form-hint">No group-size tiers configured. The package may be quoted as tailor-made.</p>}</div>
        <div><label className="mk-field-label">INCLUSIONS · ONE PER LINE</label><textarea className="mk-input mk-editor-lines" value={lines(draft.inclusions)} onChange={(e) => set('inclusions', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))} /></div><div><label className="mk-field-label">EXCLUSIONS · ONE PER LINE</label><textarea className="mk-input mk-editor-lines" value={lines(draft.exclusions)} onChange={(e) => set('exclusions', e.target.value.split('\n').map((x) => x.trim()).filter(Boolean))} /></div>
      </div>
    </div>
    <div className="mk-editor-publish"><label><input type="checkbox" checked={Boolean(draft.is_published)} onChange={(e) => set('is_published', e.target.checked)} /><span><strong>Publish this package</strong><small>Only publish when the overview, images, pricing and itinerary have been reviewed.</small></span></label><span className={`mk-badge ${draft.is_published ? 'mk-badge-published' : 'mk-badge-draft'}`}>{draft.is_published ? 'Visible on website' : 'Saved as draft'}</span></div>
    <div className="mk-package-editor-foot"><button type="button" className="mk-secondary-btn" onClick={onClose}>Cancel</button><button className="mk-primary-btn" disabled={saving || uploading}>{saving ? 'Saving package…' : 'Save package'} <Check size={15} /></button></div>
  </form></div>;
}

function Packages({ api, canWrite, showToast }) {
  const [rows, setRows] = useState([]); const [search, setSearch] = useState(''); const [category, setCategory] = useState('all'); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [editor, setEditor] = useState(undefined);
  const load = useCallback(async () => { setLoading(true); setError(''); try { setRows(await api('/api/admin/packages?limit=300')); } catch (e) { setError(e.message); } finally { setLoading(false); } }, [api]);
  useEffect(() => { load(); }, [load]);
  const categories = [...new Set(rows.map((x) => x.category))];
  const filtered = rows.filter((row) => (category === 'all' || row.category === category) && `${row.title} ${row.slug} ${row.type}`.toLowerCase().includes(search.toLowerCase()));
  const openEditor = async (row) => {
    if (!row) { setEditor(null); return; }
    try { setEditor(await api(`/api/admin/packages/${row.id}`)); }
    catch (e) { showToast(e.message, 'error'); }
  };
  const saved = () => { setEditor(undefined); load(); };
  return <><PageTitle eyebrow="TRAVEL PRODUCT CATALOGUE" title="Safari packages" description="Create and maintain the journeys presented to guests across safaris, mountain climbs and island escapes."
      actions={<>{canWrite && <button className="mk-primary-btn" onClick={() => setEditor(null)}><Plus size={16} /> New package</button>}<button className="mk-secondary-btn" onClick={load}><RefreshCw size={15} /> Refresh</button></>} />
    <div className="mk-kpi-inline"><div><small>Total packages</small><strong>{rows.length}</strong></div><div><small>Published</small><strong>{rows.filter((x) => x.is_published).length}</strong></div><div><small>Draft / hidden</small><strong>{rows.filter((x) => !x.is_published).length}</strong></div></div>
    <Panel title="Package inventory" subtitle="Live records from the Leonard Tour database" action={<span className="mk-live-label"><i /> DATABASE CONNECTED</span>}><div className="mk-table-toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Find a package by title or slug" /><div className="mk-filter-wrap"><Filter size={14} /><select value={category} onChange={(e) => setCategory(e.target.value)}><option value="all">All categories</option>{categories.map((item) => <option key={item} value={item}>{cap(item)}</option>)}</select></div></div>{error && <ErrorNotice onRetry={load}>{error}</ErrorNotice>}{loading ? <Loading label="Loading package catalogue" /> : filtered.length ? <div className="mk-table-scroll"><table className="mk-table"><thead><tr><th>Journey</th><th>Category</th><th>Duration</th><th>Itinerary</th><th>Starting price</th><th>Website status</th><th>Manage</th></tr></thead><tbody>{filtered.map((row) => <tr key={row.id}><td><div className="mk-package-cell">{row.hero_image ? <img src={mediaUrl(row.hero_image)} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <span className="mk-package-placeholder"><Compass size={18} /></span>}<span><strong>{row.title}</strong><small>{row.slug}</small></span></div></td><td><span className="mk-category-pill">{cap(row.category)}</span></td><td>{row.duration_days} days</td><td>{row.itinerary_days} days defined</td><td>{row.price_from_usd ? money(row.price_from_usd, 'USD') : row.price_from_tzs ? money(row.price_from_tzs, 'TZS') : 'Tailor-made'}</td><td><StatusBadge value={row.is_published ? 'published' : 'draft'} /></td><td><div className="mk-row-actions">{canWrite && <button className="mk-small-action" onClick={() => openEditor(row)}>Edit</button>}{canWrite && <button className="mk-small-action is-muted" onClick={async () => { try { await api(`/api/admin/packages/${row.id}`, { method: 'PATCH', body: { is_published: !row.is_published } }); showToast(row.is_published ? 'Package unpublished.' : 'Package published.'); load(); } catch (e) { showToast(e.message, 'error'); } }}>{row.is_published ? 'Hide' : 'Publish'}</button>}</div></td></tr>)}</tbody></table></div> : <EmptyState icon={Compass} title="No packages match" body="Try a different search or category." />}</Panel>
    <div className="mk-note-banner"><ShieldCheck size={18} /><p><strong>Publishing safeguards are active.</strong> Package edits include the English overview, destinations, day-by-day itinerary, photos and pricing tiers. Blog articles can now be managed in Blog CMS. The category landing pages continue to use the existing live package catalogue.</p></div>
    {editor !== undefined && <PackageEditor initial={editor} api={api} onClose={() => setEditor(undefined)} onSaved={saved} showToast={showToast} />}
  </>;
}

function Payments({ api, showToast }) {
  const [rows, setRows] = useState([]); const [status, setStatus] = useState('all'); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [working, setWorking] = useState(null);
  const load = useCallback(async () => { setLoading(true); setError(''); try { setRows(await api(`/api/admin/payments?limit=200${status !== 'all' ? `&status=${status}` : ''}`)); } catch (e) { setError(e.message); } finally { setLoading(false); } }, [api, status]);
  useEffect(() => { load(); }, [load]);
  const recheck = async (row) => { setWorking(row.id); try { const result = await api(`/api/admin/payments/${row.id}/recheck`, { method: 'POST', body: {} }); showToast(`Gateway verification completed: ${cap(result.outcome)}.`); load(); } catch (e) { showToast(e.message, 'error'); } finally { setWorking(null); } };
  return <><PageTitle eyebrow="FINANCE & RECONCILIATION" title="Payments" description="Monitor payment attempts and reconcile only provider-verified funds. No manual paid overrides are available." actions={<button className="mk-secondary-btn" onClick={load}><RefreshCw size={15} /> Refresh</button>} /><div className="mk-note-banner"><ShieldCheck size={18} /><p><strong>Payment integrity is protected.</strong> A payment is marked Paid only after the payment provider confirms the amount, currency and transaction reference.</p></div>
    <Panel title="Payment ledger" subtitle="Gateway transactions associated with guest bookings" action={<span className="mk-live-label"><i /> VERIFIED RECORDS</span>}><div className="mk-table-toolbar"><div className="mk-filter-wrap"><Filter size={14} /><select value={status} onChange={(e) => setStatus(e.target.value)}><option value="all">All payment statuses</option><option value="pending">Pending</option><option value="paid">Paid</option><option value="failed">Failed</option><option value="refunded">Refunded</option></select></div></div>{error && <ErrorNotice onRetry={load}>{error}</ErrorNotice>}{loading ? <Loading label="Loading payment ledger" /> : rows.length ? <div className="mk-table-scroll"><table className="mk-table"><thead><tr><th>Transaction</th><th>Booking ID</th><th>Type / Method</th><th>Amount</th><th>Provider reference</th><th>Verification</th><th>Status</th><th /></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><strong className="mk-reference">{row.merchant_reference}</strong><small className="mk-cell-sub">{dateText(row.created_at, { day: 'numeric', month: 'short', hour: '2-digit', minute: '2-digit' })}</small></td><td>#{row.booking_id}</td><td>{cap(row.kind)}<small className="mk-cell-sub">{cap(row.method || 'pending')}</small></td><td><strong>{money(row.amount, row.currency)}</strong></td><td className="mk-mono">{row.provider_reference || 'Not assigned'}</td><td>{row.verified_with_provider ? <span className="mk-verified"><CheckCircle2 size={14} /> Verified</span> : <span className="mk-unverified"><Clock3 size={14} /> Awaiting</span>}</td><td><StatusBadge value={row.status} /></td><td>{row.status === 'pending' && row.provider_reference && <button className="mk-small-action" disabled={working === row.id} onClick={() => recheck(row)}>{working === row.id ? 'Checking…' : 'Recheck'}</button>}</td></tr>)}</tbody></table></div> : <EmptyState icon={Wallet} title="No payment records" body="Payment attempts created by guests will appear here." />}</Panel></>;
}

function Testimonials({ api, showToast }) {
  const [rows, setRows] = useState([]); const [filter, setFilter] = useState('pending'); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { setRows(await api(`/api/admin/testimonials?limit=200&status=${filter}`)); } catch (e) { setError(e.message); } finally { setLoading(false); } }, [api, filter]);
  useEffect(() => { load(); }, [load]);
  const moderate = async (row, status) => { try { await api(`/api/admin/testimonials/${row.id}`, { method: 'PATCH', body: { status } }); showToast(status === 'approved' ? 'Guest review approved and published.' : status === 'rejected' ? 'Guest review rejected.' : 'Guest review returned to pending.'); load(); } catch (e) { showToast(e.message, 'error'); } };
  const currentStatus = (row) => row.moderation_status || (row.is_approved ? 'approved' : 'pending');
  return <><PageTitle eyebrow="GUEST TRUST & SOCIAL PROOF" title="Guest reviews" description="Review every guest story before it appears publicly. Approve, reject or return a review to pending." actions={<button className="mk-secondary-btn" onClick={load}><RefreshCw size={15} /> Refresh</button>} /><Panel title="Testimonial moderation" subtitle="Guest feedback submitted through the website"><div className="mk-table-toolbar"><div className="mk-filter-wrap"><Filter size={14} /><select value={filter} onChange={(e) => setFilter(e.target.value)}><option value="pending">Pending approval</option><option value="approved">Approved / published</option><option value="rejected">Rejected</option><option value="all">All reviews</option></select></div></div>{error && <ErrorNotice onRetry={load}>{error}</ErrorNotice>}{loading ? <Loading label="Loading guest reviews" /> : rows.length ? <div className="mk-review-grid">{rows.map((row) => { const status = currentStatus(row); return <article className="mk-review-card" key={row.id}><div className="mk-review-head"><Avatar name={row.name} /><div><strong>{row.name}</strong><small>{row.country || 'Guest'} · {dateText(row.created_at)} · {String(row.lang || 'en').toUpperCase()}</small></div><StatusBadge value={status} /></div><div className="mk-review-stars">{'★'.repeat(row.rating || 5)}<small>{row.rating}/5</small></div><p>{row.message}</p><div className="mk-review-actions">{status !== 'approved' && <button className="mk-primary-btn" onClick={() => moderate(row, 'approved')}><Check size={14} /> Approve</button>}{status !== 'rejected' && <button className="mk-secondary-btn" onClick={() => moderate(row, 'rejected')}><X size={14} /> Reject</button>}{status !== 'pending' && <button className="mk-small-action" onClick={() => moderate(row, 'pending')}>Return to pending</button>}</div></article>; })}</div> : <EmptyState icon={Star} title="No reviews in this view" body="Guest testimonials will appear here when submitted." />}</Panel></>;
}

function Team({ api, showToast, currentUserId }) {
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState(''); const [showForm, setShowForm] = useState(false); const [form, setForm] = useState({ full_name: '', email: '', role: 'booking_officer', password: '' });
  const load = useCallback(async () => { setLoading(true); setError(''); try { setRows(await api('/api/admin/users')); } catch (e) { setError(e.message); } finally { setLoading(false); } }, [api]);
  useEffect(() => { load(); }, [load]);
  const create = async (event) => { event.preventDefault(); try { await api('/api/admin/users', { method: 'POST', body: form }); setForm({ full_name: '', email: '', role: 'booking_officer', password: '' }); setShowForm(false); showToast('Staff account created. The team member must enrol MFA on first sign-in.'); load(); } catch (e) { showToast(e.message, 'error'); } };
  const update = async (row, patch) => { try { await api(`/api/admin/users/${row.id}`, { method: 'PATCH', body: patch }); showToast('Staff access updated.'); load(); } catch (e) { showToast(e.message, 'error'); } };
  const action = async (row, endpoint, message) => {
    if (row.id === currentUserId) return;
    const confirmText = endpoint === 'reset-mfa' ? `Reset MFA for ${row.full_name}? They will need to enrol again.` : endpoint === 'unlock' ? `Clear the login lock for ${row.full_name}?` : '';
    if (confirmText && !window.confirm(confirmText)) return;
    try { await api(`/api/admin/users/${row.id}/${endpoint}`, { method: 'POST', body: {} }); showToast(message); load(); } catch (e) { showToast(e.message, 'error'); }
  };
  return <><PageTitle eyebrow="PEOPLE & PERMISSIONS" title="Team & access" description="Give each colleague the access they need to deliver excellent guest experiences—nothing more." actions={<button className="mk-primary-btn" onClick={() => setShowForm(true)}><Plus size={16} /> Add team member</button>} /><div className="mk-note-banner"><ShieldCheck size={18} /><p><strong>Least-privilege access.</strong> Role or permission changes revoke existing staff sessions. New staff must set up multi-factor authentication when they first sign in.</p></div><Panel title="Staff directory" subtitle="Only authorised company staff can access this workspace">{error && <ErrorNotice onRetry={load}>{error}</ErrorNotice>}{loading ? <Loading label="Loading staff directory" /> : rows.length ? <div className="mk-table-scroll"><table className="mk-table"><thead><tr><th>Team member</th><th>Role</th><th>Security</th><th>Last sign-in</th><th>Access</th><th>Actions</th></tr></thead><tbody>{rows.map((row) => <tr key={row.id}><td><div className="mk-guest-cell"><Avatar name={row.full_name} size="xs" /><span><strong>{row.full_name}</strong><small>{row.email}</small></span></div></td><td><select className="mk-role-select" aria-label={`Role for ${row.full_name}`} value={row.role} disabled={row.id === currentUserId} onChange={(e) => update(row, { role: e.target.value })}><option value="admin">Admin</option><option value="manager">Manager</option><option value="booking_officer">Booking Officer</option><option value="finance">Finance</option></select></td><td>{row.mfa_enabled ? <span className="mk-verified"><ShieldCheck size={14} /> MFA active</span> : <span className="mk-unverified"><CircleAlert size={14} /> Setup required</span>}</td><td>{dateText(row.last_login_at, { day: 'numeric', month: 'short', year: 'numeric' })}</td><td><StatusBadge value={row.is_active ? 'active' : 'suspended'} /></td><td><div className="mk-row-actions"><button className="mk-small-action" disabled={row.id === currentUserId} onClick={() => { if (row.is_active && !window.confirm(`Suspend ${row.full_name}'s account? Their active sessions will be revoked.`)) return; update(row, { is_active: !row.is_active }); }}>{row.is_active ? 'Suspend' : 'Activate'}</button><button className="mk-small-action is-muted" disabled={row.id === currentUserId} onClick={() => action(row, 'unlock', 'Account lock cleared.')}>Unlock</button><button className="mk-icon-btn" title="Reset MFA" disabled={row.id === currentUserId} onClick={() => action(row, 'reset-mfa', 'MFA reset. Staff member must enrol again.')}><KeyRound size={15} /></button></div></td></tr>)}</tbody></table></div> : <EmptyState icon={Users} title="No staff accounts" body="Create the first team member to delegate operations securely." />}</Panel>
    {showForm && <div className="mk-modal-backdrop" onMouseDown={(e) => e.target === e.currentTarget && setShowForm(false)}><form className="mk-modal" onSubmit={create}><div className="mk-drawer-head"><div><small>TEAM ACCESS</small><h2>Create staff account</h2></div><IconButton title="Close" onClick={() => setShowForm(false)}><X size={18} /></IconButton></div><label className="mk-field-label">FULL NAME</label><input className="mk-input" required value={form.full_name} onChange={(e) => setForm({ ...form, full_name: e.target.value })} /><label className="mk-field-label">WORK EMAIL</label><input className="mk-input" type="email" required value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /><label className="mk-field-label">ROLE</label><select className="mk-input" value={form.role} onChange={(e) => setForm({ ...form, role: e.target.value })}><option value="manager">Manager</option><option value="booking_officer">Booking Officer</option><option value="finance">Finance</option><option value="admin">Administrator</option></select><label className="mk-field-label">TEMPORARY PASSWORD</label><input className="mk-input" type="password" minLength={12} required value={form.password} onChange={(e) => setForm({ ...form, password: e.target.value })} /><p className="mk-form-hint">Use a strong temporary password and share it securely. The team member will be prompted to enrol MFA.</p><div className="mk-modal-actions"><button type="button" className="mk-secondary-btn" onClick={() => setShowForm(false)}>Cancel</button><button className="mk-primary-btn"><Plus size={15} /> Create account</button></div></form></div>}
  </>;
}

function ActivityLog({ api }) {
  const [rows, setRows] = useState([]); const [loading, setLoading] = useState(true); const [error, setError] = useState('');
  const load = useCallback(async () => { setLoading(true); setError(''); try { setRows(await api('/api/admin/audit?limit=200')); } catch (e) { setError(e.message); } finally { setLoading(false); } }, [api]);
  useEffect(() => { load(); }, [load]);
  return <><PageTitle eyebrow="SECURITY & ACCOUNTABILITY" title="Audit trail" description="A time-ordered record of sensitive changes made by staff and system workflows." actions={<button className="mk-secondary-btn" onClick={load}><RefreshCw size={15} /> Refresh</button>} /><Panel title="Workspace activity" subtitle="Audit events are append-only and cannot be edited from this screen.">{error && <ErrorNotice onRetry={load}>{error}</ErrorNotice>}{loading ? <Loading /> : rows.length ? <div className="mk-audit-table">{rows.map((row) => <div className="mk-audit-row" key={row.id}><span className="mk-audit-icon"><Activity size={16} /></span><div className="mk-audit-copy"><strong>{cap(row.action)}</strong><small>{row.entity_type}{row.entity_id ? ` · ${row.entity_id}` : ''} · User #{row.user_id || 'System'}</small>{row.after && <code>{JSON.stringify(row.after)}</code>}</div><div className="mk-audit-meta"><time>{dateText(row.at, { day: 'numeric', month: 'short', year: 'numeric' })}</time><small>{row.ip || '—'}</small></div></div>)}</div> : <EmptyState icon={FileClock} title="No activity recorded" body="Actions requiring an audit trail will appear here." />}</Panel></>;
}

function SecuritySettings({ api, showToast }) {
  const [form, setForm] = useState({ current_password: '', new_password: '', confirm: '' }); const [busy, setBusy] = useState(false); const [error, setError] = useState('');
  const submit = async (event) => { event.preventDefault(); setError(''); if (form.new_password !== form.confirm) { setError('The new passwords do not match.'); return; } setBusy(true); try { await api('/api/admin/auth/change-password', { method: 'POST', body: { current_password: form.current_password, new_password: form.new_password } }); setForm({ current_password: '', new_password: '', confirm: '' }); showToast('Password updated. Other active sessions were revoked.'); } catch (e) { setError(e.message); } finally { setBusy(false); } };
  return <><PageTitle eyebrow="ACCOUNT PROTECTION" title="Security settings" description="Keep your staff account protected and review the safeguards around workspace access." /><div className="mk-settings-grid"><Panel title="Change password" subtitle="Use a unique password that is not shared with another service"><form className="mk-settings-form" onSubmit={submit}><label className="mk-field-label">CURRENT PASSWORD</label><input className="mk-input" type="password" autoComplete="current-password" value={form.current_password} onChange={(e) => setForm({ ...form, current_password: e.target.value })} required /><label className="mk-field-label">NEW PASSWORD</label><input className="mk-input" type="password" autoComplete="new-password" minLength={12} value={form.new_password} onChange={(e) => setForm({ ...form, new_password: e.target.value })} required /><label className="mk-field-label">CONFIRM NEW PASSWORD</label><input className="mk-input" type="password" autoComplete="new-password" minLength={12} value={form.confirm} onChange={(e) => setForm({ ...form, confirm: e.target.value })} required />{error && <div className="mk-inline-error">{error}</div>}<button className="mk-primary-btn" disabled={busy}>{busy ? 'Updating…' : 'Update password'} <ArrowRight size={16} /></button></form></Panel><div className="mk-security-cards"><div className="mk-security-card"><span className="is-green"><ShieldCheck size={20} /></span><div><strong>Multi-factor authentication</strong><p>Authenticator-based sign-in is required before staff can use protected workspace tools.</p><StatusBadge value="protected" /></div></div><div className="mk-security-card"><span><Clock3 size={20} /></span><div><strong>Session controls</strong><p>Sessions expire after inactivity and are rechecked on every protected request.</p><small>8-hour maximum · 30-minute idle timeout</small></div></div><div className="mk-security-card"><span><FileClock size={20} /></span><div><strong>Audit history</strong><p>Important account and operational changes are recorded for accountability.</p><small>Append-only audit events</small></div></div></div></div></>;
}

function ContentStudio({ api, showToast }) {
  const emptyForm = { title: '', slug: '', excerpt: '', content: '', category: 'Travel Guides', language: 'en', featured_image: '', is_featured: false, status: 'draft', seo_title: '', seo_description: '' };
  const [rows, setRows] = useState([]);
  const [filter, setFilter] = useState('all');
  const [search, setSearch] = useState('');
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState('');
  const [editorOpen, setEditorOpen] = useState(false);
  const [editingId, setEditingId] = useState(null);
  const [form, setForm] = useState(emptyForm);
  const [uploading, setUploading] = useState(false);
  const load = useCallback(async () => {
    setLoading(true); setError('');
    try {
      const query = new URLSearchParams({ limit: '200' });
      if (filter !== 'all') query.set('status', filter);
      if (search.trim()) query.set('q', search.trim());
      const data = await api(`/api/admin/blogs?${query.toString()}`);
      setRows(Array.isArray(data) ? data : []);
    } catch (e) { setError(e.message); }
    finally { setLoading(false); }
  }, [api, filter, search]);
  useEffect(() => { const timer = window.setTimeout(load, 180); return () => window.clearTimeout(timer); }, [load]);
  const openNew = () => { setEditingId(null); setForm(emptyForm); setEditorOpen(true); };
  const openEdit = (row) => {
    setEditingId(row.id);
    setForm({ title: row.title || '', slug: row.slug || '', excerpt: row.excerpt || '', content: row.content || '', category: row.category || 'Travel Guides', language: row.language || 'en', featured_image: row.featured_image || '', is_featured: Boolean(row.is_featured), status: row.status || 'draft', seo_title: row.seo_title || '', seo_description: row.seo_description || '' });
    setEditorOpen(true);
  };
  const slugify = (value) => value.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036f]/g, '').replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 240);
  const setField = (key, value) => setForm((old) => ({ ...old, [key]: value }));
  const uploadImage = async (file) => {
    if (!file) return;
    const body = new FormData(); body.append('photo', file);
    setUploading(true);
    try { const result = await api('/api/admin/blogs/media', { method: 'POST', body }); setField('featured_image', result.image_url); showToast('Featured image uploaded.'); }
    catch (e) { showToast(e.message, 'error'); }
    finally { setUploading(false); }
  };
  const save = async (event) => {
    event.preventDefault(); setBusy(true);
    const payload = { ...form, slug: slugify(form.slug || form.title), seo_title: form.seo_title.trim() || null, seo_description: form.seo_description.trim() || null, featured_image: form.featured_image || null };
    try {
      if (editingId) await api(`/api/admin/blogs/${editingId}`, { method: 'PATCH', body: payload });
      else await api('/api/admin/blogs', { method: 'POST', body: payload });
      showToast(editingId ? 'Article updated.' : 'Article created.'); setEditorOpen(false); await load();
    } catch (e) { showToast(e.message, 'error'); }
    finally { setBusy(false); }
  };
  const togglePublish = async (row) => {
    try { await api(`/api/admin/blogs/${row.id}`, { method: 'PATCH', body: { status: row.status === 'published' ? 'draft' : 'published' } }); showToast(row.status === 'published' ? 'Article saved as draft.' : 'Article published.'); await load(); }
    catch (e) { showToast(e.message, 'error'); }
  };
  return <>
    <PageTitle eyebrow="BRAND & DIGITAL EXPERIENCE" title="Blog content studio" description="Create, edit, review and publish Leonard Tour travel articles." actions={<button className="mk-primary-btn" onClick={openNew}><Plus size={16} /> New article</button>} />
    <Panel title="Travel journal articles" subtitle="Public articles are displayed in the selected language. Drafts remain private until published." action={<button className="mk-secondary-btn" onClick={load}><RefreshCw size={15} /> Refresh</button>}>
      <div className="mk-blog-toolbar"><SearchBox value={search} onChange={setSearch} placeholder="Search article title or slug..." /><select className="mk-blog-filter" value={filter} onChange={(e) => setFilter(e.target.value)}><option value="all">All statuses</option><option value="draft">Drafts</option><option value="published">Published</option></select></div>
      {error && <ErrorNotice onRetry={load}>{error}</ErrorNotice>}
      {loading ? <Loading label="Loading articles" /> : rows.length ? <div className="mk-blog-list">{rows.map((row) => <article className="mk-blog-row" key={row.id}><div className="mk-blog-thumb">{row.featured_image ? <img src={mediaUrl(row.featured_image)} alt="" onError={(e) => { e.currentTarget.style.display = 'none'; }} /> : <BookOpen size={22} />}</div><div className="mk-blog-copy"><div className="mk-blog-meta"><StatusBadge value={row.status} /><span>{cap(row.language)} · {row.category}</span>{row.is_featured && <em>FEATURED</em>}</div><strong>{row.title}</strong><small>/{row.slug} · Updated {dateText(row.updated_at)}</small><p>{row.excerpt || 'No excerpt added.'}</p></div><div className="mk-blog-actions"><button className="mk-small-action" onClick={() => openEdit(row)}><Pencil size={13} /> Edit</button><button className="mk-small-action is-muted" onClick={() => togglePublish(row)}>{row.status === 'published' ? 'Unpublish' : 'Publish'}</button>{row.status === 'published' && <a className="mk-small-action is-muted" href={`/blogs/${row.slug}`} target="_blank" rel="noreferrer">View</a>}</div></article>)}</div> : <EmptyState icon={BookOpen} title="No articles yet" body="Create your first travel journal article. You can save it as a draft before publishing." />}
    </Panel>
    {editorOpen && <div className="mk-modal-backdrop" role="presentation" onMouseDown={(e) => { if (e.target === e.currentTarget && !busy) setEditorOpen(false); }}><form className="mk-blog-modal" onSubmit={save}><div className="mk-blog-modal-head"><div><small>LEONARD TOUR JOURNAL</small><h2>{editingId ? 'Edit article' : 'Create article'}</h2></div><button type="button" className="mk-icon-btn" onClick={() => setEditorOpen(false)} disabled={busy}><X size={17} /></button></div><div className="mk-blog-fields">
      <label className="mk-blog-wide"><span className="mk-field-label">ARTICLE TITLE</span><input className="mk-input" required minLength={3} maxLength={220} value={form.title} onChange={(e) => { const value = e.target.value; setForm((old) => ({ ...old, title: value, slug: editingId ? old.slug : (old.slug ? old.slug : slugify(value)) })); }} /></label>
      <label><span className="mk-field-label">URL SLUG</span><input className="mk-input" required pattern="[a-z0-9]+(?:-[a-z0-9]+)*" maxLength={240} value={form.slug} onChange={(e) => setField('slug', slugify(e.target.value))} /></label>
      <label><span className="mk-field-label">CATEGORY</span><select className="mk-input" value={form.category} onChange={(e) => setField('category', e.target.value)}>{['Safari Tips','Tanzania Destinations','Kilimanjaro Adventures','Travel Guides'].map((x) => <option key={x}>{x}</option>)}</select></label>
      <label><span className="mk-field-label">LANGUAGE</span><select className="mk-input" value={form.language} onChange={(e) => setField('language', e.target.value)}>{[['en','English'],['sw','Kiswahili'],['fr','Français'],['zh','简体中文'],['ko','한국어']].map(([v,l]) => <option value={v} key={v}>{l}</option>)}</select></label>
      <label><span className="mk-field-label">STATUS</span><select className="mk-input" value={form.status} onChange={(e) => setField('status', e.target.value)}><option value="draft">Draft</option><option value="published">Published</option></select></label>
      <label className="mk-blog-wide"><span className="mk-field-label">SHORT EXCERPT</span><textarea className="mk-input mk-blog-excerpt" maxLength={500} value={form.excerpt} onChange={(e) => setField('excerpt', e.target.value)} /></label>
      <label className="mk-blog-wide"><span className="mk-field-label">ARTICLE CONTENT · USE A BLANK LINE BETWEEN PARAGRAPHS</span><textarea className="mk-input mk-blog-content" required minLength={20} maxLength={50000} value={form.content} onChange={(e) => setField('content', e.target.value)} /></label>
      <div className="mk-blog-wide"><span className="mk-field-label">FEATURED IMAGE · JPG, PNG OR WEBP · MAX 6 MB</span><div className="mk-upload-row"><span className="mk-blog-image-path">{form.featured_image || 'No image selected'}</span><label className="mk-upload-btn">{uploading ? 'Uploading…' : 'Choose image'}<input type="file" accept="image/jpeg,image/png,image/webp" disabled={uploading} onChange={(e) => uploadImage(e.target.files?.[0])} /></label></div>{form.featured_image && <div className="mk-blog-preview"><img src={mediaUrl(form.featured_image)} alt="Featured preview" /></div>}</div>
      <label className="mk-blog-wide mk-blog-featured-toggle"><input type="checkbox" checked={form.is_featured} onChange={(e) => setField('is_featured', e.target.checked)} /> Mark as featured article</label>
      <label className="mk-blog-wide"><span className="mk-field-label">SEO TITLE</span><input className="mk-input" maxLength={220} value={form.seo_title} onChange={(e) => setField('seo_title', e.target.value)} /></label>
      <label className="mk-blog-wide"><span className="mk-field-label">SEO DESCRIPTION</span><textarea className="mk-input mk-blog-seo" maxLength={320} value={form.seo_description} onChange={(e) => setField('seo_description', e.target.value)} /></label>
    </div><div className="mk-blog-modal-foot"><button type="button" className="mk-secondary-btn" disabled={busy} onClick={() => setEditorOpen(false)}>Cancel</button><button className="mk-primary-btn" disabled={busy || uploading}>{busy ? 'Saving…' : editingId ? 'Save changes' : 'Create article'} <Check size={15} /></button></div></form></div>}
  </>;
}
