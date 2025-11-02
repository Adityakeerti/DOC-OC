import React, { useEffect, useMemo, useState } from 'react'

const API_URL = `http://${window.location.hostname}:8000/process`

type Step = 'COURSE' | 'UPLOAD_10' | 'UPLOAD_12' | 'SEM_INPUT' | 'UPLOAD_SEM' | 'PROCESS' | 'PREVIEW' | 'REVIEW_ALL' | 'SUCCESS'
type Course = 'UG' | 'PG'

export default function App() {
  const [authed, setAuthed] = useState(false)
  const [step, setStep] = useState<Step>('COURSE')
  const [course, setCourse] = useState<Course>('UG')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data10, setData10] = useState<any | null>(null)
  const [data12, setData12] = useState<any | null>(null)
  const [progress, setProgress] = useState<number>(0)
  const [verified, setVerified] = useState(false)
  const [semCount, setSemCount] = useState<string>('')
  const [semCursor, setSemCursor] = useState<number>(1)
  const [semesterResults, setSemesterResults] = useState<Record<number, any>>({}) // sem number -> result
  const [currentResult, setCurrentResult] = useState<any | null>(null)
  const [prevStep, setPrevStep] = useState<Step | null>(null) // track previous step for back navigation
  const [currentResultType, setCurrentResultType] = useState<'10' | '12' | 'sem' | null>(null) // track what type of result we're showing
  const [lastMainStep, setLastMainStep] = useState<Step>('COURSE') // track last main step for indicator

  const onContinue = async () => {
    setError(null)
    if (step === 'COURSE') {
      if (course === 'PG') {
        alert('Postgraduate flow will be added later.')
        return
      }
      setLastMainStep('UPLOAD_10')
      setStep('UPLOAD_10')
      return
    }
    if (step === 'UPLOAD_10' || step === 'UPLOAD_12' || step === 'UPLOAD_SEM') {
      if (!file) { setError('Please upload a file.'); return }
      const uploadStep = step
      setPrevStep(step)
      setStep('PROCESS')
      setLoading(true)
      setProgress(0)
      try {
        const form = new FormData()
        form.append('file', file)
        let url = API_URL
        if (uploadStep === 'UPLOAD_SEM') {
          // Pass expected semester for validation
          const semRoman = ['I', 'II', 'III', 'IV', 'V', 'VI', 'VII', 'VIII'][semCursor - 1] || 'I'
          url = `${API_URL}?mode=college&expected_sem=${semRoman}`
        }
        const res = await fetch(url, { method: 'POST', body: form })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'Processing failed')
        
        if (uploadStep === 'UPLOAD_10') {
          setData10(json)
          setCurrentResult(json)
          setCurrentResultType('10')
        } else if (uploadStep === 'UPLOAD_12') {
          setData12(json)
          setCurrentResult(json)
          setCurrentResultType('12')
        } else if (uploadStep === 'UPLOAD_SEM') {
          setSemesterResults(prev => ({ ...prev, [semCursor]: json }))
          setCurrentResult(json)
          setCurrentResultType('sem')
        }
        setStep('PREVIEW')
      } catch (e: any) {
        setError(e?.message || 'Network error')
        setStep(uploadStep)
      } finally {
        setLoading(false)
        setProgress(100)
      }
      return
    }
    if (step === 'PREVIEW') {
      if (!verified) { setError('Please verify the information to continue.'); return }
      
      // Semester preview: move to next semester or review
      if (currentResultType === 'sem') {
        const next = semCursor + 1
        const semNum = parseInt(semCount.trim() || '1', 10) || 1
        if (next <= Math.max(1, semNum - 1)) {
          setLastMainStep('UPLOAD_SEM')
          setSemCursor(next)
          setCurrentResult(null)
          setCurrentResultType(null)
          setFile(null)
          setVerified(false)
          setStep('UPLOAD_SEM')
          return
        }
        // All semesters done, go to review
        setCurrentResult(null)
        setCurrentResultType(null)
        setStep('REVIEW_ALL')
        return
      }
      
      // 10th preview: go to 12th
      if (currentResultType === '10') {
        setLastMainStep('UPLOAD_12')
        setStep('UPLOAD_12')
        setFile(null)
        setVerified(false)
        setCurrentResult(null)
        setCurrentResultType(null)
        return
      }
      
      // 12th preview: go to semester input
      if (currentResultType === '12') {
        setLastMainStep('SEM_INPUT')
        setStep('SEM_INPUT')
        setFile(null)
        setVerified(false)
        setCurrentResult(null)
        setCurrentResultType(null)
        return
      }
    }
    if (step === 'SEM_INPUT') {
      const semNum = parseInt(semCount.trim(), 10)
      if (!semCount.trim() || isNaN(semNum)) {
        setError('Please enter your current semester number.')
        return
      }
      if (semNum < 2) {
        setError('Current semester must be at least 2 to upload previous semesters.')
        return
      }
      setLastMainStep('UPLOAD_SEM')
      setSemCursor(1)
      setStep('UPLOAD_SEM')
      return
    }
    if (step === 'REVIEW_ALL') {
      if (!verified) { setError('Please verify all information before submitting.'); return }
      setStep('SUCCESS')
      return
    }
  }

  useEffect(() => {
    if (step !== 'PROCESS' || !loading) return
    const totalMs = 30000
    const start = Date.now()
    const tick = () => {
      const elapsed = Date.now() - start
      const pct = Math.min(99, Math.floor((elapsed / totalMs) * 100))
      setProgress(pct)
      if (pct < 99 && loading && step === 'PROCESS') {
        raf = requestAnimationFrame(tick)
      }
    }
    let raf = requestAnimationFrame(tick)
    return () => { cancelAnimationFrame(raf) }
  }, [loading, step])

  const goBack = () => {
    if (step === 'PREVIEW') {
      if (currentResultType === '10') {
        setLastMainStep('UPLOAD_10')
        setStep('UPLOAD_10')
        setCurrentResult(null)
        setCurrentResultType(null)
        setFile(null)
      } else if (currentResultType === '12') {
        setLastMainStep('UPLOAD_12')
        setStep('UPLOAD_12')
        setCurrentResult(null)
        setCurrentResultType(null)
        setFile(null)
      } else if (currentResultType === 'sem') {
        setLastMainStep('UPLOAD_SEM')
        setStep('UPLOAD_SEM')
        setCurrentResult(null)
        setCurrentResultType(null)
        setFile(null)
      }
      setVerified(false)
      return
    }
    if (step === 'PROCESS') {
      // Go back to the upload step we came from
      if (prevStep) {
        setLastMainStep(prevStep as Step)
        setStep(prevStep)
        setPrevStep(null)
        setFile(null)
        setLoading(false)
        return
      }
      // Fallback
      setLastMainStep('UPLOAD_10')
      setFile(null)
      setLoading(false)
      return setStep('UPLOAD_10')
    }
    if (step === 'REVIEW_ALL') {
      // Go back to last semester upload or semester input if no semesters
      if (Object.keys(semesterResults).length > 0) {
        const lastSem = Math.max(...Object.keys(semesterResults).map(Number))
        setSemCursor(lastSem)
        setLastMainStep('UPLOAD_SEM')
        setStep('UPLOAD_SEM')
        setFile(null)
      } else {
        setLastMainStep('SEM_INPUT')
        setStep('SEM_INPUT')
      }
      setVerified(false)
      return
    }
    if (step === 'UPLOAD_SEM') {
      setLastMainStep('SEM_INPUT')
      setFile(null)
      return setStep('SEM_INPUT')
    }
    if (step === 'SEM_INPUT') {
      setLastMainStep('UPLOAD_12')
      return setStep('UPLOAD_12')
    }
    if (step === 'UPLOAD_12') {
      setLastMainStep('UPLOAD_10')
      setFile(null)
      return setStep('UPLOAD_10')
    }
    if (step === 'UPLOAD_10') {
      setLastMainStep('COURSE')
      setFile(null)
      return setStep('COURSE')
    }
  }

  if (!authed) {
    return <Login onSuccess={()=>setAuthed(true)} />
  }

  return (
    <div>
      {step !== 'SUCCESS' && (
        <>
          <TopNav showBack={step !== 'COURSE'} onBack={goBack} />
          <div className="container">
            <Hero />
            <StepIndicator current={step} lastMainStep={lastMainStep} />

            <div className="bento">
              <section className={"card " + ((step === 'COURSE' || step === 'SEM_INPUT') ? 'bento-a' : 'bento-full')}>
                {step === 'COURSE' && (
              <div style={{ display:'grid', gap:20 }}>
                <h3 style={{ margin: 0 }}>Select Course</h3>
                <div className="pill-toggle" style={{ marginTop: 4 }}>
                  <button className={"pill-btn " + (course==='UG'?'active':'')} onClick={()=>setCourse('UG')}>Undergraduate</button>
                  <button className={"pill-btn " + (course==='PG'?'active':'')} onClick={()=>setCourse('PG')}>Postgraduate</button>
                </div>
              </div>
            )}
            {step === 'UPLOAD_10' && (
              <div style={{ display:'grid', gap:16 }}>
                <h3 style={{ margin: 0 }}>Upload 10th Marksheet</h3>
                <Dropzone onFile={(f)=>setFile(f)} currentFile={file} />
                {error && <div style={{color:'#b00020', padding:'12px', background:'#fee2e2', borderRadius:8, fontSize:14}}>Error: {error}</div>}
              </div>
            )}
            {step === 'UPLOAD_12' && (
              <div style={{ display:'grid', gap:16 }}>
                <h3 style={{ margin: 0 }}>Upload 12th Marksheet</h3>
                <Dropzone onFile={(f)=>setFile(f)} currentFile={file} />
                {error && <div style={{color:'#b00020', padding:'12px', background:'#fee2e2', borderRadius:8, fontSize:14}}>Error: {error}</div>}
              </div>
            )}
            {step === 'SEM_INPUT' && (
              <div style={{ display:'grid', gap:16 }}>
                <h3 style={{ margin: 0 }}>Current Semester</h3>
                <div style={{ display:'grid', gap:12 }}>
                  <label style={{ color:'#64748B', fontSize: 15, fontWeight: 500 }}>Enter your current semester (number)</label>
                  <input 
                    className="edit-input" 
                    type="number" 
                    min={1} 
                    value={semCount} 
                    onChange={e=>{
                      const val = e.target.value
                      setSemCount(val)
                      setError(null)
                    }}
                    placeholder="e.g., 3, 4, 5..."
                  />
                  {semCount.trim() && !isNaN(parseInt(semCount.trim(), 10)) && (
                    <div style={{ color:'#64748B', fontSize: 14, padding:'12px', background:'#FAFBFF', borderRadius:8 }}>
                      You will upload semester marksheets from 1 to {Math.max(1, parseInt(semCount.trim(), 10) - 1)}.
                    </div>
                  )}
                </div>
                {error && <div style={{color:'#b00020', padding:'12px', background:'#fee2e2', borderRadius:8, fontSize:14}}>Error: {error}</div>}
              </div>
            )}
            {step === 'UPLOAD_SEM' && (
              <div style={{ display:'grid', gap:16 }}>
                <h3 style={{ margin: 0 }}>Upload Semester {semCursor} Marksheet</h3>
                <Dropzone onFile={(f)=>setFile(f)} currentFile={file} />
                {error && <div style={{color:'#b00020', padding:'12px', background:'#fee2e2', borderRadius:8, fontSize:14}}>Error: {error}</div>}
              </div>
            )}
            {step === 'PROCESS' && (
              <div style={{ display:'grid', gap:16 }}>
                <h3 style={{ margin: 0 }}>Processing</h3>
                <div className="process-box" style={{ display:'grid', gap:16, padding: '20px 0' }}>
                  <ProgressBar percent={progress} />
                  <p style={{color:'#64748B', margin: 0, fontSize: 15, textAlign: 'center'}}>Extracting text from your document…</p>
                </div>
              </div>
            )}
            {step === 'PREVIEW' && (
              <div style={{ display:'grid', gap:16 }}>
                <h3 style={{ margin: 0 }}>Preview</h3>
                {!currentResult && (
                  <div style={{ padding: '24px', textAlign: 'center', color: '#64748B' }}>No data available.</div>
                )}
                {currentResult && (
                  <>
                    {currentResultType === '10' && <Preview data={currentResult} />}
                    {currentResultType === '12' && <Preview data={currentResult} />}
                    {currentResultType === 'sem' && (
                      <CollegePreview data={currentResult} semester={semCursor} />
                    )}
                    <div style={{ marginTop: 24, padding: '16px', background: '#FAFBFF', borderRadius: 12, border: '1px solid var(--border)' }}>
                      <label style={{ display:'flex', alignItems:'center', gap:10, cursor: 'pointer' }}>
                        <input 
                          type="checkbox" 
                          checked={verified} 
                          onChange={e=>setVerified(e.target.checked)}
                          style={{ width: 18, height: 18, cursor: 'pointer' }}
                        />
                        <span style={{ fontSize: 15, color: '#334155' }}>I verify that the above information is correct.</span>
                      </label>
                    </div>
                    {error && (
                      <div style={{
                        color:'#b00020', 
                        padding:'12px', 
                        background:'#fee2e2', 
                        borderRadius:8, 
                        fontSize:14
                      }}>
                        Error: {error}
                      </div>
                    )}
                  </>
                )}
              </div>
            )}
            {step === 'REVIEW_ALL' && (
              <div style={{ display:'grid', gap:24 }}>
                <h3 style={{ margin: 0 }}>Review All Marksheets</h3>
                <div style={{ display:'grid', gap:12 }}>
                  {data10 && (
                    <CollapsibleMarksheet 
                      title="10th Marksheet" 
                      preview={<Preview data={data10} compact />}
                      full={<Preview data={data10} />}
                    />
                  )}
                  {data12 && (
                    <CollapsibleMarksheet 
                      title="12th Marksheet" 
                      preview={<Preview data={data12} compact />}
                      full={<Preview data={data12} />}
                    />
                  )}
                  {Object.entries(semesterResults).map(([sem, data]) => (
                    <CollapsibleMarksheet 
                      key={sem}
                      title={`Semester ${sem} Marksheet`}
                      preview={<CollegePreview data={data} semester={parseInt(sem)} compact />}
                      full={<CollegePreview data={data} semester={parseInt(sem)} />}
                    />
                  ))}
                </div>
                <div style={{ padding: '16px', background: '#FAFBFF', borderRadius: 12, border: '1px solid var(--border)' }}>
                  <label style={{ display:'flex', alignItems:'center', gap:10, cursor: 'pointer' }}>
                    <input 
                      type="checkbox" 
                      checked={verified} 
                      onChange={e=>setVerified(e.target.checked)}
                      style={{ width: 18, height: 18, cursor: 'pointer' }}
                    />
                    <span style={{ fontSize: 15, color: '#334155' }}>I verify that all information is correct and ready to submit.</span>
                  </label>
                </div>
                {error && (
                  <div style={{
                    padding: '12px', 
                    background: '#fee2e2', 
                    borderRadius: 8,
                    fontSize: 14,
                    color: '#b00020'
                  }}>
                    Error: {error}
                  </div>
                )}
              </div>
            )}
                {step !== 'SUCCESS' && (
                  <div className="center">
                    <button className="primary" onClick={onContinue} disabled={loading}>
                      {step==='COURSE' && 'Continue'}
                      {step==='UPLOAD_10' && (loading ? 'Processing…' : 'Process')}
                      {step==='UPLOAD_12' && (loading ? 'Processing…' : 'Process')}
                      {step==='SEM_INPUT' && 'Continue'}
                      {step==='UPLOAD_SEM' && (loading ? 'Processing…' : 'Process')}
                      {step==='PROCESS' && 'Processing…'}
                      {step==='PREVIEW' && 'Continue'}
                      {step==='REVIEW_ALL' && 'Submit'}
                    </button>
                  </div>
                )}
              </section>
              {(step === 'COURSE' || step === 'SEM_INPUT') && (
                <section className="card bento-b">
                  <h3>Guidance</h3>
                  <ul style={{ margin: 0, paddingLeft: 18, color: '#64748B' }}>
                    <li>Use high-quality scans for best results.</li>
                    <li>Supported: images or PDFs under 10MB.</li>
                    <li>Preview supports inline editing before you submit.</li>
                  </ul>
                </section>
              )}
            </div>
          </div>
        </>
      )}
      {step === 'SUCCESS' && (
        <SuccessAnimation />
      )}
    </div>
  )
}

