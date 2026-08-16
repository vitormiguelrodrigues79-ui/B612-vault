# B612-Vault v4 — Supabase

## 1. Criar projeto
Cria um projeto no Supabase.

## 2. Ativar Anonymous Sign-Ins
Authentication > Sign In / Providers > Anonymous Sign-Ins > Enable.

## 3. Criar o bucket privado e as regras
Vai a SQL Editor > New query.
Cola todo o conteúdo de `SUPABASE-SETUP.sql` e executa.

## 4. Configurar a app
No dashboard do Supabase copia:
- Project URL
- Publishable key (ou anon key, se o projeto mostrar a chave legacy)

Abre `supabase-config.js` e substitui os dois `COLOCA_AQUI`.

Nunca uses a `service_role` ou uma secret key no browser.

## 5. Atualizar GitHub
Carrega todos os ficheiros desta pasta para a raiz do repositório `B612-vault` e faz Commit.

## Fotografias
A app:
- permite escolher foto da biblioteca/câmara no iPhone;
- comprime para JPEG antes do envio;
- limita o lado maior a 1600 px;
- guarda em bucket privado;
- usa URLs assinadas temporárias para mostrar as fotos.

## Nota importante sobre Anonymous Auth
O utilizador anónimo fica associado ao browser/dispositivo. Se apagares os dados do Safari/PWA ou mudares de dispositivo, poderás receber um novo UID. Para sincronização real entre iPhone e computador, o passo seguinte ideal é login por email/OTP e guardar a coleção também na base de dados Supabase.
