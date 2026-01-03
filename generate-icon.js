// Script to generate icon.ico from PNG using to-ico
const fs = require('fs');
const path = require('path');
const toIco = require('to-ico');

async function generateIco() {
    const pngPath = path.join(__dirname, 'public', 'icon.png');
    const icoPath = path.join(__dirname, 'public', 'icon.ico');

    const pngBuffer = fs.readFileSync(pngPath);
    const icoBuffer = await toIco([pngBuffer]);

    fs.writeFileSync(icoPath, icoBuffer);
    console.log('Generated icon.ico successfully!');
    console.log('File size:', fs.statSync(icoPath).size, 'bytes');
}

generateIco().catch(console.error);