function SuccessAnimation() {
  return (
    <div className="modal-backdrop" style={{ 
      position: 'fixed', 
      inset: 0, 
      background: 'rgba(0,0,0,0.5)',
      backdropFilter: 'blur(4px)',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 1000,
      padding: '20px',
      animation: 'fadeInBackdrop 0.3s ease-out'
    }}>
      <div className="modal" style={{ 
        width: '100%',
        maxWidth: 420,
        background: '#fff',
        borderRadius: 20,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        padding: '48px 32px',
        textAlign: 'center',
        animation: 'slideUp 0.4s ease-out',
        position: 'relative'
      }}>
        <div style={{
          width: 120,
          height: 120,
          borderRadius: '50%',
          background: '#22C55E',
          display: 'grid',
          placeItems: 'center',
          margin: '0 auto 32px',
          animation: 'scaleIn 0.6s ease-out',
          boxShadow: '0 8px 24px rgba(34, 197, 94, 0.3)'
        }}>
          <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round" style={{ animation: 'checkmark 0.5s ease-out 0.3s both' }}>
            <polyline points="20 6 9 17 4 12" />
          </svg>
        </div>
        <h2 style={{ margin: 0, marginBottom: 12, fontSize: 28, fontWeight: 700, color: '#1e293b' }}>Submission Successful!</h2>
        <p style={{ color: '#64748B', margin: 0, marginBottom: 40, fontSize: 16, lineHeight: 1.6 }}>All marksheets have been processed and saved successfully.</p>
        <div style={{ 
          fontSize: 13, 
          color: '#94A3B8', 
          marginTop: 32,
          paddingTop: 24,
          borderTop: '1px solid var(--border)',
          fontWeight: 500,
          letterSpacing: 0.3
        }}>
          Powered by 404 Founders
        </div>
        <style>{`
          @keyframes fadeInBackdrop {
            from { opacity: 0; }
            to { opacity: 1; }
          }
          @keyframes slideUp {
            from {
              transform: translateY(30px);
              opacity: 0;
            }
            to {
              transform: translateY(0);
              opacity: 1;
            }
          }
          @keyframes scaleIn {
            from {
              transform: scale(0);
              opacity: 0;
            }
            50% {
              transform: scale(1.1);
            }
            to {
              transform: scale(1);
              opacity: 1;
            }
          }
          @keyframes checkmark {
            from {
              stroke-dasharray: 0 24;
              opacity: 0;
            }
            to {
              stroke-dasharray: 24 24;
              opacity: 1;
            }
          }
        `}</style>
      </div>
    </div>
  )
}

