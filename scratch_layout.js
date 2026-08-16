const fs = require('fs'); 
const path = require('path'); 
function walk(d, cb) { 
  fs.readdirSync(d).forEach(f => { 
    let p = path.join(d, f); 
    if (fs.statSync(p).isDirectory()) walk(p, cb); 
    else cb(p); 
  }); 
} 
walk('c:/Users/User/Documents/[02] Work/2026/bms/src/features', (f) => { 
  if (f.endsWith('Page.tsx') || f.endsWith('View.tsx')) { 
    let c = fs.readFileSync(f, 'utf8'); 
    let o = c; 
    c = c.replace(/className="sticky top-0 z-10 flex flex-col gap-\d bg-background dark:bg-black [^"]+"/g, 'className="sticky top-0 z-10 flex flex-col gap-4 bg-background dark:bg-black p-4 pl-3 pr-4 pb-4 border-b md:border-none border-sidebar-border"'); 
    c = c.replace(/className="flex flex-col gap-\d p-4 md:pt-\d pl-3 pr-4 pb-24 md:pb-\d[^"]*"/g, 'className="flex flex-col gap-4 p-4 md:pt-0 pl-3 pr-4 pb-24 md:pb-4"'); 
    if (c !== o) { 
      fs.writeFileSync(f, c); 
      console.log('Updated', f); 
    } 
  } 
});
