# B612-Vault v5 — Sync

A tabela `watches` e as respetivas RLS policies já foram criadas no Supabase.

## Antes de usar login por email
No Supabase Dashboard:
1. Authentication > Providers.
2. Mantém Email ativo.
3. Para converter o utilizador anónimo atual, ativa Manual Identity Linking se essa opção estiver disponível.
4. Authentication > URL Configuration:
   - Site URL: https://vitormiguelrodrigues79-ui.github.io/B612-vault/
   - adiciona o mesmo endereço aos Redirect URLs.

## No iPhone que já tem a coleção
1. Atualiza os ficheiros no GitHub.
2. Abre o B612-Vault no iPhone.
3. Espera alguns segundos para a coleção ser enviada para Supabase.
4. Toca no ícone da nuvem.
5. Usa "Associar esta coleção ao email".
6. Confirma o email recebido.

Isto mantém o mesmo UID do utilizador anónimo, preservando acesso às fotos existentes.

## No computador
1. Abre o mesmo endereço do B612-Vault.
2. Toca na nuvem.
3. Escolhe "Entrar com Magic Link".
4. Usa o mesmo email.
5. Abre o link recebido.

Depois do login, a tabela `watches` é sincronizada automaticamente.
