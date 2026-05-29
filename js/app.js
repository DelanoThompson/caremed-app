// app.js — core app controller
const App = (() => {
  let currentTab = 'dashboard'
  let realtimeSub = null
  let refreshTimer = null

  function init() {
    // Check stored credentials
    const creds = getStoredCreds()
    if (creds) {
      tryConnect(creds.url, creds.key, false)
    } else {
      showScreen('setup-screen')
    }
    window.addEventListener('online', () => { document.getElementById('offline-bar').style.display = 'none'; refreshAll() })
    window.addEventListener('offline', () => { document.getElementById('offline-bar').style.display = 'block' })
    if (!navigator.onLine) document.getElementById('offline-bar').style.display = 'block'
    if ('serviceWorker' in navigator) navigator.serviceWorker.register('sw.js').catch(() => {})
  }

  async function connect() {
    const url = document.getElementById('sb-url').value.trim()
    const key = document.getElementById('sb-key').value.trim()
    const name = document.getElementById('setup-name').value.trim()
    const role = document.getElementById('setup-role').value
    if (!url || !key || !name) { toast('Please fill in all fields'); return }
    localStorage.setItem('caremed-user', JSON.stringify({ name, role }))
    await tryConnect(url, key, true)
  }

  async function tryConnect(url, key, isNew) {
    try {
      DB.init(url, key)
      // Test connection
      await DB.getTodayStats()
      if (isNew) {
        localStorage.setItem('caremed-sb-url', url)
        localStorage.setItem('caremed-sb-key', key)
      }
      applyUserSettings()
      showScreen('main-screen')
      setupRealtime()
      await refreshAll()
      toast('Connected ✓')
    } catch (e) {
      if (isNew) toast('Connection failed — check your URL and key')
      else showScreen('setup-screen')
    }
  }

  function getStoredCreds() {
    const url = localStorage.getItem('caremed-sb-url')
    const key = localStorage.getItem('caremed-sb-key')
    if (url && key) return { url, key }
    return null
  }

  function applyUserSettings() {
    const user = getUser()
    if (!user) return
    document.getElementById('topbar-user').textContent = `${user.name} · ${user.role}`
    // Show/hide supervisor features
    const isSup = user.role === 'supervisor'
    const newJobBtn = document.getElementById('new-job-btn')
    if (newJobBtn) newJobBtn.style.display = isSup ? 'block' : 'none'
  }

  function getUser() {
    try { return JSON.parse(localStorage.getItem('caremed-user')) } catch { return null }
  }

  function setupRealtime() {
    if (realtimeSub) realtimeSub.unsubscribe()
    realtimeSub = DB.subscribeJobs(() => refreshAll())
  }

  async function refreshAll() {
    const tab = currentTab
    if (tab === 'dashboard') await Dashboard.refresh()
    else if (tab === 'scheduler') await Scheduler.refresh()
    else if (tab === 'builds') await BuildTracker.refreshList()
    else if (tab === 'records') await Records.refresh()
  }

  function switchTab(tab) {
    currentTab = tab
    document.querySelectorAll('.tab').forEach(t => t.classList.toggle('active', t.dataset.tab === tab))
    document.querySelectorAll('.tab-content').forEach(c => c.classList.toggle('active', c.id === `tab-${tab}`))
    refreshAll()
  }

  function showScreen(id) {
    document.querySelectorAll('.screen').forEach(s => {
      if (s.classList.contains('slide-up')) {
        s.classList.remove('open')
      } else {
        s.classList.remove('active')
      }
    })
    const el = document.getElementById(id)
    if (el.classList.contains('slide-up')) el.classList.add('open')
    else el.classList.add('active')
  }

  function closeScreen(id) {
    const el = document.getElementById(id)
    if (el.classList.contains('slide-up')) el.classList.remove('open')
    else el.classList.remove('active')
    refreshAll()
  }

  function showSettings() {
    const user = getUser()
    if (user) {
      document.getElementById('settings-name').value = user.name
      document.getElementById('settings-role').value = user.role
    }
    document.getElementById('settings-modal').style.display = 'flex'
  }

  function saveSettings() {
    const name = document.getElementById('settings-name').value.trim()
    const role = document.getElementById('settings-role').value
    if (!name) { toast('Enter your name'); return }
    localStorage.setItem('caremed-user', JSON.stringify({ name, role }))
    applyUserSettings()
    document.getElementById('settings-modal').style.display = 'none'
    toast('Settings saved')
  }

  function disconnect() {
    localStorage.removeItem('caremed-sb-url')
    localStorage.removeItem('caremed-sb-key')
    document.getElementById('settings-modal').style.display = 'none'
    location.reload()
  }

  return { init, connect, getUser, showScreen, closeScreen, switchTab, refreshAll, showSettings, saveSettings, disconnect }
})()

