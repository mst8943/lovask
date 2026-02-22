/* eslint-disable @typescript-eslint/no-require-imports */
const fs = require('fs');

const path = 'c:/MAMP/htdocs/lovask/lovask-web/app/admin/bots/page.tsx';
let content = fs.readFileSync(path, 'utf8');

// The regex matches everything between className="..." containing the old long class.
// We replace it to simplify and standardize inputs and buttons based on UI/UX rules.

content = content.replace(/className="w-full px-3 py-2 bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-500 focus:outline-none focus:ring-2 focus:ring-white\/10 focus:border-white\/30([^"]*)"/g, 'className="glass-input w-full px-4 py-2.5 text-sm$1"');

content = content.replace(/className="w-full px-3 py-2 rounded-lg bg-black\/20 border border-slate-200([^"]*)"/g, 'className="glass-input w-full px-4 py-2.5 text-sm$1"');

content = content.replace(/className="bg-white border border-slate-200 rounded-xl text-sm text-slate-700 placeholder:text-slate-600 focus:outline-none focus:ring-2 focus:ring-white\/10 focus:border-white\/30 px-3 py-2([^"]*)"/g, 'className="glass-input w-full px-4 py-2.5 text-sm$1"');

content = content.replace(/glass-panel p-5 rounded-2xl border border-slate-200 space-y-3/g, 'glass-panel p-6 rounded-2xl border border-slate-200 space-y-5 shadow-sm');

content = content.replace(/<h2 className="font-semibold">/g, '<h2 className="text-lg font-bold text-slate-800">');

content = content.replace(/<div className="text-sm text-slate-700">/g, '<div className="text-xs font-semibold uppercase tracking-wider text-slate-500 mb-1.5">');

content = content.replace(/className="w-full py-3 rounded-xl font-semibold admin-primary-btn"/g, 'className="w-full py-3.5 rounded-xl font-bold admin-primary-btn shadow-sm hover:translate-y-[-1px] transition-all"');

content = content.replace(/className="flex items-center justify-between"/g, 'className="flex items-center justify-between border-b border-slate-100 pb-4"');

fs.writeFileSync(path, content);
console.log('Done refactoring');
