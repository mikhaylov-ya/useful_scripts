// vue-imports-scanner.js

const fs = require('fs');
const path = require('path');


/**
 * Recursively find all .vue files in a directory.
 * @param {string} dir
 * @returns {string[]} Array of absolute file paths
 */
function findFiles(dir) {
  let results = [];
  const list = fs.readdirSync(dir);
  for (const file of list) {
    const filePath = path.join(dir, file);
    const stat = fs.statSync(filePath);
    if (stat && stat.isDirectory()) {
      results = results.concat(findFiles(filePath));
    } else if (filePath.endsWith('.vue')) {
      results.push(filePath);
    }
  }
  return results;
}

/**
 * Extracts all Vue component imports from a .vue file content.
 * @param {string} fileContent
 * @returns {string[]} Array of import paths ending with .vue
 */
function parseVueComponentImports(fileContent) {
  const importRegex = /import\s+[\w\s{},*]+\s+from\s+['"]([^'"]+\.vue)['"]/g;
  const imports = [];
  let match;
  while ((match = importRegex.exec(fileContent)) !== null) {
    imports.push(match[1]);
  }
  return imports;
}

/**
 * Main function: scans directory and prints .vue imports with counts.
 * @param {string} rootDir
 */
function scanVueImports(rootDir) {
  const vueFiles = findFiles(rootDir);
  const importCounts = {};

  for (const file of vueFiles) {
    const content = fs.readFileSync(file, 'utf-8');
    const imports = parseVueComponentImports(content);
    for (const imp of imports) {
      importCounts[imp] = (importCounts[imp] || 0) + 1;
    }
  }

  console.log('Vue component imports and their counts:');
  Object.entries(importCounts)
    .sort((a, b) => b[1] - a[1])
    .forEach(([imp, count]) => {
      console.log(`${imp}: ${count}`);
    });
}

// Usage: node vue-imports-scanner.js /path/to/your/src
if (require.main === module) {
  const dir = process.argv[2];
  if (!dir) {
    console.error('Usage: node vue-imports-scanner.js <directory>');
    process.exit(1);
  }
  scanVueImports(dir);
}
