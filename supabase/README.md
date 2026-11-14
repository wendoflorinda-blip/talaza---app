# Histórico e migrations do Supabase — Talaza

Esta pasta é o ponto de organização dos scripts SQL do projeto. A branch `Dev` é a área de desenvolvimento; a branch `main` e o Supabase original/produção não são alterados por esta organização.

## Regras obrigatórias

1. **Novas alterações estruturais:** criar uma migration nova, com timestamp e nome descritivo, em `supabase/migrations/` usando o fluxo oficial da Supabase CLI.
2. **Testes primeiro em Dev:** rever o SQL, testar no Supabase Dev e verificar o resultado antes de considerar qualquer promoção.
3. **Produção exige autorização separada:** nenhuma migration deve ser aplicada no Supabase original/produção sem revisão explícita e autorização específica.
4. **Não executar histórico:** os CSV em `supabase/history/` são catálogos informativos extraídos do registo interno de migrations de cada projeto. Não contêm o SQL original e não devem ser reproduzidos, importados ou executados.
5. **Scripts manuais antigos:** `supabase/manual/` guarda scripts SQL históricos que estavam na raiz do repositório. A sua localização não significa que sejam migrations, que estejam atualizados ou que devam ser executados. Inspecionar cada script e comparar com o estado atual antes de qualquer utilização manual.
6. **Rascunhos em revisão:** `supabase/review/` contém propostas ainda não aprovadas. Não executar nem promover sem revisão.
7. **Edge Function de limpeza:** `talaza-cleanup` permanece exclusivamente no Supabase original, com a trava de segurança existente. Não copiar nem ativar em Dev.

## Estrutura

- `migrations/` — migrations versionadas e destinadas a revisão/teste controlado.
- `manual/` — scripts SQL manuais históricos, não executados automaticamente.
- `review/` — SQL em análise, não aprovado para execução.
- `history/` — catálogos CSV dos registos históricos, apenas para consulta.

## Migration atualmente versionada

`20261109103000_create_media_talaza_creator_onboarding.sql` permanece na pasta `migrations/`. A presença do ficheiro no GitHub não significa que tenha sido aplicada em qualquer Supabase.
