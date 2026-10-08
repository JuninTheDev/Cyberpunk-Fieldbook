// Arquiteturas NET da campanha (documentos/morana/arquiteturas-da-campanha.md, na wiki): cada "## Nome" com uma tabela
// de andares vira um item netarch do sistema, que o NET Architect lista para os pontos de acesso. O documento é a fonte:
// o mestre lê a mesma arquitetura na wiki e no Foundry.
import fs from 'node:fs';
import path from 'node:path';
import { folderDoc, itemFrom, para } from './lib.mjs';
import { wikiDir } from './paths.mjs';

export const architecturesFile = path.join(wikiDir, 'documentos', 'morana', 'arquiteturas-da-campanha.md');
const IMG = 'systems/cyberpunk-red-core/icons/compendium/default/Default_Net_Architecture.svg';
const CONTENT = {
  senha: 'CPR.netArchitecture.floor.options.password',
  arquivo: 'CPR.netArchitecture.floor.options.file',
  'nó de controle': 'CPR.netArchitecture.floor.options.controlnode'
};
const ICE = ['asp', 'giant', 'hellhound', 'kraken', 'liche', 'raven', 'scorpion', 'skunk', 'wisp', 'dragon', 'killer', 'sabertooth'];
const escape = text => String(text).replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
const inline = text => escape(text).replace(/\*\*(.+?)\*\*/g, '<b>$1</b>');

export function buildArchitectures() {
  const text = fs.readFileSync(architecturesFile, 'utf8').replace(/\r/g, '');
  const folder = folderDoc('Item', 'Protocolo Morana: arquiteturas', 10);
  const items = [];
  for (const section of text.split(/^## /m).slice(1)) {
    const [heading, ...lines] = section.split('\n');
    const name = heading.trim();
    // A tabela: cabeçalho, separador e um andar por linha. Seção sem tabela (as regras gerais) não vira item.
    const rows = lines.filter(line => line.startsWith('|')).slice(2);
    if (!rows.length) continue;
    const problem = message => new Error(`arquiteturas-da-campanha.md, "${name}": ${message}`);
    const floors = rows.map((row, index) => {
      const [floor, branch, content, dv, note = ''] = row.split('|').slice(1, -1).map(cell => cell.trim());
      const ice = (content.match(/^Black ICE: (\w+)$/i) || [])[1]?.toLowerCase();
      if (ice && !ICE.includes(ice)) throw problem(`Black ICE desconhecido: ${content}`);
      const kind = ice ? 'CPR.global.programClass.blackice' : CONTENT[content.toLowerCase()];
      if (!kind) throw problem(`conteúdo desconhecido no andar ${floor}: ${content} (use Senha, Arquivo, Nó de controle ou Black ICE: Nome)`);
      if (!/^(1[0-8]|[1-9])$/.test(floor)) throw problem(`andar inválido: ${floor} (de 1 a 18)`);
      if (!/^[a-h]$/i.test(branch)) throw problem(`ramo inválido no andar ${floor}: ${branch} (de A a H)`);
      if (!ice && !/^([4-9]|1\d|20)$/.test(dv)) throw problem(`DV inválido no andar ${floor}: ${dv} (de 4 a 20)`);
      return { floor, branch: branch.toLowerCase(), content: kind, dv: ice ? 'N/A' : dv, blackice: ice ? `CPR.netArchitecture.floor.options.blackIce.${ice}` : '--', description: note, index };
    });
    const about = lines.filter(line => line.trim() && !line.startsWith('|')).map(line => para(inline(line.replace(/^- /, '')))).join('');
    items.push(itemFrom({ type: 'netarch', img: IMG, system: {} }, {
      seed: `netarch:morana:${name}`, name, folder: folder._id,
      system: { description: { value: `<p><b>Protocolo Morana</b> · ${floors.length} andares · do documento Arquiteturas da campanha</p>${about}` }, floors },
      flags: { campanha: 'morana', arquitetura: true }
    }));
  }
  if (!items.length) throw new Error('arquiteturas-da-campanha.md: nenhuma arquitetura com tabela de andares');
  return [folder, ...items];
}
