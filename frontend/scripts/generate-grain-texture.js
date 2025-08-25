/**
 * Generate procedural grain texture for anti-banding
 * Creates a 128x128 noise pattern for overlay effects
 */

const fs = require('fs');
const path = require('path');

function generateGrainSVG() {
  const size = 128;
  const density = 0.4; // 40% grain coverage
  
  let circles = '';
  
  for (let i = 0; i < size * size * density; i++) {
    const x = Math.random() * size;
    const y = Math.random() * size;
    const radius = Math.random() * 0.8 + 0.2; // 0.2 to 1.0
    const opacity = Math.random() * 0.15 + 0.05; // 0.05 to 0.2
    
    circles += `<circle cx="${x}" cy="${y}" r="${radius}" fill="white" opacity="${opacity}"/>`;
  }
  
  const svg = `<svg width="${size}" height="${size}" xmlns="http://www.w3.org/2000/svg">
  <rect width="${size}" height="${size}" fill="transparent"/>
  ${circles}
</svg>`;

  return svg;
}

// Generate the grain texture
const grainSVG = generateGrainSVG();
const base64 = Buffer.from(grainSVG).toString('base64');
const dataURI = `data:image/svg+xml;base64,${base64}`;

// Create a simple HTML file to convert to PNG
const htmlConverter = `<!DOCTYPE html>
<html>
<head>
  <style>
    body { margin: 0; padding: 0; }
    canvas { image-rendering: pixelated; }
  </style>
</head>
<body>
  <canvas id="canvas" width="128" height="128"></canvas>
  <script>
    const canvas = document.getElementById('canvas');
    const ctx = canvas.getContext('2d');
    const img = new Image();
    img.onload = function() {
      ctx.drawImage(img, 0, 0);
      const link = document.createElement('a');
      link.download = 'grain.png';
      link.href = canvas.toDataURL('image/png');
      link.click();
    };
    img.src = '${dataURI}';
  </script>
</body>
</html>`;

// Save converter for manual use
fs.writeFileSync(path.join(__dirname, '../public/textures/grain-converter.html'), htmlConverter);

console.log('✅ Grain texture converter created at public/textures/grain-converter.html');
console.log('📝 Open the HTML file in a browser to download the grain.png texture');

// Also create a simple placeholder for now
const simpleSVG = `<svg width="128" height="128" xmlns="http://www.w3.org/2000/svg">
  <rect width="128" height="128" fill="url(#grain)"/>
  <defs>
    <pattern id="grain" width="4" height="4" patternUnits="userSpaceOnUse">
      <rect width="4" height="4" fill="#ffffff" opacity="0.08"/>
      <circle cx="1" cy="1" r="0.3" fill="#ffffff" opacity="0.12"/>
      <circle cx="3" cy="3" r="0.2" fill="#ffffff" opacity="0.10"/>
    </pattern>
  </defs>
</svg>`;

fs.writeFileSync(path.join(__dirname, '../public/textures/grain.svg'), simpleSVG);
console.log('✅ Simple grain.svg created as fallback');