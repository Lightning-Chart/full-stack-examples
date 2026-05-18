import fs from 'node:fs';
import path from 'node:path';

const ROOT_DIR = path.resolve(import.meta.dirname, '../');
const OUTPUT_DIR = path.join(ROOT_DIR, 'backend', 'llms');
if (!fs.existsSync(OUTPUT_DIR)) {
	fs.mkdirSync(OUTPUT_DIR, { recursive: true });
}
const EXCLUDED_FILES = [
	'package-lock.json', 
	'database.db', 
	'hakemistopuu.txt', 
	'.env', 
	'.env.example', 
	'.env.production', 
	'.gitignore', 
	'.gitlab-ci.yml',
	'tsconfig.eslint.json',
	'package.json'
];
const EXCLUDED_DIRS = ['node_modules', 'dist', 'build', '.git', '.vscode', 'assets'];
const ALLOWED_EXTENSIONS = ['.ts', '.tsx', '.vue', '.js', '.json', '.html'];
const MODULES = [
	{ id: 'backend', title: 'Backend (Node.js & SQLite)', dirs: ['backend/src'] },
	{ id: 'shared', title: 'Shared Logic & Mock Data', dirs: ['shared/src'] },
	{ id: 'react', title: 'React Frontend', dirs: ['frameworks/react/src'] },
	{ id: 'vue', title: 'Vue Frontend', dirs: ['frameworks/vue/src'] },
	{ id: 'angular', title: 'Angular Frontend', dirs: ['frameworks/angular/src'] },
	{ id: 'svelte', title: 'Svelte Frontend', dirs: ['frameworks/svelte/src'] },
	{ id: 'vanillajs', title: 'Vanilla JS Frontend', dirs: ['frameworks/vanillajs/src'] },
	{ id: 'viewer', title: 'App Viewer (Main UI)', dirs: ['viewer/src'] }
];

function getFiles(dir, fileList = []) {
	if (!fs.existsSync(dir)) return fileList;
	const files = fs.readdirSync(dir);
	for (const file of files) {
		const fullPath = path.join(dir, file);
		const stat = fs.statSync(fullPath);
		if (stat.isDirectory()) {
			if (!EXCLUDED_DIRS.includes(file)) {
				getFiles(fullPath, fileList);
			}
		} else if (stat.isFile()) {
			if (!EXCLUDED_FILES.includes(file) && ALLOWED_EXTENSIONS.includes(path.extname(file))) {
				fileList.push(fullPath);
			}
		}
	}
	return fileList;
}

function generateDocumentation() {
	let indexContent = `# LCJS Reference Implementations - AI Documentation\n\n`;
	indexContent += `This project contains high-performance chart integration examples for multiple frameworks.\n\n`;
	indexContent += `## Module Index\n\n`;
	let fullContent = `# Full Source Code Compilation\n\n`;
	for (const mod of MODULES) {
		let moduleContent = `# ${mod.title}\n\n`;
		let hasFiles = false;
		for (const relativeDir of mod.dirs) {
			const absoluteDir = path.join(ROOT_DIR, relativeDir);
			const files = getFiles(absoluteDir);
			for (const file of files) {
				hasFiles = true;
				const relativeFilePath = path.relative(ROOT_DIR, file);
				const fileContent = fs.readFileSync(file, 'utf-8');
				const ext = path.extname(file).replace('.', '');
				const markdownLang = ext === 'vue' ? 'html' : ext;
				const fileEntry = `### File: ${relativeFilePath}\n\`\`\`${markdownLang}\n${fileContent}\n\`\`\`\n\n`;
				moduleContent += fileEntry;
				fullContent += fileEntry;
			}
		}
		if (hasFiles) {
			const fileName = `${mod.id}.txt`;
			fs.writeFileSync(path.join(OUTPUT_DIR, fileName), moduleContent, 'utf-8');
			indexContent += `- [${mod.title}](/${fileName}) - Implementation details for ${mod.id}\n`;
		}
	}
	indexContent += `\n## Full Context\n`;
	indexContent += `- [Combined Source Code](/full.txt) - Everything in one file (use if you lack browsing capabilities)\n`;
	fs.writeFileSync(path.join(OUTPUT_DIR, 'llms.txt'), indexContent, 'utf-8');
	fs.writeFileSync(path.join(OUTPUT_DIR, 'full.txt'), fullContent, 'utf-8');
	console.log(`Modular LLM documentation generated in backend/llms/`);
}
generateDocumentation();