function StepIndicator({ current, lastMainStep }: { current: Step; lastMainStep: Step }) {
  const stepNames: Record<Step, string> = {
    'COURSE': 'Course',
    'UPLOAD_10': '10th',
    'UPLOAD_12': '12th',
    'SEM_INPUT': 'Semester',
    'UPLOAD_SEM': 'Upload',
    'PROCESS': 'Process',
    'PREVIEW': 'Preview',
    'REVIEW_ALL': 'Review',
    'SUCCESS': 'Success'
  }
  // Only show main flow steps
  const mainSteps: Step[] = ['COURSE', 'UPLOAD_10', 'UPLOAD_12', 'SEM_INPUT', 'UPLOAD_SEM']
  // Map current step to its main flow step for highlighting
  // During PROCESS/PREVIEW/REVIEW_ALL, use lastMainStep
  // Otherwise use current step (if it's a main step)
  const activeMainStep: Step = (current === 'PROCESS' || current === 'PREVIEW' || current === 'REVIEW_ALL' || current === 'SUCCESS')
    ? lastMainStep
    : (mainSteps.includes(current) ? current : lastMainStep)
  
  return (
    <div className="steps">
      {mainSteps.map((s, i)=>(
        <React.Fragment key={s}>
          <div className={"step "+(activeMainStep === s?'active':'')}>
            <div className="dot" /> <span>{stepNames[s] || s}</span>
          </div>
          {i<mainSteps.length-1 && <div className="step-line" />}
        </React.Fragment>
      ))}
    </div>
  )
}

