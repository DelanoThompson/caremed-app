// build-tracker.js
const ASSEMBLY_STAGES = [
  { id: 0, name: 'Attach seat frame to jig', short: 'Jig', steps: '1', est: 5 },
  { id: 1, name: 'Earthing point & backrest frame', short: 'Frame', steps: '2–3', est: 15 },
  { id: 2, name: 'Actuators (backrest, tilt, legrest)', short: 'Actuators', steps: '4–6', est: 30 },
  { id: 3, name: 'Legrest slide, legrest & saddle', short: 'Legrest', steps: '7–11', est: 25 },
  { id: 4, name: 'Hilo, base frame & castors', short: 'Base', steps: '12–15', est: 30 },
  { id: 5, name: 'Flip to lift & plugs/grommets', short: 'Flip', steps: '16–17', est: 10 },
  { id: 6, name: '✓ Visual inspection 1', short: 'VI-1', steps: '18', est: 10, isCheckpoint: true },
  { id: 7, name: 'Earthing cables & powercord retainer', short: 'Earthing', steps: '19–21', est: 20 },
  { id: 8, name: 'Backrest plastic, handlebar & control box', short: 'Controls', steps: '22–24', est: 20 },
  { id: 9, name: 'Battery, actuators & cable management', short: 'Wiring', steps: '25–26', est: 25 },
  { id: 10, name: 'Power, handset & function test', short: 'Test', steps: '27–28', est: 15 },
  { id: 11, name: 'Service cover & skirts', short: 'Covers', steps: '29–32', est: 20 },
  { id: 12, name: 'Infection control panels', short: 'IC panels', steps: '33–35', est: 15 },
  { id: 13, name: '✓ Visual inspection 2', short: 'VI-2', steps: '36', est: 10, isCheckpoint: true },
  { id: 14, name: 'Cushions & armrests', short: 'Cushions', steps: '37–41', est: 25 },
  { id: 15, name: 'Decals, serial number & final clean', short: 'Finish', steps: '42–46', est: 15 },
]

