/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');

const dir = 'c:/MAMP/htdocs/lovask/lovask-web/app/admin';
const advancedFolders = [
    'bot-management', 'bot-monitoring', 'bot-interactions', 'bot-optimization',
    'ops', 'audit', 'settings',
    'moderation', 'incidents', 'risk', 'insights',
    'payments', 'transactions', 'chargebacks', 'refunds',
    'ai'
];

for (const folder of advancedFolders) {
    const pagePath = path.join(dir, folder, 'page.tsx');
    if (!fs.existsSync(pagePath)) continue;

    let content = fs.readFileSync(pagePath, 'utf8');

    // 1. Panels: standardize
    content = content.replace(/className=\"glass-panel p-5 rounded-2xl border border-slate-200 space-y-3\"/g, 'className=\"glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4\"');
    content = content.replace(/className=\"glass-panel p-6 rounded-2xl space-y-4 border border-slate-200\"/g, 'className=\"glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm space-y-4\"');

    // 2. Headings on top of pages
    content = content.replace(/className=\"text-2xl font-bold mb-6\"/g, 'className=\"text-2xl font-bold\"');
    // Ensure titles are inside a nice flex container at the top if possible. (Some might already be)

    // 3. Inner Panel Header Descriptions
    // E.g. <div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">
    // Some are already updated, but let's fix old settings inputs
    content = content.replace(/className=\"glass-input bg-white border border-slate-200 rounded-full px-3 py-2 text-xs\"/g, 'className=\"glass-input w-full px-4 py-2.5 text-sm\"');
    content = content.replace(/className=\"glass-input w-full px-3 py-2 text-sm\"/g, 'className=\"glass-input w-full px-4 py-2.5 text-sm\"');

    // Checkboxes
    content = content.replace(/className=\"w-4 h-4 accent-emerald-500\"/g, 'className=\"w-5 h-5 rounded border-slate-300 text-pink-500 focus:ring-pink-500 cursor-pointer\"');
    content = content.replace(/className=\"w-5 h-5 accent-emerald-500\"/g, 'className=\"w-5 h-5 rounded border-slate-300 text-pink-500 focus:ring-pink-500 cursor-pointer\"');

    // Labels
    content = content.replace(/className=\"text-\[10px\] uppercase tracking-wider text-slate-500\"/g, 'className=\"text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5\"');

    // Tables / Lists generic class replacements
    content = content.replace(/className=\"bg-slate-50 p-3 rounded-lg flex items-center justify-between\"/g, 'className=\"glass-panel p-5 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 flex flex-col md:flex-row md:items-center justify-between gap-4\"');

    // Primary Buttons (small ones and big ones)
    content = content.replace(/className=\"px-4 py-2 rounded-lg admin-primary-btn text-sm\"/g, 'className=\"px-6 py-2.5 rounded-xl font-bold admin-primary-btn shadow-sm hover:translate-y-[-1px] transition-all\"');
    content = content.replace(/className=\"px-3 py-1\.5 rounded-lg admin-primary-btn text-xs\"/g, 'className=\"px-6 py-2.5 rounded-xl font-bold admin-primary-btn shadow-sm hover:translate-y-[-1px] transition-all text-xs\"');

    // Panel internal titles
    content = content.replace(/className=\"text-sm font-medium text-slate-700\"/g, 'className=\"text-lg font-bold text-slate-800 border-b border-slate-100 pb-2\"');

    fs.writeFileSync(pagePath, content, 'utf8');
    console.log(`Refactored UX in ${folder}`);
}