function lerpColor(a: string, b: string, t: number) {
  const pa = [parseInt(a.slice(1,3),16),parseInt(a.slice(3,5),16),parseInt(a.slice(5,7),16)]
  const pb = [parseInt(b.slice(1,3),16),parseInt(b.slice(3,5),16),parseInt(b.slice(5,7),16)]
  const pc = pa.map((av,i)=> Math.round(av + (pb[i]-av)*t))
  const toHex = (n:number)=> n.toString(16).padStart(2,'0')
  return `#${toHex(pc[0])}${toHex(pc[1])}${toHex(pc[2])}`
}

function ProgressBar({ percent }:{ percent:number }){
  const p = Math.max(0, Math.min(100, percent))
  const color = lerpColor('#3A6FF8', '#22C55E', p/100)
  return (
    <div style={{ border:'1px solid var(--border)', borderRadius: 10, padding: 6, background:'#fff' }}>
      <div style={{ height: 16, borderRadius: 6, background:'#EEF3FF', overflow:'hidden' }}>
        <div style={{ width: `${p}%`, height:'100%', background: color, transition:'width 200ms linear, background-color 200ms linear' }} />
      </div>
      <div style={{ marginTop: 6, fontSize: 12, color:'#64748B', textAlign:'right' }}>{p}%</div>
    </div>
  )
}

