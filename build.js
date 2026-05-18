import path from 'node:path';
import fs from 'node:fs';

const folderArg = process.argv[2] || '.';
const targetFolder = path.resolve(folderArg);
const buildDir = path.join(targetFolder, 'build');

try {
	if (fs.existsSync(buildDir)) {
		fs.rmSync(buildDir, { recursive: true, force: true });
	}
	fs.mkdirSync(buildDir, { recursive: true });
	const viewerDist = path.resolve('viewer', 'dist');
	if (fs.existsSync(viewerDist)) {
		fs.cpSync(viewerDist, buildDir, { recursive: true });
	} else {
		console.warn(`[Warning] Source folder not found: ${viewerDist}`);
	}
	const frameworks = ['react', 'vue', 'angular', 'svelte', 'vanillajs'];
	for (const framework of frameworks) {
		const targetFrameworkDir = path.join(buildDir, 'frameworks', framework, 'dist');
		const sourceFrameworkDir = path.resolve('frameworks', framework, 'dist');
		fs.mkdirSync(targetFrameworkDir, { recursive: true });
		if (fs.existsSync(sourceFrameworkDir)) {
			fs.cpSync(sourceFrameworkDir, targetFrameworkDir, { recursive: true });
		} else {
			console.warn(`[Warning] Source folder not found: ${sourceFrameworkDir}`);        
		}
	}
} catch (error) {
	console.error('\n[ERROR] An error occurred during file copying:', error.message);
	process.exit(1);
}