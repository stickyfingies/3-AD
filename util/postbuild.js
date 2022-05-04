import fs from 'fs';

const path = './dist/index.es.js';

fs.readFile(path, 'utf8', (err, data) => {
    if (err) return console.error(err);

    // Vite spits out WebWorkers with absolute paths, making them nearly impossible
    // to package with reusable liraries.  This script applies a patch to the WW paths,
    // making them relative to the script that loads them.
    const result = data.replace(/Worker\("(.+)",/g , 'Worker(new URL(".$1", import.meta.url),');
    
    fs.writeFile('./dist/index.es.js', result, 'utf8', (err) => {
        if (err) console.error(err);
    });
});