function TopNav({ showBack, onBack }:{ showBack?: boolean; onBack?: ()=>void }){
  return (
    <div className="nav" style={{ display:'flex', justifyContent:'space-between', alignItems:'center', gap: 12 }}>
      <div style={{ flex: showBack ? 0 : 1, display: 'flex', alignItems: 'center' }}>
        {showBack && (
          <button 
            className="icon-btn" 
            onClick={onBack}
            style={{ 
              display: 'flex', 
              alignItems: 'center', 
              gap: 6,
              fontSize: 14,
              fontWeight: 500,
              padding: '8px 12px'
            }}
          >
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <polyline points="15 18 9 12 15 6" />
            </svg>
            Back
          </button>
        )}
      </div>
      <div className="logo" style={{ flex: 1, textAlign: 'center' }}>Marksheet</div>
      <div style={{ flex: showBack ? 0 : 1, minWidth: showBack ? 'auto' : 0 }} />
    </div>
  )
}

function Hero(){
  return (
    <div className="hero">
      <svg className="illus" width="160" height="120" viewBox="0 0 160 120" fill="none" xmlns="http://www.w3.org/2000/svg">
        <rect x="10" y="10" width="140" height="90" rx="12" fill="#3A6FF8" opacity="0.2"/>
        <rect x="25" y="25" width="110" height="12" rx="6" fill="#3A6FF8" opacity="0.35"/>
        <rect x="25" y="45" width="90" height="12" rx="6" fill="#3A6FF8" opacity="0.25"/>
        <rect x="25" y="65" width="70" height="12" rx="6" fill="#3A6FF8" opacity="0.25"/>
      </svg>
      <h1>Marksheet Data Extraction</h1>
      <p>Digitize academic documents securely & accurately.</p>
    </div>
  )
}

