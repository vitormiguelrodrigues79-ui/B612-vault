# B612-Vault — v2

PWA simples para gerir:
- Coleção
- Wishlist
- Builds personalizados
- Custos / valores
- Componentes do build
- Notas
- Backup e restauro em JSON

## Como testar no computador

A app precisa de ser servida por HTTP para o modo PWA funcionar corretamente.

### Opção rápida com Python
1. Descompacta a pasta.
2. Abre Terminal/PowerShell dentro da pasta.
3. Executa:
   python -m http.server 8080
4. Abre:
   http://localhost:8080

## Como usar no iPhone

Quando estiver alojada num endereço HTTPS:
1. Abre no Safari.
2. Toca em Partilhar.
3. Escolhe "Adicionar ao ecrã principal".

Os dados desta versão são guardados no browser através de localStorage.

## Próximos upgrades possíveis
- Login e sync com Supabase/Firebase
- Upload real de imagens
- Histórico de manutenção
- Peças múltiplas por build com custo individual
- Gráficos de valor da coleção
- Tags e filtros avançados
- Fichas PDF
- Interface específica para iPad


## Publicar no GitHub Pages

1. Cria um repositório público no GitHub.
2. Envia para a raiz do repositório todos os ficheiros desta pasta.
3. Abre Settings > Pages.
4. Em Build and deployment, escolhe Source: Deploy from a branch.
5. Branch: main.
6. Folder: / (root).
7. Guarda.

O endereço será normalmente:
https://TEU-UTILIZADOR.github.io/NOME-DO-REPOSITORIO/


## Alterações v2
- Nome alterado para B612-Vault
- Símbolo da raposa aplicado no cabeçalho e no ícone da PWA
- Secção Vendidos removida
- Cache da PWA atualizado para forçar a nova versão no iPhone
