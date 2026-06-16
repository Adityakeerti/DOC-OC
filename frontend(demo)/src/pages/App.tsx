import React, { useEffect, useMemo, useState } from 'react'
import Home from './Home'
import Workspace from './Workspace'
import Technology from './Technology'
import Developer from './Developer'

const API_BASE =
  window.location.hostname === 'localhost' || window.location.hostname === '127.0.0.1'
    ? `http://${window.location.hostname}:8000`
    : (import.meta as any).env?.VITE_API_BASE || window.location.origin;

export type PipelineStep = {
  step: string
  status: 'idle' | 'running' | 'done' | 'error'
  label: string
  data?: any
}

const INITIAL_STEPS: PipelineStep[] = [
  { step: 'preprocess', status: 'idle', label: 'Waiting…' },
  { step: 'logo',       status: 'idle', label: 'Waiting…' },
  { step: 'face',       status: 'idle', label: 'Waiting…' },
  { step: 'tables',     status: 'idle', label: 'Waiting…' },
  { step: 'ocr_marks',  status: 'idle', label: 'Waiting…' },
  { step: 'ocr_info',   status: 'idle', label: 'Waiting…' },
  { step: 'extract',    status: 'idle', label: 'Waiting…' },
]

export default function App() {
  const [currentPage, setCurrentPage] = useState<'overview' | 'workspace' | 'pipeline' | 'developer'>('overview')
  const [mode, setMode] = useState<'school' | 'college'>('school')
  const [uploadCount, setUploadCount] = useState<number>(() => {
    const val = localStorage.getItem('dococ_upload_count_v5')
    return val ? parseInt(val, 10) : 0
  })
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [result, setResult] = useState<any | null>(null)
  const [detectedBoard, setDetectedBoard] = useState<string>('')
  const [editable, setEditable] = useState(false)
  const [localSubjects, setLocalSubjects] = useState<any[]>([])
  const [localInfo, setLocalInfo] = useState<any>({})
  const [pipelineSteps, setPipelineSteps] = useState<PipelineStep[]>(INITIAL_STEPS)

  const isLimitReached = uploadCount >= 2

  const updateUploadCount = () => {
    const nextCount = uploadCount + 1
    setUploadCount(nextCount)
    localStorage.setItem('dococ_upload_count_v5', String(nextCount))
  }

  const processFile = async (selectedFile: File, selectedMode: 'school' | 'college') => {
    if (isLimitReached) {
      setError("Analysis Quota Reached: You have reached the maximum of 2 files allowed for this validation session.")
      return
    }
    setFile(selectedFile)
    setLoading(true)
    setError(null)
    setResult(null)
    setEditable(false)
    setPipelineSteps(INITIAL_STEPS)

    try {
      const form = new FormData()
      form.append('file', selectedFile)
      let url = `${API_BASE}/process-stream?mode=${selectedMode}`
      if (selectedMode === 'college') url += `&expected_sem=I`

      const response = await fetch(url, { method: 'POST', body: form })
      if (!response.ok || !response.body) {
        throw new Error('Backend returned an error. Is it running?')
      }

      const reader = response.body.getReader()
      const decoder = new TextDecoder()
      let buffer = ''

      while (true) {
        const { done, value } = await reader.read()
        if (done) break
        buffer += decoder.decode(value, { stream: true })

        // SSE lines come as "data: {...}\n\n"
        const parts = buffer.split('\n\n')
        buffer = parts.pop() ?? ''

        for (const part of parts) {
          const line = part.trim()
          if (!line.startsWith('data:')) continue
          try {
            const event = JSON.parse(line.slice(5).trim())

            if (event.type === 'step') {
              setPipelineSteps(prev => prev.map(s =>
                s.step === event.step
                  ? { ...s, status: event.status, label: event.label, data: event }
                  : s
              ))
            } else if (event.type === 'result') {
              setResult(event)
              setDetectedBoard(event.board || '')
              if (selectedMode === 'college') {
                setLocalSubjects(event.data?.subjects || [])
                setLocalInfo({ college: event.data?.college || {}, student: event.data?.student || {}, result: event.data?.result || {} })
              } else {
                setLocalSubjects(event.data?.subjects || [])
                setLocalInfo(event.data || {})
              }
              updateUploadCount()
            } else if (event.type === 'error') {
              throw new Error(event.message || 'Pipeline error')
            }
          } catch (parseErr: any) {
            if (parseErr?.message) throw parseErr
          }
        }
      }
    } catch (e: any) {
      setError(e?.message || 'Network error connecting to API')
    } finally {
      setLoading(false)
    }
  }

  // Fetch and run sample files
  const runSample = async (filename: string, sampleMode: 'school' | 'college') => {
    if (isLimitReached) {
      setError("Analysis Quota Reached: You have reached the maximum of 2 files allowed for this validation session.")
      return
    }
    setLoading(true)
    setError(null)
    setResult(null)
    try {
      const resp = await fetch(`/sample/${filename}`)
      if (!resp.ok) throw new Error(`Sample file ${filename} not found.`)
      const blob = await resp.blob()
      const sampleFile = new File([blob], filename, { type: blob.type || 'image/png' })
      setMode(sampleMode)
      await processFile(sampleFile, sampleMode)
    } catch (e: any) {
      setError(e.message)
      setLoading(false)
    }
  }

  // Drag and drop events
  const onDragOver = (e: React.DragEvent) => {
    e.preventDefault()
  }

  const onDrop = (e: React.DragEvent) => {
    e.preventDefault()
    if (isLimitReached || loading) return
    const droppedFiles = e.dataTransfer.files
    if (droppedFiles && droppedFiles.length > 0) {
      processFile(droppedFiles[0], mode)
    }
  }

  const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isLimitReached || loading) return
    const selected = e.target.files
    if (selected && selected.length > 0) {
      processFile(selected[0], mode)
    }
  }

  // Cell editing logic
  const handleCellChange = (idx: number, key: string, val: string) => {
    const updated = [...localSubjects]
    updated[idx] = { ...updated[idx], [key]: val }
    setLocalSubjects(updated)
  }

  // Inferred columns for school mode — preferred key order per board matches exact JSON schema
  const schoolColumns = useMemo(() => {
    const preferredByBoard: Record<string, string[]> = {
      // CBSE: code, name, theory, practical/IA, total, grade
      'CBSE':         ['code','name','theory_marks','practical_marks','total_marks','total_in_words','grade'],
      // ICSE: no code, just name + marks + marks_in_words
      'ICSE':         ['name','marks','marks_in_words'],
      // Uttarakhand: similar to CBSE but has internal_marks instead of practical
      'UTTARAKHAND':  ['code','name','theory_marks','practical_marks','internal_marks','total_marks','marks_in_words','grade'],
      // UK alias
      'UK':           ['code','name','theory_marks','practical_marks','internal_marks','total_marks','marks_in_words','grade'],
    }
    const board = detectedBoard.toUpperCase()
    const set = new Set<string>()
    localSubjects.forEach(r => Object.keys(r || {}).forEach(k => set.add(k)))
    const pref = preferredByBoard[board] || []
    const ordered: string[] = []
    // Add preferred keys that actually exist in data
    for (const k of pref) if (set.has(k)) ordered.push(k)
    // Append any remaining keys not in preferred list
    for (const k of set) if (!ordered.includes(k)) ordered.push(k)
    const toLabel = (k: string) => k.replace(/_/g,' ').replace(/\b\w/g, m => m.toUpperCase())
    return ordered.map(k => ({ key: k, label: toLabel(k) }))
  }, [localSubjects, detectedBoard])

  // Inferred columns for college mode — fixed preferred order matching college_extractor.py schema
  const collegeColumns = useMemo(() => {
    const preferred = ['code','name','credits','internal_marks','external_marks','total','grade','grade_point']
    const set = new Set<string>()
    localSubjects.forEach(r => Object.keys(r || {}).forEach(k => set.add(k)))
    const ordered: string[] = []
    for (const k of preferred) if (set.has(k)) ordered.push(k)
    for (const k of set) if (!ordered.includes(k)) ordered.push(k)
    const toLabel = (k: string) => k.replace(/_/g,' ').replace(/\b\w/g, m => m.toUpperCase())
    return ordered.map(k => ({ key: k, label: toLabel(k) }))
  }, [localSubjects])

  return (
    <div className="landing-container">
      {/* Global Pinned Navbar */}
      <nav className="global-nav">
        <div className="nav-title">
          <svg className="nav-logo-svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" style={{ marginRight: 8, color: 'var(--color-accent-blue)', display: 'inline-block', verticalAlign: 'middle' }}>
            <path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z" />
            <polyline points="14 2 14 8 20 8" />
            <line x1="16" y1="13" x2="8" y2="13" />
            <line x1="16" y1="17" x2="8" y2="17" />
            <polyline points="10 9 9 9 8 9" />
          </svg>
          <span style={{ fontWeight: 400 }}>Doc</span><span style={{ color: 'var(--color-accent-blue)', fontWeight: 600 }}>OC</span>
          <span className="nav-badge">v5.0</span>
        </div>
        <div className="nav-links">
          <button onClick={() => setCurrentPage('overview')} className={`nav-tab-btn ${currentPage === 'overview' ? 'active' : ''}`}>Overview</button>
          <button onClick={() => setCurrentPage('workspace')} className={`nav-tab-btn ${currentPage === 'workspace' ? 'active' : ''}`}>Workspace</button>
          <button onClick={() => setCurrentPage('pipeline')} className={`nav-tab-btn ${currentPage === 'pipeline' ? 'active' : ''}`}>Pipeline</button>
          <button onClick={() => setCurrentPage('developer')} className={`nav-tab-btn ${currentPage === 'developer' ? 'active' : ''}`}>Developer</button>
        </div>
        <div>
          {currentPage !== 'workspace' ? (
            <button className="btn-primary" onClick={() => setCurrentPage('workspace')}>
              Launch Workspace
            </button>
          ) : (
            <button className="btn-secondary" disabled style={{ display: 'inline-flex', alignItems: 'center', height: 40, opacity: 0.6, cursor: 'not-allowed' }}>
              API Key (Coming Soon)
            </button>
          )}
        </div>
      </nav>

      {/* Page Content Router */}
      <main className="main-content">
        {currentPage === 'overview' && (
          <Home onNavigateToWorkspace={() => setCurrentPage('workspace')} />
        )}
        {currentPage === 'workspace' && (
          <Workspace
            mode={mode}
            setMode={setMode}
            uploadCount={uploadCount}
            file={file}
            loading={loading}
            error={error}
            result={result}
            detectedBoard={detectedBoard}
            editable={editable}
            setEditable={setEditable}
            localSubjects={localSubjects}
            localInfo={localInfo}
            processFile={processFile}
            runSample={runSample}
            onDragOver={onDragOver}
            onDrop={onDrop}
            onFileChange={onFileChange}
            handleCellChange={handleCellChange}
            schoolColumns={schoolColumns}
            collegeColumns={collegeColumns}
            isLimitReached={isLimitReached}
            pipelineSteps={pipelineSteps}
          />
        )}
        {currentPage === 'pipeline' && (
          <Technology />
        )}
        {currentPage === 'developer' && (
          <Developer />
        )}
      </main>

      {/* Footer */}
      <footer className="global-footer">
        <div className="footer-content">
          <p>© {new Date().getFullYear()} DocOC AI. Developed by Aditya Keerti.</p>
          <div className="footer-links">
            <a href="mailto:adityacodes404@gmail.com" className="text-link">Contact Developer</a>
            <span className="bullet-divider">•</span>
            <a href="https://adityakeerti.vercel.app" target="_blank" rel="noopener noreferrer" className="text-link">Portfolio</a>
          </div>
        </div>
      </footer>
    </div>
  )
}