function Dropzone({ onFile, currentFile }:{ onFile:(f:File)=>void; currentFile: File | null }){
  const onChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const f = e.target.files?.[0]
    if (f) onFile(f)
  }
  return (
    <label className="dropzone">
      <input type="file" accept="image/*,application/pdf" onChange={onChange} />
      <div className="dz-label">
        {currentFile ? currentFile.name : 'Drop a file here or click to upload'}
      </div>
    </label>
  )
}

function Preview({ data, compact }: { data:any; compact?: boolean }){
  const board: string = (data.board || data?.data?.board || '').toUpperCase()
  const payload = data.data || {}

  const [editable, setEditable] = useState(false)
  const [local, setLocal] = useState<any>(payload)

  const subjects: any[] = Array.isArray(local?.subjects) ? local.subjects : []
  const cols = useMemo(()=>inferColumns(subjects, board), [subjects, board])

  const onCellChange = (idx: number, key: string, value: string) => {
    const next = [...subjects]
    const row = { ...(next[idx]||{}) }
    row[key] = value
    next[idx] = row
    setLocal({ ...local, subjects: next })
  }

  if (compact) {
    return (
      <div>
        <div style={{ color: '#64748B', marginBottom: 8 }}>Board: {board || 'Unknown'}</div>
        <div style={{ fontSize: 14, color: '#64748B' }}>{subjects.length} subjects found</div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ margin: '8px 0 12px', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', background: '#fff' }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Board: {board || 'Unknown'}</div>
        <InfoTable data={payload} />
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:10 }}>
        <button className="icon-btn" onClick={()=>setEditable(e=>!e)}>{editable? 'View' : 'Edit All Fields'}</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {cols.map(c=> <th key={c.key}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {subjects.map((row, i)=> (
              <tr key={i}>
                {cols.map(c=> (
                  <td key={c.key}>
                    {editable ? (
                      <input className="edit-input" value={(row?.[c.key] ?? '')} onChange={(e)=>onCellChange(i, c.key, e.target.value)} />
                    ) : (
                      <span>{fmt(row?.[c.key])}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  )
}

function inferColumns(rows: any[], board: string){
  const preferredByBoard: Record<string, string[]> = {
    'CBSE': ['code','name','theory_marks','practical_marks','total_marks','grade'],
    'ICSE': ['code','name','theory_marks','practical_marks','total_marks','grade','marks','max','percentage'],
    'UK': ['code','name','theory_marks','practical_marks','total_marks','grade','marks_obtained']
  }
  const set = new Set<string>()
  rows.forEach(r => Object.keys(r||{}).forEach(k => set.add(k)))
  const pref = preferredByBoard[board] || []
  const ordered: string[] = []
  for (const k of pref) if (set.has(k)) ordered.push(k)
  for (const k of set) if (!ordered.includes(k)) ordered.push(k)
  return ordered.map(k => ({ key: k, label: toTitle(k) }))
}

function toTitle(s:string){ return s.replace(/_/g,' ').replace(/\b\w/g, m=>m.toUpperCase()) }
function fmt(v:any){ if(v===null||v===undefined) return ''; if(typeof v==='object') return JSON.stringify(v); return String(v) }

function InfoTable({ data }:{ data:any }){
  const keys = ['student_name','roll_number','school_name','school_code','mother_name','father_name']
  const rows = keys.filter(k => data && data[k] !== undefined && data[k] !== null && data[k] !== '')
  if (!rows.length) return null
  return (
    <div className="table-wrap" style={{ border: '1px solid var(--border)', borderRadius: '10px' }}>
      <table>
        <tbody>
          {rows.map(k => (
            <tr key={k}>
              <td style={{ width: 220, color: '#64748B' }}>{toTitle(k)}</td>
              <td>{String(data[k])}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  )
}

function CollegePreview({ data, semester, compact }: { data:any; semester:number; compact?: boolean }){
  const payload = data.data || {}
  const [editable, setEditable] = useState(false)
  const [local, setLocal] = useState<any>(payload)
  
  const college = local?.college || {}
  const student = local?.student || {}
  const subjects: any[] = Array.isArray(local?.subjects) ? local.subjects : []
  const result = local?.result || {}
  
  const onCellChange = (idx: number, key: string, value: string) => {
    const next = [...subjects]
    const row = { ...(next[idx]||{}) }
    row[key] = value
    next[idx] = row
    setLocal({ ...local, subjects: next })
  }
  
  const cols = useMemo(() => {
    const set = new Set<string>()
    subjects.forEach(r => Object.keys(r||{}).forEach(k => set.add(k)))
    return Array.from(set).map(k => ({ key: k, label: toTitle(k) }))
  }, [subjects])
  
  if (compact) {
    return (
      <div>
        <div style={{ color: '#64748B', marginBottom: 4 }}>Semester: {college.semester || semester}</div>
        <div style={{ color: '#64748B', marginBottom: 8 }}>{subjects.length} subjects | SGPA: {result.sgpa || 'N/A'}</div>
      </div>
    )
  }
  
  return (
    <div>
      <div style={{ margin: '8px 0 12px', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', background: '#fff' }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Semester {semester}</div>
        {college.course && <div style={{ color: '#64748B', marginBottom: 4 }}>Course: {college.course}</div>}
        {college.semester && <div style={{ color: '#64748B', marginBottom: 4 }}>Semester: {college.semester}</div>}
        {college.session && <div style={{ color: '#64748B', marginBottom: 4 }}>Session: {college.session}</div>}
      </div>
      <div style={{ margin: '8px 0 12px', border: '1px solid var(--border)', borderRadius: '10px', padding: '12px', background: '#fff' }}>
        <div style={{ fontWeight: 600, marginBottom: 8 }}>Student Information</div>
        {student.name && <div style={{ color: '#64748B', marginBottom: 4 }}>Name: {student.name}</div>}
        {student.roll_no && <div style={{ color: '#64748B', marginBottom: 4 }}>Roll No: {student.roll_no}</div>}
        {student.enrollment_no && <div style={{ color: '#64748B', marginBottom: 4 }}>Enrollment No: {student.enrollment_no}</div>}
        {student.father_name && <div style={{ color: '#64748B', marginBottom: 4 }}>Father's Name: {student.father_name}</div>}
      </div>
      <div style={{ display:'flex', gap:8, marginBottom:10 }}>
        <button className="icon-btn" onClick={()=>setEditable(e=>!e)}>{editable? 'View' : 'Edit All Fields'}</button>
      </div>
      <div className="table-wrap">
        <table>
          <thead>
            <tr>
              {cols.map(c=> <th key={c.key}>{c.label}</th>)}
            </tr>
          </thead>
          <tbody>
            {subjects.map((row, i)=> (
              <tr key={i}>
                {cols.map(c=> (
                  <td key={c.key}>
                    {editable ? (
                      <input className="edit-input" value={(row?.[c.key] ?? '')} onChange={(e)=>onCellChange(i, c.key, e.target.value)} />
                    ) : (
                      <span>{fmt(row?.[c.key])}</span>
                    )}
                  </td>
                ))}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      {result.sgpa && (
        <div style={{ marginTop: 12, padding: '10px 12px', border: '1px solid var(--border)', borderRadius: '10px', background: '#FAFBFF' }}>
          <div style={{ fontWeight: 600 }}>SGPA: {result.sgpa}</div>
          {result.total_credits_registered && <div style={{ color: '#64748B' }}>Credits Registered: {result.total_credits_registered}</div>}
          {result.total_credits_earned && <div style={{ color: '#64748B' }}>Credits Earned: {result.total_credits_earned}</div>}
          {result.status && <div style={{ color: '#64748B' }}>Status: {result.status}</div>}
        </div>
      )}
    </div>
  )
}

function CollapsibleMarksheet({ title, preview, full }: { title: string; preview: React.ReactNode; full: React.ReactNode }) {
  const [expanded, setExpanded] = useState(false)
  return (
    <div style={{ 
      border: '1px solid var(--border)', 
      borderRadius: 12, 
      overflow: 'hidden',
      background: '#fff',
      transition: 'all 0.2s ease',
      boxShadow: '0 2px 8px rgba(0,0,0,0.04)'
    }}>
      <button
        onClick={() => setExpanded(!expanded)}
        style={{
          width: '100%',
          padding: '16px',
          background: 'transparent',
          border: 'none',
          display: 'flex',
          alignItems: 'flex-start',
          justifyContent: 'space-between',
          cursor: 'pointer',
          gap: 12,
          textAlign: 'left',
          transition: 'background 0.15s ease'
        }}
        onMouseEnter={(e) => e.currentTarget.style.background = '#FAFBFF'}
        onMouseLeave={(e) => e.currentTarget.style.background = 'transparent'}
      >
        <div style={{ flex: 1, minWidth: 0 }}>
          <div style={{ fontWeight: 600, fontSize: 16, marginBottom: 8, color: '#1e293b' }}>{title}</div>
          {!expanded && (
            <div style={{ 
              color: '#64748B', 
              fontSize: 14,
              overflow: 'hidden',
              textOverflow: 'ellipsis',
              maxHeight: '60px'
            }}>
              {preview}
            </div>
          )}
        </div>
        <div style={{
          width: 32,
          height: 32,
          minWidth: 32,
          display: 'grid',
          placeItems: 'center',
          borderRadius: 6,
          background: '#F1F5F9',
          flexShrink: 0,
          transition: 'all 0.2s ease'
        }}>
          <svg 
            width="16" 
            height="16" 
            viewBox="0 0 24 24" 
            fill="none" 
            stroke="#64748B" 
            strokeWidth="2.5" 
            strokeLinecap="round" 
            strokeLinejoin="round"
            style={{ 
              transform: expanded ? 'rotate(180deg)' : 'rotate(0deg)',
              transition: 'transform 0.2s ease'
            }}
          >
            <polyline points="6 9 12 15 18 9" />
          </svg>
        </div>
      </button>
      {expanded && (
        <div style={{ 
          padding: '0 16px 16px 16px', 
          borderTop: '1px solid var(--border)',
          marginTop: 0,
          paddingTop: 16,
          animation: 'fadeIn 0.2s ease'
        }}>
          {full}
        </div>
      )}
      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  )
}

function Login({ onSuccess }:{ onSuccess: ()=>void }){
  const [u, setU] = useState('')
  const [p, setP] = useState('')
  const [err, setErr] = useState<string | null>(null)
  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    if (u === 'user' && p === '123') onSuccess()
    else setErr('Invalid credentials')
  }
  return (
    <div style={{ 
      minHeight: '100vh', 
      display: 'flex', 
      alignItems: 'center',
      justifyContent: 'center',
      background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
      padding: '20px',
      boxSizing: 'border-box'
    }}>
      <div className="card" style={{ 
        width: '100%',
        maxWidth: 420,
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        margin: '0 auto',
        padding: '32px 24px',
        boxSizing: 'border-box'
      }}>
        <div style={{ textAlign: 'center', marginBottom: 32 }}>
          <div style={{
            width: 64,
            height: 64,
            borderRadius: '50%',
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            display: 'grid',
            placeItems: 'center',
            margin: '0 auto 16px'
          }}>
            <svg width="32" height="32" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 2L2 7l10 5 10-5-10-5z" />
              <path d="M2 17l10 5 10-5" />
              <path d="M2 12l10 5 10-5" />
            </svg>
          </div>
          <h2 style={{ margin: 0, marginBottom: 8, fontSize: 28, fontWeight: 700 }}>Welcome Back</h2>
          <p style={{ margin: 0, color: '#64748B', fontSize: 15 }}>Sign in to continue to Marksheet Extraction</p>
        </div>
        <form onSubmit={submit} style={{ display:'grid', gap:16 }}>
          <div>
            <label style={{ display:'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#334155' }}>Username</label>
            <input 
              className="edit-input" 
              placeholder="Enter your username" 
              value={u} 
              onChange={e=>{setU(e.target.value); setErr(null)}}
              style={{ 
                width: '100%', 
                padding: '12px 16px', 
                fontSize: 15,
                boxSizing: 'border-box',
                border: '1px solid var(--border)',
                borderRadius: '8px'
              }}
            />
          </div>
          <div>
            <label style={{ display:'block', marginBottom: 8, fontSize: 14, fontWeight: 500, color: '#334155' }}>Password</label>
            <input 
              className="edit-input" 
              placeholder="Enter your password" 
              type="password" 
              value={p} 
              onChange={e=>{setP(e.target.value); setErr(null)}}
              style={{ 
                width: '100%', 
                padding: '12px 16px', 
                fontSize: 15,
                boxSizing: 'border-box',
                border: '1px solid var(--border)',
                borderRadius: '8px'
              }}
            />
          </div>
          {err && (
            <div style={{ 
              color:'#b00020', 
              background: '#fee2e2', 
              padding: '10px 12px', 
              borderRadius: 8,
              fontSize: 14,
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}>
              <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <circle cx="12" cy="12" r="10" />
                <line x1="12" y1="8" x2="12" y2="12" />
                <line x1="12" y1="16" x2="12.01" y2="16" />
              </svg>
              {err}
            </div>
          )}
          <button className="primary" type="submit" style={{ marginTop: 8, padding: '14px', fontSize: 16, fontWeight: 600 }}>Sign In</button>
        </form>
      </div>
    </div>
  )
}
