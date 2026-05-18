import fs from 'node:fs';
import path from 'node:path';
import { execSync } from 'node:child_process';

const targetVersion = process.argv[2];
const packageName = '@lightningchart/lcjs';
const semverRegex = /^(?:\^|~)?\d+\.\d+\.\d+(?:-[\w.]+)?$/;
if (!targetVersion || !semverRegex.test(targetVersion)) {
	console.error(`ERROR: "${targetVersion}" is not a valid version format.`);
	process.exit(1);
}
try {
	const cleanVersion = targetVersion.replace(/[\^~]/, '');
	const remoteVersions = execSync(`npm view ${packageName} versions --json`, { encoding: 'utf8' });
	const availableVersions = JSON.parse(remoteVersions);
	if (!availableVersions.includes(cleanVersion)) {
		console.error(`ERROR: Version "${cleanVersion}" was not found in the NPM registry.`);
		console.log(`Latest versions are: ${availableVersions.slice(-3).join(', ')}`);
		process.exit(1);
	}
} catch (error) {
	console.error('ERROR: Could not connect to NPM registry or package does not exist:', error.message);
	process.exit(1);
}
const rootDir = path.resolve(__dirname, '..');
const searchPaths = ['.', 'viewer', 'shared'];
const frameworksDir = path.join(rootDir, 'frameworks');
if (fs.existsSync(frameworksDir)) {
	const frameworks = fs.readdirSync(frameworksDir, { withFileTypes: true })
		.filter(dirent => dirent.isDirectory())
		.map(dirent => `frameworks/${dirent.name}`);
	searchPaths.push(...frameworks);
}
let updateCount = 0;
searchPaths.forEach(relativePath => {
	const pkgPath = path.join(rootDir, relativePath, 'package.json');
	if (fs.existsSync(pkgPath)) {
		try {
			const pkgData = fs.readFileSync(pkgPath, 'utf8');
			const pkg = JSON.parse(pkgData);
			let modified = false;
			const dependencyTypes = ['dependencies', 'devDependencies', 'peerDependencies'];
			dependencyTypes.forEach(type => {
				if (pkg[type] && pkg[type]['@lightningchart/lcjs']) {
					pkg[type]['@lightningchart/lcjs'] = targetVersion;
					modified = true;
				}
			});
			if (modified) {
				fs.writeFileSync(pkgPath, JSON.stringify(pkg, null, 2) + '\n');
				console.log(`[OK] Updated: ${relativePath}/package.json`);
				updateCount++;
			}
		} catch (error) {
			console.error(`[ERROR] Failed to process ${pkgPath}:`, error.message);
		}
	}
});
if (updateCount === 0) {
	console.log('No @lightningchart/lcjs dependencies found to update.');
	process.exit(0);
}
console.log('Running npm install to sync changes...');
try {
	execSync('npm install', { cwd: rootDir, stdio: 'inherit' });
} catch (error) {
	console.error('Error occurred during npm install:', error.message);
	process.exit(1);
}
searchPaths.forEach(relativePath => {
	const viteCachePath = path.join(rootDir, relativePath, 'node_modules', '.vite');
	if (fs.existsSync(viteCachePath)) {
		try {
			fs.rmSync(viteCachePath, { recursive: true, force: true });
			console.log(`[OK] Cache cleared: ${relativePath}`);
		} catch (error) {
			console.error(`[WARN] Could not clear cache for ${relativePath}:`, error.message);
		}
	}
});
console.log('\nLightningChart JS update completed successfully.');