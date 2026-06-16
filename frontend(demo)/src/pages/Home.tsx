import React from 'react'

interface HomeProps {
  onNavigateToWorkspace: () => void;
}

export default function Home({ onNavigateToWorkspace }: HomeProps) {
  return (
    <div className="page-fade-in">
      {/* Hero Section - Poster Layout */}
      <section className="product-tile-dark hero-section">
        <div className="tile-content">
          <span className="tile-tagline">DocOC Engine v5</span>
          <h1 className="display-xl hero-display">Verify & extract marksheet transcripts instantly.</h1>
          <p className="tile-lead" style={{ maxWidth: 700 }}>
            An advanced AI-powered pipeline designed to parse, verify, and digitize school and college marksheets. Automatically extracts structures, detects tables, masks faces, and reads content.
          </p>
          <div className="hero-actions">
            <button className="btn-primary" onClick={onNavigateToWorkspace}>
              Launch Workspace
            </button>
            <a href="#key-benefits" className="btn-secondary">
              Learn More
            </a>
          </div>

          {/* Premium CSS Interactive Mock Visualization */}
          <div className="hero-visual-container">
            <div className="hero-visual-card">
              <div className="scanner-line-glow"></div>
              <div className="visual-sheet">
                <div className="visual-header-row">
                  <div className="visual-logo-placeholder" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                    <svg className="logo-spark" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ color: 'var(--color-accent-blue)' }}>
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                    </svg>
                  </div>
                  <div className="visual-header-text">
                    <div className="text-line-thick"></div>
                    <div className="text-line-thin"></div>
                  </div>
                </div>
                
                <div className="visual-avatar-row">
                  <div className="visual-avatar-placeholder">
                    <div className="face-bounding-box">
                      <span className="box-tag">PII Masked</span>
                    </div>
                  </div>
                  <div className="visual-details-lines">
                    <div className="detail-line"></div>
                    <div className="detail-line short"></div>
                  </div>
                </div>

                <div className="visual-table-placeholder">
                  <div className="visual-table-row header">
                    <div className="col"></div>
                    <div className="col"></div>
                    <div className="col"></div>
                  </div>
                  <div className="visual-table-row">
                    <div className="col box-glow-blue"></div>
                    <div className="col box-glow-blue"></div>
                    <div className="col box-glow-blue"></div>
                  </div>
                  <div className="visual-table-row">
                    <div className="col"></div>
                    <div className="col"></div>
                    <div className="col"></div>
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Stats Display */}
          <div className="stats-grid">
            <div className="stat-item">
              <span className="stat-num">98%</span>
              <span className="stat-label">Layout Accuracy</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">&lt;1.5s</span>
              <span className="stat-label">Inference Time</span>
            </div>
            <div className="stat-item">
              <span className="stat-num">100%</span>
              <span className="stat-label">Secure Verification</span>
            </div>
          </div>
        </div>
      </section>

      {/* Benefits Section - Featuring Signature Gradient Spotlight Cards */}
      <section id="key-benefits" className="product-tile-dark">
        <div className="tile-content">
          <h2 className="display-lg">Built for Marksheet Parsing & Privacy</h2>
          <p className="tile-lead" style={{ maxWidth: 650 }}>
            Processing transcripts and credentials through layout-aware segmentation and secure masking.
          </p>

          <div className="features-grid">
            <div className="store-utility-card">
              <div className="card-badge-dot"></div>
              <div className="card-title">Dual OCR Pipeline</div>
              <div className="card-desc">
                Adapts dynamically to high-res scanner PDFs and low-contrast mobile snaps, pre-processing images before layout analysis.
              </div>
            </div>

            {/* Signature Violet Spotlight Card */}
            <div className="gradient-spotlight-card">
              <div className="card-badge-dot" style={{ backgroundColor: 'var(--color-primary)' }}></div>
              <div className="card-title">Automatic Face Masking</div>
              <div className="card-desc">
                Locates student photos with high-precision bounding boxes, masking PII face data at the browser/GPU boundary.
              </div>
            </div>

            {/* Signature Orange Spotlight Card */}
            <div className="gradient-spotlight-card-orange">
              <div className="card-badge-dot" style={{ backgroundColor: 'var(--color-primary)' }}></div>
              <div className="card-title">YOLOv8 & Custom Logo Detection</div>
              <div className="card-desc">
                Features a fine-tuned YOLOv8 model for precise layout table segmentation, alongside a custom logo detection classifier built from scratch to verify institution credentials.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Overview Interactive Promotion */}
      <section className="product-tile-dark promo-section">
        <div className="tile-content" style={{ alignItems: 'center', textAlign: 'center' }}>
          <h2 className="display-lg">Ready to test the models?</h2>
          <p className="tile-lead" style={{ maxWidth: 580 }}>
            Load actual board marksheets or semesters results directly inside our Workspace configurator and see extraction in action.
          </p>
          <button className="btn-primary" onClick={onNavigateToWorkspace} style={{ marginTop: 16 }}>
            Launch Workspace
          </button>
        </div>
      </section>
    </div>
  )
}