const BuildTracker = (() => {
  let currentJob = null
  let stageTimer = null

  async function open(jobId) {
    try {
      const job = await DB.getJob(jobId)
      const logs = await DB.getStageLogs(jobId)
      currentJob = job
      render(job, logs)
      App.showScreen('build-screen')
    } catch (e) { toast('Error loading build: ' + e.message) }
  }

  function render(job, logs) {
    document.getElementById('build-screen-title').textContent = `${job.work_order} — ${job.model}`
    document.getElementById('build-screen-sub').textContent = `${job.operator} · SN: ${job.serial || '—'}`
    const pill = document.getElementById('build-status-pill')
    pill.textContent = statusLabel(job.status)
    pill.className = `status-pill ${pillClass(job.status)}`

    const logMap = {}
    ;(logs || []).forEach(l => { logMap[l.stage_id] = l })

    const completed = job.stages_completed || []
    const currentStage = job.current_stage

    // Total elapsed
    const firstLog = logs && logs[0]
    const totalStart = firstLog ? firstLog.started_at : null
    const totalTime = totalStart ? fmtDuration(totalStart, job.status === 'complete' ? job.updated_at : null) : '—'

    // Build info card
    const infoHtml = `<div class="build-info-card">
      <div class="build-info-row"><span class="build-info-key">Work order</span><span class="build-info-val">${job.work_order}</span></div>
      <div class="build-info-row"><span class="build-info-key">Model</span><span class="build-info-val">${job.model}</span></div>
      <div class="build-info-row"><span class="build-info-key">Serial</span><span class="build-info-val">${job.serial || '—'}</span></div>
      <div class="build-info-row"><span class="build-info-key">Operator</span><span class="build-info-val">${job.operator}</span></div>
      <div class="build-info-row"><span class="build-info-key">Scheduled</span><span class="build-info-val">${job.scheduled_date}</span></div>
      <div class="build-info-row"><span class="build-info-key">Total elapsed</span><span class="build-info-val" id="total-elapsed">${totalTime}</span></div>
    </div>`

    // Active stage timer
    const activeLog = currentStage !== null && currentStage !== undefined ? logMap[currentStage] : null
    const timerHtml = activeLog && !activeLog.ended_at ? `
      <div class="timer-big" id="stage-timer">—</div>` : ''

    // QC form links
    const hasQC = job.qc_records || {}
    const formLinksHtml = `<div class="section-title">QC forms</div>
      <div class="form-links">
        <div class="form-link-card" onclick="QCForm.open('assembly', '${job.id}')">
          <div class="form-link-icon">🔩</div>
          <div><div class="form-link-title">Assembly QC</div><div class="form-link-sub">Torque checks, visual inspections & sign-offs</div></div>
          <span class="form-link-status ${hasQC.assembly ? 'badge-ok' : 'badge-pending'}">${hasQC.assembly ? 'Done' : 'Pending'}</span>
        </div>
        <div class="form-link-card" style="opacity:.5;pointer-events:none">
          <div class="form-link-icon">📋</div>
          <div><div class="form-link-title">Pre-delivery inspection</div><div class="form-link-sub">Coming soon</div></div>
          <span class="form-link-status badge-pending">—</span>
        </div>
        <div class="form-link-card" style="opacity:.5;pointer-events:none">
          <div class="form-link-icon">📦</div>
          <div><div class="form-link-title">Goods-in check</div><div class="form-link-sub">Coming soon</div></div>
          <span class="form-link-status badge-pending">—</span>
        </div>
        <div class="form-link-card" style="opacity:.5;pointer-events:none">
          <div class="form-link-icon">🔧</div>
          <div><div class="form-link-title">Repair / rework sign-off</div><div class="form-link-sub">Coming soon</div></div>
          <span class="form-link-status badge-pending">—</span>
        </div>
      </div>`

    // Stages list
    const user = App.getUser()
    const stagesHtml = `<div class="section-title mt">Build stages</div>
      <div class="stage-list">` +
      ASSEMBLY_STAGES.map(s => {
        const isDone = completed.includes(s.id)
        const isActive = currentStage === s.id
        const log = logMap[s.id]
        const elapsed = log ? fmtDuration(log.started_at, log.ended_at) : '—'
        const cls = isDone ? 'stage-done' : isActive ? 'stage-active' : 'stage-locked'
        const numCls = isDone ? 'done' : isActive ? 'active' : ''
        const canStart = !isDone && !isActive && (currentStage === null || currentStage === undefined) && (s.id === 0 || completed.includes(s.id - 1))
        const timeDisplay = isDone ? `<span class="stage-time done">${elapsed}</span>` :
          isActive ? `<span class="stage-time running" id="active-stage-time">—</span>` :
          `<span class="stage-time">Est. ${s.est}m</span>`

        let actions = ''
        if (isActive && !isDone) {
          actions = `<div class="stage-actions">
            ${s.isCheckpoint ? `<button class="btn-success" onclick="BuildTracker.completeStage(${s.id})">✓ Checkpoint passed</button>` :
              `<button class="btn-success" onclick="BuildTracker.completeStage(${s.id})">✓ Stage complete</button>`}
            <button class="btn-danger" onclick="BuildTracker.pauseStage(${s.id})">Pause</button>
          </div>`
        } else if (canStart && job.status !== 'complete') {
          actions = `<div class="stage-actions"><button class="btn-primary sm" onclick="BuildTracker.startStage(${s.id})">▶ Start</button></div>`
        }

        return `<div class="stage-item ${cls}">
          <div class="stage-row">
            <div class="stage-num ${numCls}">${isDone ? '✓' : s.id + 1}</div>
            <div class="stage-info">
              <div class="stage-name">${s.name}</div>
              <div class="stage-est">Steps ${s.steps} · Est. ${s.est} min</div>
            </div>
            ${timeDisplay}
          </div>
          ${actions}
        </div>`
      }).join('') + `</div>`

    // Supervisor controls
    const supHtml = user && user.role === 'supervisor' ? `
      <div class="divider"></div>
      <div class="section-title">Supervisor controls</div>
      <div style="display:flex;gap:8px;flex-wrap:wrap;margin-bottom:16px">
        <button class="btn-secondary" onclick="BuildTracker.setStatus('hold')">Put on hold</button>
        <button class="btn-secondary" onclick="BuildTracker.setStatus('scheduled')">Reset to scheduled</button>
        ${job.status !== 'complete' ? `<button class="btn-success" onclick="BuildTracker.markComplete()">Mark complete</button>` : ''}
      </div>` : ''

    document.getElementById('build-detail-body').innerHTML = infoHtml + timerHtml + formLinksHtml + stagesHtml + supHtml

    // Start live timers
    clearInterval(stageTimer)
    if (activeLog && !activeLog.ended_at) {
      const startTime = new Date(activeLog.started_at)
      stageTimer = setInterval(() => {
        const el = document.getElementById('active-stage-time')
        const te = document.getElementById('total-elapsed')
        if (el) el.textContent = fmtTime(Date.now() - startTime)
        if (te && totalStart) te.textContent = fmtDuration(totalStart)
      }, 1000)
    }
  }

  async function startStage(stageId) {
    if (!currentJob) return
    try {
      const now = new Date().toISOString()
      await DB.upsertStageLog({ job_id: currentJob.id, stage_id: stageId, started_at: now, ended_at: null, operator: App.getUser()?.name })
      const updatedJob = await DB.updateJob(currentJob.id, { status: 'in_progress', current_stage: stageId })
      currentJob = updatedJob
      const logs = await DB.getStageLogs(currentJob.id)
      render(currentJob, logs)
      toast(`Stage ${stageId + 1} started`)
    } catch (e) { toast('Error: ' + e.message) }
  }

  async function completeStage(stageId) {
    if (!currentJob) return
    try {
      const now = new Date().toISOString()
      // End the stage log
      const logs = await DB.getStageLogs(currentJob.id)
      const log = logs.find(l => l.stage_id === stageId)
      if (log) await DB.upsertStageLog({ ...log, ended_at: now })

      const completed = [...(currentJob.stages_completed || []), stageId]
      const isLast = stageId === ASSEMBLY_STAGES.length - 1
      const updatedJob = await DB.updateJob(currentJob.id, {
        stages_completed: completed,
        current_stage: isLast ? null : null,
        status: isLast ? 'complete' : 'in_progress',
        updated_at: now
      })
      currentJob = updatedJob
      const newLogs = await DB.getStageLogs(currentJob.id)
      render(currentJob, newLogs)
      if (isLast) toast('🎉 Build complete!')
      else toast(`Stage ${stageId + 1} done ✓`)
    } catch (e) { toast('Error: ' + e.message) }
  }

  async function pauseStage(stageId) {
    if (!currentJob) return
    try {
      const now = new Date().toISOString()
      const logs = await DB.getStageLogs(currentJob.id)
      const log = logs.find(l => l.stage_id === stageId)
      if (log) await DB.upsertStageLog({ ...log, ended_at: now, paused: true })
      const updatedJob = await DB.updateJob(currentJob.id, { status: 'in_progress', current_stage: null })
      currentJob = updatedJob
      const newLogs = await DB.getStageLogs(currentJob.id)
      render(currentJob, newLogs)
      toast('Stage paused')
    } catch (e) { toast('Error: ' + e.message) }
  }

  async function setStatus(status) {
    if (!currentJob) return
    try {
      const updatedJob = await DB.updateJob(currentJob.id, { status })
      currentJob = updatedJob
      const logs = await DB.getStageLogs(currentJob.id)
      render(currentJob, logs)
      toast(`Status set to ${status}`)
    } catch (e) { toast('Error: ' + e.message) }
  }

  async function markComplete() {
    if (!currentJob) return
    const allIds = ASSEMBLY_STAGES.map(s => s.id)
    try {
      const updatedJob = await DB.updateJob(currentJob.id, { status: 'complete', stages_completed: allIds, current_stage: null, updated_at: new Date().toISOString() })
      currentJob = updatedJob
      const logs = await DB.getStageLogs(currentJob.id)
      render(currentJob, logs)
      toast('Build marked complete ✓')
    } catch (e) { toast('Error: ' + e.message) }
  }

  async function refreshList() {
    try {
      const user = App.getUser()
      const [active, completed] = await Promise.all([
        DB.getJobs({ status: 'in_progress' }),
        DB.get().from('jobs').select('*').eq('status', 'complete').gte('updated_at', new Date().toISOString().split('T')[0]).order('updated_at', { ascending: false }).then(r => r.data || [])
      ])
      const myBuilds = document.getElementById('my-builds')
      const compBuilds = document.getElementById('completed-builds')
      if (!active.length) myBuilds.innerHTML = '<div class="empty-state"><div class="empty-icon">🔩</div>No active builds</div>'
      else {
        myBuilds.innerHTML = active.map(j => BuildCard.render(j)).join('')
        myBuilds.querySelectorAll('.build-card').forEach((c, i) => { c.onclick = () => BuildTracker.open(active[i].id) })
      }
      if (!completed.length) compBuilds.innerHTML = '<div class="empty-state" style="padding:16px">None today</div>'
      else {
        compBuilds.innerHTML = completed.map(j => BuildCard.render(j)).join('')
        compBuilds.querySelectorAll('.build-card').forEach((c, i) => { c.onclick = () => BuildTracker.open(completed[i].id) })
      }
    } catch (e) { console.error(e) }
  }

  return { open, startStage, completeStage, pauseStage, setStatus, markComplete, refreshList }
})()

function toast(msg) {
  const t = document.getElementById('toast')
  t.textContent = msg
  t.classList.add('show')
  setTimeout(() => t.classList.remove('show'), 2800)
}
