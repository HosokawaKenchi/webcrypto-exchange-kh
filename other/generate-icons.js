// generate-icons.js
// Simple script to convert SVG to PNG using Node.js

const fs = require('fs');
const path = require('path');

// Check if sharp is installed
try {
  const sharp = require('sharp');
  
  const svgFile = 'icon.svg';
  const sizes = [192, 512];
  
  if (!fs.existsSync(svgFile)) {
    console.error(`Error: ${svgFile} not found`);
    process.exit(1);
  }
  
  sizes.forEach(size => {
    const outputFile = `icon-${size}.png`;
    sharp(svgFile)
      .resize(size, size, {
        fit: 'contain',
        background: { r: 255, g: 255, b: 255, alpha: 0 }
      })
      .png()
      .toFile(outputFile, (err, info) => {
        if (err) {
          console.error(`✗ Failed to create ${outputFile}:`, err.message);
        } else {
          console.log(`✓ Created ${outputFile} (${info.width}x${info.height})`);
        }
      });
  });
  
} catch (err) {
  console.error('Sharp not installed. Install with: npm install sharp');
  console.error('\nAlternatively, manually convert using:');
  console.error('  - ImageMagick: magick convert icon.svg icon-192.png');
  console.error('  - Online tools: https://convertio.co/svg-png/');
  process.exit(1);
}
