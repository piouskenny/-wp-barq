import { useState, useEffect } from 'react'
import { Activity, ShieldCheck, Database, HardDrive, BellRing, Settings, Server, RefreshCw, ChevronLeft, Save, Play, CheckCircle, Smartphone, Monitor } from 'lucide-react'

const getApiBase = () => {
  return window.wpApiSettings?.root ? window.wpApiSettings.root + 'wp-barq/v1' : '/wp-json/wp-barq/v1';
};

const apiBase = getApiBase();

function StatusCard({ title, value, status, icon: Icon, time, action }) {
  const isHealthy = status === 'healthy'
  
  return (
    <div className="barq-card">
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.25rem' }}>
        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 600, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.025em' }}>{title}</h3>
        <span className={`barq-status-badge ${status === 'healthy' ? 'status-healthy' : (status === 'warning' ? 'status-warning' : 'status-critical')} ${isHealthy ? 'pulse' : ''}`}>
          {status.toUpperCase()}
        </span>
      </div>
      
      <div style={{ display: 'flex', alignItems: 'center', gap: '1.25rem', margin: '1rem 0' }}>
        <div style={{ padding: '0.85rem', background: 'rgba(99, 102, 241, 0.08)', borderRadius: '1rem' }}>
          <Icon size={24} color={isHealthy ? 'var(--healthy)' : (status === 'warning' ? 'var(--warning)' : 'var(--critical)')} />
        </div>
        <div>
          <h2 style={{ margin: 0, fontSize: '2.25rem', fontWeight: 700, letterSpacing: '-0.02em' }}>{value}</h2>
          <p style={{ margin: '0.25rem 0 0 0', color: 'var(--text-secondary)', fontSize: '0.8rem', fontWeight: 500 }}>{time}</p>
        </div>
      </div>
      {action && (
        <div style={{ marginTop: '1.5rem', paddingTop: '1rem', borderTop: '1px solid rgba(0,0,0,0.03)' }}>
          {action}
        </div>
      )}
    </div>
  )
}

