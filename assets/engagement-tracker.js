// Simple engagement tracking for anti-link-farming signals
(function(){
  // Track user engagement signals
  let startTime = Date.now();
  let maxScroll = 0;
  let clicks = 0;
  
  // Track scroll depth
  window.addEventListener('scroll', () => {
    const scrollPercent = Math.round(
      (window.scrollY / (document.documentElement.scrollHeight - window.innerHeight)) * 100
    );
    maxScroll = Math.max(maxScroll, scrollPercent);
  }, { passive: true });
  
  // Track clicks on links
  document.addEventListener('click', (e) => {
    if(e.target.tagName === 'A' || e.target.closest('a')) {
      clicks++;
    }
  }, { passive: true });
  
  // Send engagement data when leaving page (beacon API)
  window.addEventListener('beforeunload', () => {
    const timeOnPage = Math.round((Date.now() - startTime) / 1000);
    const engagement = {
      time: timeOnPage,
      scroll: maxScroll,
      clicks: clicks,
      path: window.location.pathname
    };
    
    // Use sendBeacon for reliable delivery
    if(navigator.sendBeacon) {
      navigator.sendBeacon('/api/engagement', JSON.stringify(engagement));
    }
  });
  
  // Also track for analytics (if you add analytics later)
  if(typeof gtag !== 'undefined') {
    window.addEventListener('beforeunload', () => {
      gtag('event', 'page_engagement', {
        time_on_page: Math.round((Date.now() - startTime) / 1000),
        scroll_depth: maxScroll,
        link_clicks: clicks
      });
    });
  }
})();

