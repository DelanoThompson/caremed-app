# Caremed Production App — Setup Guide

## Overview
The app has two parts:
1. **GitHub Pages** — hosts the app files (free, already set up from last time)
2. **Supabase** — free cloud database that syncs data across all devices in real time

This guide covers both. Total setup time: about 20 minutes.

---

## Part 1 — Set up Supabase (the database)

### Step 1 — Create a free Supabase account
1. Go to **supabase.com**
2. Click **Start your project** → sign up with GitHub or email
3. Verify your email if prompted

### Step 2 — Create a new project
1. Click **New project**
2. Name it: `caremed-production`
3. Set a database password (save this somewhere safe)
4. Choose region: **West EU (Ireland)** — closest to UK
5. Click **Create new project** — wait ~2 minutes

### Step 3 — Create the database tables
1. In your Supabase project, click **SQL Editor** (left sidebar)
2. Click **New query**
3. Paste the SQL below and click **Run**:

```sql
-- Jobs table (one row per unit being built)
CREATE TABLE jobs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  work_order TEXT NOT NULL,
  model TEXT NOT NULL,
  serial TEXT,
  operator TEXT NOT NULL,
  scheduled_date DATE NOT NULL,
  target_days INTEGER DEFAULT 1,
  status TEXT DEFAULT 'scheduled',
  stages_completed INTEGER[] DEFAULT '{}',
  current_stage INTEGER,
  qc_records JSONB DEFAULT '{}',
  notes TEXT,
  created_by TEXT,
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Stage logs (one row per stage per job — records start/end times)
CREATE TABLE stage_logs (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  stage_id INTEGER NOT NULL,
  operator TEXT,
  started_at TIMESTAMPTZ DEFAULT now(),
  ended_at TIMESTAMPTZ,
  paused BOOLEAN DEFAULT false,
  UNIQUE(job_id, stage_id)
);

-- QC records (one row per form submission per job)
CREATE TABLE qc_records (
  id UUID DEFAULT gen_random_uuid() PRIMARY KEY,
  job_id UUID REFERENCES jobs(id) ON DELETE CASCADE,
  form_type TEXT NOT NULL,
  work_order TEXT,
  serial TEXT,
  operator TEXT,
  data JSONB DEFAULT '{}',
  created_at TIMESTAMPTZ DEFAULT now(),
  updated_at TIMESTAMPTZ DEFAULT now()
);

-- Enable Row Level Security (open access for now — tighten later if needed)
ALTER TABLE jobs ENABLE ROW LEVEL SECURITY;
ALTER TABLE stage_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE qc_records ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Allow all" ON jobs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON stage_logs FOR ALL USING (true) WITH CHECK (true);
CREATE POLICY "Allow all" ON qc_records FOR ALL USING (true) WITH CHECK (true);

-- Enable realtime
ALTER PUBLICATION supabase_realtime ADD TABLE jobs;
ALTER PUBLICATION supabase_realtime ADD TABLE stage_logs;
```

4. You should see **Success. No rows returned** — that means it worked.

### Step 4 — Get your connection credentials
1. Go to **Project Settings** (⚙ gear icon, bottom left)
2. Click **API**
3. You need two things:
   - **Project URL** — looks like `https://abcdefghijkl.supabase.co`
   - **anon public key** — long string starting with `eyJ...`
4. Copy both — you'll need them in the app

---

## Part 2 — Upload to GitHub Pages

### If this is your first time (new repository):
1. Go to **github.com** → sign in
2. Click **+** → **New repository**
3. Name it `caremed-app` → set **Public** → **Create repository**
4. Upload ALL files from this folder (drag and drop) including the `css/`, `js/`, `icons/` folders
5. Go to **Settings → Pages** → Source: **main branch** → Save
6. Your URL: `https://YOUR-USERNAME.github.io/caremed-app/`

### If you already have the old single-form app:
You can either:
- **Replace it**: delete the old files in your `caremed-qc` repo and upload these new ones
- **New repo**: create a new repo called `caremed-app` alongside the old one

---

## Part 3 — Connect the app

### On each device (phone, tablet):
1. Open Chrome → go to your GitHub Pages URL
2. The app will show a **setup screen** asking for:
   - **Supabase Project URL** — paste from Step 4 above
   - **Supabase Anon Key** — paste from Step 4 above
   - **Your name**
   - **Role** — Supervisor or Operator
3. Tap **Connect & Continue**
4. The app connects and you're in

### Install to home screen:
- Chrome will show an **install banner** — tap it
- Or: tap Chrome menu (⋮) → **Add to Home screen**

---

## How it works across the team

| Role | What they can do |
|------|-----------------|
| **Supervisor** | Schedule jobs, assign operators, view all builds, put jobs on hold |
| **Operator** | See their builds, clock in/out of stages, fill QC forms |

All devices see live updates — when an operator starts a stage, the supervisor's dashboard updates instantly.

---

## Adding new QC forms (when you're ready)

To add a new form (e.g. pre-delivery inspection):
1. Create a new file in `js/forms/` — copy `assembly.js` as a template
2. Change the `QCForm.register('assembly', {...})` call to `QCForm.register('pre-delivery', {...})`
3. Add your sections, checklists and bolt specs
4. Add a `<script src="js/forms/pre-delivery.js">` line in `index.html`
5. In `build-tracker.js`, find the form links section and uncomment/update the pre-delivery card

That's all — the form engine handles rendering, sign-offs, saving and exporting automatically.

---

## Troubleshooting

**"Connection failed"** — Double-check your URL and anon key. Make sure you copied the full key.

**Data not syncing** — Check you have internet. Check Supabase is not in maintenance (status.supabase.com).

**App won't install** — Must be opened in Chrome (not Safari or Samsung Internet) for the install prompt to appear.

**Need to reset / start fresh** — In the app, go to ⚙ Settings → Disconnect. This clears your credentials but not the database data.
