// Caminhos usados pelos scripts de build.
import os from 'node:os';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

export const moduleId = 'cpr-2077';
export const buildDir = path.dirname(fileURLToPath(import.meta.url));
export const sourceDir = path.resolve(buildDir, '..');
export const wikiDir = path.resolve(sourceDir, '..');
export const cacheDir = path.join(sourceDir, '.cache');

// Pasta de dados do Foundry. Pode ser trocada com FOUNDRY_DATA=... (os testes usam uma pasta separada).
export const foundryData = process.env.FOUNDRY_DATA || path.join(process.env.LOCALAPPDATA || path.join(os.homedir(), 'AppData', 'Local'), 'FoundryVTT', 'Data');
export const systemDir = path.join(foundryData, 'systems', 'cyberpunk-red-core');
export const moduleDir = path.join(foundryData, 'modules', moduleId);
