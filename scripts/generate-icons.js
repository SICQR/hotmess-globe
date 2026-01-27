/**
 * PWA Icon Generator Script
 * 
 * Generates PNG icons at various sizes from the SVG favicon.
 * Run with: node scripts/generate-icons.js
 * 
 * Requires: npm install sharp
 */

const fs = require('fs');
const path = require('path');

// Try to use sharp if available, otherwise provide instructions
async function generateIcons() {
  const sizes = [72, 96, 128, 144, 152, 192, 384, 512];
  const outputDir = path.join(__dirname, '../public/icons');
  const svgPath = path.join(__dirname, '../public/favicon.svg');
  
  // Create output directory if it doesn't exist
  if (!fs.existsSync(outputDir)) {
    fs.mkdirSync(outputDir, { recursive: true });
  }
  
  let sharp;
  try {
    sharp = require('sharp');
  } catch (e) {
    console.log('Sharp is not installed. Install it with: npm install sharp');
    console.log('\nAlternatively, you can use these online tools to generate icons:');
    console.log('1. https://realfavicongenerator.net/');
    console.log('2. https://www.pwabuilder.com/imageGenerator');
    console.log('\nOr manually create PNG files at these sizes:', sizes);
    
    // Create placeholder SVG icons instead
    console.log('\nCreating placeholder SVG icons...');
    const svgContent = fs.readFileSync(svgPath, 'utf-8');
    
    for (const size of sizes) {
      const iconPath = path.join(outputDir, `icon-${size}x${size}.svg`);
      // Write the SVG with adjusted viewBox for each size
      const scaledSvg = svgContent
        .replace('viewBox="0 0 512 512"', `viewBox="0 0 512 512" width="${size}" height="${size}"`);
      fs.writeFileSync(iconPath, scaledSvg);
      console.log(`Created: ${iconPath}`);
    }
    
    console.log('\nNote: These are SVG placeholders. For full PWA support, generate PNG files.');
    return;
  }
  
  // Read SVG file
  const svgBuffer = fs.readFileSync(svgPath);
  
  console.log('Generating PWA icons...');
  
  for (const size of sizes) {
    const outputPath = path.join(outputDir, `icon-${size}x${size}.png`);
    
    await sharp(svgBuffer)
      .resize(size, size)
      .png()
      .toFile(outputPath);
    
    console.log(`Generated: icon-${size}x${size}.png`);
  }
  
  // Also create a badge icon for notifications (smaller, simpler)
  const badgePath = path.join(outputDir, 'badge-72x72.png');
  await sharp(svgBuffer)
    .resize(72, 72)
    .png()
    .toFile(badgePath);
  console.log('Generated: badge-72x72.png');
  
  // Create Apple touch icon
  const appleTouchPath = path.join(outputDir, 'apple-touch-icon.png');
  await sharp(svgBuffer)
    .resize(180, 180)
    .png()
    .toFile(appleTouchPath);
  console.log('Generated: apple-touch-icon.png');
  
  console.log('\nDone! All PWA icons generated successfully.');
  console.log('\nAdd these lines to your index.html <head>:');
  console.log('<link rel="apple-touch-icon" href="/icons/apple-touch-icon.png">');
}

generateIcons().catch(console.error);
