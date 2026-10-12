// Veículos de Cyberpunk 2077 adaptados às classes do RED (data/veiculos-2077.json).
import fs from 'node:fs';
import path from 'node:path';
import { coreDoc, folderDoc, itemFrom, para } from './lib.mjs';
import { sourceDir } from './paths.mjs';

const bookNames = { core_vehicles: 'livro-base do RED', 'black-chrome_vehicles': 'Black Chrome' };

export function buildVehicles() {
  const { veiculos } = JSON.parse(fs.readFileSync(path.join(sourceDir, 'data', 'veiculos-2077.json'), 'utf8'));
  const groupNames = [...new Set(veiculos.map(vehicle => vehicle.grupo))];
  const folders = groupNames.map((name, index) => folderDoc('Item', name, index));
  const items = veiculos.map(vehicle => {
    const [pack, baseName] = vehicle.base;
    const base = coreDoc(pack, baseName);
    const seats = vehicle.assentos ?? base.system.seats;
    return itemFrom(base, {
      seed: `veiculo:${vehicle.nome}`, name: vehicle.nome, folder: folders[groupNames.indexOf(vehicle.grupo)]._id,
      system: {
        brand: vehicle.marca, seats, price: { market: vehicle.preco ?? base.system.price.market },
        source: { book: 'Adaptação de Cyberpunk 2077', page: 0 },
        description: {
          value: `<p><b>${vehicle.classe}</b> no jogo Cyberpunk 2077 · SDP ${base.system.sdp} · ${seats} assentos · MOVE ${base.system.speedCombat} (${base.system.speedNarrative})</p>${para(vehicle.texto)}<p><b>Adaptação:</b> nem o Mission Kit nem o suplemento de fã trazem veículos. Os números são os do <b>${baseName}</b> (${bookNames[pack]})${seats !== base.system.seats ? `, com ${seats} assentos` : ''}. Personalize com os upgrades de veículo do RED.</p>`
        }
      },
      flags: { adaptacao: true, base: baseName, classe2077: vehicle.classe }
    });
  });
  return [...folders, ...items];
}
