module.exports = function transformer(fileInfo, api) {
  const j = api.jscodeshift;
  const source = fileInfo.source;

  const importMap = new Map();
  const typeDefs = [];

  const typedefBlocks = [];
  const lines = source.split("\n");

  let inTypedef = false;
  let currentBlock = [];

  for (let line of lines) {
    line = line.trim();
    if (line.startsWith("/**")) {
      inTypedef = true;
      currentBlock = [line];
    } else if (inTypedef) {
      currentBlock.push(line);
      if (line.endsWith("*/")) {
        typedefBlocks.push(currentBlock.join("\n"));
        inTypedef = false;
      }
    }
  }

  for (const block of typedefBlocks) {
    const lines = block
      .split("\n")
      .map(l => l.replace(/^\/?\*+ ?/, "").trim())
      .filter(Boolean);

    const typedefLine = lines.find(l => l.startsWith("@typedef"));
    if (!typedefLine) continue;

    const match = typedefLine.match(/@typedef\s+{([^}]+)}\s+(\w+)/);
    if (!match) continue;

    const [, typeExpr, typeName] = match;

    // Handle import types
    if (typeExpr.startsWith("import(")) {
      const importMatch = typeExpr.match(/import\(["'](.+?)["']\)\.(\w+)/);
      if (!importMatch) continue;

      let [, importPath, symbol] = importMatch;
      importPath = importPath.replace(/\.d(\.js)?$/, "");

      if (!importMap.has(importPath)) importMap.set(importPath, new Set());
      importMap.get(importPath).add(symbol);

      continue;
    }

    if (typeExpr === "Object") {
      const properties = lines
        .filter(l => l.startsWith("@property"))
        .map(line => {
          const m = line.match(/@property\s+{([^}]+)}\s+(\w+)(=?)\s*-\s*(.*)?/);
          if (!m) return null;
          const [, type, key, optional] = m;
          return `  ${key}${optional ? "?" : ""}: ${type};`;
        })
        .filter(Boolean);

      typeDefs.push(`export type ${typeName} = {\n${properties.join("\n")}\n};`);
    } else {
      typeDefs.push(`export type ${typeName} = ${typeExpr};`);
    }
  }

  const importLines = Array.from(importMap.entries()).map(([path, names]) =>
    `import type { ${Array.from(names).sort().join(", ")} } from "${path}";`
  );

  const result = [...importLines, "", ...typeDefs].join("\n\n");

  return result;
};
