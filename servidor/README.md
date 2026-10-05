cyber25host# Wiki e mesa online: o servidor

A wiki e o Foundry rodam num servidor gratuito da Oracle, sempre ligados, com endereço fixo:

- `https://wiki.SEUDOMINIO`: a wiki. Os jogadores entram direto. O mestre entra por `https://wiki.SEUDOMINIO/mestre`.
- `https://mesa.SEUDOMINIO`: o Foundry. A wiki mostra se a mesa está aberta e tem o botão **Entrar na mesa**.

Você continua editando no PC. Para mandar uma mudança para o servidor, dê dois cliques em **`publicar.bat`**. Ele confere se o OneDrive não estragou nenhum arquivo, envia para o GitHub e avisa quando a versão nova estiver no ar (em até 1 minuto).

A mudança é feita uma vez só. Siga os passos na ordem.

## 1. Domínio

Compre um domínio. Por exemplo, `nightcity.com.br` no [registro.br](https://registro.br) (cerca de R$ 40 por ano) ou um `.com` na Cloudflare (cerca de US$ 10 por ano).

Deixe o painel de DNS aberto: no passo 3 você cria os endereços apontando para o servidor.

## 2. Servidor na Oracle

1. Crie a conta em [cloud.oracle.com](https://cloud.oracle.com), no plano Free Tier.
   - **Região:** escolha **Brazil East (São Paulo)** ou **Brazil Southeast (Vinhedo)**. Ela não pode ser trocada depois.
   - Eles pedem um cartão só para conferir. O que está em "Always Free" não é cobrado.
2. **Recomendado:** em *Billing → Upgrade and Manage Payment*, passe a conta para **Pay As You Go**.
   - Continua grátis dentro dos limites do Always Free.
   - Evita a Oracle recuperar máquinas paradas e a falta de máquina ("Out of capacity").
   - Crie também um alerta de orçamento de R$ 1 (*Billing → Budgets*), para saber se algo sair do grátis.
3. Crie a máquina em *Compute → Instances → Create instance*:
   - **Image:** Canonical Ubuntu **24.04**.
   - **Shape:** Ampere → `VM.Standard.A1.Flex`, com **2 OCPUs e 12 GB** (sobra; o grátis vai até 4 e 24).
   - **Networking:** crie uma VCN nova com sub-rede pública e marque *Assign a public IPv4 address*.
   - **SSH keys:** *Generate a key pair for me* → **Download private key**. Guarde o arquivo `.key` fora da pasta da wiki (por exemplo, em `Documentos\chaves`). Quem tem esse arquivo entra no servidor.
   - **Boot volume:** 100 GB (o grátis vai até 200).
   - Se aparecer "Out of capacity", tente outro *Availability domain* ou mais tarde.
4. Anote o **IP público** da máquina, na página dela.
5. Abra as portas da web:
   - Vá em *Networking → Virtual cloud networks* → a sua VCN → a sub-rede pública → *Security Lists* → *Default Security List* → *Add Ingress Rules*.
   - Preencha: *Source CIDR* `0.0.0.0/0`, *IP Protocol* TCP, *Source Port Range* vazio, *Destination Port Range* `80`.
   - Repita para a porta `443`.

## 3. Endereços no DNS

O DNS é configurado **onde você comprou o domínio**, e não na Oracle. As telas *DNS management*, *Private resolver* e *Manage rules* da Oracle não são usadas.

No painel de DNS do domínio, crie estes registros, todos apontando para o IP do servidor:

| Tipo | Nome | Valor |
|---|---|---|
| A | `wiki` | IP do servidor |
| A | `mesa` | IP do servidor |
| A | `@` (o domínio puro) | IP do servidor |
| CNAME | `www` | o seu domínio |

Na Cloudflare, deixe a nuvem **cinza** (*DNS only*): o próprio servidor cuida do HTTPS.

## 4. Montar o servidor

Aqui o seu PC conversa com o servidor pelo **SSH**: você digita comandos no PowerShell do PC, e eles rodam no servidor. O arquivo `.key` que a Oracle deu ao criar a máquina funciona como a senha dessa conexão.

Separe uns 20 minutos. Leva uns 10 de espera; o resto são as perguntas, todas no começo.

### Antes de começar

- **O código novo precisa estar no GitHub.** O servidor baixa a wiki de lá. Se `publicar.bat` ainda não rodou desde que a pasta `servidor/` apareceu, rode agora.
- **O DNS do passo 3 já deve estar criado.** Se ainda não espalhou pela internet, tudo bem: o servidor tenta o HTTPS de novo sozinho.
- **Tenha à mão:**
  - o **IP público** da máquina (página da máquina na Oracle → *Public IP address*);
  - a **senha do mestre** que você quer usar;
  - o site [foundryvtt.com](https://foundryvtt.com), logado, aberto em outra aba.

### 4.1. Guardar a chave

A chave baixada está em *Downloads*, com um nome parecido com `ssh-key-2026-10-05.key`. Ela vai para a pasta `.ssh` do seu usuário, que fica fora do OneDrive. A sua pasta Documentos está dentro do OneDrive, e chave não deve ir para a nuvem.

1. No VS Code, abra o terminal: menu *Terminal → New Terminal*. Ele já abre na pasta da wiki.
2. Rode, um por vez (troque o nome do arquivo pelo seu):

   ```
   mkdir -Force $HOME\.ssh
   Move-Item "$HOME\Downloads\ssh-key-2026-10-05.key" "$HOME\.ssh\oracle.key"
   icacls "$HOME\.ssh\oracle.key" /inheritance:r /grant:r "$($env:USERNAME):R"
   ```

   O `icacls` deixa só você ler a chave; o SSH do Windows recusa uma chave que outros usuários do PC possam ler. A resposta deve ser "Arquivos processados com êxito: 1".

### 4.2. Mandar o instalador e entrar no servidor

Nos comandos abaixo, troque `IP` pelo número do IP público da máquina (por exemplo, `ubuntu@163.176.10.20`). Não digite a palavra `IP`.

O terminal precisa estar na **pasta principal da wiki** (onde ficam o `server.js` e o `publicar.bat`), e não dentro de `servidor/`. Se estiver dentro dela, rode `cd ..` antes.

1. Copie o instalador para o servidor:

   ```
   scp -i "$HOME\.ssh\oracle.key" servidor\instalar.sh ubuntu@IP:
   ```

   - Os **dois-pontos no fim** fazem parte do comando: significam "na pasta inicial do servidor".
   - **Na primeira vez**, ele pergunta `Are you sure you want to continue connecting (yes/no)?`. Digite `yes` e Enter.

2. Entre no servidor:

   ```
   ssh -i "$HOME\.ssh\oracle.key" ubuntu@IP
   ```

   Deu certo quando o começo da linha muda para algo como `ubuntu@nome-da-maquina:~$`. A partir daí, o que você digita roda **no servidor**.

### 4.3. Rodar o instalador

No servidor, rode:

```
sudo bash instalar.sh
```

Ele faz as perguntas na ordem:

1. **Domínio:** só o domínio, sem `wiki.` nem `https://` (por exemplo, `edgerunnersstorys.app`).
2. **Repositório no GitHub:** aperte Enter.
3. **Senha do mestre:** é a senha para entrar como mestre na wiki.
   - Ao digitar, **nada aparece na tela**. É normal no Linux; digite e aperte Enter.
   - A senha precisa ter pelo menos 10 caracteres, sem espaço, aspas, `$`, crase ou barra invertida.
   - Ou aperte Enter para ele gerar uma. Ela aparece no fim; **anote**.
4. **Link do Foundry:** pegue o link **só agora**, porque ele vale 5 minutos.
   - Na aba do foundryvtt.com: sua conta → *Purchased Licenses*.
   - Escolha a versão **12** (a mesma do seu PC) e o sistema **Linux/NodeJS**.
   - Clique em **Timed URL**: o link vai para a área de transferência.
   - No terminal, cole com **clique direito** (ou Ctrl+V) e aperte Enter. Ele baixa o Foundry na hora.
   - Se o download falhar, o instalador continua sem o Foundry. Depois, rode `sudo bash instalar.sh` de novo, com um link novo: o resto é mantido.
5. **Chave do GitHub:** ele mostra uma linha que começa com `ssh-ed25519`.
   1. Selecione a linha inteira com o mouse e copie (Ctrl+C no terminal do VS Code).
   2. No GitHub, abra o repositório `JuninTheDev/Cyberpunk-Fieldbook` → *Settings* → *Deploy keys* → **Add deploy key**.
   3. Em *Title*, escreva `servidor da mesa`. Em *Key*, cole a linha. **Não marque** *Allow write access*: o servidor só lê.
   4. Clique em **Add key** e volte ao terminal.
   5. Aperte Enter. Se ele mostrar a chave de novo, o GitHub ainda não salvou: confira e aperte Enter outra vez.

Depois de "GitHub: acesso ok", **não há mais perguntas**. Em uns 5 a 10 minutos, ele:

- atualiza o Ubuntu;
- instala o Node.js e o Caddy (HTTPS automático);
- libera as portas 80 e 443;
- baixa a wiki do GitHub;
- liga a wiki e o Foundry, que voltam sozinhos se o servidor reiniciar;
- liga a atualização pelo GitHub (a cada minuto) e o backup diário (às 4h30).

No fim aparece **Pronto**, com os dois endereços (e a senha do mestre, se ele gerou). Se aparecer o aviso de reinício do Ubuntu, rode `sudo reboot`: a conexão cai e, em 1 minuto, tudo volta sozinho.

Para sair do servidor e voltar ao PC, digite `exit`.

### Se der erro

| Mensagem | O que fazer |
|---|---|
| `UNPROTECTED PRIVATE KEY FILE` | Rode de novo o `icacls` do 4.1. |
| `Permission denied (publickey)` | A chave não é a desta máquina, ou o usuário não é `ubuntu`. Confira o arquivo `.key` e o comando. |
| `Connection timed out` | O IP está errado ou a máquina está parada. Confira na página da máquina, na Oracle. |
| `No such file or directory` no `scp` | O terminal não está na pasta da wiki. Abra o terminal pelo VS Code, com a pasta da wiki aberta. |
| O instalador parou com erro | Copie as últimas linhas e me mande. Rodar `sudo bash instalar.sh` de novo é seguro: ele mantém o que já fez. |

## 5. Foundry: primeira vez

**Faça isto logo**, porque até lá qualquer um que abrir o endereço vê a tela de configuração:

1. Abra `https://mesa.SEUDOMINIO`, cole a chave de licença e aceite os termos.
2. Em *Configuration*, defina a **Administrator Password**.

A licença do Foundry vale para uma mesa por vez. A partir de agora, jogue pelo servidor e não pelo Foundry do PC.

## 6. Trazer os dados do PC

Feche o Foundry do PC e dê dois cliques em **`servidor\enviar-para-servidor.bat`**.

- Ele pede o servidor (`ubuntu@IP`) e o arquivo da chave, e lembra dos dois para a próxima vez.
- Ele pergunta o que enviar:
  - **Dados da wiki:** personagens e retratos, códigos dos jogadores, painel Publicar e regras da loja.
  - **Os PDFs dos livros:** no servidor, só o mestre abre.
  - **A pasta Data do Foundry:** mundos, sistemas, módulos e imagens. Pode demorar, se houver muitas imagens.
- O servidor guarda uma cópia do que já tinha antes de receber.
- O módulo **Cyberpunk RED: 2077** é gerado de novo no servidor, com a versão do GitHub, em até uns 2 minutos.

## 7. Conferir

- `https://wiki.SEUDOMINIO`: a wiki dos jogadores, com a mesa na barra lateral.
- `https://wiki.SEUDOMINIO/mestre`: entre com a senha do mestre.
  - Na barra lateral aparecem **Sair do modo mestre**, **Baixar backup** e a versão no ar.
- `https://mesa.SEUDOMINIO`: lance o mundo e confira se os usuários e as senhas dos jogadores vieram.
- **Importar da wiki, no Foundry:**
  - Funciona sozinho no navegador em que você entrou como mestre na wiki.
  - O endereço da wiki é descoberto pelo endereço da mesa (Configurações do módulo → Endereço da wiki, vazio).
- **Mande aos jogadores** o link da wiki. Os códigos continuam os mesmos, mas cada um digita o código de novo uma vez, porque o endereço mudou.

## Depois da mudança

- **Use a wiki online** para Publicar, criar códigos e mexer em personagens.
  - A wiki do PC (`node server.js`) vira só um lugar de teste: o que você publicar nela não chega aos jogadores.
- **Para mudar páginas, lore ou regras:** edite no PC e rode o `publicar.bat`.
- **`abrir-online.bat` e o `cloudflared` não são mais necessários.**
- **Recomendado: tire a pasta da wiki do OneDrive.** O GitHub já é o backup, e o OneDrive é quem volta arquivos para versões antigas.
  - Feche o VS Code e mova a pasta para fora do OneDrive (por exemplo, `C:\Users\kouar\Documents\Cyberpunk Fieldbook`, se Documentos não estiver sincronizado).
- **Backup:** de vez em quando, em **Baixar backup**, guarde uma cópia no PC.
  - O servidor guarda 14 dias, mas só lá dentro.
  - Mapas e imagens soltas do Foundry não entram no backup diário, só os mundos.

## Manutenção

Entre no servidor com `ssh -i "$HOME\.ssh\oracle.key" ubuntu@IP`, no PowerShell do PC.

| Para | Comando |
|---|---|
| Ver o que foi publicado e quando | `cat /srv/fieldbook/dados/atualizacoes.log` |
| Reiniciar a wiki / o Foundry | `sudo systemctl restart fieldbook` / `sudo systemctl restart foundry` |
| Ver erros da wiki / do Foundry | `journalctl -u fieldbook -n 50` / `journalctl -u foundry -n 50` |
| Gerar o módulo agora (derruba quem estiver na mesa) | `sudo bash /srv/fieldbook/wiki/servidor/atualizar-modulo.sh --agora` |
| Trocar a senha do mestre, o domínio ou instalar o Foundry | `sudo bash /srv/fieldbook/wiki/servidor/instalar.sh` (Enter mantém o resto) |
| Reiniciar o servidor todo | `sudo reboot` (tudo volta sozinho) |

- **Atualizar o Foundry:** pela própria tela de configuração dele (*Update Software*).
- **Atualizações de segurança do Ubuntu:** são automáticas.

### Como funciona por dentro

| Onde | O quê |
|---|---|
| `/srv/fieldbook/wiki` | A cópia do GitHub. Nunca edite aqui: a atualização apaga mudanças locais. |
| `/srv/fieldbook/dados` | Personagens, retratos, códigos, Publicar e regras da loja. Ficam fora do git e entram no backup. |
| `/srv/foundry/app` e `/srv/foundry/data` | O programa do Foundry e os dados dele. |
| `/srv/backups` | Os backups diários (14 dias). |
| `/etc/fieldbook.env` | A configuração da wiki: senha do mestre, endereço da mesa. |
| `/etc/caddy/Caddyfile` | Os endereços e o HTTPS. |

| Script | Para que serve |
|---|---|
| `instalar.sh` | Monta ou refaz o servidor. |
| `atualizar.sh` | Roda a cada minuto e puxa o GitHub. |
| `atualizar-modulo.sh` | Gera o módulo do Foundry; sozinho, só com a mesa vazia. |
| `backup.sh` | Faz o backup diário. |
| `receber.sh` | Recebe o envio do PC. |
| `iniciar-foundry.sh` | Liga o Foundry. |
| `enviar-para-servidor.ps1` | Faz o envio, do lado do PC. |
