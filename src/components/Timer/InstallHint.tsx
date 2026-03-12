import React, { useEffect, useState } from 'react';

const INSTALL_HINT_KEY = 'TimelyTasker:InstallHintDismissed';

type Platform = 'mac-safari' | 'mac-other' | 'iphone' | null;

const detectPlatform = (): Platform => {
  const ua = navigator.userAgent;
  const isStandalone =
    window.matchMedia('(display-mode: standalone)').matches ||
    (navigator as any).standalone === true;

  if (isStandalone) return null;

  // iPhone / iPad in Safari (not Chrome for iOS, Firefox for iOS, or GSA)
  if (/iPhone|iPad/i.test(ua) && /Safari/i.test(ua) && !/CriOS|FxiOS|GSA/.test(ua)) {
    return 'iphone';
  }

  // Mac — maxTouchPoints < 2 excludes iPad "Request Desktop Website" spoofing
  if (/Macintosh/i.test(ua) && navigator.maxTouchPoints < 2) {
    const isSafari = /Safari/i.test(ua) && !/Chrome|Chromium|Firefox|Edg/i.test(ua);
    return isSafari ? 'mac-safari' : 'mac-other';
  }

  return null;
};

const ShareIcon = () => (
  <svg
    width="12"
    height="12"
    viewBox="0 0 24 24"
    fill="none"
    stroke="currentColor"
    strokeWidth="2.5"
    strokeLinecap="round"
    strokeLinejoin="round"
    className="install-hint-share-svg"
  >
    <polyline points="12 2 12 15" />
    <polyline points="7 7 12 2 17 7" />
    <path d="M5 16v2a2 2 0 002 2h10a2 2 0 002-2v-2" />
  </svg>
);

const InstallHint = () => {
  const [visible, setVisible] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [copied, setCopied] = useState(false);
  const platform = detectPlatform();

  const dismiss = () => {
    setLeaving(true);
    setTimeout(() => {
      setVisible(false);
      localStorage.setItem(INSTALL_HINT_KEY, 'yes');
    }, 400);
  };

  const copyLink = () => {
    navigator.clipboard.writeText(window.location.href).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    });
  };

  useEffect(() => {
    if (!platform) return;
    if (localStorage.getItem(INSTALL_HINT_KEY)) return;
    const t = setTimeout(() => setVisible(true), 1400);
    return () => clearTimeout(t);
  }, [platform]);

  if (!visible || !platform) return null;

  return (
    <div className={`install-hint ${leaving ? 'install-hint--leaving' : ''}`}>
      {platform === 'mac-safari' && (
        <>
          <span className="install-hint-emoji">🖥️</span>
          <span className="install-hint-text">
            <strong>Add to Dock</strong>
            {' — '}Safari › File › <em>Add to Dock…</em>
          </span>
        </>
      )}

      {platform === 'mac-other' && (
        <>
          <span className="install-hint-emoji">🧭</span>
          <span className="install-hint-text">
            Open in <strong>Safari</strong> to add Timely Tasker to your Dock
          </span>
          <button className="install-hint-copy" onClick={copyLink}>
            {copied ? '✓ copied' : 'copy link'}
          </button>
        </>
      )}

      {platform === 'iphone' && (
        <>
          <span className="install-hint-emoji">📲</span>
          <span className="install-hint-text">
            <strong>Add to Home Screen</strong>
            {' — tap '}
            <span className="install-hint-share-badge"><ShareIcon /></span>
            {' then '}
            <em>Add to Home Screen</em>
          </span>
        </>
      )}

      <button className="install-hint-close" onClick={dismiss} aria-label="Dismiss">
        ✕
      </button>
    </div>
  );
};

export default InstallHint;
