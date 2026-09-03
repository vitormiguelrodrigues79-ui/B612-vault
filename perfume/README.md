# B612 Scent Vault · MVP

Aplicação de perfumes integrada no ecossistema B612-Vault, mas isolada em `/perfume/` para não interferir com a app de relógios.

## Incluído
- Coleção / Decants / Wishlist
- Filtros por estação e dia/noite
- Pesquisa e ordenação por nota
- Ficha de avaliação: abertura, 30 min, 2 h, 6 h
- Notas 0–10 para longevidade, projeção, elegância, originalidade, adequação pessoal e nota final
- Perfil aromático e pirâmide olfativa
- Favoritos, preço, loja/link e notas livres
- Tema claro/escuro
- Persistência local
- Sincronização Supabase por utilizador com RLS
- Login Google
- Dados iniciais baseados no guia PDF: CDNIM, Marwa, YSL L’Homme, Arctic Breeze, Jean Lowe Immortel, Inekas Luna, Liam Grey, Spectre Ghost e Ramad Oriental

A tabela `public.perfumes` é independente da tabela `watches`.