const fs = require('fs');
const path = require('path');

function snakeToCamel(str) {
    return str.replace(/_([a-z])/g, (match, letter) => letter.toUpperCase());
}

function transformGqlFile(filePath) {
    const content = fs.readFileSync(filePath, 'utf8');

    const dir = path.dirname(filePath);
    const filename = path.basename(filePath, '.gql');
    const newFilePath = path.join(dir, `${filename}.ts`);

    // Удалить #import
    const contentWithoutImports = content.replace(/#import\s+["'].*?["']\s*\n?/g, '');
    const cleanContent = contentWithoutImports.trim();

    const isQuery = /^\s*query\s+/i.test(cleanContent);
    const isMutation = /^\s*mutation\s+/i.test(cleanContent);

    let operationName = filename; // fallback to filename

    if (isQuery) {
        const queryMatch = cleanContent.match(/^\s*query\s+(\w+)/i);
        if (queryMatch) {
            operationName = queryMatch[1];
        }
    } else if (isMutation) {
        const mutationMatch = cleanContent.match(/^\s*mutation\s+(\w+)/i);
        if (mutationMatch) {
            operationName = mutationMatch[1];
        }
    }

    let newContent = '';
    // Добавляем импорты
    newContent += 'import { gql } from "@/shared/__gql__";\n';
    const create_api_func = isQuery ? 'create_typed_query' : 'create_typed_mutation';
    newContent += `import { ${create_api_func} } from "@/shared/api";\n`;
    newContent += '\n';
    // Добавляем переменную с gql-тэгом
    newContent += `const ${operationName} = gql(\`${cleanContent}\`);\n`;
    const exportedName = snakeToCamel(`${isQuery ? "query_" : ""}${operationName}`);
    newContent += `export const ${exportedName} = ${create_api_func}(${operationName});`;

    fs.writeFileSync(newFilePath, newContent);

    console.log(`Transformed: ${filePath} -> ${newFilePath}`);

    // Удалить исходный gql-файл
    fs.unlinkSync(filePath);
}

function transformAllGqlFiles(directory) {
    // Read all files in the directory
    const files = fs.readdirSync(directory, { withFileTypes: true });

    for (const file of files) {
        const fullPath = path.join(directory, file.name);

        if (file.isDirectory()) {
            // Recursively process subdirectories
            transformAllGqlFiles(fullPath);
        } else if (file.isFile() && path.extname(file.name) === '.gql') {
            // Transform .gql files
            transformGqlFile(fullPath);
        }
    }
}

function main() {
    const args = process.argv.slice(2);

    if (args.length === 0) {
        console.log('Usage: node transform-gql.js <directory_or_file_path>');
        console.log('Example: node transform-gql.js ./src/graphql');
        console.log('Example: node transform-gql.js ./src/queries/user.gql');
        return;
    }

    const inputPath = args[0];

    if (!fs.existsSync(inputPath)) {
        console.error(`Error: Path "${inputPath}" does not exist.`);
        return;
    }

    const stats = fs.statSync(inputPath);

    if (stats.isDirectory()) {
        console.log(`Processing directory: ${inputPath}`);
        transformAllGqlFiles(inputPath);
    } else if (stats.isFile() && path.extname(inputPath) === '.gql') {
        console.log(`Processing file: ${inputPath}`);
        transformGqlFile(inputPath);
    } else {
        console.error('Error: Please provide a directory or a .gql file.');
        return;
    }

    console.log('Transformation complete!');
}

main();