function ReportView({ pagespeed, onBack }) {
  const current = pagespeed?.current;
  const history = pagespeed?.history || [];

  const MetricItem = ({ label, value, icon: Icon }) => (
    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.3)', borderRadius: '1.25rem', border: '1px solid rgba(255,255,255,0.6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
        <Icon size={18} />
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{value || 'N/A'}</div>
    </div>
  );

  return (
    <div className="barq-dashboard-container">
      <header className="barq-header">
        <div className="barq-logo-wrapper">
          <button onClick={onBack} className="barq-btn barq-btn-outline" style={{ padding: '0.5rem' }}>
            <ChevronLeft size={24} />
          </button>
          <h1>Performance Report</h1>
        </div>
        <div style={{ color: 'var(--text-secondary)', fontWeight: 500 }}>Last Audit: {current?.timestamp || 'Never'}</div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem', marginBottom: '3rem' }}>
        <div className="barq-card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Smartphone size={20} color="var(--primary)" /> Mobile Metrics</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <MetricItem label="FCP" value={current?.mobile?.metrics?.fcp} icon={Activity} />
            <MetricItem label="LCP" value={current?.mobile?.metrics?.lcp} icon={Play} />
            <MetricItem label="TBT" value={current?.mobile?.metrics?.tbt} icon={Activity} />
            <MetricItem label="CLS" value={current?.mobile?.metrics?.cls} icon={Activity} />
          </div>
        </div>
        <div className="barq-card">
          <h2 style={{ fontSize: '1.25rem', marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><Monitor size={20} color="var(--secondary)" /> Desktop Metrics</h2>
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            <MetricItem label="FCP" value={current?.desktop?.metrics?.fcp} icon={Activity} />
            <MetricItem label="LCP" value={current?.desktop?.metrics?.lcp} icon={Play} />
            <MetricItem label="TBT" value={current?.desktop?.metrics?.tbt} icon={Activity} />
            <MetricItem label="CLS" value={current?.desktop?.metrics?.cls} icon={Activity} />
          </div>
        </div>
      </div>

      <section className="barq-card">
        <h2 style={{ fontSize: '1.5rem', marginBottom: '1.5rem' }}>Audit History</h2>
        <div className="barq-table-wrapper">
          <table className="barq-table">
            <thead>
              <tr>
                <th>Date & Time</th>
                <th>Mobile Score</th>
                <th>Desktop Score</th>
                <th>Main Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((audit, idx) => (
                <tr key={idx}>
                  <td><div style={{ fontWeight: 600 }}>{audit.timestamp}</div></td>
                  <td>
                    <span className={`barq-status-badge ${audit.mobile?.score > 80 ? 'status-healthy' : 'status-critical'}`}>
                      {audit.mobile?.score}%
                    </span>
                  </td>
                  <td>
                    <span className={`barq-status-badge ${audit.desktop?.score > 80 ? 'status-healthy' : 'status-critical'}`}>
                      {audit.desktop?.score}%
                    </span>
                  </td>
                  <td>Healthy</td>
                </tr>
              ))}
              {history.length === 0 && (
                <tr><td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-secondary)' }}>No audit history available yet.</td></tr>
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  );
}

function NotificationsView({ settings, onUpdate, onBack }) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  useEffect(() => {
    setLocalSettings(settings);
  }, [settings]);

  const handleSave = () => {
    setSaving(true);
    fetch(`${apiBase}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.wpApiSettings?.nonce },
      body: JSON.stringify(localSettings)
    })
      .then(res => res.json())
      .then(() => {
        setSaving(false);
        setMessage('Notification settings saved!');
        onUpdate(localSettings);
        setTimeout(() => setMessage(''), 3000);
      });
  };

  const Toggle = ({ label, value, onChange, disabled }) => (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '0.75rem', opacity: disabled ? 0.5 : 1 }}>
      <span style={{ fontWeight: 500 }}>{label}</span>
      <label className="barq-switch">
        <input 
          type="checkbox" 
          checked={value} 
          onChange={e => !disabled && onChange(e.target.checked)}
          disabled={disabled}
        />
        <span className="barq-slider"></span>
      </label>
    </div>
  );

  return (
    <div className="barq-dashboard-container">
      <header className="barq-header">
        <div className="barq-logo-wrapper">
          <button onClick={onBack} className="barq-btn barq-btn-outline" style={{ padding: '0.5rem' }}>
            <ChevronLeft size={24} />
          </button>
          <h1>Notification Settings</h1>
        </div>
        <button className="barq-btn barq-btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={18} /> {saving ? 'Saving...' : 'Save Changes'}
        </button>
      </header>
      
      {message && <div style={{ padding: '1rem', background: 'rgba(52, 211, 153, 0.2)', border: '1px solid #34d399', borderRadius: '0.5rem', marginBottom: '2rem', textAlign: 'center' }}>{message}</div>}

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 1fr) minmax(0, 1.5fr)', gap: '2rem' }}>
        <div className="barq-card">
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><BellRing size={20} color="var(--primary)" /> Recipients</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div>
              <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-muted)' }}>STANDARD RECIPIENT (FREE)</label>
              <div style={{ padding: '0.75rem', background: 'rgba(0,0,0,0.08)', borderRadius: '0.5rem', color: 'var(--text-secondary)', border: '1px dashed var(--glass-border)' }}>
                Site Admin Email (Fixed)
              </div>
            </div>
            
            <div style={{ opacity: localSettings.is_pro ? 1 : 0.6 }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '0.5rem' }}>
                <label style={{ display: 'block', fontSize: '0.9rem', color: 'var(--text-muted)' }}>ADDITIONAL EMAILS (PRO)</label>
                {!localSettings.is_pro && <span className="barq-status-badge status-warning" style={{fontSize: '0.6rem'}}>PRO ONLY</span>}
              </div>
              <textarea 
                value={localSettings.pro_emails} 
                onChange={e => localSettings.is_pro && setLocalSettings({...localSettings, pro_emails: e.target.value})}
                placeholder="email1@example.com, email2@example.com"
                disabled={!localSettings.is_pro}
                style={{ width: '100%', padding: '0.75rem', background: 'rgba(0,0,0,0.05)', border: '1px solid var(--glass-border)', borderRadius: '0.5rem', color: 'var(--text-main)', minHeight: '80px', resize: 'vertical' }}
              />
            </div>
          </div>
        </div>

        <div className="barq-card">
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
            <div>
              <h2 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Monitoring Notifications</h2>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Toggle label="Fault Warnings" value={localSettings.monitor_faults} onChange={v => setLocalSettings({...localSettings, monitor_faults: v})} />
                <Toggle label="Backup Reports" value={localSettings.monitor_backups} onChange={v => setLocalSettings({...localSettings, monitor_backups: v})} />
                <Toggle label="Health Status" value={localSettings.monitor_health} onChange={v => setLocalSettings({...localSettings, monitor_health: v})} />
              </div>
            </div>
            
            <div style={{ opacity: localSettings.is_pro ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>SNS Triggers (AWS Pro)</h2>
                {!localSettings.is_pro && <span className="barq-status-badge status-warning" style={{fontSize: '0.6rem'}}>PRO ONLY</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Toggle label="SNS for Faults" value={localSettings.sns_faults} onChange={v => setLocalSettings({...localSettings, sns_faults: v})} disabled={!localSettings.is_pro} />
                <Toggle label="SNS for Backups" value={localSettings.sns_backups} onChange={v => setLocalSettings({...localSettings, sns_backups: v})} disabled={!localSettings.is_pro} />
                <Toggle label="SNS for Health" value={localSettings.sns_health} onChange={v => setLocalSettings({...localSettings, sns_health: v})} disabled={!localSettings.is_pro} />
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}

function SettingsView({ settings, onUpdate, onBack }) {
  const [localSettings, setLocalSettings] = useState(settings);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState('');

  const handleSave = () => {
    setSaving(true);
    fetch(`${apiBase}/settings`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.wpApiSettings?.nonce },
      body: JSON.stringify(localSettings)
    })
      .then(res => res.json())
      .then(() => {
        setSaving(false);
        setMessage('Settings saved successfully!');
        onUpdate(localSettings);
        setTimeout(() => setMessage(''), 3000);
      });
  };

  return (
    <div className="barq-dashboard-container">
      <header className="barq-header">
        <div className="barq-logo-wrapper">
          <button onClick={onBack} className="barq-btn barq-btn-outline" style={{ padding: '0.5rem' }}>
            <ChevronLeft size={24} />
          </button>
          <h1>General Settings</h1>
        </div>
        <button className="barq-btn barq-btn-primary" onClick={handleSave} disabled={saving}>
          <Save size={18} /> {saving ? 'Saving...' : 'Save Configuration'}
        </button>
      </header>
      {message && <div style={{ padding: '1rem', background: 'rgba(52, 211, 153, 0.2)', border: '1px solid #34d399', borderRadius: '0.5rem', marginBottom: '2rem', textAlign: 'center' }}>{message}</div>}
      
      <div className="barq-card" style={{ maxWidth: '600px', margin: '0 auto' }}>
        <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldCheck size={20} color="var(--primary)" /> Licensing & Tier</h2>
        <div style={{ padding: '1.5rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
            <div>
              <h3 style={{ margin: 0 }}>Pro Status</h3>
              <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Enable advanced cloud features and SNS alerts</p>
            </div>
            <label className="barq-switch">
              <input 
                type="checkbox" 
                checked={localSettings.is_pro} 
                onChange={e => setLocalSettings({...localSettings, is_pro: e.target.checked})}
              />
              <span className="barq-slider"></span>
            </label>
          </div>
        </div>
        <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
          Note: AWS configurations are now centrally managed by the plugin developer.
        </p>
      </div>
    </div>
  );
}

function UpgradeView({ onBack }) {
  return (
    <div className="barq-dashboard-container">
      <header className="barq-header">
        <div className="barq-logo-wrapper">
          <button onClick={onBack} className="barq-btn barq-btn-outline" style={{ padding: '0.5rem' }}>
            <ChevronLeft size={24} />
          </button>
          <h1>Upgrade to Pro</h1>
        </div>
      </header>
      
      <div className="barq-card" style={{ maxWidth: '800px', margin: '0 auto', textAlign: 'center', padding: '3rem 2rem' }}>
        <ShieldCheck size={64} color="var(--primary)" style={{ marginBottom: '1.5rem' }} />
        <h2 style={{ fontSize: '2rem', marginBottom: '1rem' }}>Unlock Full Cloud Power</h2>
        <p style={{ color: 'var(--text-secondary)', fontSize: '1.1rem', marginBottom: '2.5rem', maxWidth: '600px', margin: '0 auto 2.5rem' }}>
          WP BARQ Pro gives you access to real-time AWS Lambda security monitoring, intelligent DynamoDB rate-limiting, instant Amazon SNS alerts via SMS/Email, and automated off-site S3 backups.
        </p>
        
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1.5rem', textAlign: 'left', marginBottom: '3rem', background: 'rgba(0,0,0,0.02)', padding: '2rem', borderRadius: '1rem' }}>
          <div>
            <h3 style={{ borderBottom: '1px solid var(--border)', paddingBottom: '0.5rem' }}>Free Tier</h3>
            <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>✅ Basic Health Scans</li>
              <li>✅ Standard Email Alerts</li>
              <li>✅ Google PageSpeed Audit</li>
              <li>❌ Cloud S3 Backups</li>
              <li>❌ DynamoDB Rate-Limiting</li>
              <li>❌ AWS Lambda Integration</li>
            </ul>
          </div>
          <div>
            <h3 style={{ borderBottom: '1px solid rgba(99, 102, 241, 0.2)', paddingBottom: '0.5rem', color: 'var(--primary)' }}>Pro Tier</h3>
            <ul style={{ listStyle: 'none', padding: 0, marginTop: '1rem', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
              <li>✅ Core File Integrity Checks</li>
              <li>✅ SMS & Push via AWS SNS</li>
              <li>✅ Advanced Rate-Limiting</li>
              <li>✅ 1-Click Amazon S3 Backups</li>
              <li>✅ Multiple Email Recipients</li>
              <li>✅ Brute Force IP Detection</li>
            </ul>
          </div>
        </div>
        
        <button className="barq-btn barq-btn-primary" style={{ fontSize: '1.1rem', padding: '1rem 2rem' }} onClick={() => window.open('https://example.com/pricing', '_blank')}>
          Upgrade Now - $9/mo
        </button>
      </div>
    </div>
  );
}


function App() {
  const [view, setView] = useState(() => {
    const params = new URLSearchParams(window.location.search);
    if (params.get('page') === 'wp-barq-notifications') return 'notifications';
    if (params.get('page') === 'wp-barq-upgrade') return 'upgrade';
    return 'dashboard';
  });
  const [health, setHealth] = useState(null);
  const [pagespeed, setPagespeed] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backupStatus, setBackupStatus] = useState('');
  const [auditStatus, setAuditStatus] = useState('');

  useEffect(() => {
    fetchHealth();
    fetchSettings();
  }, []);

  const fetchSettings = () => {
    fetch(`${apiBase}/settings`, { headers: { 'X-WP-Nonce': window.wpApiSettings?.nonce } })
      .then(res => res.json())
      .then(data => setSettings(data));
  };

  const fetchHealth = () => {
    setLoading(true);
    fetch(`${apiBase}/health`, { 
      headers: { 
        'X-WP-Nonce': window.wpApiSettings?.nonce 
      } 
    })
      .then(res => {
        if (!res.ok) throw new Error('Failed to fetch health data');
        return res.json();
      })
      .then(data => { 
        setHealth(data); 
        setLoading(false); 
      })
      .catch(err => {
        console.error(err);
        setLoading(false);
      });

    fetch(`${apiBase}/pagespeed`, { 
      headers: { 'X-WP-Nonce': window.wpApiSettings?.nonce } 
    })
      .then(res => res.json())
      .then(data => {
        setPagespeed(data);
      })
      .catch(err => console.error(err));
  };

  const handleRunBackup = () => {
    setBackupStatus('Backing up...');
    fetch(`${apiBase}/backup`, {
      method: 'POST',
      headers: { 'X-WP-Nonce': window.wpApiSettings?.nonce }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          setBackupStatus('Backup completed successfully!');
          setTimeout(() => setBackupStatus(''), 5000);
        } else {
          setBackupStatus('Backup failed. Check logs.');
        }
      })
      .catch(() => setBackupStatus('Error occurred during backup.'));
  };

  const handleRunAudit = () => {
    const isLocal = window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1';
    setAuditStatus(isLocal ? 'Running Local Lighthouse Audit (may take up to 1 minute)...' : 'Running Performance Audit...');
    fetch(`${apiBase}/pagespeed`, {
      method: 'POST',
      headers: { 'X-WP-Nonce': window.wpApiSettings?.nonce }
    })
      .then(res => res.json())
      .then(data => {
        if (data.timestamp || data.current?.timestamp) {
          setPagespeed(data);
          setAuditStatus('Audit completed!');
          setTimeout(() => setAuditStatus(''), 3000);
        } else {
          setAuditStatus('Audit failed. Verify CLI or API Key.');
        }
      })
      .catch(() => setAuditStatus('Error during audit.'));
  };

  if (view === 'settings' && settings) {
    return <SettingsView settings={settings} onUpdate={setSettings} onBack={() => setView('dashboard')} />;
  }

  if (view === 'notifications' && settings) {
    return <NotificationsView settings={settings} onUpdate={setSettings} onBack={() => setView('dashboard')} />;
  }

  if (view === 'report') {
    return <ReportView pagespeed={pagespeed} onBack={() => setView('dashboard')} />;
  }

  if (view === 'upgrade') {
    return <UpgradeView onBack={() => setView('dashboard')} />;
  }
  return (
    <div className="barq-dashboard-container">
      <header className="barq-header">
        <div className="barq-logo-wrapper">
          <Activity size={36} color="#4f46e5" />
          <h1>WP BARQ</h1>
        </div>
        <div style={{display: 'flex', gap: '1rem'}}>
          <button className="barq-btn barq-btn-outline" onClick={fetchHealth} disabled={loading}>
            <RefreshCw size={18} className={loading ? 'pulse' : ''} /> {loading ? 'Syncing...' : 'Refresh Sync'}
          </button>
          <button className="barq-btn barq-btn-primary" onClick={() => setView('settings')}>
            <Settings size={18} /> Manage AWS
          </button>
          {!settings?.is_pro && (
            <button className="barq-btn barq-btn-primary" style={{ background: '#f59e0b', boxShadow: '0 4px 14px rgba(245, 158, 11, 0.4)' }} onClick={() => setView('upgrade')}>
              <ShieldCheck size={18} /> Upgrade to Pro
            </button>
          )}
        </div>
      </header>

      {(backupStatus || auditStatus) && (
        <div style={{ padding: '1rem', background: 'rgba(96, 165, 250, 0.2)', border: '1px solid #60a5fa', borderRadius: '0.5rem', marginBottom: '2rem', textAlign: 'center' }}>
          {backupStatus || auditStatus}
        </div>
      )}

      <section style={{ marginBottom: '3.5rem' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
          <ShieldCheck size={28} color="var(--healthy)" />
          <h2 style={{ margin: 0, fontSize: '1.75rem', fontWeight: 700 }}>System Health Overview</h2>
        </div>
        {health ? (
          <div className="barq-grid">
            <StatusCard title="Main Status" value={health.status.toUpperCase()} status={health.status} icon={Server} time={`Last Sync: ${health.timestamp}`} />
            <StatusCard 
              title="Disk Usage" 
              value={health.metrics.disk_usage.value} 
              status={health.metrics.disk_usage.status} 
              icon={HardDrive} 
              time={`Total: ${health.metrics.disk_usage.total}`} 
            />
            {pagespeed?.current ? (
              <>
                <StatusCard 
                  title="Mobile PageSpeed" 
                  value={`${pagespeed.current.mobile.score}%`} 
                  status={pagespeed.current.mobile.score > 80 ? 'healthy' : (pagespeed.current.mobile.score > 50 ? 'warning' : 'critical')} 
                  icon={Smartphone} 
                  time={`Audit: ${pagespeed.current.timestamp}`}
                  action={<button onClick={() => setView('report')} className="barq-btn barq-btn-outline" style={{width: '100%', fontSize: '0.8rem'}}>View Full Report</button>}
                />
                <StatusCard 
                  title="Desktop PageSpeed" 
                  value={`${pagespeed.current.desktop.score}%`} 
                  status={pagespeed.current.desktop.score > 80 ? 'healthy' : (pagespeed.current.desktop.score > 50 ? 'warning' : 'critical')} 
                  icon={Monitor} 
                  time={`Audit: ${pagespeed.current.timestamp}`}
                  action={<button onClick={() => setView('report')} className="barq-btn barq-btn-outline" style={{width: '100%', fontSize: '0.8rem'}}>View Full Report</button>}
                />
              </>
            ) : (
              <StatusCard title="PageSpeed" value="N/A" status="warning" icon={Activity} time="Pending initial audit..." />
            )}
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem', color: 'var(--text-secondary)', background: 'var(--glass-bg)', borderRadius: '1.5rem' }}>
            <RefreshCw size={40} className="pulse" style={{ marginBottom: '1rem', opacity: 0.5 }} />
            <div style={{ fontSize: '1.1rem', fontWeight: 500 }}>Fetching live system data...</div>
          </div>
        )}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'minmax(0, 2fr) minmax(0, 1fr)', gap: '1.5rem' }}>
        <section className="barq-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
            <Activity size={24} color="#60a5fa" />
            <h2 style={{ margin: 0, fontSize: '1.5rem' }}>Active Actions</h2>
          </div>
          <div style={{ display: 'flex', gap: '1.5rem' }}>
            <div className="barq-card" style={{ flex: 1, padding: '1.5rem', textAlign: 'center', background: 'rgba(0,0,0,0.02)', position: 'relative' }}>
              {!settings?.is_pro && <span className="barq-status-badge status-warning" style={{position: 'absolute', top: '1rem', right: '1rem', fontSize: '0.6rem'}}>PRO ONLY</span>}
              <Database size={40} color="#a855f7" style={{ marginBottom: '1rem', opacity: settings?.is_pro ? 1 : 0.4 }} />
              <h3>Full Site Backup</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>{settings?.is_pro ? 'Compresses current state & uploads to S3' : 'Upgrade to Pro for cloud backups'}</p>
              <button className="barq-btn barq-btn-primary" style={{ width: '100%', justifyContent: 'center', opacity: settings?.is_pro ? 1 : 0.5 }} onClick={handleRunBackup} disabled={!settings?.is_pro}>
                <Play size={18} /> {!settings?.is_pro ? 'Pro Feature' : (backupStatus.includes('Backing') ? 'In Progress...' : 'Run Backup Now')}
              </button>
            </div>
            <div className="barq-card" style={{ flex: 1, padding: '1.5rem', textAlign: 'center', background: 'rgba(0,0,0,0.02)' }}>
              <Activity size={40} color="#3b82f6" style={{ marginBottom: '1rem' }} />
              <h3>PageSpeed Audit</h3>
              <p style={{ color: 'var(--text-muted)', fontSize: '0.9rem', marginBottom: '1.5rem' }}>Analyze performance (Mobile & Desktop)</p>
              <button className="barq-btn barq-btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={handleRunAudit} disabled={auditStatus.includes('Audit')}>
                <RefreshCw size={18} className={auditStatus.includes('Running') ? 'pulse' : ''} /> {auditStatus.includes('Running') ? 'Analyzing...' : 'Start Audit'}
              </button>
            </div>
          </div>
        </section>

        <section className="barq-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1rem' }}>
              <BellRing size={20} color="#a855f7" />
              <h2 style={{ margin: 0, fontSize: '1.25rem' }}>Cloud Integration (SNS)</h2>
            </div>
            <div style={{ padding: '1rem', background: 'rgba(255,255,255,0.05)', borderRadius: '12px' }}>
              <p style={{ margin: '0 0 0.5rem 0', fontWeight: 500 }}>Live Monitors</p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                <span style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={14} color="#34d399" /> Uptime Detection</span>
                <span style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={14} color="#34d399" /> PHP Fatal Watcher</span>
                <span style={{ fontSize: '0.9rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><CheckCircle size={14} color="#34d399" /> DB Connectivity</span>
              </div>
            </div>
          </div>
          <div style={{ marginTop: 'auto', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
            <button className="barq-btn barq-btn-outline" style={{ width: '100%', justifyContent: 'center' }} onClick={() => setView('notifications')}>
              Notification Config
            </button>
            <button className="barq-btn" style={{ width: '100%', justifyContent: 'center', background: 'transparent', border: 'none', color: 'var(--text-muted)', fontSize: '0.8rem' }} onClick={() => setView('settings')}>
              Global Settings
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

export default App
