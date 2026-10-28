# Finanças — app pessoal de controle do cartão

App de uma página só (HTML + JS, sem servidor) para acompanhar a fatura do Nubank, separar o que é de outra pessoa que usa o cartão e planejar quanto sobra em cada mês.

## O que vai para o git

| Arquivo | Para que serve |
|---|---|
| `index.html` | O app inteiro |
| `manifest.webmanifest` | Permite instalar o app na tela inicial do celular |
| `sw.js` | Faz o app abrir mesmo sem internet |
| `icon-192.png`, `icon-512.png` | Ícones |
| `.gitignore` | Impede que dados financeiros entrem no repositório |
| `README.md` | Este guia |
| `ponte/worker.js` | A ponte com o Nubank (roda na Cloudflare, não no GitHub Pages) |
| `ponte/LEIA-ME.md` | Como instalar a ponte |

**Nunca faça commit** de backups (`financas-backup-*.json`), CSVs, PDFs ou planilhas de fatura. O `.gitignore` já bloqueia esses arquivos. O código não tem nenhum dado pessoal: os seus dados entram pelo backup.

## Publicar no GitHub Pages (uma vez)

1. Crie uma conta em github.com (se ainda não tiver).
2. Crie um repositório novo, por exemplo `financas`, **público**. O GitHub Pages gratuito só funciona em repositório público; isso não tem problema, porque só o código fica lá.
3. Envie os arquivos desta pasta:
   - **Pelo site:** "Add file → Upload files", arraste os 7 arquivos e clique em "Commit changes".
   - **Pelo git:**
     ```
     git init
     git add .
     git commit -m "App de finanças"
     git branch -M main
     git remote add origin https://github.com/SEU-USUARIO/financas.git
     git push -u origin main
     ```
4. No repositório: Settings → Pages → em "Branch" escolha `main` e a pasta `/ (root)` → Save.
5. Em 1 ou 2 minutos o app fica disponível em `https://SEU-USUARIO.github.io/financas/`.

## Primeiro uso em cada aparelho

1. Abra o link do app.
2. Vá em ⚙ Config → **Importar backup** e escolha o backup mais recente que está no OneDrive.
3. **No celular:** no menu do navegador, toque em "Adicionar à tela inicial" (Android/Chrome) ou em Compartilhar → "Adicionar à Tela de Início" (iPhone/Safari). O app passa a abrir como um aplicativo.

## Sincronização automática com o Nubank (Open Finance)

O app busca os lançamentos do cartão direto no banco, sem CSV, através de uma **ponte**:

```
App (GitHub Pages) ──senha da ponte──▶ Ponte (Cloudflare Worker) ──chaves da Pluggy──▶ Pluggy / Meu Pluggy ──Open Finance──▶ Nubank
```

- A ponte guarda as chaves da Pluggy; o app só conhece o endereço e a senha da ponte. Instalação em `ponte/LEIA-ME.md`.
- Em **Config → Sincronização com o Nubank**: endereço e senha da ponte, finais dos cartões da outra pessoa e a data até a qual as compras são dela.
- Em **Importar → Sincronizar agora**. O app mostra quantos lançamentos são novos e pede confirmação antes de aplicar.
- **Regras:** o mês é o da fatura (vencimento); pagamentos são ignorados; estornos entram negativos; parcelas futuras só aparecem quando a fatura delas abre; lançamentos que já vieram pelo CSV são reconhecidos (mesma fatura, mesmo valor, data mais próxima) e não duplicam.
- **Dono:** 1) parcela já marcada no Planejamento; 2) cartão da outra pessoa; 3) compra até a data de corte; 4) seu. Continua dando para trocar tocando no selo.
- **Planejamento:** as parcelas do banco atualizam as que já existem (nome parecido, mesmo nº de parcelas, valor próximo) e criam as novas.
- O banco atualiza os dados **uma vez por dia**. A autorização do Open Finance vale 12 meses: o app avisa quando faltarem 30 dias (renove em meu.pluggy.ai).
- O CSV continua funcionando como plano B.

## Dia a dia

- **Lançamentos do cartão:** use **Importar → Sincronizar agora**. Sem a ponte, no app do Nubank, vá em Cartão → Faturas → escolha a fatura → Exportar planilha e importe o CSV na tela **Importar**. Pode importar a fatura aberta várias vezes: lançamentos repetidos não duplicam. Mantenha o nome do arquivo que o Nubank dá (`Nubank_AAAA-MM-DD.csv`), porque é por ele que o app sabe de qual fatura se trata.
- **Gastos fora do cartão** (Pix, dinheiro): lance na tela **Gastos**.
- **De quem é cada gasto:** toque no selo "meu"/nome da outra pessoa para trocar.
- **Planejamento:** mostra a sobra de cada mês e quanto a outra pessoa te deve.

## Manter os aparelhos iguais (backup no OneDrive)

Cada navegador guarda a sua própria cópia dos dados. A regra é simples:

1. **Terminou de mexer num aparelho?** Toque em **Salvar backup**. Quando há alterações não salvas, aparece um aviso amarelo no início do app.
   - No celular abre o "Compartilhar": escolha **OneDrive** → pasta Financeiro.
   - No computador o arquivo vai para Downloads: mova para a pasta do OneDrive.
2. **Vai usar outro aparelho?** Primeiro use **Importar backup** com o arquivo mais recente (o nome tem data e hora: `financas-backup-2026-10-24-1530.json`).

A importação **junta** os dados: nada que está no aparelho é apagado. Planejamento e configurações vêm do lado que foi alterado por último.

Cuidado: se você apagar um lançamento num aparelho, ele pode voltar quando você importar um backup antigo. Depois de apagar, salve um backup novo e importe esse backup nos outros aparelhos.

## Atualizar o app

Troque o `index.html` no repositório (upload ou `git commit` + `git push`). Os aparelhos pegam a versão nova na próxima vez que abrirem o app com internet. Atualizar o app não apaga os dados.
