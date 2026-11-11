// Built-in demo for the `untangle` module — used when a section gives no
// `nodes`. A typical small business's stack: two email platforms, two
// clouds, three spreadsheets and a server nobody wants to touch.
export const DEMO = {
  lanes: ['Inputs', 'Core', 'Outputs'],
  nodes: [
    { id: 'web',   label: 'Web forms',  lane: 'Inputs' },
    { id: 'crm',   label: 'CRM',        lane: 'Inputs',
      issue: 'Half the team logs leads in a spreadsheet instead' },
    { id: 'pos',   label: 'POS',        lane: 'Inputs' },
    { id: 'zap',   label: 'Zapier',     lane: 'Core', cleanLabel: 'Integration hub',
      issue: '14 zaps, and nobody remembers who built them' },
    { id: 'qb',    label: 'QuickBooks', lane: 'Core' },
    { id: 'drive', label: 'Shared drive', lane: 'Core' },
    { id: 'sheet', label: 'Sales sheet', lane: 'Outputs', cleanLabel: 'Live reporting',
      issue: 'Re-keyed by hand every Friday' },
    { id: 'gmail', label: 'Gmail',      lane: 'Outputs' },

    { id: 'ol',    label: 'Outlook',        mergeInto: 'gmail',
      issue: 'Two email platforms, double the licensing' },
    { id: 'box',   label: 'Dropbox',        mergeInto: 'drive',
      issue: 'Files split across two clouds' },
    { id: 's2',    label: 'Sales sheet v2', mergeInto: 'sheet',
      issue: 'Which sheet is the real one?' },
    { id: 'inv',   label: 'Inventory.xlsx', mergeInto: 'pos',
      issue: 'Stock counts live outside the POS' },
    { id: 'srv',   label: 'Old server',     remove: true,
      issue: 'Unpatched since 2019' },
  ],
  links: [
    ['crm', 'qb'], ['crm', 'sheet'], ['crm', 'gmail'], ['crm', 'ol'], ['crm', 's2'],
    ['pos', 'inv'], ['pos', 'qb'], ['web', 'gmail'], ['web', 'ol'], ['web', 'crm'],
    ['qb', 'sheet'], ['qb', 's2'], ['qb', 'srv'], ['sheet', 's2'], ['s2', 'inv'],
    ['inv', 'box'], ['gmail', 'ol'], ['ol', 'drive'], ['drive', 'box'], ['box', 'srv'],
    ['zap', 'crm'], ['zap', 'qb'], ['zap', 's2'], ['zap', 'gmail'], ['srv', 'inv'],
  ],
  cleanLinks: [
    ['web', 'zap'], ['crm', 'zap'], ['pos', 'zap'], ['pos', 'qb'],
    ['zap', 'qb'], ['qb', 'sheet'], ['qb', 'drive'], ['zap', 'gmail'],
  ],
}
