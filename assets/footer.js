// Footer include script - loads footer.html into elements with data-include="footer"
(function() {
  const footerElements = document.querySelectorAll('[data-include="footer"]');
  if (footerElements.length === 0) return;
  
  fetch('/assets/footer.html')
    .then(response => {
      if (!response.ok) throw new Error('Failed to load footer');
      return response.text();
    })
    .then(html => {
      footerElements.forEach(el => {
        el.innerHTML = html;
      });
    })
    .catch(err => {
      console.error('Error loading footer:', err);
      // Fallback footer if fetch fails
      footerElements.forEach(el => {
        el.innerHTML = `
          <footer style="margin-top: 64px; padding: 40px 0; border-top: 1px solid var(--border);">
            <div style="max-width: 1200px; margin: 0 auto; padding: 0 32px; text-align: center;">
              <p style="margin: 0 0 12px 0; color: var(--muted); font-size: 14px; line-height: 1.6;">
                Listed content belongs to publishers. Release Press Releases in Romania hub displays only summaries from public RSS feeds with press releases.
              </p>
              <p style="margin: 0; color: var(--muted); font-size: 14px;">
                © 2025 Release Press Releases in Romania. 
                <a href="/sitemap.xml" style="color: #4338ca; text-decoration: underline; font-weight: 500;">Sitemap</a> | 
                <a href="/feed.xml" style="color: #4338ca; text-decoration: underline; font-weight: 500;">RSS Feed</a>
              </p>
            </div>
          </footer>
        `;
      });
    });
})();

