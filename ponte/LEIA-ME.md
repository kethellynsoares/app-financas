# Ponte com o Nubank (Cloudflare Worker)

A ponte é um pequeno programa que roda de graça na Cloudflare. Ela guarda as chaves da Pluggy e entrega ao app só os lançamentos do cartão. **Somente leitura:** não consegue pagar, transferir nem alterar nada no banco.

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

## Problemas comuns

| Mensagem | O que fazer |
|---|---|
| "Senha da ponte incorreta" | A senha em Config é diferente da variável `APP_TOKEN`. |
| "Site não autorizado a usar a ponte" | O endereço do app não está em `ALLOWED_ORIGINS` (sem barra no fim). |
| "A ponte está sem a variável …" | Falta criar essa variável no passo 5. |
| "Falha ao consultar o banco … 401/403" | Client ID/Secret errados ou a aplicação da Pluggy foi apagada. |
| "Falha ao consultar o banco … 404" | Item ID errado, ou a conexão foi revogada: conecte de novo em meu.pluggy.ai. |

## Renovar a autorização (a cada 12 meses)

O app avisa quando faltarem 30 dias. Entre em meu.pluggy.ai e renove a conexão do Nubank. Se o Item ID mudar, troque `PLUGGY_ITEM_ID` na Cloudflare.
