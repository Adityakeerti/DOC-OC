import React from 'react'
import type { PipelineStep } from './App'

const STEP_META: Record<string, { icon: string; label: string }> = {
  preprocess: { icon: '✂️', label: 'Preprocess' },
  logo:       { icon: '🔍', label: 'Logo Detection' },
  face:       { icon: '👤', label: 'Face / PII' },
  tables:     { icon: '📐', label: 'Table Segmentation' },
  ocr_marks:  { icon: '✍️', label: 'OCR · Marks Table' },
  ocr_info:   { icon: '✍️', label: 'OCR · Info Table' },
  extract:    { icon: '📦', label: 'JSON Extraction' },
}

interface WorkspaceProps {
  mode: 'school' | 'college';
  setMode: (mode: 'school' | 'college') => void;
  uploadCount: number;
  file: File | null;
  loading: boolean;
  error: string | null;
  result: any | null;
  detectedBoard: string;
  editable: boolean;
  setEditable: (editable: boolean) => void;
  localSubjects: any[];
  localInfo: any;
  processFile: (selectedFile: File, selectedMode: 'school' | 'college') => void;
  runSample: (filename: string, sampleMode: 'school' | 'college') => void;
  onDragOver: (e: React.DragEvent) => void;
  onDrop: (e: React.DragEvent) => void;
  onFileChange: (e: React.ChangeEvent<HTMLInputElement>) => void;
  handleCellChange: (idx: number, key: string, val: string) => void;
  schoolColumns: any[];
  collegeColumns: any[];
  isLimitReached: boolean;
  pipelineSteps: PipelineStep[];
}

