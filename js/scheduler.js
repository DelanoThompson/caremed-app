// scheduler.js
const Scheduler = (() => {
  let weekOffset = 0

  function getWeekDates(offset) {
    const now = new Date()
    const day = now.getDay()
    const monday = new Date(now)
    monday.setDate(now.getDate() - (day === 0 ? 6 : day - 1) + offset * 7)
    return Array.from({ length: 7 }, (_, i) => {
      const d = new Date(monday)
      d.setDate(monday.getDate() + i)
      return d
    })
  }

  async function refresh() {
    const user = App.getUser()
    const isSup = user && user.role === 'supervisor'
    document.getElementById('new-job-btn').style.display = isSup ? 'block' : 'none'

    const dates = getWeekDates(weekOffset)
    const from = dates[0].toISOString().split('T')[0]
    const to = dates[6].toISOString().split('T')[0]

    let jobs = []
    try {
      const { data } = await DB.get().from('jobs').select('*')
        .gte('scheduled_date', from).lte('scheduled_date', to)
        .order('scheduled_date')
      jobs = data || []
    } catch (e) { console.error(e) }

    const today = new Date().toISOString().split('T')[0]
    const weekLbl = `${dates[0].toLocaleDateString('en-GB',{day:'numeric',month:'short'})} – ${dates[6].toLocaleDateString('en-GB',{day:'numeric',month:'short',year:'numeric'})}`

    document.getElementById('schedule-week').innerHTML = `
      <div class="week-nav">
        <button class="week-btn" onclick="Scheduler.prevWeek()">‹ Prev</button>
        <span class="week-lbl">${weekLbl}</span>
        <button class="week-btn" onclick="Scheduler.nextWeek()">Next ›</button>
      </div>
      ${dates.map(d => {
        const ds = d.toISOString().split('T')[0]
        const dayJobs = jobs.filter(j => j.scheduled_date === ds)
        const isToday = ds === today
        const dayName = d.toLocaleDateString('en-GB',{weekday:'short',day:'numeric',month:'short'})
        return `<div class="day-row">
          <div class="day-head"><span>${dayName}</span>${isToday ? '<span class="today-tag">Today</span>' : ''}${isSup ? `<button class="btn-primary sm" style="padding:3px 10px;font-size:11px" onclick="Scheduler.showCreate('${ds}')">+ Add</button>` : ''}</div>
          ${dayJobs.length ? dayJobs.map(j => `
            <div class="job-card" onclick="BuildTracker.open('${j.id}')">
              <div class="job-dot" style="background:${statusColor(j.status)}"></div>
              <div><div class="job-wo">${j.work_order} — ${j.model}</div><div class="job-meta">${j.operator}${j.serial ? ' · ' + j.serial : ''}</div></div>
              <span class="job-status-pill ${pillClass(j.status)}">${statusLabel(j.status)}</span>
            </div>`).join('')
          : `<div style="font-size:12px;color:var(--text3);padding:6px 2px;">No jobs scheduled</div>`}
        </div>`
      }).join('')}`
  }

  function showCreate(date) {
    const user = App.getUser()
    if (!user || user.role !== 'supervisor') { toast('Supervisors only'); return }
    document.getElementById('nj-date').value = date || new Date().toISOString().split('T')[0]
    document.getElementById('nj-wo').value = ''
    document.getElementById('nj-serial').value = ''
    document.getElementById('nj-notes').value = ''
    document.getElementById('nj-operator').value = ''
    document.getElementById('job-modal').style.display = 'flex'
  }

  async function createJob() {
    const wo = document.getElementById('nj-wo').value.trim()
    const model = document.getElementById('nj-model').value
    const serial = document.getElementById('nj-serial').value.trim()
    const operator = document.getElementById('nj-operator').value.trim()
    const date = document.getElementById('nj-date').value
    const target = parseInt(document.getElementById('nj-target').value) || 1
    const notes = document.getElementById('nj-notes').value.trim()
    if (!wo || !operator || !date) { toast('Fill in work order, operator and date'); return }
    try {
      await DB.createJob({
        work_order: wo, model, serial: serial || null,
        operator, scheduled_date: date,
        target_days: target, notes: notes || null,
        status: 'scheduled', stages_completed: [], current_stage: null,
        created_by: App.getUser()?.name
      })
      document.getElementById('job-modal').style.display = 'none'
      toast('Job scheduled ✓')
      await refresh()
    } catch (e) { toast('Error creating job: ' + e.message) }
  }

  function prevWeek() { weekOffset--; refresh() }
  function nextWeek() { weekOffset++; refresh() }

  return { refresh, showCreate, createJob, prevWeek, nextWeek }
})()
