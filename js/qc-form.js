// qc-form.js — form renderer and submission engine
const QCForm = (() => {
  let currentRecord = null
  let currentJobId = null
  let currentFormType = null
  let signed = {}
  const FORMS = {}

  function register(type, config) { FORMS[type] = config }

  async function open(formType, jobId) {
    if (!FORMS[formType]) { toast('Form not available'); return }
    currentFormType = formType
    currentJobId = jobId
    signed = {}

    // Load existing record if any
    try {
      const records = await DB.getQCRecords({ job_id: jobId, form_type: formType })
      currentRecord = records && records[0] ? records[0] : null
    } catch (e) { currentRecord = null }

    const job = await DB.getJob(jobId)
    const form = FORMS[formType]

    document.getElementById('form-screen-title').textContent = form.title
    document.getElementById('form-screen-sub').textContent = `${job.work_order} · ${job.serial || 'No serial'}`
    document.getElementById('form-submit-btn').textContent = 'Submit'
    document.getElementById('form-submit-btn').className = 'footer-btn primary'

    const body = document.getElementById('form-body')
    body.innerHTML = ''

    // Job info bar
    const infoBar = document.createElement('div')
    infoBar.style.cssText = 'background:var(--surface);border-bottom:1px solid var(--border);padding:10px 16px;display:flex;gap:16px;font-size:12px;color:var(--text3);flex-wrap:wrap'
    infoBar.innerHTML = `<span>WO: <strong style="color:var(--text)">${job.work_order}</strong></span><span>Model: <strong style="color:var(--text)">${job.model}</strong></span><span>SN: <strong style="color:var(--text)">${job.serial||'—'}</strong></span><span>Date: <strong style="color:var(--text)">${new Date().toLocaleDateString('en-GB')}</strong></span>`
    body.appendChild(infoBar)

    const sectionsWrap = document.createElement('div')
    sectionsWrap.style.cssText = 'padding:12px 16px;padding-bottom:80px'
    body.appendChild(sectionsWrap)

    // Restore saved data
    const saved = currentRecord ? currentRecord.data : {}

    form.sections.forEach((sec, si) => {
      const secEl = document.createElement('div')
      secEl.className = 'form-section'
      secEl.id = `fs-${si}`

      const headEl = document.createElement('div')
      headEl.className = 'form-sec-head'
      headEl.innerHTML = `<div class="form-sec-icon ${sec.green ? 'green' : ''}">${sec.icon}</div>
        <div><div class="form-sec-title">${sec.title}</div><div class="form-sec-sub">${sec.sub}</div></div>
        <span class="form-sec-badge badge-pending" id="fsb-${si}">Pending</span>
        <span class="chevron">▾</span>`
      headEl.onclick = () => secEl.classList.toggle('collapsed')
      secEl.appendChild(headEl)

      const bodyEl = document.createElement('div')
      bodyEl.className = 'form-sec-body'
      secEl.appendChild(bodyEl)
      sectionsWrap.appendChild(secEl)

      if (sec.banner) {
        const b = document.createElement('div'); b.className = 'insp-banner'; b.textContent = sec.banner; bodyEl.appendChild(b)
      }

      if (sec.type === 'bolts') renderBolts(bodyEl, sec, si, saved)
      else if (sec.type === 'checklist') renderChecklist(bodyEl, sec, si, saved)
      else if (sec.type === 'release') renderRelease(bodyEl, sec, si, saved)

      if (sec.notes !== false) {
        const nw = document.createElement('div'); nw.className = 'notes-wrap'
        nw.innerHTML = `<span class="notes-lbl">Notes</span><textarea id="notes-${si}" placeholder="Any observations..." rows="2">${saved[`notes_${si}`]||''}</textarea>`
        nw.querySelector('textarea').oninput = () => updateProgress(form)
        bodyEl.appendChild(nw)
      }

      // Signoff
      const so = document.createElement('div'); so.className = 'signoff-area'; so.id = `so-${si}`
      const savedSign = saved[`sign_${si}`]
      if (savedSign) {
        signed[si] = savedSign
        so.innerHTML = `<div class="signed-info">✓ <span>${savedSign.name} — ${savedSign.ts}</span></div>`
      } else {
        so.innerHTML = `<input type="text" id="sn-${si}" placeholder="Your name" value="${App.getUser()?.name||''}">
          <button class="sign-btn" id="sb-${si}" onclick="QCForm.signSection(${si})">Sign off</button>
          <div class="signed-info" id="si-${si}" style="display:none">✓ <span id="st-${si}"></span></div>`
      }
      bodyEl.appendChild(so)
    })

    // Restore signed state badges
    form.sections.forEach((_, si) => updateSectionBadge(si, form))
    updateProgress(form)

    App.showScreen('form-screen')
  }

  function renderBolts(bodyEl, sec, si, saved) {
    const list = document.createElement('div'); list.className = 'bolt-list'
    sec.bolts.forEach(b => {
      const row = document.createElement('div'); row.className = 'bolt-row'
      const savedVal = saved[`t_${b.ref}`] || ''
      row.innerHTML = `<div class="bolt-info">
        <div class="bolt-ref">${b.ref} · step ${b.step}</div>
        <div class="bolt-desc">${b.desc}</div>
        <div class="bolt-fix">${b.fix}</div>
      </div>
      <div class="bolt-right">
        <div class="bolt-spec">Spec<br>${b.spec} Nm</div>
        <input class="t-in" type="number" inputmode="decimal" min="0" max="999" step="0.1"
          placeholder="Nm" data-sec="${si}" data-ref="${b.ref}" data-spec="${b.spec}"
          value="${savedVal}" oninput="QCForm.chkTorque(this)">
        <div class="result-dot" id="rd-${b.ref}"></div>
      </div>`
      list.appendChild(row)
    })
    bodyEl.appendChild(list)
    // Apply saved state styling
    list.querySelectorAll('.t-in').forEach(el => { if (el.value) QCForm.chkTorque(el) })
  }

  function renderChecklist(bodyEl, sec, si, saved) {
    const list = document.createElement('div'); list.className = 'check-list'
    sec.items.forEach((txt, i) => {
      const div = document.createElement('div'); div.className = 'chk-item'; div.id = `ci-${si}-${i}`
      const checked = saved[`cb_${si}_${i}`] || false
      if (checked) div.classList.add('checked')
      div.innerHTML = `<input type="checkbox" id="cb-${si}-${i}" ${checked ? 'checked' : ''} onchange="QCForm.chkCheck(${si},${i},this,${sec.items.length})">
        <label class="chk-label" for="cb-${si}-${i}">${txt}</label>`
      list.appendChild(div)
    })
    bodyEl.appendChild(list)
  }

  function renderRelease(bodyEl, sec, si, saved) {
    const rw = document.createElement('div'); rw.className = 'release-wrap'
    const savedRel = saved[`rel_${si}`]
    rw.innerHTML = sec.options.map(o => `
      <label class="rel-opt"><input type="radio" name="rel-${si}" value="${o.value}" ${savedRel === o.value ? 'checked' : ''} onchange="QCForm.updateProgress_()">
        <span class="rel-label">${o.label}</span></label>`).join('')
    bodyEl.appendChild(rw)
  }

  function chkTorque(el) {
    const spec = parseFloat(el.dataset.spec), val = parseFloat(el.value)
    const dot = document.getElementById('rd-' + el.dataset.ref)
    if (!dot) return
    const si = el.dataset.sec
    if (isNaN(val) || el.value === '') { el.className = 't-in'; dot.className = 'result-dot'; dot.textContent = '' }
    else if (val >= spec * 0.9 && val <= spec * 1.1) { el.className = 't-in pass'; dot.className = 'result-dot dot-pass'; dot.textContent = '✓' }
    else { el.className = 't-in fail'; dot.className = 'result-dot dot-fail'; dot.textContent = '✗' }
    updateSectionBadge(si, FORMS[currentFormType])
    updateProgress(FORMS[currentFormType])
  }

  function chkCheck(si, i, el, total) {
    document.getElementById(`ci-${si}-${i}`).className = 'chk-item' + (el.checked ? ' checked' : '')
    updateSectionBadge(si, FORMS[currentFormType])
    updateProgress(FORMS[currentFormType])
  }

  function updateProgress_() { updateProgress(FORMS[currentFormType]) }

  function updateSectionBadge(si, form) {
    const sec = form.sections[si]
    const badge = document.getElementById(`fsb-${si}`)
    if (!badge) return
    if (sec.type === 'bolts') {
      const inputs = document.querySelectorAll(`input[data-sec="${si}"]`)
      let all = true, fail = false
      inputs.forEach(i => {
        if (!i.value) all = false
        else { const v = parseFloat(i.value), s = parseFloat(i.dataset.spec); if (v < s * 0.9 || v > s * 1.1) fail = true }
      })
      if (!all) { badge.textContent = 'Pending'; badge.className = 'form-sec-badge badge-pending' }
      else if (fail) { badge.textContent = 'Fail'; badge.className = 'form-sec-badge badge-fail' }
      else { badge.textContent = 'Complete'; badge.className = 'form-sec-badge badge-ok' }
    } else if (sec.type === 'checklist') {
      let done = 0
      for (let i = 0; i < sec.items.length; i++) { const cb = document.getElementById(`cb-${si}-${i}`); if (cb && cb.checked) done++ }
      if (done === 0) { badge.textContent = 'Pending'; badge.className = 'form-sec-badge badge-pending' }
      else if (done < sec.items.length) { badge.textContent = `${done}/${sec.items.length}`; badge.className = 'form-sec-badge badge-partial' }
      else { badge.textContent = 'Complete'; badge.className = 'form-sec-badge badge-ok' }
    } else if (signed[si]) {
      badge.textContent = 'Signed'; badge.className = 'form-sec-badge badge-ok'
    }
  }

  function updateProgress(form) {
    if (!form) return
    let done = 0, total = 0
    form.sections.forEach((sec, si) => {
      const badge = document.getElementById(`fsb-${si}`)
      if (badge && (badge.textContent === 'Complete' || badge.textContent === 'Signed')) done++
      total++
      if (signed[si]) done += 0 // sign-off already counted in badge
    })
    // Sign-offs
    form.sections.forEach((_, si) => { total++; if (signed[si]) done++ })
    const btn = document.getElementById('form-submit-btn')
    if (!btn) return
    const allSigned = form.sections.every((_, si) => signed[si])
    if (allSigned) { btn.className = 'footer-btn primary ready'; btn.textContent = '✓ Submit' }
    else { btn.className = 'footer-btn primary'; btn.textContent = 'Submit' }
  }

  function signSection(si) {
    const nameEl = document.getElementById(`sn-${si}`)
    if (!nameEl || !nameEl.value.trim()) { toast('Enter your name first'); return }
    const now = new Date()
    const ts = now.toLocaleTimeString('en-GB', { hour: '2-digit', minute: '2-digit' }) + ' ' + now.toLocaleDateString('en-GB')
    signed[si] = { name: nameEl.value.trim(), ts }
    document.getElementById(`sb-${si}`).style.display = 'none'
    nameEl.disabled = true
    const si_el = document.getElementById(`si-${si}`)
    si_el.style.display = 'flex'
    document.getElementById(`st-${si}`).textContent = `${nameEl.value.trim()} — ${ts}`
    updateSectionBadge(si, FORMS[currentFormType])
    updateProgress(FORMS[currentFormType])
  }

  function collectData(form) {
    const data = {}
    form.sections.forEach((sec, si) => {
      if (sec.type === 'bolts') {
        document.querySelectorAll(`input[data-sec="${si}"]`).forEach(el => { data[`t_${el.dataset.ref}`] = el.value })
      } else if (sec.type === 'checklist') {
        sec.items.forEach((_, i) => { const cb = document.getElementById(`cb-${si}-${i}`); data[`cb_${si}_${i}`] = cb ? cb.checked : false })
      } else if (sec.type === 'release') {
        const r = document.querySelector(`input[name="rel-${si}"]:checked`); if (r) data[`rel_${si}`] = r.value
      }
      const notes = document.getElementById(`notes-${si}`); if (notes) data[`notes_${si}`] = notes.value
      if (signed[si]) data[`sign_${si}`] = signed[si]
    })
    return data
  }

  async function submit() {
    const form = FORMS[currentFormType]
    if (!form) return
    const data = collectData(form)
    try {
      const record = {
        id: currentRecord?.id,
        job_id: currentJobId,
        form_type: currentFormType,
        data,
        operator: App.getUser()?.name,
        created_at: currentRecord?.created_at || new Date().toISOString(),
        updated_at: new Date().toISOString(),
        // Pull top-level fields for searchability
        work_order: document.getElementById('form-screen-sub').textContent.split('·')[0].trim(),
        serial: document.getElementById('form-screen-sub').textContent.split('·')[1]?.trim(),
      }
      const saved = await DB.saveQCRecord(record)
      currentRecord = saved
      // Update job's qc_records flag
      try {
        const job = await DB.getJob(currentJobId)
        const qcRec = job.qc_records || {}
        qcRec[currentFormType] = true
        await DB.updateJob(currentJobId, { qc_records: qcRec })
      } catch (e) {}
      toast('Record saved ✓')
      document.getElementById('form-submit-btn').className = 'footer-btn primary ready'
      document.getElementById('form-submit-btn').textContent = '✓ Saved'
    } catch (e) { toast('Error saving: ' + e.message) }
  }

  function export_() {
    const form = FORMS[currentFormType]
    if (!form) return
    const data = collectData(form)
    let txt = `${form.title.toUpperCase()}\n${'='.repeat(50)}\n`
    txt += `Job: ${currentJobId}  Date: ${new Date().toLocaleDateString('en-GB')}\n\n`
    form.sections.forEach((sec, si) => {
      txt += `${sec.title.toUpperCase()}\n${'-'.repeat(40)}\n`
      if (sec.type === 'bolts') {
        sec.bolts.forEach(b => { txt += `  ${b.ref}: ${data[`t_${b.ref}`]||'—'} Nm  (spec ${b.spec} Nm)\n` })
      } else if (sec.type === 'checklist') {
        sec.items.forEach((item, i) => { txt += `  [${data[`cb_${si}_${i}`] ? 'X' : ' '}] ${item}\n` })
      }
      if (data[`notes_${si}`]) txt += `  Notes: ${data[`notes_${si}`]}\n`
      if (signed[si]) txt += `  Signed: ${signed[si].name} @ ${signed[si].ts}\n`
      txt += '\n'
    })
    const blob = new Blob([txt], { type: 'text/plain' })
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob); a.download = `QC_${currentFormType}_${Date.now()}.txt`; a.click()
  }

  return { open, chkTorque, chkCheck, updateProgress_, signSection, submit, export: export_, register }
})()

// RECORDS
const Records = (() => {
  async function refresh(search) {
    try {
      const records = await DB.getQCRecords(search ? { search } : {})
      render(records)
    } catch (e) { console.error(e) }
  }

  function render(records) {
    const el = document.getElementById('records-list')
    if (!records.length) { el.innerHTML = '<div class="empty-state"><div class="empty-icon">📋</div>No records found</div>'; return }
    el.innerHTML = records.map(r => `
      <div class="record-card">
        <div class="record-wo">${r.work_order || r.job_id} — ${r.form_type}</div>
        <div class="record-meta">SN: ${r.serial || '—'} · ${r.operator || '—'} · ${new Date(r.updated_at).toLocaleDateString('en-GB')}</div>
        <div class="record-badges">
          <span class="form-sec-badge badge-ok">Submitted</span>
        </div>
      </div>`).join('')
  }

  function search(val) {
    clearTimeout(Records._searchTimer)
    Records._searchTimer = setTimeout(() => refresh(val), 300)
  }

  return { refresh, search }
})()
