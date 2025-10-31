import React, { useEffect, useMemo, useState } from 'react'

const API_URL = `http://${window.location.hostname}:8000/process`

type Step = 'RESULT' | 'UPLOAD' | 'PROCESS' | 'PREVIEW'
type ResultType = '10' | '12'

export default function App() {
  const [authed, setAuthed] = useState(false)
  const [step, setStep] = useState<Step>('RESULT')
  const [resultType, setResultType] = useState<ResultType>('10')
  const [file, setFile] = useState<File | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [data10, setData10] = useState<any | null>(null)
  const [data12, setData12] = useState<any | null>(null)
  const [progress, setProgress] = useState<number>(0)
  const bothReady = !!data10 && !!data12

  const onContinue = async () => {
    setError(null)
    if (step === 'RESULT') return setStep('UPLOAD')
    if (step === 'UPLOAD') {
      if (!file) { setError('Please upload a file.'); return }
      setStep('PROCESS')
      setLoading(true)
      setProgress(0)
      try {
        const form = new FormData()
        form.append('file', file)
        const res = await fetch(API_URL, { method: 'POST', body: form })
        const json = await res.json()
        if (!res.ok) throw new Error(json?.error || 'Processing failed')
        // store into respective bucket
        if (resultType === '10') setData10(json)
        else setData12(json)
        setStep('PREVIEW')
      } catch (e: any) {
        setError(e?.message || 'Network error')
        setStep('UPLOAD')
      } finally {
        setLoading(false)
        setProgress(100)
      }
      return
    }
    if (step === 'PREVIEW') {
      if (resultType === '10' && !data12) {
        // prompt to process 12th next
        setResultType('12')
        setFile(null)
        setStep('UPLOAD')
        return
      }
      // submit placeholder (no-op for now). Both present or user on 12th.
      alert('Submit clicked (stub). This would save both 10th and 12th to DB.')
      return
    }
  }

  // Simulate a 30s progress while processing; clamp to 99% until completion
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
    if (step === 'PREVIEW') return setStep('UPLOAD')
    if (step === 'PROCESS') return setStep('UPLOAD')
    if (step === 'UPLOAD') return setStep('RESULT')
  }

  if (!authed) {
    return <Login onSuccess={()=>setAuthed(true)} />
  }

  return (
    <div>
      <TopNav showBack={step !== 'RESULT'} onBack={goBack} />
      <div className="container">
        <Hero />
        <StepIndicator current={step} />

        <div className="bento">
          <section className={"card " + (step === 'RESULT' ? 'bento-a' : 'bento-full')}>
            {step === 'RESULT' && (
              <>
                <h3>Result Type</h3>
                <div className="pill-toggle">
                  <button className={"pill-btn " + (resultType==='10'?'active':'')} onClick={()=>setResultType('10')}>10th</button>
                  <button className={"pill-btn " + (resultType==='12'?'active':'')} onClick={()=>setResultType('12')}>12th</button>
                </div>
              </>
            )}
            {step === 'UPLOAD' && (
              <>
                <h3>Upload</h3>
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
                {!getCurrentData(data10, data12, resultType) && <div>No data.</div>}
                {getCurrentData(data10, data12, resultType) && (
                  <>
                    {!bothReady && resultType === '10' && (
                      <div style={{
                        margin: '8px 0 12px',
                        padding: '10px 12px',
                        border: '1px solid var(--border)',
                        borderRadius: '10px',
                        background: '#FAFBFF',
                        color: '#64748B'
                      }}>
                        Next step: Process 12th as well to complete the submission.
                      </div>
                    )}
                    <PreviewTabs
                      available10={!!data10}
                      available12={!!data12}
                      active={resultType}
                      onSwitch={(t)=> setResultType(t)}
                    />
                    <Preview data={getCurrentData(data10, data12, resultType)} />
                  </>
                )}
              </>
            )}
            <div className="center">
              <button className="primary" onClick={onContinue} disabled={loading}>
                {step==='RESULT' && 'Continue'}
                {step==='UPLOAD' && (loading ? 'Processing…' : 'Process')}
                {step==='PROCESS' && 'Processing…'}
                {step==='PREVIEW' && (resultType==='10' && !data12 ? 'Process 12th' : 'Submit')}
              </button>
            </div>
          </section>
          {step === 'RESULT' && (
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

function lerpColor(a: string, b: string, t: number) {
  // a,b as hex like #3A6FF8 -> rgb interpolate
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
    <div className="nav">
      <div className="logo">Marksheet</div>
      {showBack ? (
        <button className="icon-btn" onClick={onBack}>Back</button>
      ) : <div />}
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

function StepIndicator({ current }: { current: Step }){
  const steps: Step[] = ['RESULT','UPLOAD','PROCESS','PREVIEW']
  return (
    <div className="steps">
      {steps.map((s, i)=>(
        <React.Fragment key={s}>
          <div className={"step "+(current===s?'active':'')}>
            <div className="dot" /> <span>{s === 'RESULT' ? 'Result' : s[0]+s.slice(1).toLowerCase()}</span>
          </div>
          {i<steps.length-1 && <div className="step-line" />}
        </React.Fragment>
      ))}
    </div>
  )
}

function Tile({ label, active, onClick }:{label:string, active?:boolean, onClick?:()=>void}){
  return (
    <div className={"board-tile "+(active?'active':'')} onClick={onClick}>
      {label}
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

function Preview({ data }:{ data:any }){
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

  return (
    <div>
      {/* Info section */}
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

function getCurrentData(d10:any, d12:any, type: ResultType){
  return type === '10' ? d10 : d12
}

function PreviewTabs({ available10, available12, active, onSwitch }:{ available10:boolean; available12:boolean; active: ResultType; onSwitch:(t:ResultType)=>void }){
  if (!available10 && !available12) return null
  return (
    <div style={{ display:'flex', gap:8, margin:'6px 0 10px' }}>
      {available10 && (
        <button className="icon-btn" style={{ background: active==='10'? '#EEF3FF' : '#fff' }} onClick={()=>onSwitch('10')}>10th Preview</button>
      )}
      {available12 && (
        <button className="icon-btn" style={{ background: active==='12'? '#EEF3FF' : '#fff' }} onClick={()=>onSwitch('12')}>12th Preview</button>
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


