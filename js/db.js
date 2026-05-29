// db.js — Supabase database layer
const DB = (() => {
  let client = null

  function init(url, key) {
    client = supabase.createClient(url, key)
    return client
  }

  function get() { return client }

  // JOBS
  async function getJobs(filters = {}) {
    let q = client.from('jobs').select('*').order('scheduled_date', { ascending: true })
    if (filters.date) q = q.eq('scheduled_date', filters.date)
    if (filters.status) q = q.eq('status', filters.status)
    if (filters.operator) q = q.eq('operator', filters.operator)
    const { data, error } = await q
    if (error) throw error
    return data
  }

  async function getJob(id) {
    const { data, error } = await client.from('jobs').select('*').eq('id', id).single()
    if (error) throw error
    return data
  }

  async function createJob(job) {
    const { data, error } = await client.from('jobs').insert(job).select().single()
    if (error) throw error
    return data
  }

  async function updateJob(id, updates) {
    const { data, error } = await client.from('jobs').update(updates).eq('id', id).select().single()
    if (error) throw error
    return data
  }

  // STAGE LOGS
  async function getStageLogs(jobId) {
    const { data, error } = await client.from('stage_logs').select('*').eq('job_id', jobId).order('started_at', { ascending: true })
    if (error) throw error
    return data
  }

  async function upsertStageLog(log) {
    const { data, error } = await client.from('stage_logs').upsert(log, { onConflict: 'job_id,stage_id' }).select().single()
    if (error) throw error
    return data
  }

  // QC RECORDS
  async function getQCRecords(filters = {}) {
    let q = client.from('qc_records').select('*').order('created_at', { ascending: false })
    if (filters.job_id) q = q.eq('job_id', filters.job_id)
    if (filters.form_type) q = q.eq('form_type', filters.form_type)
    if (filters.search) q = q.or(`serial.ilike.%${filters.search}%,work_order.ilike.%${filters.search}%,operator.ilike.%${filters.search}%`)
    const { data, error } = await q.limit(50)
    if (error) throw error
    return data
  }

  async function saveQCRecord(record) {
    if (record.id) {
      const { data, error } = await client.from('qc_records').update(record).eq('id', record.id).select().single()
      if (error) throw error
      return data
    } else {
      const { data, error } = await client.from('qc_records').insert(record).select().single()
      if (error) throw error
      return data
    }
  }

  // REALTIME
  function subscribeJobs(callback) {
    return client.channel('jobs-changes')
      .on('postgres_changes', { event: '*', schema: 'public', table: 'jobs' }, callback)
      .on('postgres_changes', { event: '*', schema: 'public', table: 'stage_logs' }, callback)
      .subscribe()
  }

  // STATS
  async function getTodayStats() {
    const today = new Date().toISOString().split('T')[0]
    const { data: jobs } = await client.from('jobs').select('status').eq('scheduled_date', today)
    const { data: completed } = await client.from('jobs').select('id').eq('status', 'complete').gte('updated_at', today)
    const { data: inprog } = await client.from('jobs').select('id').eq('status', 'in_progress')
    return {
      scheduled: (jobs || []).length,
      complete: (completed || []).length,
      inProgress: (inprog || []).length,
      onHold: (jobs || []).filter(j => j.status === 'hold').length,
    }
  }

  return { init, get, getJobs, getJob, createJob, updateJob, getStageLogs, upsertStageLog, getQCRecords, saveQCRecord, subscribeJobs, getTodayStats }
})()
