# Ponte com o Nubank (Cloudflare Worker)

A ponte é um pequeno programa que roda de graça na Cloudflare. Ela faz duas coisas:

- **Nubank:** guarda as chaves da Pluggy e entrega ao app só os lançamentos do cartão. **Somente leitura:** não consegue pagar, transferir nem alterar nada no banco.
- **Sincronização entre aparelhos:** guarda uma cópia dos dados do app para o PC e o celular ficarem iguais. A cópia chega **criptografada pelo próprio app** com a senha da nuvem — a ponte e a Cloudflare só veem texto embaralhado.

## Instalar (uma vez, ~10 minutos)

1. Crie uma conta grátis em https://dash.cloudflare.com/sign-up e confirme o e-mail.
2. No menu da esquerda: **Compute (Workers) → Workers & Pages → Create → Create Worker** (opção "Start with Hello World").
3. Dê o nome **ponte-financas** e clique em **Deploy**.
4. Clique em **Edit code**, apague todo o código de exemplo, cole o conteúdo de `worker.js` e clique em **Deploy**.
5. Volte ao Worker → **Settings → Variables and Secrets → Add**. Crie as 5 variáveis:

| Nome | Tipo | Valor |
|---|---|---|
| `PLUGGY_CLIENT_ID` | Secret | Client ID da aplicação na Pluggy |
| `PLUGGY_CLIENT_SECRET` | Secret | Client Secret da aplicação na Pluggy |
| `PLUGGY_ITEM_ID` | Secret | Item ID da conexão MeuPluggy |
| `APP_TOKEN` | Secret | a senha da ponte (uma senha longa, só sua) |
| `ALLOWED_ORIGINS` | Text | `https://kethellynsoares.github.io` |

   Clique em **Deploy** para salvar.
6. Copie o endereço do Worker (aparece no topo, termina em `.workers.dev`).
7. No app: **Config → Sincronização com o Nubank** → cole o endereço e a senha da ponte e preencha os cartões e a data de corte da outra pessoa.
8. **Importar → Sincronizar agora.**

## Ligar a sincronização entre aparelhos (uma vez, ~5 minutos)

Se a ponte já está instalada, só faltam estes passos:

1. Na Cloudflare: **Storage & Databases → Workers KV → Create instance** (ou "Create namespace"). Nome: **financas-dados** → **Create**.
2. Abra o Worker **ponte-financas** → **Bindings** (ou Settings → Bindings) → **Add binding → KV namespace**.
   - **Variable name:** `DADOS` (assim, em maiúsculas)
   - **KV namespace:** `financas-dados`
   - **Add binding** / **Deploy**.
3. Ainda no Worker: **Edit code**, apague tudo, cole o `worker.js` novo desta pasta e clique em **Deploy**.
4. **No PC (o aparelho com os dados certos):** abra o app → ⚙ Config → **Sincronização entre aparelhos** → crie a **senha da nuvem** (mín. 8 caracteres) → **Ativar sincronização** → confirme "Enviar os dados deste aparelho".
5. **No celular:** abra o app (com internet, feche e abra de novo para pegar a versão nova) → confira em Config se o endereço e a senha da ponte estão preenchidos → **Sincronização entre aparelhos** → a **mesma** senha da nuvem → **Ativar sincronização** → confirme que os dados do celular serão **substituídos** pelos da nuvem.

Pronto: o indicador "☁ Sincronizado" aparece no topo. Daí em diante cada aparelho envia as alterações sozinho (uns 4 segundos depois de mexer) e busca as do outro ao abrir ou voltar para o app.

**Guarde a senha da nuvem.** Ela não fica na Cloudflare e não dá para recuperar. Se perder: desligue a sincronização nos aparelhos, apague o valor `dados` em Workers KV → financas-dados e ative de novo (começando pelo aparelho com os dados certos).

O plano grátis do KV aceita 1.000 gravações por dia — muito mais do que o app usa.

## Problemas comuns

| Mensagem | O que fazer |
|---|---|
| "Senha da ponte incorreta" | A senha em Config é diferente da variável `APP_TOKEN`. |
| "Site não autorizado a usar a ponte" | O endereço do app não está em `ALLOWED_ORIGINS` (sem barra no fim). |
| "A ponte está sem a variável …" | Falta criar essa variável no passo 5. |
| "Falha ao consultar o banco … 401/403" | Client ID/Secret errados ou a aplicação da Pluggy foi apagada. |
| "Falha ao consultar o banco … 404" | Item ID errado, ou a conexão foi revogada: conecte de novo em meu.pluggy.ai. |
| "A ponte está sem o armazenamento DADOS (KV)" | Falta o passo 2 da sincronização (binding com o nome exato `DADOS`). |
| "Senha da nuvem incorreta" | Use a mesma senha da nuvem criada no primeiro aparelho. |
| "⚠ Sincronização com erro" no topo | Toque nele: a tela de Config mostra o motivo. |
| "☁ Sem internet • pendente" | Normal sem conexão: as alterações são enviadas quando a internet voltar. |

## Renovar a autorização (a cada 12 meses)

O app avisa quando faltarem 30 dias. Entre em meu.pluggy.ai e renove a conexão do Nubank. Se o Item ID mudar, troque `PLUGGY_ITEM_ID` na Cloudflare.
