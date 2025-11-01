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
  const [semCount, setSemCount] = useState<number>(1)
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
        if (next <= Math.max(1, semCount - 1)) {
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
      if (semCount < 2) {
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
      <TopNav showBack={step !== 'COURSE' && step !== 'SUCCESS'} onBack={goBack} />
      <div className="container">
        <Hero />
        {step !== 'SUCCESS' && <StepIndicator current={step} lastMainStep={lastMainStep} />}

        <div className="bento">
          <section className={"card " + ((step === 'COURSE' || step === 'SEM_INPUT' || step === 'SUCCESS') ? 'bento-a' : 'bento-full')}>
            {step === 'COURSE' && (
              <>
                <h3>Select Course</h3>
                <div className="pill-toggle" style={{ marginTop: 12 }}>
                  <button className={"pill-btn " + (course==='UG'?'active':'')} onClick={()=>setCourse('UG')}>Undergraduate</button>
                  <button className={"pill-btn " + (course==='PG'?'active':'')} onClick={()=>setCourse('PG')}>Postgraduate</button>
                </div>
              </>
            )}
            {step === 'UPLOAD_10' && (
              <>
                <h3>Upload 10th Marksheet</h3>
                <Dropzone onFile={(f)=>setFile(f)} currentFile={file} />
                {error && <div style={{color:'#b00020', marginTop:10}}>Error: {error}</div>}
              </>
            )}
            {step === 'UPLOAD_12' && (
              <>
                <h3>Upload 12th Marksheet</h3>
                <Dropzone onFile={(f)=>setFile(f)} currentFile={file} />
                {error && <div style={{color:'#b00020', marginTop:10}}>Error: {error}</div>}
              </>
            )}
            {step === 'SEM_INPUT' && (
              <>
                <h3>Current Semester</h3>
                <div style={{ display:'grid', gap:12 }}>
                  <label style={{ color:'#64748B' }}>Enter your current semester (number)</label>
                  <input className="edit-input" type="number" min={1} value={semCount} onChange={e=>setSemCount(Math.max(1, parseInt(e.target.value||'1',10)))} />
                  <div style={{ color:'#64748B', fontSize: 14 }}>You will upload semester marksheets from 1 to {Math.max(1, semCount-1)}.</div>
                </div>
                {error && <div style={{color:'#b00020', marginTop:10}}>Error: {error}</div>}
              </>
            )}
            {step === 'UPLOAD_SEM' && (
              <>
                <h3>Upload Semester {semCursor} Marksheet</h3>
                <Dropzone onFile={(f)=>setFile(f)} currentFile={file} />
                {error && <div style={{color:'#b00020', marginTop:10}}>Error: {error}</div>}
              </>
            )}
            {step === 'PROCESS' && (
              <>
                <h3>Processing</h3>
                <div className="process-box" style={{ display:'grid', gap:12 }}>
                  <ProgressBar percent={progress} />
                  <p style={{color:'#64748B', margin: 0}}>Extracting text from your document…</p>
                </div>
              </>
            )}
            {step === 'PREVIEW' && (
              <>
                <h3>Preview</h3>
                {!currentResult && <div>No data.</div>}
                {currentResult && (
                  <>
                    {currentResultType === '10' && <Preview data={currentResult} />}
                    {currentResultType === '12' && <Preview data={currentResult} />}
                    {currentResultType === 'sem' && (
                      <CollegePreview data={currentResult} semester={semCursor} />
                    )}
                    <div style={{ marginTop: 16 }}>
                      <label style={{ display:'flex', alignItems:'center', gap:8 }}>
                        <input type="checkbox" checked={verified} onChange={e=>setVerified(e.target.checked)} />
                        <span>I verify that the above information is correct.</span>
                      </label>
                    </div>
                    {error && <div style={{color:'#b00020', marginTop:10}}>Error: {error}</div>}
                  </>
                )}
              </>
            )}
            {step === 'REVIEW_ALL' && (
              <>
                <h3>Review All Marksheets</h3>
                <div style={{ display:'grid', gap:16 }}>
                  {data10 && (
                    <div style={{ border:'1px solid var(--border)', borderRadius:10, padding:12 }}>
                      <div style={{ fontWeight:600, marginBottom:8 }}>10th Marksheet</div>
                      <Preview data={data10} compact />
                    </div>
                  )}
                  {data12 && (
                    <div style={{ border:'1px solid var(--border)', borderRadius:10, padding:12 }}>
                      <div style={{ fontWeight:600, marginBottom:8 }}>12th Marksheet</div>
                      <Preview data={data12} compact />
                    </div>
                  )}
                  {Object.entries(semesterResults).map(([sem, data]) => (
                    <div key={sem} style={{ border:'1px solid var(--border)', borderRadius:10, padding:12 }}>
                      <div style={{ fontWeight:600, marginBottom:8 }}>Semester {sem} Marksheet</div>
                      <CollegePreview data={data} semester={parseInt(sem)} compact />
                    </div>
                  ))}
                </div>
                <div style={{ marginTop: 16 }}>
                  <label style={{ display:'flex', alignItems:'center', gap:8 }}>
                    <input type="checkbox" checked={verified} onChange={e=>setVerified(e.target.checked)} />
                    <span>I verify that all information is correct and ready to submit.</span>
                  </label>
                </div>
                {error && <div style={{color:'#b00020', marginTop:10}}>Error: {error}</div>}
              </>
            )}
            {step === 'SUCCESS' && (
              <SuccessAnimation />
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
    </div>
  )
}

function SuccessAnimation() {
  return (
    <div style={{ display:'grid', placeItems:'center', padding:'40px 20px', textAlign:'center' }}>
      <div style={{
        width: 120,
        height: 120,
        borderRadius: '50%',
        background: '#22C55E',
        display: 'grid',
        placeItems: 'center',
        marginBottom: 24,
        animation: 'scaleIn 0.5s ease-out'
      }}>
        <svg width="64" height="64" viewBox="0 0 24 24" fill="none" stroke="white" strokeWidth="4" strokeLinecap="round" strokeLinejoin="round">
          <polyline points="20 6 9 17 4 12" />
        </svg>
      </div>
      <h2 style={{ margin: 0, marginBottom: 8 }}>Submission Successful!</h2>
      <p style={{ color: '#64748B', margin: 0, marginBottom: 32 }}>All marksheets have been processed and saved.</p>
      <div style={{ fontSize: 12, color: '#94A3B8', marginTop: 24 }}>
        Powered by 404 Founders
      </div>
      <style>{`
        @keyframes scaleIn {
          from {
            transform: scale(0);
            opacity: 0;
          }
          to {
            transform: scale(1);
            opacity: 1;
          }
        }
      `}</style>
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
    <div className="nav" style={{ display:'flex', justifyContent:'space-between', alignItems:'center' }}>
      {showBack ? (
        <button className="icon-btn" onClick={onBack} style={{ order: -1 }}>Back</button>
      ) : <div />}
      <div className="logo">Marksheet</div>
      <div />
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
    <div style={{ minHeight: '100vh', display: 'grid', placeItems: 'center' }}>
      <div className="card" style={{ width: 360 }}>
        <h3 style={{ marginTop: 0 }}>Login</h3>
        <form onSubmit={submit} style={{ display:'grid', gap:10 }}>
          <input className="edit-input" placeholder="Username" value={u} onChange={e=>setU(e.target.value)} />
          <input className="edit-input" placeholder="Password" type="password" value={p} onChange={e=>setP(e.target.value)} />
          {err && <div style={{ color:'#b00020' }}>{err}</div>}
          <button className="primary" type="submit">Sign in</button>
        </form>
      </div>
    </div>
  )
}
