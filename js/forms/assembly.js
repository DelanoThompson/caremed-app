// forms/assembly.js — Assembly QC form definition
// Registers itself with QCForm engine via QCForm.register()

document.addEventListener('DOMContentLoaded', () => {
  QCForm.register('assembly', {
    title: 'Assembly QC',
    sections: [
      {
        title: 'Actuator & frame bolts',
        sub: 'Steps 3–11',
        icon: '🔩',
        type: 'bolts',
        bolts: [
          {ref:'S3-01',step:3,desc:'Backrest frame — LH shoulder bolt',fix:'M10 Shoulder 12mm',spec:45},
          {ref:'S3-02',step:3,desc:'Backrest frame — RH shoulder bolt',fix:'M10 Shoulder 12mm',spec:45},
          {ref:'S4-01',step:4,desc:'Backrest actuator bracket to seat frame',fix:'M10 Caphead 30mm',spec:50},
          {ref:'S4-02',step:4,desc:'Backrest actuator to bracket',fix:'M6 Buttonhead 12mm',spec:12},
          {ref:'S5-01',step:5,desc:'Tilt actuator to seat frame',fix:'M8 Shoulder 30mm',spec:30},
          {ref:'S5-02',step:5,desc:'Tilt actuator nut',fix:'M8 Nut',spec:30},
          {ref:'S6-01',step:6,desc:'Legrest actuator to seat frame',fix:'M8 Shoulder 30mm',spec:30},
          {ref:'S6-02',step:6,desc:'Legrest actuator nut',fix:'M8 Nut',spec:30},
          {ref:'S7-01',step:7,desc:'Legrest slide — bolt 1',fix:'M6 Caphead 30mm',spec:12},
          {ref:'S7-02',step:7,desc:'Legrest slide — bolt 2',fix:'M6 Caphead 30mm',spec:12},
          {ref:'S7-03',step:7,desc:'Legrest slide — bolt 3',fix:'M6 Caphead 30mm',spec:12},
          {ref:'S7-04',step:7,desc:'Legrest slide — bolt 4',fix:'M6 Caphead 30mm',spec:12},
          {ref:'S9-01',step:9,desc:'Legrest actuator to legrest',fix:'M8 Shoulder 30mm',spec:30},
          {ref:'S9-02',step:9,desc:'Legrest actuator nut',fix:'M8 Nut',spec:30},
          {ref:'S10-01',step:10,desc:'Saddle to tilt actuator',fix:'M8 Shoulder 30mm',spec:30},
          {ref:'S10-02',step:10,desc:'Saddle to tilt actuator nut',fix:'M8 Nut',spec:30},
          {ref:'S11-01',step:11,desc:'Saddle to seat frame — LH',fix:'M10 Shoulder 40mm',spec:45},
          {ref:'S11-02',step:11,desc:'Saddle to seat frame — RH',fix:'M10 Shoulder 40mm',spec:45},
        ]
      },
      {
        title: 'Base, castors & hilo bolts',
        sub: 'Steps 12–15',
        icon: '🔩',
        type: 'bolts',
        bolts: [
          {ref:'S12-01',step:12,desc:'Hilo to saddle — bolt 1',fix:'M8 Hex + Spring Washer',spec:30},
          {ref:'S12-02',step:12,desc:'Hilo to saddle — bolt 2',fix:'M8 Hex + Spring Washer',spec:30},
          {ref:'S12-03',step:12,desc:'Hilo to saddle — bolt 3',fix:'M8 Hex + Spring Washer',spec:30},
          {ref:'S12-04',step:12,desc:'Hilo to saddle — bolt 4',fix:'M8 Hex + Spring Washer',spec:30},
          {ref:'S13-01',step:13,desc:'Base frame to hilo — bolt 1',fix:'M8 Hex + Spring Washer',spec:30},
          {ref:'S13-02',step:13,desc:'Base frame to hilo — bolt 2',fix:'M8 Hex + Spring Washer',spec:30},
          {ref:'S13-03',step:13,desc:'Base frame to hilo — bolt 3',fix:'M8 Hex + Spring Washer',spec:30},
          {ref:'S13-04',step:13,desc:'Base frame to hilo — bolt 4',fix:'M8 Hex + Spring Washer',spec:30},
          {ref:'S14-01',step:14,desc:'Braking castor LH',fix:'M12 Caphead 80mm + Loctite',spec:80},
          {ref:'S14-02',step:14,desc:'Braking castor RH',fix:'M12 Caphead 80mm + Loctite',spec:80},
          {ref:'S15-01',step:15,desc:'Tracking castor LH',fix:'M12 Caphead 80mm + Loctite',spec:80},
          {ref:'S15-02',step:15,desc:'Tracking castor RH',fix:'M12 Caphead 80mm + Loctite',spec:80},
        ]
      },
      {
        title: 'Visual inspection 1 — pre-wiring',
        sub: 'After step 18',
        icon: '👁',
        type: 'checklist',
        green: true,
        banner: 'Check all items before proceeding to wiring steps',
        items: [
          'All structural bolts and fixings torqued to spec (steps 1–15)',
          'Frame correctly inverted on height-adjustable lift (step 16)',
          'All plugs and grommets fitted in all apertures (step 17)',
          'No visible damage, sharp edges, or weld defects on frame',
          'Actuators move freely without obstruction',
          'Castors and base frame correctly aligned',
          'Earthing point fitted and secure (step 2)',
        ]
      },
      {
        title: 'Electrical & wiring fixings',
        sub: 'Steps 19–27',
        icon: '🔩',
        type: 'bolts',
        bolts: [
          {ref:'S19-01',step:19,desc:'140mm earth cable — seat frame end',fix:'M4 Caphead 15mm',spec:4},
          {ref:'S19-02',step:19,desc:'140mm earth cable — earth point end',fix:'M6 Buttonhead 10mm',spec:8},
          {ref:'S20-01',step:20,desc:'500mm earth cable to seat frame',fix:'M6 Buttonhead 10mm',spec:8},
          {ref:'S21-01',step:21,desc:'Powercord retainer — bolt 1',fix:'M4 Caphead 10mm',spec:4},
          {ref:'S21-02',step:21,desc:'Powercord retainer — bolt 2',fix:'M4 Caphead 10mm',spec:4},
          {ref:'S22-01',step:22,desc:'Backrest plastic / earth cable bolt',fix:'M6 Buttonhead 20mm',spec:8},
          {ref:'S23-01',step:23,desc:'Handlebar to backrest frame',fix:'M8 Buttonhead 30mm',spec:25},
          {ref:'S24-01',step:24,desc:'Control box — upper bolt',fix:'50mm Buttonhead',spec:12},
          {ref:'S24-02',step:24,desc:'Control box — lower bolt',fix:'40mm Buttonhead',spec:12},
          {ref:'S25-01',step:25,desc:'Battery — bolt 1',fix:'M6 Buttonhead 40mm',spec:8},
          {ref:'S25-02',step:25,desc:'Battery — bolt 2',fix:'M6 Buttonhead 40mm',spec:8},
        ]
      },
      {
        title: 'Visual inspection 2 — pre-cosmetics',
        sub: 'After step 35',
        icon: '👁',
        type: 'checklist',
        green: true,
        banner: 'Check all items before proceeding to finishing steps',
        items: [
          'Both earthing cables installed and secure (steps 19–20)',
          'Powercord retainer fitted (step 21)',
          'Backrest plastic fitted with earthing cable bolt (step 22)',
          'Handlebar fitted correctly (step 23)',
          'Control box and battery fitted (steps 24–25)',
          'All actuators plugged in — cable management complete (step 26)',
          'Powercable, handset and battery plugged in (step 27)',
          'All functions tested and confirmed operational (step 28)',
          'Service cover and all skirts fitted (steps 29–32)',
          'Infection control panels fitted (steps 33–35)',
          'No visible damage, marks, or cosmetic defects',
        ]
      },
      {
        title: 'Body, trim & armrest fixings',
        sub: 'Steps 29–39',
        icon: '🔩',
        type: 'bolts',
        bolts: [
          {ref:'S31-01',step:31,desc:'Armrest bracket LH',fix:'M8 Buttonhead 30mm',spec:25},
          {ref:'S33-01',step:33,desc:'Armrest bracket RH',fix:'M8 Buttonhead 30mm',spec:25},
          {ref:'S36-01',step:36,desc:'Legrest cushion — bolt 1',fix:'M6 Buttonhead 40mm',spec:8},
          {ref:'S36-02',step:36,desc:'Legrest cushion — bolt 2',fix:'M6 Buttonhead 40mm',spec:8},
          {ref:'S39-01',step:39,desc:'Armrest block LH — bolt 1',fix:'M10 Caphead 35mm',spec:45},
          {ref:'S39-02',step:39,desc:'Armrest block LH — bolt 2',fix:'M10 Caphead 35mm',spec:45},
          {ref:'S39-03',step:39,desc:'Armrest block RH — bolt 1',fix:'M10 Caphead 35mm',spec:45},
          {ref:'S39-04',step:39,desc:'Armrest block RH — bolt 2',fix:'M10 Caphead 35mm',spec:45},
          {ref:'S40-01',step:40,desc:'Left armrest — bolt 1',fix:'M6 Buttonhead 40mm',spec:8},
          {ref:'S40-02',step:40,desc:'Left armrest — bolt 2',fix:'M6 Buttonhead 40mm',spec:8},
          {ref:'S41-01',step:41,desc:'Right armrest — bolt 1',fix:'M6 Buttonhead 40mm',spec:8},
          {ref:'S41-02',step:41,desc:'Right armrest — bolt 2',fix:'M6 Buttonhead 40mm',spec:8},
        ]
      },
      {
        title: 'Final QC release',
        sub: 'Sign-off & release decision',
        icon: '🛡',
        type: 'release',
        notes: true,
        options: [
          { value: 'release', label: '✅ Release to despatch' },
          { value: 'hold', label: '⚠️ Hold — rework required' },
          { value: 'scrap', label: '❌ Scrap' },
        ]
      }
    ]
  })
})