export default function Workspace({
  mode, setMode, uploadCount, file, loading, error, result, detectedBoard,
  editable, setEditable, localSubjects, localInfo, processFile, runSample,
  onDragOver, onDrop, onFileChange, handleCellChange, schoolColumns, collegeColumns,
  isLimitReached, pipelineSteps,
}: WorkspaceProps) {

  return (
    <div className="page-fade-in">
      <section className="product-tile-dark workspace-config-section">
        <div className="tile-content">
          <h2 className="display-lg">Production Workspace</h2>
          <p className="tile-lead" style={{ maxWidth: 550 }}>
            Upload raw transcripts, graduation certificates, or class marksheets to trigger the automated extraction pipeline.
          </p>

          {/* ── LOADING: full takeover ── */}
          {loading && (
            <div style={{
              display: 'grid',
              gridTemplateColumns: '1fr 220px',
              gap: 20,
              marginTop: 20,
              animation: 'fadeInLoad 0.35s ease both',
            }}>
              {/* Left: live step list */}
              <PipelineStepList steps={pipelineSteps} />

              {/* Right: animated document mock */}
              <LoadingDocMock steps={pipelineSteps} />
            </div>
          )}

          {/* ── IDLE: configurator + dropzone ── */}
          {!loading && (
            <>
              {/* Configurator Option Chips */}
              <div className="configurator-row">
                <button 
                  className={`configurator-option-chip ${mode === 'school' ? 'selected' : ''}`}
                  onClick={() => setMode('school')}
                >
                  Secondary School Marksheet
                </button>
                <button 
                  className={`configurator-option-chip ${mode === 'college' ? 'selected' : ''}`}
                  onClick={() => setMode('college')}
                >
                  University Transcript
                </button>
              </div>

              {/* Core Interactive Dropzone */}
              <div className="dropzone-container">
                <label 
                  className={`dropzone ${isLimitReached ? 'disabled' : ''}`}
                  onDragOver={onDragOver}
                  onDrop={onDrop}
                >
                  <input 
                    type="file" 
                    disabled={isLimitReached} 
                    onChange={onFileChange}
                    accept=".pdf,image/*"
                    style={{ display: 'none' }}
                  />
                  <div className="upload-icon-wrapper">
                    <svg className="upload-icon-anim" width="36" height="36" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
                      <path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" />
                      <polyline points="17 8 12 3 7 8" />
                      <line x1="12" y1="3" x2="12" y2="15" />
                    </svg>
                  </div>
                  <h3 className="dz-title">Drag & drop files here</h3>
                  <p className="dz-desc">
                    Supports photographic transcript scans, multi-page PDFs, or direct camera snaps.
                  </p>
                  
                  <div className={`limit-tag ${uploadCount < 2 ? 'safe' : ''}`}>
                    {uploadCount < 2 ? `${2 - uploadCount} analysis allocations remaining` : 'Verification Quota Reached'}
                  </div>
                </label>
              </div>
            </>
          )}

          {/* Error Banner */}
          {error && (
            <div className="error-banner">
              <div>{error}</div>
              {isLimitReached && (
                <div style={{ marginTop: 8, fontSize: 13, opacity: 0.9 }}>
                  Interested in deploying this pipeline? Contact <a href="mailto:adityacodes404@gmail.com" className="text-link">adityacodes404@gmail.com</a>.
                </div>
              )}
            </div>
          )}

          {/* Samples Grid — only when idle */}
          {!result && !loading && (
            <div className="sample-section">
              <span className="sample-title">Pre-loaded Production Samples</span>
              <div className="sample-grid">
                <div className="sample-card" onClick={() => runSample('cbse_10th_sample.pdf', 'school')}>
                  <span className="sample-icon" style={{ display: 'inline-flex', color: 'var(--color-accent-blue)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </span>
                  <span className="sample-name">CBSE Class X</span>
                  <span className="sample-badge">CBSE-X.PDF</span>
                </div>
                <div className="sample-card" onClick={() => runSample('cbse_12th_sample.pdf', 'school')}>
                  <span className="sample-icon" style={{ display: 'inline-flex', color: 'var(--color-accent-blue)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                  </span>
                  <span className="sample-name">CBSE Class XII</span>
                  <span className="sample-badge">CBSE-XII.PDF</span>
                </div>
                <div className="sample-card" onClick={() => runSample('ICSE_10th_sample.jpg', 'school')}>
                  <span className="sample-icon" style={{ display: 'inline-flex', color: 'var(--color-accent-blue)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
                      <polyline points="14 2 14 8 20 8" />
                      <line x1="16" y1="13" x2="8" y2="13" />
                      <line x1="16" y1="17" x2="8" y2="17" />
                    </svg>
                  </span>
                  <span className="sample-name">ICSE Class X</span>
                  <span className="sample-badge">ICSE-X.JPG</span>
                </div>
                <div className="sample-card" onClick={() => runSample('ICSE_12th_sample.jpg', 'school')}>
                  <span className="sample-icon" style={{ display: 'inline-flex', color: 'var(--color-accent-blue)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <line x1="18" y1="20" x2="18" y2="10" />
                      <line x1="12" y1="20" x2="12" y2="4" />
                      <line x1="6" y1="20" x2="6" y2="14" />
                    </svg>
                  </span>
                  <span className="sample-name">ICSE Class XII</span>
                  <span className="sample-badge">ICSE-XII.JPG</span>
                </div>
                <div className="sample-card" onClick={() => runSample('1ST_SEM.pdf', 'college')}>
                  <span className="sample-icon" style={{ display: 'inline-flex', color: 'var(--color-accent-blue)' }}>
                    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M22 10v6M2 10l10-5 10 5-10 5z" />
                      <path d="M6 12v5c0 2 2 3 6 3s6-1 6-3v-5" />
                    </svg>
                  </span>
                  <span className="sample-name">Semester I</span>
                  <span className="sample-badge">SEM-I.PDF</span>
                </div>
              </div>
            </div>
          )}

          {/* Results Analysis Panel */}
          {result && !loading && (
            <div className="result-workspace-split">
              {/* Left Side: Dynamic Layout Segmentation Visualizer */}
              <div className="layout-parser-card">
                <div className="visualizer-header" style={{ display: 'flex', alignItems: 'center', gap: 8, flexWrap: 'wrap' }}>
                  <span className="visualizer-dot blinking"></span>
                  <span className="visualizer-title">Layout Segmentation Analysis</span>
                  {result.pipeline?.overall_status && (
                    <span style={{
                      marginLeft: 'auto',
                      fontSize: 11,
                      padding: '2px 8px',
                      borderRadius: 20,
                      fontWeight: 600,
                      background: result.pipeline.overall_status === 'valid_marksheet' ? 'rgba(34,197,94,0.15)' : 'rgba(251,191,36,0.15)',
                      color: result.pipeline.overall_status === 'valid_marksheet' ? '#16a34a' : '#b45309',
                      border: `1px solid ${result.pipeline.overall_status === 'valid_marksheet' ? '#16a34a40' : '#b4530940'}`,
                    }}>
                      {result.pipeline.overall_status.replace(/_/g, ' ').toUpperCase()}
                    </span>
                  )}
                </div>

                <LayoutVisualizer pipeline={result.pipeline} mode={mode} pipelineSteps={pipelineSteps} />

                {/* Detection summary chips */}
                <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginTop: 10 }}>
                  <DetChip
                    label="Board Logo"
                    value={result.pipeline?.logo?.board_name || (result.pipeline?.logo?.detected ? 'Detected' : 'Not found')}
                    ok={result.pipeline?.logo?.detected}
                  />
                  <DetChip
                    label="Photo / PII"
                    value={result.pipeline?.face?.detected ? 'Detected & masked' : 'Not found'}
                    ok={result.pipeline?.face?.detected}
                  />
                  <DetChip
                    label="Tables"
                    value={result.pipeline?.tables?.found ? `${result.pipeline.tables.count} region${result.pipeline.tables.count !== 1 ? 's' : ''}` : 'None'}
                    ok={result.pipeline?.tables?.found}
                  />
                </div>
              </div>

              {/* Right Side: Tabular Result sheet */}
              <div className="result-card">
                <div className="result-header">
                  <div>
                    <h2 style={{ fontSize: 21, fontWeight: 600 }}>Extracted Records</h2>
                    <span style={{ fontSize: 13, color: 'var(--color-ink-muted)' }}>
                      Verified Institution: <strong>{detectedBoard || 'College / Autonomous'}</strong>
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 12 }}>
                    <button className="btn-pearl-capsule" onClick={() => setEditable(!editable)}>
                      {editable ? 'Lock Fields' : 'Edit Fields'}
                    </button>
                    <button className="btn-primary" onClick={() => {
                      window.location.reload();
                    }} style={{ fontSize: 13, padding: '6px 14px' }}>
                      Clear Work
                    </button>
                  </div>
                </div>

                {/* School Mode Results */}
                {mode === 'school' && (
                  <>
                    {/* ── Info metadata: dynamic, covers CBSE / ICSE / UK fields ── */}
                    {(() => {
                      // Preferred display order for all boards
                      const INFO_ORDER = [
                        'student_name','roll_number','unique_id',
                        'school_name','school_code',
                        'mother_name','father_name',
                      ]
                      const toLabel = (k: string) => k.replace(/_/g,' ').replace(/\b\w/g, m => m.toUpperCase())
                      const fmt = (v: any) => (v === null || v === undefined || v === '') ? 'N/A' : String(v)

                      // Build ordered key list from actual data
                      const allKeys = Object.keys(localInfo).filter(k => k !== 'subjects' && k !== 'board')
                      const ordered: string[] = []
                      for (const k of INFO_ORDER) if (allKeys.includes(k)) ordered.push(k)
                      for (const k of allKeys) if (!ordered.includes(k)) ordered.push(k)
                      const visibleKeys = ordered.filter(k => localInfo[k] !== null && localInfo[k] !== undefined && localInfo[k] !== '')

                      if (!visibleKeys.length) return null
                      return (
                        <div className="metadata-grid">
                          {visibleKeys.map(k => (
                            <div className="meta-field" key={k}>
                              <span className="meta-label">{toLabel(k)}</span>
                              <span className="meta-val">{fmt(localInfo[k])}</span>
                            </div>
                          ))}
                        </div>
                      )
                    })()}

                    {/* ── Subjects marks table ── */}
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            {schoolColumns.map(col => (
                              <th key={col.key}>{col.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {localSubjects.map((row, idx) => (
                            <tr key={idx}>
                              {schoolColumns.map(col => {
                                const v = row[col.key]
                                const display = (v === null || v === undefined) ? '' : String(v)
                                return (
                                  <td key={col.key}>
                                    {editable ? (
                                      <input
                                        className="edit-input"
                                        value={display}
                                        onChange={(e) => handleCellChange(idx, col.key, e.target.value)}
                                      />
                                    ) : (
                                      display
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}

                {/* College Mode Results */}
                {mode === 'college' && (
                  <>
                    {/* ── College metadata: student + college + result sub-objects ── */}
                    {(() => {
                      const fmt = (v: any) => (v === null || v === undefined || v === '') ? 'N/A' : String(v)
                      const fields: { label: string; value: any }[] = []

                      // Student section
                      const s = localInfo.student || {}
                      if (s.name)          fields.push({ label: 'Student Name',   value: s.name })
                      if (s.roll_no)       fields.push({ label: 'Roll No',         value: s.roll_no })
                      if (s.enrollment_no) fields.push({ label: 'Enrollment No',   value: s.enrollment_no })
                      if (s.father_name)   fields.push({ label: "Father's Name",   value: s.father_name })

                      // College section
                      const c = localInfo.college || {}
                      if (c.course)   fields.push({ label: 'Course',   value: c.course })
                      if (c.semester) fields.push({ label: 'Semester', value: c.semester })
                      if (c.session)  fields.push({ label: 'Session',  value: c.session })

                      // Result section
                      const r = localInfo.result || {}
                      if (r.sgpa   != null) fields.push({ label: 'SGPA',             value: r.sgpa })
                      if (r.cgpa   != null) fields.push({ label: 'CGPA',             value: r.cgpa })
                      if (r.total_credits_registered != null) fields.push({ label: 'Credits Registered', value: r.total_credits_registered })
                      if (r.total_credits_earned     != null) fields.push({ label: 'Credits Earned',     value: r.total_credits_earned })
                      if (r.status) fields.push({ label: 'Status', value: r.status })

                      if (!fields.length) return null
                      return (
                        <div className="metadata-grid">
                          {fields.map((f, i) => (
                            <div className="meta-field" key={i}>
                              <span className="meta-label">{f.label}</span>
                              <span className="meta-val">{fmt(f.value)}</span>
                            </div>
                          ))}
                        </div>
                      )
                    })()}

                    {/* ── Subjects table ── */}
                    <div className="table-wrap">
                      <table>
                        <thead>
                          <tr>
                            {collegeColumns.map(col => (
                              <th key={col.key}>{col.label}</th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {localSubjects.map((row, idx) => (
                            <tr key={idx}>
                              {collegeColumns.map(col => {
                                const v = row[col.key]
                                const display = (v === null || v === undefined) ? '' : String(v)
                                return (
                                  <td key={col.key}>
                                    {editable ? (
                                      <input
                                        className="edit-input"
                                        value={display}
                                        onChange={(e) => handleCellChange(idx, col.key, e.target.value)}
                                      />
                                    ) : (
                                      display
                                    )}
                                  </td>
                                )
                              })}
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </>
                )}
              </div>
            </div>
          )}
        </div>
      </section>
    </div>
  )
}

// ─── Dynamic Layout Bounding Box Visualizer ──────────────────────────────────

function LayoutVisualizer({ pipeline, mode, pipelineSteps = [] }: { pipeline: any; mode: 'school' | 'college'; pipelineSteps?: any[] }) {
  // Document canvas is always portrait A4-ish (3:4 ratio)
  const W = 240
  const H = 320

  if (!pipeline) {
    return (
      <div style={{ height: H, display: 'grid', placeItems: 'center', color: 'var(--color-ink-muted)', fontSize: 13 }}>
        No pipeline data available
      </div>
    )
  }

  const tables: any[] = pipeline.tables?.items || []

  // For college mode we use fixed normalised boxes (same as backend)
  const collegeRegions = mode === 'college' ? [
    { label: 'Info Region', type: 'info', nx1: 0.395, ny1: 0.164, nw: 0.654, nh: 0.129, conf: null },
    { label: 'Marks Table', type: 'table', nx1: 0.493, ny1: 0.473, nw: 0.849, nh: 0.492, conf: null },
  ] : []

  // Determine image bounding box extent so we can normalise table coords
  // pipeline table coords are in absolute pixels of the uploaded image
  // We don't have image dimensions here, so we compute max extents from table boxes
  let imgW = 1, imgH = 1
  if (tables.length > 0) {
    tables.forEach(t => {
      imgW = Math.max(imgW, t.coordinates?.x2 || 0)
      imgH = Math.max(imgH, t.coordinates?.y2 || 0)
    })
  }

  // Colors
  const COLOR: Record<string, { stroke: string; fill: string; text: string }> = {
    logo:  { stroke: '#22c55e', fill: 'rgba(34,197,94,0.12)',  text: '#16a34a' },
    face:  { stroke: '#a78bfa', fill: 'rgba(167,139,250,0.12)', text: '#7c3aed' },
    table: { stroke: '#38bdf8', fill: 'rgba(56,189,248,0.10)', text: '#0369a1' },
    info:  { stroke: '#fb923c', fill: 'rgba(251,146,60,0.10)', text: '#c2410c' },
  }

  return (
    <div style={{ position: 'relative', margin: '12px 0', display: 'flex', justifyContent: 'center' }}>
      <svg
        width={W}
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        style={{
          background: '#1a1f2e',
          borderRadius: 10,
          border: '1px solid rgba(255,255,255,0.08)',
          display: 'block',
          overflow: 'visible',
        }}
      >
        {/* Document background lines (faint ruled-paper feel) */}
        {Array.from({ length: 18 }).map((_, i) => (
          <line key={i} x1={12} y1={24 + i * 16} x2={W - 12} y2={24 + i * 16}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        ))}

        {/* ── COLLEGE mode: fixed normalised regions ── */}
        {mode === 'college' && collegeRegions.map((r, i) => {
          const x = r.nx1 * W
          const y = r.ny1 * H
          const rw = r.nw * W
          const rh = r.nh * H
          const c = COLOR[r.type]
          return (
            <g key={i} style={{ animation: `fadeInBox 0.4s ease ${i * 0.15}s both` }}>
              <rect x={x} y={y} width={rw} height={rh}
                fill={c.fill} stroke={c.stroke} strokeWidth="1.5" strokeDasharray="4 2" rx="3" />
              <rect x={x} y={y} width={Math.min(rw, 100)} height={14} fill={c.stroke} rx="2" />
              <text x={x + 4} y={y + 10} fontSize="8" fill="#fff" fontFamily="monospace" fontWeight="600">
                {r.label.toUpperCase()}
              </text>
            </g>
          )
        })}

        {/* ── SCHOOL mode: dynamic detections ── */}
        {mode === 'school' && (
          <>
            {/* Logo — always at top ~10% of doc */}
            {pipeline.logo?.detected && (
              <g style={{ animation: 'fadeInBox 0.4s ease 0s both' }}>
                <rect x={W * 0.32} y={H * 0.02} width={W * 0.36} height={H * 0.1}
                  fill={COLOR.logo.fill} stroke={COLOR.logo.stroke} strokeWidth="1.5" rx="3" />
                <rect x={W * 0.32} y={H * 0.02} width={90} height={13} fill={COLOR.logo.stroke} rx="2" />
                <text x={W * 0.32 + 4} y={H * 0.02 + 9.5} fontSize="8" fill="#fff" fontFamily="monospace" fontWeight="600">
                  LOGO · {pipeline.logo.board_name}
                </text>
              </g>
            )}

            {/* Face — top-right ~15% of doc */}
            {pipeline.face?.detected && (
              <g style={{ animation: 'fadeInBox 0.4s ease 0.12s both' }}>
                <rect x={W * 0.72} y={H * 0.04} width={W * 0.22} height={H * 0.13}
                  fill={COLOR.face.fill} stroke={COLOR.face.stroke} strokeWidth="1.5" strokeDasharray="4 2" rx="3" />
                {/* Diagonal hatch to indicate PII mask */}
                {Array.from({ length: 6 }).map((_, hi) => (
                  <line key={hi}
                    x1={W * 0.72 + hi * 8} y1={H * 0.04}
                    x2={W * 0.72} y2={H * 0.04 + hi * 8}
                    stroke={COLOR.face.stroke} strokeWidth="0.7" opacity="0.4" />
                ))}
                <rect x={W * 0.72} y={H * 0.04} width={62} height={13} fill={COLOR.face.stroke} rx="2" />
                <text x={W * 0.72 + 4} y={H * 0.04 + 9.5} fontSize="8" fill="#fff" fontFamily="monospace" fontWeight="600">
                  PHOTO (PII)
                </text>
              </g>
            )}

            {/* Tables — real coordinates normalised to canvas */}
            {tables.map((t, i) => {
              const c = t.coordinates || {}
              const nx = (c.x1 || 0) / imgW
              const ny = (c.y1 || 0) / imgH
              const nw = ((c.x2 || 0) - (c.x1 || 0)) / imgW
              const nh = ((c.y2 || 0) - (c.y1 || 0)) / imgH
              const bx = nx * W
              const by = ny * H
              const bw = Math.max(nw * W, 20)
              const bh = Math.max(nh * H, 14)
              const isInfo = (t.table_type || '').toLowerCase().includes('info')
              const c2 = isInfo ? COLOR.info : COLOR.table
              const confPct = t.confidence ? Math.round(t.confidence * 100) : null
              const isOcrActive = pipelineSteps.some((s: any) =>
                ((isInfo && s.step === 'ocr_info') || (!isInfo && s.step === 'ocr_marks')) && s.status === 'running'
              )
              return (
                <g key={i} style={{ animation: `fadeInBox 0.4s ease ${0.25 + i * 0.12}s both` }}>
                  <rect x={bx} y={by} width={bw} height={bh}
                    fill={c2.fill} stroke={c2.stroke} strokeWidth="1.5" rx="3" />
                  {/* OCR writing animation: animated scan lines when this table is being read */}
                  {isOcrActive && (
                    <g clipPath={`url(#clip-${i})`}>
                      <clipPath id={`clip-${i}`}>
                        <rect x={bx} y={by} width={bw} height={bh} rx="3" />
                      </clipPath>
                      {Array.from({ length: Math.max(1, Math.floor(bh / 8)) }).map((_, li) => (
                        <line key={li}
                          x1={bx} y1={by + 4 + li * 8}
                          x2={bx + bw} y2={by + 4 + li * 8}
                          stroke={c2.stroke} strokeWidth="1.2" opacity="0.5"
                          strokeDasharray={`${bw * 0.6} ${bw}`}
                          style={{ animation: `writeScan 1.4s linear ${li * 0.08}s infinite` }}
                        />
                      ))}
                    </g>
                  )}
                  <rect x={bx} y={by} width={Math.min(bw, 130)} height={14} fill={c2.stroke} rx="2" />
                  <text x={bx + 4} y={by + 10} fontSize="8" fill="#fff" fontFamily="monospace" fontWeight="600">
                    {(t.table_type || 'TABLE').toUpperCase()}
                  </text>
                </g>
              )
            })}

            {/* Fallback if no tables but table found=true */}
            {pipeline.tables?.found && tables.length === 0 && (
              <g style={{ animation: 'fadeInBox 0.4s ease 0.25s both' }}>
                <rect x={W * 0.05} y={H * 0.45} width={W * 0.9} height={H * 0.42}
                  fill={COLOR.table.fill} stroke={COLOR.table.stroke} strokeWidth="1.5" rx="3" />
                <rect x={W * 0.05} y={H * 0.45} width={100} height={13} fill={COLOR.table.stroke} rx="2" />
                <text x={W * 0.05 + 4} y={H * 0.45 + 9.5} fontSize="8" fill="#fff" fontFamily="monospace" fontWeight="600">
                  MARKS TABLE
                </text>
              </g>
            )}
          </>
        )}

        {/* Coordinate legend (bottom) */}
        <text x={W / 2} y={H - 5} fontSize="7.5" fill="rgba(255,255,255,0.2)"
          textAnchor="middle" fontFamily="monospace">
          {mode === 'school'
            ? `YOLO+Haar · ${tables.length} table region${tables.length !== 1 ? 's' : ''}`
            : 'Fixed-format OCR regions'}
        </text>
      </svg>
      <style>{`
        @keyframes fadeInBox {
          from { opacity: 0; transform: translateY(6px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        @keyframes writeScan {
          from { stroke-dashoffset: 0; }
          to   { stroke-dashoffset: -240; }
        }
        svg g {
          transform-box: fill-box;
          transform-origin: center;
        }
      `}</style>
    </div>
  )
}

// ─── Small detection chip ─────────────────────────────────────────────────────

function DetChip({ label, value, ok }: { label: string; value: string; ok?: boolean }) {
  return (
    <div style={{
      display: 'inline-flex',
      flexDirection: 'column',
      gap: 2,
      padding: '5px 10px',
      borderRadius: 8,
      border: `1px solid ${ok ? 'rgba(34,197,94,0.25)' : 'rgba(255,255,255,0.08)'}`,
      background: ok ? 'rgba(34,197,94,0.07)' : 'rgba(255,255,255,0.03)',
      minWidth: 90,
    }}>
      <span style={{ fontSize: 9, color: 'rgba(255,255,255,0.35)', fontWeight: 600, letterSpacing: 0.5, textTransform: 'uppercase' }}>{label}</span>
      <span style={{ fontSize: 11, color: ok ? '#4ade80' : 'rgba(255,255,255,0.45)', fontWeight: 600 }}>{value}</span>
    </div>
  )
}

// ─── Live Pipeline Step List ──────────────────────────────────────────────────

function PipelineStepList({ steps }: { steps: any[] }) {
  return (
    <div style={{
      margin: '12px 0 8px',
      display: 'flex',
      flexDirection: 'column',
      gap: 0,
      borderRadius: 12,
      overflow: 'hidden',
      border: '1px solid rgba(255,255,255,0.07)',
      background: 'rgba(0,0,0,0.25)',
    }}>
      {steps.map((s, i) => {
        const meta = STEP_META[s.step] || { icon: '⚙️', label: s.step }
        const isRunning = s.status === 'running'
        const isDone    = s.status === 'done'
        const isIdle    = s.status === 'idle'
        return (
          <div key={s.step} style={{
            display: 'flex',
            alignItems: 'center',
            gap: 10,
            padding: '9px 14px',
            borderBottom: i < steps.length - 1 ? '1px solid rgba(255,255,255,0.05)' : 'none',
            background: isRunning ? 'rgba(99,102,241,0.12)' : 'transparent',
            transition: 'background 0.3s ease',
          }}>
            {/* Status icon */}
            <div style={{ width: 22, display: 'flex', justifyContent: 'center', flexShrink: 0 }}>
              {isDone && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#4ade80" strokeWidth="2.5"
                  strokeLinecap="round" strokeLinejoin="round"
                  style={{ animation: 'stepCheckIn 0.3s ease both' }}>
                  <polyline points="20 6 9 17 4 12" />
                </svg>
              )}
              {isRunning && (
                <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="#818cf8" strokeWidth="2.5"
                  style={{ animation: 'spinStep 0.9s linear infinite' }}>
                  <path d="M21 12a9 9 0 1 1-6.219-8.56" strokeLinecap="round"/>
                </svg>
              )}
              {isIdle && (
                <div style={{
                  width: 7, height: 7, borderRadius: '50%',
                  background: 'rgba(255,255,255,0.15)', margin: 'auto',
                }} />
              )}
            </div>
            {/* Step name */}
            <span style={{
              fontSize: 12,
              fontWeight: 600,
              color: isDone ? '#c7d2fe' : isRunning ? '#e0e7ff' : 'rgba(255,255,255,0.25)',
              fontFamily: 'monospace',
              minWidth: 140,
              transition: 'color 0.3s',
            }}>
              {meta.label}
            </span>
            {/* Label / message */}
            <span style={{
              fontSize: 11,
              color: isDone ? 'rgba(255,255,255,0.45)' : isRunning ? '#a5b4fc' : 'rgba(255,255,255,0.15)',
              flex: 1,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              whiteSpace: 'nowrap',
              transition: 'color 0.3s',
            }}>
              {isIdle ? '—' : s.label}
            </span>
            {/* Running pulse */}
            {isRunning && (
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: '#818cf8',
                animation: 'pulseDot 1s ease-in-out infinite',
                flexShrink: 0,
              }} />
            )}
          </div>
        )
      })}
      <style>{`
        @keyframes spinStep {
          from { transform: rotate(0deg); }
          to   { transform: rotate(360deg); }
        }
        @keyframes stepCheckIn {
          from { opacity: 0; transform: scale(0.5); }
          to   { opacity: 1; transform: scale(1); }
        }
        @keyframes pulseDot {
          0%, 100% { opacity: 1; transform: scale(1); }
          50%       { opacity: 0.4; transform: scale(0.6); }
        }
      `}</style>
    </div>
  )
}

// ─── Animated document mock shown while loading ───────────────────────────────

function LoadingDocMock({ steps }: { steps: any[] }) {
  const W = 180, H = 240

  const done  = (s: string) => steps.find(x => x.step === s)?.status === 'done'
  const run   = (s: string) => steps.find(x => x.step === s)?.status === 'running'
  const ocrMarksRun = run('ocr_marks')
  const ocrInfoRun  = run('ocr_info')

  return (
    <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
      <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`}
        style={{ background: '#1a1f2e', borderRadius: 10, border: '1px solid rgba(255,255,255,0.07)', display: 'block' }}>

        {/* Faint ruled lines — always visible */}
        {Array.from({ length: 14 }).map((_, i) => (
          <line key={i} x1={10} y1={18 + i * 16} x2={W - 10} y2={18 + i * 16}
            stroke="rgba(255,255,255,0.04)" strokeWidth="1" />
        ))}

        {/* ── Logo box — appears after logo step done ── */}
        {done('logo') && (
          <g style={{ animation: 'fadeInBox 0.4s ease both' }}>
            <rect x={W * 0.28} y={6} width={W * 0.44} height={22} rx="3"
              fill="rgba(34,197,94,0.12)" stroke="#22c55e" strokeWidth="1.5" />
            <rect x={W * 0.28} y={6} width={60} height={10} rx="2" fill="#22c55e" />
            <text x={W * 0.28 + 3} y={14.5} fontSize="6.5" fill="#fff" fontFamily="monospace" fontWeight="700">BOARD LOGO</text>
          </g>
        )}

        {/* ── Face box — top right ── */}
        {done('face') && (
          <g style={{ animation: 'fadeInBox 0.4s ease 0.1s both' }}>
            <rect x={W * 0.74} y={8} width={W * 0.2} height={26} rx="3"
              fill="rgba(167,139,250,0.12)" stroke="#a78bfa" strokeWidth="1.5" strokeDasharray="3 2" />
            {Array.from({ length: 4 }).map((_, i) => (
              <line key={i} x1={W * 0.74 + i * 7} y1={8} x2={W * 0.74} y2={8 + i * 7}
                stroke="#a78bfa" strokeWidth="0.6" opacity="0.4" />
            ))}
            <text x={W * 0.74 + 2} y={16} fontSize="5.5" fill="#a78bfa" fontFamily="monospace" fontWeight="700">PII</text>
          </g>
        )}

        {/* ── Info table box ── */}
        {done('tables') && (
          <g style={{ animation: 'fadeInBox 0.4s ease 0.15s both' }}>
            <rect x={8} y={68} width={W - 16} height={40} rx="3"
              fill="rgba(251,146,60,0.08)" stroke="#fb923c" strokeWidth="1.5" />
            {ocrInfoRun && (
              // scan beam sweeping across info table rows
              <>
                {[78, 86, 94, 102].map((y, i) => (
                  <line key={i} x1={8} y1={y} x2={W - 8} y2={y}
                    stroke="#fb923c" strokeWidth="1" opacity="0.55" strokeDasharray={`${(W - 20) * 0.55} ${W}`}
                    style={{ animation: `writeScan 1.3s linear ${i * 0.1}s infinite` }} />
                ))}
                <rect x={8} y={68} width={W - 16} height={40} rx="3"
                  fill="rgba(251,146,60,0.06)"
                  style={{ animation: 'ocrPulse 1.5s ease-in-out infinite' }} />
              </>
            )}
            <rect x={8} y={68} width={90} height={12} rx="2" fill="#fb923c" />
            <text x={12} y={77.5} fontSize="6.5" fill="#fff" fontFamily="monospace" fontWeight="700">INFO TABLE</text>
          </g>
        )}

        {/* ── Marks table box ── */}
        {done('tables') && (
          <g style={{ animation: 'fadeInBox 0.4s ease 0.25s both' }}>
            <rect x={8} y={130} width={W - 16} height={80} rx="3"
              fill="rgba(56,189,248,0.08)" stroke="#38bdf8" strokeWidth="1.5" />
            {ocrMarksRun && (
              <>
                {[140, 148, 156, 164, 172, 180, 188, 196, 204].map((y, i) => (
                  <line key={i} x1={8} y1={y} x2={W - 8} y2={y}
                    stroke="#38bdf8" strokeWidth="1" opacity="0.55" strokeDasharray={`${(W - 20) * 0.55} ${W}`}
                    style={{ animation: `writeScan 1.3s linear ${i * 0.08}s infinite` }} />
                ))}
                <rect x={8} y={130} width={W - 16} height={80} rx="3"
                  fill="rgba(56,189,248,0.06)"
                  style={{ animation: 'ocrPulse 1.5s ease-in-out infinite' }} />
              </>
            )}
            <rect x={8} y={130} width={100} height={12} rx="2" fill="#38bdf8" />
            <text x={12} y={139.5} fontSize="6.5" fill="#fff" fontFamily="monospace" fontWeight="700">MARKS TABLE</text>
          </g>
        )}

        {/* Placeholder lines — shown until tables detected */}
        {!done('tables') && [68, 84, 100, 130, 146, 162, 178, 194].map((y, i) => (
          <rect key={i} x={10} y={y} width={W - 20 - (i % 3) * 20} height={8} rx="2"
            fill="rgba(255,255,255,0.04)"
            style={{ animation: `shimmer 1.8s ease ${i * 0.15}s infinite` }} />
        ))}

        {/* Bottom legend */}
        <text x={W / 2} y={H - 4} fontSize="6" fill="rgba(255,255,255,0.18)"
          textAnchor="middle" fontFamily="monospace">
          {ocrMarksRun ? 'OCR · Reading marks…'
            : ocrInfoRun ? 'OCR · Reading info…'
            : done('extract') ? 'Extraction complete'
            : done('tables') ? 'Tables segmented'
            : done('logo') ? 'Detecting regions…'
            : 'Initialising pipeline…'}
        </text>
      </svg>
      <style>{`
        @keyframes fadeInLoad  { from { opacity:0; transform:translateY(8px) } to { opacity:1; transform:none } }
        @keyframes shimmer {
          0%,100% { opacity: 0.04; }
          50%      { opacity: 0.12; }
        }
        @keyframes ocrPulse {
          0%,100% { opacity: 0; }
          50%     { opacity: 1; }
        }
        @keyframes fadeInBox {
          from { opacity: 0; transform: translateY(6px) scale(0.96); }
          to   { opacity: 1; transform: translateY(0) scale(1); }
        }
        svg g {
          transform-box: fill-box;
          transform-origin: center;
        }
      `}</style>
    </div>
  )
}
