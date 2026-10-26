// As pastas dos arquivos que o sistema grava nos dados do Foundry (o cortador dos tokens dinâmicos, o retrato da wiki).
// O createDirectory do Foundry 14 não cria a pasta-mãe (client/applications/apps/file-picker.mjs, o manageFiles do
// servidor): "tokens/qyan" num mundo sem "tokens" falhava, e o upload seguinte respondia "Target directory ... does not
// exist". Aqui cada nível é criado, do mais de fora para o de dentro.

// Os níveis de uma pasta, do de fora para o de dentro: 'tokens/qyan' → ['tokens', 'tokens/qyan'].
export const niveisDaPasta = pasta => String(pasta ?? '').split('/').map(parte => parte.trim()).filter(Boolean)
  .map((_parte, i, partes) => partes.slice(0, i + 1).join('/'));

// Garante a pasta (e as de fora) nos dados do usuário. Erro, se o Foundry não criar uma delas.
export async function garantirPasta(pasta) {
  const FP = foundry.applications.apps.FilePicker.implementation;
  for (const nivel of niveisDaPasta(pasta)) {
    try { await FP.browse('data', nivel); } catch {
      try { await FP.createDirectory('data', nivel, {}); } catch (erro) {
        // Outro cliente pode ter criado no meio tempo: só é erro se a pasta continuar faltando.
        try { await FP.browse('data', nivel); } catch { throw new Error(`não consegui criar a pasta ${nivel} (${erro.message})`); }
      }
    }
  }
}
