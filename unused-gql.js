// find-unused-gql.js
const fs = require('fs');
const path = require('path');

const gqlDir = path.resolve(__dirname, '../ctx/frontend/src/graphql'); // <-- set your gql folder
const projectDir = path.resolve(__dirname, '../ctx/frontend'); // <-- set your project root

// 1. Recursively collect all .gql files
function getAllGqlFiles(dir) {
  let results = [];
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      results = results.concat(getAllGqlFiles(fullPath));
    } else if (file.endsWith('.gql')) {
      if (file.includes("fragment")) return; // Skip fragments
      results.push(fullPath.replace("/Users/aroslavmihajlov/Documents/ctx/frontend/src", "@"));
    }
  });
  return results;
}

// 2. Recursively collect all .vue, .js, .ts files
function getAllCodeFiles(dir) {
  let results = [];
  fs.readdirSync(dir).forEach(file => {
    const fullPath = path.join(dir, file);
    if (fs.statSync(fullPath).isDirectory()) {
      results = results.concat(getAllCodeFiles(fullPath));
    } else if (/\.(vue|js|ts)$/.test(file)) {
      results.push(fullPath);
    }
  });
  return results;
}

// 3. Check if a file is referenced via require()
function isGqlFileUsed(gqlFile, codeFiles) {
  const requirePattern = new RegExp(`(['"\`]${gqlFile.replace(/\\/g, '\\\\')}['"\`])`, 'g');
  return codeFiles.some(codeFile => {
    const content = fs.readFileSync(codeFile, 'utf8');
    return requirePattern.test(content);
  });
}

// MAIN
const gqlFiles = getAllGqlFiles(gqlDir);
const codeFiles = getAllCodeFiles(projectDir);

const unusedGqlFiles = gqlFiles.filter(gqlFile => !isGqlFileUsed(gqlFile, codeFiles));

console.log('Unused .gql files:');
unusedGqlFiles.forEach(f => console.log(f));
