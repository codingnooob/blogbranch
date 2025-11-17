const sharp = require('sharp');
const fs = require('fs');
const path = require('path');

const svgPath = path.join(__dirname, '../icons/icon.svg');
const outputDir = path.join(__dirname, '../icons');

const sizes = [16, 32, 48, 64, 128, 256];

async function generateIcons() {
  try {
    // Ensure the output directory exists
    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    // Generate PNG icons for each size
    for (const size of sizes) {
      const outputPath = path.join(outputDir, `icon${size}.png`);
      
      await sharp(svgPath)
        .resize(size, size)
        .png({ 
          compressionLevel: 9,
          quality: 90
        })
        .toFile(outputPath);
      
      console.log(`Generated ${size}x${size} icon: ${outputPath}`);
    }

    console.log('All icons generated successfully!');
  } catch (error) {
    console.error('Error generating icons:', error);
    process.exit(1);
  }
}

generateIcons();