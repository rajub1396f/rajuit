(function () {
  if (window.__rajuitVisitorTrackerLoaded) return;
  window.__rajuitVisitorTrackerLoaded = true;

  if (location.pathname.startsWith('/admin')) return;

  const VISITOR_KEY = 'rajuitVisitorId';
  const SESSION_KEY = 'rajuitVisitorSessionId';
  const HEARTBEAT_MS = 15000;

  let pageViewId = null;
  let startedAt = Date.now();
  let heartbeatTimer = null;

  function makeId(prefix) {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') {
      return `${prefix}_${window.crypto.randomUUID()}`;
    }
    return `${prefix}_${Date.now()}_${Math.random().toString(36).slice(2)}`;
  }

  function getVisitorId() {
    let visitorId = localStorage.getItem(VISITOR_KEY);
    if (!visitorId) {
      visitorId = makeId('v');
      localStorage.setItem(VISITOR_KEY, visitorId);
    }
    return visitorId;
  }

  function getSessionId() {
    let sessionId = sessionStorage.getItem(SESSION_KEY);
    if (!sessionId) {
      sessionId = makeId('s');
      sessionStorage.setItem(SESSION_KEY, sessionId);
    }
    return sessionId;
  }

  function getDeviceType() {
    const width = window.innerWidth || document.documentElement.clientWidth || 0;
    if (width <= 767) return 'Mobile';
    if (width <= 1024) return 'Tablet';
    return 'Desktop';
  }

  function getBrowser() {
    const ua = navigator.userAgent || '';
    if (ua.includes('Edg/')) return 'Edge';
    if (ua.includes('Chrome/')) return 'Chrome';
    if (ua.includes('Safari/') && !ua.includes('Chrome/')) return 'Safari';
    if (ua.includes('Firefox/')) return 'Firefox';
    return 'Unknown';
  }

  function getOs() {
    const ua = navigator.userAgent || '';
    if (ua.includes('Windows')) return 'Windows';
    if (ua.includes('Android')) return 'Android';
    if (ua.includes('iPhone') || ua.includes('iPad')) return 'iOS';
    if (ua.includes('Mac OS')) return 'macOS';
    if (ua.includes('Linux')) return 'Linux';
    return 'Unknown';
  }

  function getAuthHeaders() {
    const token = localStorage.getItem('token');
    return token ? { Authorization: `Bearer ${token}` } : {};
  }

  function getPayload() {
    return {
      visitorId: getVisitorId(),
      sessionId: getSessionId(),
      path: `${location.pathname}${location.search}`,
      title: document.title || '',
      referrer: document.referrer || '',
      language: navigator.language || '',
      timezone: Intl.DateTimeFormat().resolvedOptions().timeZone || '',
      screenSize: `${window.screen.width || 0}x${window.screen.height || 0}`,
      browser: getBrowser(),
      os: getOs(),
      deviceType: getDeviceType()
    };
  }

  async function postJson(url, body, keepalive) {
    const headers = {
      'Content-Type': 'application/json',
      ...getAuthHeaders()
    };

    return fetch(url, {
      method: 'POST',
      headers,
      body: JSON.stringify(body),
      credentials: 'same-origin',
      keepalive: Boolean(keepalive)
    });
  }

  async function startTracking() {
    try {
      const response = await postJson('/api/visitor/start', getPayload());
      if (!response.ok) return;
      const data = await response.json();
      pageViewId = data.pageViewId;
      scheduleHeartbeat();
    } catch (error) {
      console.debug('Visitor tracking start skipped:', error);
    }
  }

  function getDurationSeconds() {
    return Math.max(0, Math.round((Date.now() - startedAt) / 1000));
  }

  async function sendHeartbeat(keepalive) {
    if (!pageViewId) return;

    try {
      await postJson('/api/visitor/heartbeat', {
        visitorId: getVisitorId(),
        pageViewId,
        durationSeconds: getDurationSeconds(),
        path: `${location.pathname}${location.search}`,
        title: document.title || ''
      }, keepalive);
    } catch (error) {
      console.debug('Visitor tracking heartbeat skipped:', error);
    }
  }

  function scheduleHeartbeat() {
    if (heartbeatTimer) clearInterval(heartbeatTimer);
    heartbeatTimer = setInterval(() => {
      if (!document.hidden) sendHeartbeat(false);
    }, HEARTBEAT_MS);
  }

  document.addEventListener('visibilitychange', () => {
    if (document.hidden) {
      sendHeartbeat(true);
    } else {
      startedAt = Date.now() - getDurationSeconds() * 1000;
      sendHeartbeat(false);
    }
  });

  window.addEventListener('pagehide', () => sendHeartbeat(true));
  window.addEventListener('beforeunload', () => sendHeartbeat(true));

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', startTracking);
  } else {
    startTracking();
  }
})();
