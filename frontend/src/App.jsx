import { useState, useEffect } from 'react'
import { Activity, ShieldCheck, Database, HardDrive, BellRing, Settings, Server, RefreshCw, ChevronLeft, ChevronRight, Save, Play, CheckCircle, Smartphone, Monitor, CreditCard, Loader2, X, AlertTriangle, LayoutDashboard, Zap, ShieldAlert, History, Clock, TrendingUp, Gauge, Info } from 'lucide-react'

const getApiBase = () => {
  return window.wpApiSettings?.root ? window.wpApiSettings.root + 'wp-barq/v1' : '/wp-json/wp-barq/v1';
};

const apiBase = getApiBase();

function StatusCard({ title, value, status, icon: Icon, time, action, locked, onUnlock }) {
  const isHealthy = status === 'healthy'

  return (
    <div className="barq-card" style={{ position: 'relative', overflow: 'hidden' }}>
      {locked && (
        <div style={{
          position: 'absolute',
          inset: 0,
          background: 'rgba(255, 255, 255, 0.85)',
          backdropFilter: 'blur(3px)',
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          justifyContent: 'center',
          zIndex: 10,
          padding: '1rem',
          textAlign: 'center',
          gap: '0.5rem'
        }}>
          <ShieldAlert size={24} color="var(--primary)" />
          <span style={{ fontWeight: 600, fontSize: '0.85rem', color: 'var(--text-main)' }}>Automatic Check Locked</span>
          <button className="barq-btn barq-btn-primary" style={{ padding: '0.25rem 0.5rem', fontSize: '0.75rem' }} onClick={onUnlock}>Upgrade</button>
        </div>
      )}

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

const getMetricStatus = (metricKey, valueStr) => {
  if (!valueStr || valueStr === 'N/A') return { label: 'Unknown', color: 'var(--text-secondary)', status: 'warning' };

  const val = parseFloat(valueStr);
  if (isNaN(val)) return { label: 'Unknown', color: 'var(--text-secondary)', status: 'warning' };

  if (metricKey === 'fcp') {
    if (val <= 1.8) return { label: 'Good', color: 'var(--healthy)', status: 'healthy' };
    if (val <= 3.0) return { label: 'Needs Work', color: 'var(--warning)', status: 'warning' };
    return { label: 'Poor', color: 'var(--critical)', status: 'critical' };
  }
  if (metricKey === 'lcp') {
    if (val <= 2.5) return { label: 'Good', color: 'var(--healthy)', status: 'healthy' };
    if (val <= 4.0) return { label: 'Needs Work', color: 'var(--warning)', status: 'warning' };
    return { label: 'Poor', color: 'var(--critical)', status: 'critical' };
  }
  if (metricKey === 'tbt') {
    let msVal = val;
    if (valueStr.includes('s') && !valueStr.includes('ms')) {
      msVal = val * 1000;
    }
    if (msVal <= 200) return { label: 'Good', color: 'var(--healthy)', status: 'healthy' };
    if (msVal <= 600) return { label: 'Needs Work', color: 'var(--warning)', status: 'warning' };
    return { label: 'Poor', color: 'var(--critical)', status: 'critical' };
  }
  if (metricKey === 'cls') {
    if (val <= 0.1) return { label: 'Good', color: 'var(--healthy)', status: 'healthy' };
    if (val <= 0.25) return { label: 'Needs Work', color: 'var(--warning)', status: 'warning' };
    return { label: 'Poor', color: 'var(--critical)', status: 'critical' };
  }
  return { label: 'Info', color: 'var(--primary)', status: 'healthy' };
};

const getMetricData = (key, value) => {
  const statusInfo = getMetricStatus(key, value);

  const details = {
    fcp: {
      title: 'First Visual Load (First Impression)',
      explanation: 'How quickly a visitor sees the very first parts of your website (like the logo or page background) after clicking your link.',
      impact: 'If this is slow, visitors see a blank screen and might assume your website is down or broken, prompting them to leave immediately.',
      fix: 'Use a fast hosting provider, configure a page caching plugin, and minimize files that block rendering.'
    },
    lcp: {
      title: 'Main Content Load (Ready to Read)',
      explanation: 'How long it takes for the largest visual elements (such as a hero header, background image, or banner text) to fully load and show up.',
      impact: 'This is the most critical metric for perceived speed. If it takes too long, visitors cannot consume the core content of your page.',
      fix: 'Compress large images, use modern formats like WebP, and utilize lazy-loading for images further down the page.'
    },
    tbt: {
      title: 'Interaction Delay (Page Sluggishness)',
      explanation: 'How long the page feels frozen or unresponsive when trying to click links, type, or scroll while background scripts are loading.',
      impact: 'Even if the page looks loaded, lag makes it feel heavy, slow, and broken, causing users to drop off.',
      fix: 'Reduce the number of active WordPress plugins, and delay secondary script loading (like Facebook Pixels or analytics tags).'
    },
    cls: {
      title: 'Visual Stability (Jumping Content)',
      explanation: 'How much the layout of your webpage shifts or jumps around as elements (like slow-loading ads or images) pop into view.',
      impact: 'Shifting content is extremely frustrating. Users might go to click one button and end up clicking something else because the page shifted.',
      fix: 'Assign explicit width and height dimensions to all images and media containers, and avoid inserting dynamic popups above existing text.'
    }
  };

  return {
    ...statusInfo,
    ...details[key]
  };
};

function ReportView({ pagespeed, onBack }) {
  const current = pagespeed?.current;
  const history = pagespeed?.history || [];
  const [activeTab, setActiveTab] = useState('friendly'); // friendly or technical
  const [deviceStrategy, setDeviceStrategy] = useState('mobile'); // mobile or desktop

  const MetricItem = ({ label, value, icon: Icon }) => (
    <div style={{ padding: '1.5rem', background: 'rgba(255,255,255,0.3)', borderRadius: '1.25rem', border: '1px solid rgba(255,255,255,0.6)' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.75rem', color: 'var(--text-secondary)' }}>
        <Icon size={18} />
        <span style={{ fontSize: '0.85rem', fontWeight: 600 }}>{label}</span>
      </div>
      <div style={{ fontSize: '1.5rem', fontWeight: 700 }}>{value || 'N/A'}</div>
    </div>
  );

  const getOverallAnalysis = (score) => {
    if (score >= 90) {
      return {
        title: 'Excellent Website Speed!',
        description: 'Your website is performing exceptionally well. Visitors will experience almost instant load times and smooth interactions. No major speed optimizations are needed.',
        color: 'var(--healthy)',
        bg: 'rgba(16, 185, 129, 0.05)'
      };
    }
    if (score >= 50) {
      return {
        title: 'Moderate Speed - Room for Improvement',
        description: 'Your site loads reasonably well, but visitors might notice slight delays, especially on mobile connections. Applying the suggested actions below will make it snappier.',
        color: 'var(--warning)',
        bg: 'rgba(245, 158, 11, 0.05)'
      };
    }
    return {
      title: 'Slow Website Speed - Critical Action Required',
      description: 'Your website is loading slowly. Visitors are experiencing long wait times, which increases the likelihood that they will leave. Resolving the issues below is highly recommended.',
      color: 'var(--critical)',
      bg: 'rgba(239, 68, 68, 0.05)'
    };
  };

  const FriendlyCard = ({ metricKey, value }) => {
    const data = getMetricData(metricKey, value);
    const statusColors = {
      healthy: { bg: 'rgba(16, 185, 129, 0.08)', text: 'var(--healthy)', border: 'rgba(16, 185, 129, 0.2)' },
      warning: { bg: 'rgba(245, 158, 11, 0.08)', text: 'var(--warning)', border: 'rgba(245, 158, 11, 0.2)' },
      critical: { bg: 'rgba(239, 68, 68, 0.08)', text: 'var(--critical)', border: 'rgba(239, 68, 68, 0.2)' }
    };
    const sc = statusColors[data.status] || statusColors.warning;

    return (
      <div className="barq-card" style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', padding: '1.75rem', height: '100%' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '1rem' }}>
          <h3 style={{ margin: 0, fontSize: '1.1rem', fontWeight: 700, color: 'var(--text-main)' }}>{data.title}</h3>
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '0.25rem', flexShrink: 0 }}>
            <span style={{ fontSize: '1.5rem', fontWeight: 800, color: sc.text }}>{value || 'N/A'}</span>
            <span className="barq-status-badge" style={{ background: sc.bg, color: sc.text, border: `1px solid ${sc.border}`, fontSize: '0.65rem', padding: '0.15rem 0.5rem' }}>
              {data.label}
            </span>
          </div>
        </div>

        <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
          <strong>What it means:</strong> {data.explanation}
        </p>

        <div style={{ background: 'rgba(0,0,0,0.02)', padding: '1rem', borderRadius: '0.75rem', fontSize: '0.85rem', flexGrow: 1, display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
          <p style={{ margin: 0, color: 'var(--text-main)', lineHeight: '1.4' }}>
            <strong>Why it matters:</strong> {data.impact}
          </p>
          <p style={{ margin: 0, color: 'var(--primary)', fontWeight: 500, lineHeight: '1.4' }}>
            <strong>How to fix:</strong> {data.fix}
          </p>
        </div>
      </div>
    );
  };

  const currentStrategyData = deviceStrategy === 'mobile' ? current?.mobile : current?.desktop;
  const analysis = getOverallAnalysis(currentStrategyData?.score || 0);

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

      {/* Tab Selector */}
      <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '2rem' }}>
        <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.04)', padding: '4px', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
          <button
            className="barq-btn"
            style={{
              padding: '0.5rem 1.5rem',
              fontSize: '0.85rem',
              borderRadius: '0.75rem',
              background: activeTab === 'friendly' ? 'white' : 'transparent',
              color: activeTab === 'friendly' ? 'var(--primary)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'friendly' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer'
            }}
            onClick={() => setActiveTab('friendly')}
          >
            Easy-to-Read Summary
          </button>
          <button
            className="barq-btn"
            style={{
              padding: '0.5rem 1.5rem',
              fontSize: '0.85rem',
              borderRadius: '0.75rem',
              background: activeTab === 'technical' ? 'white' : 'transparent',
              color: activeTab === 'technical' ? 'var(--primary)' : 'var(--text-secondary)',
              boxShadow: activeTab === 'technical' ? '0 4px 12px rgba(0,0,0,0.05)' : 'none',
              border: 'none',
              fontWeight: 600,
              cursor: 'pointer'
            }}
            onClick={() => setActiveTab('technical')}
          >
            Technical Metrics
          </button>
        </div>
      </div>

      {activeTab === 'friendly' ? (
        <div>
          {/* Strategy Device Selector */}
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem', flexWrap: 'wrap', gap: '1rem' }}>
            <h2 style={{ fontSize: '1.3rem', margin: 0, display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              {deviceStrategy === 'mobile' ? <Smartphone size={22} color="var(--primary)" /> : <Monitor size={22} color="var(--secondary)" />}
              {deviceStrategy === 'mobile' ? 'Mobile Speed Analysis' : 'Desktop Speed Analysis'}
            </h2>
            <div style={{ display: 'inline-flex', background: 'rgba(0,0,0,0.03)', padding: '3px', borderRadius: '0.75rem', border: '1px solid var(--glass-border)' }}>
              <button
                style={{
                  border: 'none',
                  padding: '0.4rem 1.25rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '0.6rem',
                  background: deviceStrategy === 'mobile' ? 'white' : 'transparent',
                  color: deviceStrategy === 'mobile' ? 'var(--primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  boxShadow: deviceStrategy === 'mobile' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setDeviceStrategy('mobile')}
              >
                Mobile
              </button>
              <button
                style={{
                  border: 'none',
                  padding: '0.4rem 1.25rem',
                  fontSize: '0.8rem',
                  fontWeight: 600,
                  borderRadius: '0.6rem',
                  background: deviceStrategy === 'desktop' ? 'white' : 'transparent',
                  color: deviceStrategy === 'desktop' ? 'var(--primary)' : 'var(--text-secondary)',
                  cursor: 'pointer',
                  boxShadow: deviceStrategy === 'desktop' ? '0 2px 8px rgba(0,0,0,0.05)' : 'none',
                  transition: 'all 0.2s ease'
                }}
                onClick={() => setDeviceStrategy('desktop')}
              >
                Desktop
              </button>
            </div>
          </div>

          {/* Overall Analysis Card */}
          <div style={{ background: analysis.bg, border: `1px solid ${analysis.color}`, borderRadius: '1.5rem', padding: '2rem', marginBottom: '2.5rem', display: 'flex', gap: '1.5rem', alignItems: 'center', flexWrap: 'wrap' }}>
            <div style={{ fontSize: '3rem', fontWeight: 800, color: 'white', background: analysis.color, border: `4px solid white`, boxShadow: '0 8px 24px rgba(0,0,0,0.08)', width: '88px', height: '88px', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              {currentStrategyData?.score || 0}
            </div>
            <div style={{ flex: 1, minWidth: '250px' }}>
              <h3 style={{ margin: '0 0 0.5rem 0', color: 'var(--text-main)', fontSize: '1.25rem', fontWeight: 700 }}>{analysis.title}</h3>
              <p style={{ margin: 0, color: 'var(--text-muted)', fontSize: '0.95rem', lineHeight: '1.5' }}>{analysis.description}</p>
            </div>
          </div>

          {/* Friendly Cards Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: '2rem', marginBottom: '3rem' }}>
            <FriendlyCard metricKey="fcp" value={currentStrategyData?.metrics?.fcp} />
            <FriendlyCard metricKey="lcp" value={currentStrategyData?.metrics?.lcp} />
            <FriendlyCard metricKey="tbt" value={currentStrategyData?.metrics?.tbt} />
            <FriendlyCard metricKey="cls" value={currentStrategyData?.metrics?.cls} />
          </div>
        </div>
      ) : (
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
      )}

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
                {!localSettings.is_pro && <span className="barq-status-badge status-warning" style={{ fontSize: '0.6rem' }}>PRO ONLY</span>}
              </div>
              <textarea
                value={localSettings.pro_emails}
                onChange={e => localSettings.is_pro && setLocalSettings({ ...localSettings, pro_emails: e.target.value })}
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
                <Toggle label="Fault Warnings" value={localSettings.monitor_faults} onChange={v => setLocalSettings({ ...localSettings, monitor_faults: v })} />
                <Toggle label="Backup Reports" value={localSettings.monitor_backups} onChange={v => setLocalSettings({ ...localSettings, monitor_backups: v })} />
                <Toggle label="Health Status" value={localSettings.monitor_health} onChange={v => setLocalSettings({ ...localSettings, monitor_health: v })} />
              </div>
            </div>

            <div style={{ opacity: localSettings.is_pro ? 1 : 0.6 }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginBottom: '1.5rem' }}>
                <h2 style={{ margin: 0, fontSize: '1.1rem' }}>SNS Triggers (AWS Pro)</h2>
                {!localSettings.is_pro && <span className="barq-status-badge status-warning" style={{ fontSize: '0.6rem' }}>PRO ONLY</span>}
              </div>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                <Toggle label="SNS for Faults" value={localSettings.sns_faults} onChange={v => setLocalSettings({ ...localSettings, sns_faults: v })} disabled={!localSettings.is_pro} />
                <Toggle label="SNS for Backups" value={localSettings.sns_backups} onChange={v => setLocalSettings({ ...localSettings, sns_backups: v })} disabled={!localSettings.is_pro} />
                <Toggle label="SNS for Health" value={localSettings.sns_health} onChange={v => setLocalSettings({ ...localSettings, sns_health: v })} disabled={!localSettings.is_pro} />
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

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2rem' }}>
        <div className="barq-card">
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><ShieldCheck size={20} color="var(--primary)" /> Licensing & Tier</h2>
          <div style={{ padding: '1.5rem', background: 'rgba(99, 102, 241, 0.05)', borderRadius: '1rem', border: '1px solid var(--glass-border)' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <div>
                <h3 style={{ margin: 0 }}>Pro Status</h3>
                <p style={{ margin: '0.25rem 0 0 0', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Enable advanced cloud features and recovery</p>
              </div>
              <label className="barq-switch">
                <input
                  type="checkbox"
                  checked={localSettings.is_pro}
                  onChange={e => setLocalSettings({ ...localSettings, is_pro: e.target.checked })}
                />
                <span className="barq-slider"></span>
              </label>
            </div>
          </div>
          <p style={{ marginTop: '1.5rem', fontSize: '0.85rem', color: 'var(--text-muted)', textAlign: 'center' }}>
            Note: AWS configurations can be overridden below for custom setups.
          </p>
        </div>

        <div className="barq-card">
          <h2 style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}><HardDrive size={20} color="var(--secondary)" /> Plan & AWS Status</h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(52, 211, 153, 0.1)', borderRadius: '0.75rem', border: '1px solid rgba(52, 211, 153, 0.2)' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: 'var(--healthy)', fontWeight: 600, marginBottom: '0.25rem' }}>
                <CheckCircle size={16} /> AWS Managed by Developer
              </div>
              <p style={{ margin: 0, fontSize: '0.8rem', color: 'var(--text-secondary)' }}>You don't need to configure your own S3 bucket. We handle the cloud infrastructure for you.</p>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Current Plan:</span>
                <span style={{ fontWeight: 700, textTransform: 'uppercase', color: 'var(--primary)' }}>{localSettings.plan}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Storage Quota:</span>
                <span>{localSettings.plan === 'agency' ? '5GB' : (localSettings.plan === 'pro_plus' ? '2GB' : '500MB')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>Backup Frequency:</span>
                <span>{localSettings.plan === 'agency' ? 'Hourly' : (localSettings.plan === 'pro_plus' ? '6 Hours' : 'Daily')}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.9rem' }}>
                <span style={{ color: 'var(--text-muted)' }}>File Restrictions:</span>
                <span>Media & Logs excluded</span>
              </div>
            </div>
          </div>
        </div>
      </div>
      <style>{`
        .barq-input {
          width: 100%;
          padding: 0.75rem;
          background: rgba(0,0,0,0.05);
          border: 1px solid var(--glass-border);
          border-radius: 0.5rem;
          color: var(--text-main);
          font-family: inherit;
        }
        .barq-input:focus {
          outline: none;
          border-color: var(--primary);
          background: rgba(255,255,255,0.8);
        }
      `}</style>
    </div>
  );
}

function ProgressModal({ isOpen, title, status, steps, currentStep, onClose, error }) {
  if (!isOpen) return null;

  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.5)', backdropFilter: 'blur(4px)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 10000, animation: 'fadeIn 0.2s ease-out' }}>
      <div className="barq-card" style={{ width: '100%', maxWidth: '450px', padding: '2rem', textAlign: 'center' }}>
        {!error && currentStep < steps.length - 1 && (
          <button onClick={onClose} style={{ position: 'absolute', top: '1.25rem', right: '1.25rem', background: 'transparent', border: 'none', cursor: 'pointer', color: 'var(--text-muted)' }}>
            <X size={20} />
          </button>
        )}

        <h2 style={{ marginBottom: '1.5rem' }}>{title}</h2>

        <div style={{ marginBottom: '2rem' }}>
          {error ? (
            <div style={{ width: '64px', height: '64px', background: 'rgba(239, 68, 68, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
              <AlertTriangle size={32} color="var(--critical)" />
            </div>
          ) : (
            currentStep === steps.length - 1 ? (
              <div style={{ width: '64px', height: '64px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1rem' }}>
                <CheckCircle size={32} color="var(--healthy)" />
              </div>
            ) : (
              <div style={{ position: 'relative', width: '80px', height: '80px', margin: '0 auto 1rem' }}>
                <Loader2 size={80} color="var(--primary)" className="spin" style={{ opacity: 0.2 }} />
                <Loader2 size={80} color="var(--primary)" className="spin" style={{ position: 'absolute', top: 0, left: 0, clipPath: `inset(0 0 ${100 - ((currentStep + 1) / steps.length * 100)}% 0)` }} />
              </div>
            )
          )}
          <p style={{ fontWeight: 600, fontSize: '1.1rem', color: error ? 'var(--critical)' : 'var(--text-main)' }}>
            {error || status}
          </p>
        </div>

        <div style={{ textAlign: 'left', background: 'rgba(0,0,0,0.03)', borderRadius: '1rem', padding: '1rem' }}>
          {steps.map((step, idx) => (
            <div key={idx} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem', opacity: idx > currentStep ? 0.4 : 1 }}>
              {idx < currentStep ? <CheckCircle size={16} color="var(--healthy)" /> : (idx === currentStep && !error ? <Loader2 size={16} color="var(--primary)" className="spin" /> : <div style={{ width: 16, height: 16, borderRadius: '50%', border: '2px solid var(--text-muted)' }} />)}
              <span style={{ fontSize: '0.9rem', fontWeight: idx === currentStep ? 600 : 400 }}>{step}</span>
            </div>
          ))}
        </div>

        {(error || currentStep === steps.length - 1) && (
          <button className="barq-btn barq-btn-primary" style={{ width: '100%', justifyContent: 'center', marginTop: '2rem' }} onClick={onClose}>
            {error ? 'Close & Fix' : 'Finish'}
          </button>
        )}
      </div>
      <style>{`
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        .spin { animation: spin 1s linear infinite; }
      `}</style>
    </div>
  );
}

function UpgradeView({ currentPlan, onBack, onDemoUpgrade }) {
  const planLevels = {
    free: 0,
    freemium: 1,
    premium_30k: 2,
    pro: 3,
    pro_plus: 4,
    agency: 5
  };
  const currentLevel = planLevels[currentPlan] || 0;

  const plans = [
    {
      id: 'free',
      name: 'Free Plan',
      price: 'Free',
      period: '',
      color: '#6b7280',
      icon: Server,
      features: ['Disk Storage View Only', 'No Backups Included', 'No Automatic Detection', 'No Real-time Alerts'],
      note: 'Simple storage check'
    },
    {
      id: 'standard',
      name: 'standard',
      price: 'Free',
      period: ' (Freemium)',
      color: 'var(--secondary)',
      icon: Database,
      features: ['Local Manual Backups', 'Disk Storage View', 'No Automated Backups', 'No AWS integration'],
      note: 'Basic local protection'
    },
    {
      id: 'premium',
      name: 'Premium',
      price: '₦30k',
      period: '/mo',
      color: 'var(--primary)',
      icon: Activity,
      features: ['Manual Backups up to 5 GB', 'Automatic Daily Backups', 'Automatic Fault Detection', 'No AWS Cloud backup'],
      note: 'For professional websites',
      popular: true
    },
    {
      id: 'pro',
      name: 'Pro Cloud AWS',
      price: '$15',
      period: '/mo',
      color: '#10b981',
      icon: ShieldCheck,
      features: ['Offsite Amazon S3 Backups', '1-Click S3 Recovery', 'Amazon SNS Alerts', 'Lambda Security Monitoring'],
      note: 'Full AWS cloud power'
    }
  ];

  return (
    <div className="barq-dashboard-container">
      <header className="barq-header">
        <div className="barq-logo-wrapper">
          <button onClick={onBack} className="barq-btn barq-btn-outline" style={{ padding: '0.5rem' }}>
            <ChevronLeft size={24} />
          </button>
          <h1>Select Your Plan</h1>
        </div>
      </header>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))', gap: '2rem', marginBottom: '4rem' }}>
        {plans.map((plan) => {
          const isCurrent = plan.id === currentPlan;
          const targetLevel = planLevels[plan.id] || 0;
          const isDowngrade = targetLevel < currentLevel;

          let buttonText = 'Get Started';
          let buttonStyle = { width: '100%', justifyContent: 'center', background: plan.color, color: 'white', padding: '1rem', fontSize: '1.1rem', cursor: 'pointer' };
          let disabled = false;

          if (isCurrent) {
            buttonText = 'Current Plan';
            buttonStyle = {
              width: '100%',
              justifyContent: 'center',
              background: 'rgba(0, 0, 0, 0.05)',
              color: 'var(--text-muted)',
              border: '1px dashed var(--glass-border)',
              padding: '1rem',
              fontSize: '1.1rem',
              cursor: 'default'
            };
            disabled = true;
          } else {
            buttonText = isDowngrade ? 'Downgrade' : 'Upgrade';
            if (isDowngrade) {
              buttonStyle = {
                width: '100%',
                justifyContent: 'center',
                background: 'transparent',
                color: plan.color,
                border: `2px solid ${plan.color}`,
                padding: '1rem',
                fontSize: '1.1rem',
                cursor: 'pointer'
              };
            }
          }

          return (
            <div key={plan.id} className="barq-card" style={{ display: 'flex', flexDirection: 'column', padding: '2.5rem', border: isCurrent ? '2px solid var(--healthy)' : (plan.popular ? `2px solid ${plan.color}` : '1px solid var(--glass-border)'), position: 'relative' }}>
              {isCurrent && <span style={{ position: 'absolute', top: 0, left: '2rem', background: 'var(--healthy)', color: 'white', padding: '0.25rem 1rem', borderRadius: '0 0 1rem 1rem', fontSize: '0.8rem', fontWeight: 700 }}>ACTIVE PLAN</span>}
              {plan.popular && !isCurrent && <span style={{ position: 'absolute', top: 0, right: '2rem', background: plan.color, color: 'white', padding: '0.25rem 1rem', borderRadius: '0 0 1rem 1rem', fontSize: '0.8rem', fontWeight: 700 }}>MOST POPULAR</span>}

              <div style={{ marginBottom: '2rem' }}>
                <plan.icon size={48} color={plan.color} style={{ marginBottom: '1rem' }} />
                <h2 style={{ margin: 0, fontSize: '1.75rem' }}>{plan.name}</h2>
                <p style={{ color: 'var(--text-secondary)', fontSize: '0.9rem' }}>{plan.note}</p>
              </div>

              <div style={{ marginBottom: '2.5rem' }}>
                <span style={{ fontSize: '2.75rem', fontWeight: 800 }}>{plan.price}</span>
                <span style={{ color: 'var(--text-secondary)', fontSize: '1.1rem' }}>{plan.period}</span>
              </div>

              <ul style={{ listStyle: 'none', padding: 0, margin: '0 0 3rem 0', flex: 1, display: 'flex', flexDirection: 'column', gap: '1rem' }}>
                {plan.features.map((f, i) => (
                  <li key={i} style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', fontSize: '0.95rem' }}>
                    <CheckCircle size={18} color="var(--healthy)" /> {f}
                  </li>
                ))}
              </ul>

              <button
                className="barq-btn"
                style={buttonStyle}
                onClick={() => !disabled && onDemoUpgrade(plan)}
                disabled={disabled}
              >
                {buttonText}
              </button>
            </div>
          );
        })}
      </div>

      <div style={{ textAlign: 'center' }}>
        <button onClick={onBack} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', textDecoration: 'underline' }}>
          Back to Dashboard
        </button>
      </div>
    </div>
  );
}

function DemoUpgradeView({ settings, currentPlan, onUpdate, onBack, selectedPlan }) {
  const [step, setStep] = useState('checkout'); // checkout, processing, success
  const [loading, setLoading] = useState(false);

  const planLevels = {
    free: 0,
    freemium: 1,
    premium_30k: 2,
    pro: 3,
    pro_plus: 4,
    agency: 5
  };
  const isDowngrade = (planLevels[selectedPlan.id] || 0) < (planLevels[currentPlan] || 0);

  const handleDemoUpgrade = (toPlan = selectedPlan.id) => {
    setLoading(true);
    setStep('processing');

    const isProPlan = toPlan === 'pro' || toPlan === 'pro_plus' || toPlan === 'agency';

    setTimeout(() => {
      fetch(`${apiBase}/settings`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', 'X-WP-Nonce': window.wpApiSettings?.nonce },
        body: JSON.stringify({ ...settings, is_pro: isProPlan, plan: toPlan })
      })
        .then(res => res.json())
        .then(() => {
          setLoading(false);
          setStep('success');
          onUpdate({ ...settings, is_pro: isProPlan, plan: toPlan });
        });
    }, 2500);
  };

  return (
    <div className="barq-dashboard-container">
      <header className="barq-header">
        <div className="barq-logo-wrapper">
          <button onClick={onBack} className="barq-btn barq-btn-outline" style={{ padding: '0.5rem' }}>
            <ChevronLeft size={24} />
          </button>
          <h1>Demo Checkout</h1>
        </div>
      </header>

      <div className="barq-card" style={{ maxWidth: '500px', margin: '0 auto', textAlign: 'center', padding: '3rem 2rem' }}>
        {step === 'checkout' && (
          <>
            <CreditCard size={48} color={selectedPlan.color} style={{ marginBottom: '1.5rem' }} />
            <h2>{isDowngrade ? `Downgrade to ${selectedPlan.name}` : `Activate ${selectedPlan.name}`}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              {isDowngrade
                ? `Confirm your demo downgrade to the **${selectedPlan.name}**. Your settings and access levels will be updated.`
                : `Confirm your demo activation for the **${selectedPlan.name}**. No real payment is required.`}
            </p>
            <div style={{ background: 'rgba(0,0,0,0.03)', padding: '1.5rem', borderRadius: '1rem', marginBottom: '2rem', textAlign: 'left' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span>{selectedPlan.name} (Demo)</span>
                <strong>{selectedPlan.price === 'Free' ? '$0.00' : selectedPlan.price}</strong>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', color: 'var(--healthy)', fontWeight: 600 }}>
                <span>Demo Discount</span>
                <span>-{selectedPlan.price === 'Free' ? '$0.00' : selectedPlan.price}</span>
              </div>
              <div style={{ borderTop: '1px solid var(--border)', marginTop: '1rem', paddingTop: '1rem', display: 'flex', justifyContent: 'space-between', fontSize: '1.2rem', fontWeight: 700 }}>
                <span>Total Due</span>
                <span>$0.00</span>
              </div>
            </div>
            <button className="barq-btn" style={{ width: '100%', justifyContent: 'center', padding: '1rem', background: selectedPlan.color, color: 'white' }} onClick={() => handleDemoUpgrade()}>
              Confirm Plan Switch
            </button>
          </>
        )}

        {step === 'processing' && (
          <div style={{ padding: '2rem 0' }}>
            <Loader2 size={48} color={selectedPlan.color} className="spin" style={{ marginBottom: '1.5rem' }} />
            <h2>{isDowngrade ? 'Updating Plan...' : 'Provisioning Plan...'}</h2>
            <p style={{ color: 'var(--text-secondary)' }}>
              {isDowngrade
                ? `Updating your environment to the ${selectedPlan.name} tier.`
                : `Setting up ${selectedPlan.name} environment and cloud resources.`}
            </p>
          </div>
        )}

        {step === 'success' && (
          <>
            <div style={{ width: '80px', height: '80px', background: 'rgba(16, 185, 129, 0.1)', borderRadius: '50%', display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 1.5rem' }}>
              <CheckCircle size={48} color="var(--healthy)" />
            </div>
            <h2>{isDowngrade ? 'Plan Downgraded!' : 'Plan Activated!'}</h2>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
              {isDowngrade
                ? `Your account is now on the **${selectedPlan.name}**. Access permissions have been adjusted.`
                : `Your account is now on the **${selectedPlan.name}**. All associated features are now unlocked.`}
            </p>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
              <button className="barq-btn barq-btn-primary" style={{ width: '100%', justifyContent: 'center' }} onClick={onBack}>
                Go to Dashboard
              </button>
              <button className="barq-btn barq-btn-outline" style={{ width: '100%', justifyContent: 'center', fontSize: '0.8rem' }} onClick={() => handleDemoUpgrade('free')}>
                Reset to Free Tier
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  );
}


function Sidebar({ activeView, setView, plan, isCollapsed, onToggle }) {
  const isProAWS = plan === 'pro' || plan === 'pro_plus' || plan === 'agency';
  const menuItems = [
    { id: 'dashboard', label: 'Overview', icon: LayoutDashboard },
    { id: 'recovery', label: isProAWS ? 'Cloud Recovery' : 'Site Recovery', icon: RefreshCw, badge: plan !== 'free' ? (isProAWS ? 'Pro AWS' : 'Active') : null },
    { id: 'performance', label: 'Performance', icon: Zap },
    { id: 'notifications', label: 'Security Alerts', icon: BellRing },
    { id: 'settings', label: 'Global Settings', icon: Settings },
  ];

  return (
    <aside className={`barq-sidebar ${isCollapsed ? 'collapsed' : ''}`}>
      <button type="button" className="barq-collapse-btn" onClick={() => { console.log('Sidebar toggle clicked'); onToggle(); }}>
        {isCollapsed ? <ChevronRight size={18} /> : <ChevronLeft size={18} />}
      </button>


      <div className="barq-logo-wrapper">
        <Activity size={32} color="var(--primary)" />
        {!isCollapsed && <h1 style={{ fontSize: '1.5rem', margin: 0, fontWeight: 800, background: 'linear-gradient(135deg, var(--primary), var(--secondary))', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>WP BARQ</h1>}
      </div>

      <nav style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
        {menuItems.map(item => (
          <button
            key={item.id}
            type="button"
            className={`barq-nav-item ${activeView === item.id ? 'active' : ''}`}
            onClick={() => setView(item.id)}
            title={isCollapsed ? item.label : ''}
          >
            <item.icon size={20} />
            {!isCollapsed && <span className="barq-nav-label">{item.label}</span>}
            {!isCollapsed && item.badge && <span className="barq-badge">{item.badge}</span>}
          </button>
        ))}
      </nav>

      {!isCollapsed && (
        <div className="barq-sidebar-footer" style={{ marginTop: 'auto' }}>
          <div className="barq-card" style={{ padding: '1.25rem', background: 'rgba(99, 102, 241, 0.05)', textAlign: 'center' }}>
            <p style={{ margin: '0 0 1rem 0', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>Plan: <strong style={{ color: 'var(--primary)', textTransform: 'uppercase' }}>{plan}</strong></p>
            {plan === 'free' ? (
              <button className="barq-btn barq-btn-primary" style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem', justifyContent: 'center' }} onClick={() => setView('upgrade')}>
                Upgrade Plan
              </button>
            ) : (
              <button className="barq-btn barq-btn-outline" style={{ width: '100%', fontSize: '0.8rem', padding: '0.5rem', justifyContent: 'center' }} onClick={() => setView('upgrade')}>
                Change Plan
              </button>
            )}
          </div>
        </div>
      )}
    </aside>
  );
}

function OverviewPage({ health, pagespeed, onSync, loading, setView, plan }) {
  const isFree = plan === 'free';
  return (
    <div className="barq-main">
      <header className="barq-header">
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>System Health</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>Real-time status of your WordPress environment.</p>
        </div>
        <button className="barq-btn barq-btn-outline" onClick={onSync} disabled={loading}>
          <RefreshCw size={18} className={loading ? 'spin' : ''} /> {loading ? 'Syncing...' : 'Refresh Health'}
        </button>
      </header>

      <section style={{ marginBottom: '3rem' }}>
        {health ? (
          <div className="barq-grid">
            <StatusCard title="Server Status" value={health.status.toUpperCase()} status={health.status} icon={Server} time={`Last Sync: ${health.timestamp}`} />
            <StatusCard title="Disk Usage" value={health.metrics.disk_usage.value} status={health.metrics.disk_usage.status} icon={HardDrive} time={`Total: ${health.metrics.disk_usage.total}`} />
            <StatusCard
              title="PageSpeed"
              value={pagespeed?.current ? `${pagespeed.current.mobile.score}%` : 'N/A'}
              status={pagespeed?.current ? (pagespeed.current.mobile.score > 80 ? 'healthy' : 'warning') : 'warning'}
              icon={Zap}
              time="Mobile Performance Score"
              locked={isFree}
              onUnlock={() => setView('upgrade')}
            />
          </div>
        ) : (
          <div style={{ textAlign: 'center', padding: '4rem' }}>
            <Loader2 size={40} className="spin" color="var(--primary)" />
          </div>
        )}
      </section>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(400px, 1fr))', gap: '2rem', position: 'relative' }}>
        {isFree && (
          <div style={{
            position: 'absolute',
            inset: 0,
            background: 'rgba(255, 255, 255, 0.85)',
            backdropFilter: 'blur(4px)',
            display: 'flex',
            flexDirection: 'column',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 20,
            borderRadius: '1.5rem',
            border: '1px solid var(--glass-border)',
            gap: '1rem',
            padding: '2rem'
          }}>
            <ShieldAlert size={36} color="var(--primary)" />
            <div style={{ textAlign: 'center' }}>
              <h3 style={{ margin: '0 0 0.5rem 0' }}>Security Monitoring & Activity Log Locked</h3>
              <p style={{ margin: 0, color: 'var(--text-secondary)', fontSize: '0.9rem' }}>Upgrade to Premium or Pro to enable automated security scans and event tracking.</p>
            </div>
            <button className="barq-btn barq-btn-primary" onClick={() => setView('upgrade')}>View Plans</button>
          </div>
        )}
        <div className="barq-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <ShieldAlert size={24} color="var(--primary)" />
            <h3 style={{ margin: 0 }}>Security Events</h3>
          </div>
          <div style={{ color: 'var(--text-muted)', fontSize: '0.9rem', textAlign: 'center', padding: '2rem' }}>
            No security threats detected in the last 24 hours.
          </div>
        </div>
        <div className="barq-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '1.5rem' }}>
            <History size={24} color="var(--secondary)" />
            <h3 style={{ margin: 0 }}>Activity Log</h3>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {[1, 2, 3].map(i => (
              <div key={i} style={{ display: 'flex', gap: '1rem', paddingBottom: '1rem', borderBottom: '1px solid var(--border)', opacity: 0.7 }}>
                <div style={{ width: 8, height: 8, borderRadius: '50%', background: 'var(--primary)', marginTop: '0.4rem' }} />
                <div>
                  <p style={{ margin: 0, fontSize: '0.9rem', fontWeight: 500 }}>System Health Sync Completed</p>
                  <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{i} hour ago</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function RecoveryPage({ settings, onBackup, onRestore, backupStatus, restoreStatus, setView, backupsList, onListRefresh }) {
  const plan = settings?.plan || 'free';
  const isFree = plan === 'free';
  const isAws = plan === 'pro' || plan === 'pro_plus' || plan === 'agency';

  return (
    <div className="barq-main">
      <header className="barq-header">
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>
            {isAws ? 'Cloud Recovery' : 'Site Recovery'}
          </h2>
          <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>
            {isAws ? 'Manage your S3 snapshots and instant recovery.' : (isFree ? 'Manage backups and restore points.' : 'Manage local snapshots and instant recovery.')}
          </p>
        </div>
        {!isFree && onListRefresh && (
          <button className="barq-btn barq-btn-outline" onClick={onListRefresh}>
            <RefreshCw size={18} /> Refresh Backups
          </button>
        )}
      </header>

      {isFree ? (
        <div className="barq-card" style={{ padding: '4rem 2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center' }}>
          <Database size={64} color="var(--text-muted)" style={{ marginBottom: '1.5rem', opacity: 0.5 }} />
          <h2>Recovery Features Locked</h2>
          <p style={{ color: 'var(--text-secondary)', maxWidth: '500px', margin: '0.5rem auto 2rem' }}>
            Backups are not included in the Free plan. Upgrade to Freemium for free local backups, Premium for automatic daily backups, or Pro for off-site AWS S3 cloud recovery.
          </p>
          <button className="barq-btn barq-btn-primary" onClick={() => setView('upgrade')}>View Upgrades</button>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2.5rem' }}>
          <div className="barq-card" style={{ padding: '2.5rem', textAlign: 'center' }}>
            <Database size={64} color="var(--primary)" style={{ marginBottom: '1.5rem' }} />
            <h3>{isAws ? 'AWS Cloud Snapshot' : 'Local Site Snapshot'}</h3>
            <p style={{ color: 'var(--text-muted)', maxWidth: '400px', margin: '0 auto 2rem' }}>
              {isAws
                ? 'Create a complete backup of your database and files, stored in your managed S3 vault.'
                : 'Create a local backup archive of your database and files stored securely on this server.'}
            </p>
            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'center' }}>
              <button className="barq-btn barq-btn-primary" onClick={() => onBackup()}>
                <Play size={18} /> Start Backup
              </button>
              <button className="barq-btn barq-btn-outline" onClick={() => onRestore()} disabled={!backupsList || backupsList.length === 0}>
                <RefreshCw size={18} /> Restore Latest
              </button>
            </div>
          </div>

          <div className="barq-card">
            <h3 style={{ marginBottom: '1.5rem', fontSize: '1.1rem' }}>Statistics</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Storage Quota</span>
                <p style={{ margin: 0, fontSize: '1.25rem', fontWeight: 700 }}>
                  {plan === 'premium_30k' ? '5GB' : (plan === 'freemium' ? '500MB' : (plan === 'agency' ? '5GB' : (plan === 'pro_plus' ? '2GB' : '500MB')))}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Status</span>
                <p style={{ margin: 0, fontSize: '1.05rem', fontWeight: 600, color: 'var(--healthy)' }}>
                  {isAws ? 'Managed AWS Active' : 'Local Storage Active'}
                </p>
              </div>
              <div>
                <span style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>Plan Tier</span>
                <p style={{ margin: 0, fontSize: '1rem', fontWeight: 500, textTransform: 'uppercase', color: 'var(--primary)' }}>
                  {plan}
                </p>
              </div>
            </div>
          </div>
        </div>
      )}

      {!isFree && (
        <section className="barq-card" style={{ marginTop: '2.5rem' }}>
          <h2 style={{ fontSize: '1.3rem', marginBottom: '1.5rem' }}>Backup Archives ({isAws ? 'Amazon S3' : 'Local Storage'})</h2>
          <div className="barq-table-wrapper">
            <table className="barq-table">
              <thead>
                <tr>
                  <th>Archive Filename</th>
                  <th>Creation Date</th>
                  <th>File Size</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {backupsList && backupsList.map((backup, idx) => (
                  <tr key={idx}>
                    <td style={{ fontWeight: 600, color: 'var(--text-main)' }}>{backup.key}</td>
                    <td>{backup.date}</td>
                    <td>{(backup.size / 1024 / 1024).toFixed(1)} MB</td>
                    <td>
                      <button className="barq-btn barq-btn-outline" style={{ padding: '0.35rem 0.75rem', fontSize: '0.8rem' }} onClick={() => onRestore(backup.key)}>
                        Restore Point
                      </button>
                    </td>
                  </tr>
                ))}
                {(!backupsList || backupsList.length === 0) && (
                  <tr>
                    <td colSpan="4" style={{ textAlign: 'center', padding: '3rem', color: 'var(--text-muted)' }}>
                      No backup points found. Start a backup above.
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </section>
      )}
    </div>
  );
}

function PerformancePage({ pagespeed, onAudit, auditStatus, setView }) {
  return (
    <div className="barq-main">
      <header className="barq-header">
        <div>
          <h2 style={{ fontSize: '1.75rem', fontWeight: 700, margin: 0 }}>Performance</h2>
          <p style={{ color: 'var(--text-secondary)', margin: '0.25rem 0 0 0' }}>Google PageSpeed Insights integration.</p>
        </div>
        <button className="barq-btn barq-btn-primary" onClick={onAudit} disabled={auditStatus.includes('Audit')}>
          <RefreshCw size={18} className={auditStatus.includes('Running') ? 'spin' : ''} /> {auditStatus.includes('Running') ? 'Analyzing...' : 'New Audit'}
        </button>
      </header>

      {pagespeed?.current ? (
        <div className="barq-grid">
          <StatusCard
            title="Mobile Score"
            value={`${pagespeed.current.mobile.score}%`}
            status={pagespeed.current.mobile.score > 80 ? 'healthy' : 'warning'}
            icon={Smartphone}
            time={`Audit: ${pagespeed.current.timestamp}`}
            action={<button onClick={() => setView('report')} className="barq-btn barq-btn-outline" style={{ width: '100%', fontSize: '0.8rem' }}>Details</button>}
          />
          <StatusCard
            title="Desktop Score"
            value={`${pagespeed.current.desktop.score}%`}
            status={pagespeed.current.desktop.score > 80 ? 'healthy' : 'warning'}
            icon={Monitor}
            time={`Audit: ${pagespeed.current.timestamp}`}
            action={<button onClick={() => setView('report')} className="barq-btn barq-btn-outline" style={{ width: '100%', fontSize: '0.8rem' }}>Details</button>}
          />
        </div>
      ) : (
        <div className="barq-card" style={{ textAlign: 'center', padding: '4rem' }}>
          <Zap size={48} color="var(--warning)" style={{ marginBottom: '1.5rem' }} />
          <h3>No Audit Data</h3>
          <p style={{ color: 'var(--text-muted)' }}>Start your first performance audit to see insights.</p>
        </div>
      )}
    </div>
  );
}

function App() {
  const getInitialView = () => {
    const params = new URLSearchParams(window.location.search);
    const page = params.get('page');
    if (page === 'wp-barq-upgrade') return 'upgrade';
    if (page === 'wp-barq-notifications') return 'notifications';
    return 'dashboard';
  };
  const [view, setView] = useState(getInitialView);
  const [health, setHealth] = useState(null);
  const [pagespeed, setPagespeed] = useState(null);
  const [settings, setSettings] = useState(null);
  const [loading, setLoading] = useState(true);
  const [backupStatus, setBackupStatus] = useState('');
  const [restoreStatus, setRestoreStatus] = useState('');
  const [auditStatus, setAuditStatus] = useState('');
  const [selectedPlan, setSelectedPlan] = useState(null);
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [modal, setModal] = useState({ isOpen: false, title: '', status: '', steps: [], currentStep: 0, error: '' });
  const [backupsList, setBackupsList] = useState([]);

  useEffect(() => {
    fetchSettings();
    fetchHealth();
    fetchBackups();
  }, []);

  const fetchSettings = () => {
    fetch(`${apiBase}/settings`, {
      headers: { 'X-WP-Nonce': window.wpApiSettings?.nonce }
    })
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
      .then(async res => {
        const data = await res.json();
        if (!res.ok && res.status !== 503) {
          throw new Error(data.message || 'Failed to fetch health data');
        }
        return data;
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

  const fetchBackups = () => {
    fetch(`${apiBase}/backups`, {
      headers: { 'X-WP-Nonce': window.wpApiSettings?.nonce }
    })
      .then(res => res.json())
      .then(data => {
        if (Array.isArray(data)) {
          setBackupsList(data);
        }
      })
      .catch(err => console.error('Error fetching backups:', err));
  };

  const handleRunBackup = () => {
    const plan = settings?.plan || 'free';
    const isAws = plan === 'pro' || plan === 'pro_plus' || plan === 'agency';

    const steps = isAws
      ? ['Initializing environment', 'Dumping database', 'Compressing site files', 'Uploading to Amazon S3', 'Finalizing recovery package']
      : ['Initializing environment', 'Dumping database', 'Compressing site files', 'Verifying integrity', 'Saving recovery package'];

    setModal({
      isOpen: true,
      title: isAws ? 'Cloud Backup In Progress' : 'Local Backup In Progress',
      status: steps[0],
      steps,
      currentStep: 0,
      error: ''
    });

    const updateStep = (idx, status) => setModal(m => ({ ...m, currentStep: idx, status: status || steps[idx] }));

    setTimeout(() => updateStep(1), 800);

    fetch(`${apiBase}/backup`, {
      method: 'POST',
      headers: { 'X-WP-Nonce': window.wpApiSettings?.nonce }
    })
      .then(res => res.json())
      .then(data => {
        if (data.success || (data.file && !data.error)) {
          updateStep(2);
          setTimeout(() => updateStep(3), 1000);
          setTimeout(() => updateStep(4), 2000);
          setTimeout(() => {
            updateStep(5, 'Backup completed successfully!');
            setBackupStatus('Backup completed successfully!');
            fetchBackups();
            setTimeout(() => setBackupStatus(''), 5000);
          }, 3000);
        } else {
          setModal(m => ({ ...m, error: data.message || 'Backup failed. Ensure folder write permissions are enabled.' }));
        }
      })
      .catch((err) => {
        console.error('Backup Fetch Error:', err);
        setModal(m => ({ ...m, error: 'Network error or Timeout. The backup process might be too large for the current server limits.' }));
      });
  };

  const handleRunRestore = (backupKey = '') => {
    const plan = settings?.plan || 'free';
    const isAws = plan === 'pro' || plan === 'pro_plus' || plan === 'agency';

    const steps = isAws
      ? ['Connecting to S3', 'Downloading recovery vault', 'Extracting archives', 'Restoring database', 'Syncing file system']
      : ['Locating recovery archive', 'Verifying compression', 'Extracting archives', 'Restoring database', 'Syncing file system'];

    setModal({
      isOpen: true,
      title: isAws ? 'System Recovery In Progress' : 'Local Restore In Progress',
      status: steps[0],
      steps,
      currentStep: 0,
      error: ''
    });

    const updateStep = (idx, status) => setModal(m => ({ ...m, currentStep: idx, status: status || steps[idx] }));

    fetch(`${apiBase}/restore`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'X-WP-Nonce': window.wpApiSettings?.nonce
      },
      body: JSON.stringify({ key: backupKey })
    })
      .then(res => res.json())
      .then(data => {
        if (data.success) {
          updateStep(1);
          setTimeout(() => updateStep(2), 1500);
          setTimeout(() => updateStep(3), 3000);
          setTimeout(() => updateStep(4), 4500);
          setTimeout(() => {
            updateStep(5, 'Site restored successfully!');
            setRestoreStatus('Recovery completed successfully! Site is restored.');
            setTimeout(() => setRestoreStatus(''), 5000);
            fetchHealth();
          }, 6000);
        } else {
          setModal(m => ({ ...m, error: data.message || 'Recovery failed.' }));
        }
      })
      .catch(() => setModal(m => ({ ...m, error: 'Network error occurred during recovery.' })));
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

  if (!settings) return <div style={{ padding: '4rem', textAlign: 'center' }}><Loader2 size={40} className="spin" color="var(--primary)" /></div>;

  const renderContent = () => {
    return (
      <div className="barq-dashboard-layout">
        <Sidebar
          activeView={view}
          setView={setView}
          plan={settings?.plan || 'free'}
          isCollapsed={isSidebarCollapsed}
          onToggle={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
        />
        <div style={{ flex: 1, overflowY: 'auto' }}>
          {view === 'dashboard' && <OverviewPage health={health} pagespeed={pagespeed} onSync={fetchHealth} loading={loading} setView={setView} plan={settings?.plan || 'free'} />}
          {view === 'recovery' && <RecoveryPage settings={settings} onBackup={handleRunBackup} onRestore={handleRunRestore} backupStatus={backupStatus} restoreStatus={restoreStatus} setView={setView} backupsList={backupsList} onListRefresh={fetchBackups} />}
          {view === 'performance' && <PerformancePage pagespeed={pagespeed} onAudit={handleRunAudit} auditStatus={auditStatus} setView={setView} />}
          {view === 'settings' && <SettingsView settings={settings} onUpdate={setSettings} onBack={() => setView('dashboard')} />}
          {view === 'notifications' && <NotificationsView settings={settings} onUpdate={setSettings} onBack={() => setView('dashboard')} />}
          {view === 'report' && <ReportView pagespeed={pagespeed} onBack={() => setView('dashboard')} />}
          {view === 'upgrade' && <UpgradeView currentPlan={settings?.plan || 'free'} onBack={() => setView('dashboard')} onDemoUpgrade={(plan) => { setSelectedPlan(plan); setView('demo'); }} />}
          {view === 'demo' && <DemoUpgradeView settings={settings} currentPlan={settings?.plan || 'free'} onUpdate={(s) => { setSettings(s); fetchBackups(); }} onBack={() => setView('dashboard')} selectedPlan={selectedPlan} />}
        </div>
      </div>
    );
  };

  return (
    <>
      {renderContent()}
      <ProgressModal
        {...modal}
        onClose={() => setModal({ ...modal, isOpen: false })}
      />
    </>
  );
}

export default App
