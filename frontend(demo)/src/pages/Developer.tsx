import React from 'react'

export default function Developer() {
  const handleNotifySubmit = (e: React.FormEvent) => {
    e.preventDefault()
    alert('Thank you! You have been added to the DocOC API waitlist. We will notify you upon launch.')
  }

  return (
    <div className="page-fade-in">
      {/* Profile Card Section - Dark Canvas */}
      <section className="product-tile-dark dev-profile-section">
        <div className="tile-content">
          <div className="dev-card">
            <div className="dev-avatar" style={{ display: 'grid', placeItems: 'center', width: 80, height: 80, borderRadius: '50%', background: 'var(--color-surface-2)', margin: '0 auto 15px', color: 'var(--color-accent-blue)' }}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                <path d="M20 21v-2a4 4 0 0 0-4-4H8a4 4 0 0 0-4 4v2" />
                <circle cx="12" cy="7" r="4" />
              </svg>
            </div>
            <div className="dev-name">Aditya Keerti</div>
            <div className="dev-title">Lead Developer & Architect</div>
            <p className="dev-bio">
              I build advanced neural layout parsers, deep transcript understanding models, and photography-first web applications. Feel free to reach out to collaborate.
            </p>
            <div className="dev-socials">
              <a href="https://adityakeerti.vercel.app" target="_blank" rel="noopener noreferrer" className="text-link">Portfolio</a>
              <span className="bullet-divider">•</span>
              <a href="https://x.com/adiFoundGlitch" target="_blank" rel="noopener noreferrer" className="text-link">Twitter</a>
              <span className="bullet-divider">•</span>
              <a href="mailto:adityacodes404@gmail.com" className="text-link">Email</a>
            </div>
          </div>
        </div>
      </section>

      {/* Code Snippet & Hosting Options Section */}
      <section className="product-tile-dark integration-section">
        <div className="tile-content">
          <h2 className="display-lg">API Integration & Hosting</h2>
          <p className="tile-lead" style={{ maxWidth: 650 }}>
            Query the pipeline using standard HTTP clients or set up a dedicated environment for your organization.
          </p>

          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))', gap: 30, width: '100%', alignItems: 'start' }}>
            
            {/* Left Column: API snippets - Premium Waitlist Visual */}
            <div className="integration-container">
              <div className="tab-header">
                <span className="visualizer-dot blinking"></span>
                <span style={{ fontSize: 13, fontWeight: 600, textTransform: 'uppercase', color: 'var(--color-ink)' }}>Public API Access</span>
                <span className="nav-badge" style={{ marginLeft: 'auto', animation: 'pulse-glow-blue 2s infinite' }}>Coming Soon</span>
              </div>
              <div className="code-block-wrapper" style={{ padding: '40px var(--space-lg)', display: 'flex', flexDirection: 'column', gap: 15, alignItems: 'center', justifyContent: 'center', minHeight: 250, textAlign: 'center', position: 'relative' }}>
                
                {/* Visual mock code background slightly blurred */}
                <div style={{ position: 'absolute', top: 20, left: 20, right: 20, bottom: 80, opacity: 0.04, fontFamily: 'monospace', fontSize: 11, textAlign: 'left', overflow: 'hidden', pointerEvents: 'none', lineHeight: 1.6, whiteSpace: 'pre-wrap' }}>
                  {`const dococ = require('@dococ/api');
const client = dococ.initialize({ apiKey: 'YOUR_KEY' });

client.transcripts.upload('./marksheet.pdf')
  .then(res => {
    console.log(\`Board: \${res.board}\`);
    console.log(res.data.subjects);
  });`}
                </div>
                <div style={{ animation: 'float-avatar 3s ease-in-out infinite', color: 'var(--color-accent-blue)', display: 'inline-flex' }}>
                  <svg width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <polygon points="13 2 3 14 12 14 11 22 21 10 12 10 13 2" />
                  </svg>
                </div>
                <h3 style={{ fontSize: 18, fontWeight: 600, zIndex: 1 }}>API Endpoint Under Active Development</h3>
                <p style={{ fontSize: 14, color: 'var(--color-ink-muted)', maxWidth: 320, lineHeight: 1.4, zIndex: 1 }}>
                  SDK integration guides, code client examples, and developer keys will be released in the upcoming public build.
                </p>

                {/* Waitlist form */}
                <form onSubmit={handleNotifySubmit} style={{ display: 'flex', gap: 8, width: '100%', maxWidth: 320, zIndex: 1, marginTop: 10 }}>
                  <input 
                    type="email" 
                    placeholder="Enter email for API waitlist" 
                    required 
                    className="edit-input" 
                    style={{ flex: 1, height: 36, fontSize: 13 }} 
                  />
                  <button type="submit" className="btn-primary" style={{ height: 36, fontSize: 13, padding: '0 12px' }}>
                    Notify Me
                  </button>
                </form>
              </div>
            </div>

            {/* Right Column: Custom Hosting Spotlights */}
            <div className="gradient-spotlight-card">
              <div className="card-badge-dot" style={{ backgroundColor: 'var(--color-primary)' }}></div>
              <div className="card-title">Dedicated Deployments & Hosting</div>
              <p className="card-desc" style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.4 }}>
                Want to run the YOLOv8 layout parser, face masking systems, and Table Transformer segments inside your own cloud setup? 
              </p>
              <p className="card-desc" style={{ fontSize: 14, color: 'rgba(255, 255, 255, 0.8)', lineHeight: 1.4 }}>
                I offer custom installation, deployment scripting, and private cloud hosting services to get your team a tailored instance running with 100% data sovereignty.
              </p>
              <a href="mailto:adityacodes404@gmail.com" className="btn-primary" style={{ width: 'fit-content', marginTop: 10, textDecoration: 'none' }}>
                Contact for Deployment
              </a>
            </div>

          </div>
        </div>
      </section>
    </div>
  )
}
