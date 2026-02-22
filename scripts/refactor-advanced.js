/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');
const path = require('path');
const dir = 'c:/MAMP/htdocs/lovask/lovask-web/app/admin';

const folders = [
    'bot-management', 'bot-monitoring', 'bot-interactions', 'bot-optimization',
    'ops', 'audit', 'settings',
    'moderation', 'incidents', 'risk', 'insights',
    'payments', 'transactions', 'chargebacks', 'refunds',
    'ai'
];

for (const folder of folders) {
    const pagePath = path.join(dir, folder, 'page.tsx');
    if (!fs.existsSync(pagePath)) continue;

    let content = fs.readFileSync(pagePath, 'utf8');

    content = content.replace(/className="space-y-6"/g, 'className="admin-page space-y-6"');
    content = content.replace(/className="text-xs text-slate-500"/g, 'className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5"');
    content = content.replace(/className="text-sm text-slate-500"/g, 'className="text-sm text-slate-700"');

    content = content.replace(/className="text-xs px-3 py-1\.5 rounded-full bg-white border border-slate-200 text-slate-600"/g, 'className="text-xs px-4 py-2.5 rounded-full font-bold bg-white border border-slate-200 text-slate-700 shadow-sm hover:translate-y-[-1px] transition-all"');

    content = content.replace(/className="glass-panel p-5 rounded-2xl border border-slate-200 space-y-2"/g, 'className="glass-panel p-6 rounded-2xl border border-slate-200 shadow-sm hover:shadow-md transition-all duration-200 space-y-3 group"');

    content = content.replace(/className="text-sm font-semibold"/g, 'className="text-lg font-bold text-slate-800 group-hover:text-slate-900 border-b border-slate-100 pb-2"');

    content = content.split('className="text-xs uppercase tracking-[0.2em] text-slate-500"').join('className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2"');
    content = content.split('className="text-xs uppercase tracking-[0.2em] text-slate-600"').join('className="text-[10px] font-bold uppercase tracking-wider text-slate-400 mb-2"');

    fs.writeFileSync(pagePath, content, 'utf8');
}
console.log('Done refactoring advanced pages');
