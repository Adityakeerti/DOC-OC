import React from 'react'

export default function Technology() {
  return (
    <div className="page-fade-in">
      {/* Technology Hero Section - Dark Canvas */}
      <section className="product-tile-dark tech-hero-section">
        <div className="tile-content">
          <span className="tile-tagline">Architectural Pipeline</span>
          <h1 className="display-xl hero-display">High-Fidelity Document Processing</h1>
          <p className="tile-lead" style={{ maxWidth: 700 }}>
            DocOC AI combines YOLO-based layout detection, Table Transformer layout parsers, and large language model semantic synthesis into a single, high-accuracy processing pipeline.
          </p>
        </div>
      </section>

      {/* Visual Flowchart representation */}
      <section className="product-tile-dark flowchart-section">
        <div className="tile-content">
          <h2 className="display-lg">The Extraction Flow</h2>
          <p className="tile-lead" style={{ maxWidth: 600 }}>
            Here is how a marksheet file flows from ingestion to structured output:
          </p>

          <div className="visual-pipeline">
            <div className="pipeline-step">
              <div className="step-number">01</div>
              <div className="step-title">Ingestion & Pre-processing</div>
              <div className="step-desc">
                PDF conversion, skew correction, contrast correction, and file type validation.
              </div>
            </div>
            <div className="pipeline-arrow">➔</div>
            <div className="pipeline-step">
              <div className="step-number">02</div>
              <div className="step-title">YOLO Verification & Masking</div>
              <div className="step-desc">
                Detects student face coordinates and masks them to preserve privacy. Locates board stamps/logos.
              </div>
            </div>
            <div className="pipeline-arrow">➔</div>
            <div className="pipeline-step">
              <div className="step-number">03</div>
              <div className="step-title">Table Transformer Detection</div>
              <div className="step-desc">
                Segments layout structures and crops out specific tabular regions (Info & Marks tables).
              </div>
            </div>
            <div className="pipeline-arrow">➔</div>
            <div className="pipeline-step">
              <div className="step-number">04</div>
              <div className="step-title">Unstract LLM Extraction</div>
              <div className="step-desc">
                Extracts data using layout-aware spatial models, turning cropped pixels into semantic JSON outputs.
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Technology Specifications - Spotlight Gradients */}
      <section className="product-tile-dark specs-section">
        <div className="tile-content">
          <h2 className="display-lg">Model Specs & Integrations</h2>
          <p className="tile-lead" style={{ maxWidth: 650 }}>
            Deep learning architectures engineered for high precision extraction.
          </p>
          
          <div className="features-grid">
            {/* Spotlight Card 1: Violet */}
            <div className="gradient-spotlight-card">
              <div className="card-badge-dot" style={{ backgroundColor: 'var(--color-primary)' }}></div>
              <div className="card-title">Fine-Tuned YOLOv8 & Logo Parser</div>
              <div className="card-desc">
                Features a fine-tuned YOLOv8 model specialized for precise table detection, combined with a custom logo detection classifier built entirely from scratch to verify institution authority.
              </div>
            </div>

            {/* Spotlight Card 2: Magenta */}
            <div className="gradient-spotlight-card-magenta">
              <div className="card-badge-dot" style={{ backgroundColor: 'var(--color-primary)' }}></div>
              <div className="card-title">Hugging Face Transformers</div>
              <div className="card-desc">
                Utilizes the <code>microsoft/table-transformer-structure-recognition-v1.1-all</code> checkpoint via <code>timm</code> (PyTorch) to ensure robust layout cell segmentation.
              </div>
            </div>

            {/* Spotlight Card 3: Coral */}
            <div className="gradient-spotlight-card-coral">
              <div className="card-badge-dot" style={{ backgroundColor: 'var(--color-primary)' }}></div>
              <div className="card-title">Unstract LLM Client v2</div>
              <div className="card-desc">
                Utilizes specialized API routes designed to extract complex tables from raw documents, offering highly precise values even with unstructured headers.
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  )
}