// DASHBOARD
const Dashboard = (() => {
  async function refresh() {
    try {
      const stats = await DB.getTodayStats()
      renderStats(stats)
      const today = new Date().toISOString().split('T')[0]
      const [liveJobs, todayJobs] = await Promise.all([
        DB.getJobs({ status: 'in_progress' }),
        DB.getJobs({ date: today })
      ])
      renderLive(liveJobs)
      renderTodaySchedule(todayJobs)
    } catch (e) { console.error(e) }
  }

  function renderStats(s) {
    document.getElementById('today-stats').innerHTML = `
      <div class="stat-card blue"><div class="stat-num">${s.scheduled}</div><div class="stat-lbl">Scheduled today</div></div>
      <div class="stat-card"><div class="stat-num">${s.inProgress}</div><div class="stat-lbl">In progress</div></div>
      <div class="stat-card green"><div class="stat-num">${s.complete}</div><div class="stat-lbl">Completed today</div></div>
      <div class="stat-card amber"><div class="stat-num">${s.onHold}</div><div class="stat-lbl">On hold</div></div>`
  }

  function renderLive(jobs) {
    const el = document.getElementById('live-builds')
    if (!jobs.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">🔩</div>No active builds right now</div>'; return }
    el.innerHTML = jobs.map(j => BuildCard.render(j)).join('')
    el.querySelectorAll('.build-card').forEach((c, i) => { c.onclick = () => BuildTracker.open(jobs[i].id) })
  }

  function renderTodaySchedule(jobs) {
    const el = document.getElementById('today-schedule')
    const pending = jobs.filter(j => j.status === 'scheduled')
    if (!pending.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div>All jobs started or no jobs today</div>'; return }
    el.innerHTML = pending.map(j => `
      <div class="job-card" onclick="BuildTracker.open('${j.id}')">
        <div class="job-dot" style="background:${statusColor(j.status)}"></div>
        <div><div class="job-wo">${j.work_order} — ${j.model}</div><div class="job-meta">${j.operator} · SN: ${j.serial || '—'}</div></div>
        <span class="job-status-pill ${pillClass(j.status)}">${statusLabel(j.status)}</span>
      </div>`).join('')
  }

  return { refresh }
})()

// SHARED HELPERS
const BuildCard = {
  render(j) {
    const stages = ASSEMBLY_STAGES
    const done = (j.stages_completed || []).length
    const pct = Math.round(done / stages.length * 100)
    const initials = (j.work_order || 'WO').replace(/[^A-Z0-9]/gi,'').slice(0,3).toUpperCase()
    return `<div class="build-card">
      <div class="build-card-head">
        <div class="build-avatar">${initials}</div>
        <div>
          <div class="build-wo">${j.work_order} — ${j.model}</div>
          <div class="build-meta">${j.operator} · ${j.serial || 'No serial'}</div>
        </div>
        <span class="build-pill ${pillClass(j.status)}">${statusLabel(j.status)}</span>
      </div>
      <div class="build-progress-bar"><div class="build-progress-fill" style="width:${pct}%"></div></div>
      <div class="build-stages">${stages.slice(0,6).map((s,i) => `<span class="stage-dot ${stageDotClass(j, i)}">${s.short}</span>`).join('')}${stages.length > 6 ? `<span class="stage-dot">+${stages.length-6}</span>` : ''}</div>
    </div>`
  }
}

function pillClass(s) { return {scheduled:'pill-scheduled',in_progress:'pill-inprogress',complete:'pill-complete',hold:'pill-hold'}[s]||'pill-scheduled' }
function statusLabel(s) { return {scheduled:'Scheduled',in_progress:'In progress',complete:'Complete',hold:'On hold'}[s]||s }
function statusColor(s) { return {scheduled:'#3a3a7f',in_progress:'#c08000',complete:'#1f6b3a',hold:'#c02020'}[s]||'#888' }
function stageDotClass(j, i) {
  const comp = j.stages_completed || []
  const act = j.current_stage
  if (comp.includes(i)) return 'done'
  if (act === i) return 'active'
  return ''
}
function fmtTime(ms) {
  if (!ms && ms !== 0) return '—'
  const s = Math.floor(ms / 1000)
  const m = Math.floor(s / 60)
  const h = Math.floor(m / 60)
  if (h > 0) return `${h}h ${m % 60}m`
  if (m > 0) return `${m}m ${s % 60}s`
  return `${s}s`
}
function fmtDuration(startIso, endIso) {
  if (!startIso) return '—'
  const end = endIso ? new Date(endIso) : new Date()
  return fmtTime(end - new Date(startIso))
}

document.addEventListener('DOMContentLoaded', () => App.init())
