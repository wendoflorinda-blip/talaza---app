# Catálogos históricos de migrations

Os ficheiros CSV desta pasta são fotografias informativas dos registos `supabase_migrations.schema_migrations` consultados nos dois projetos na data desta organização.

- `production-applied.csv`: 57 entradas do registo do Supabase original/produção.
- `dev-clone-applied.csv`: 33 entradas do registo do Supabase Dev, incluindo operações de clonagem estrutural.

## Limites importantes

- Os CSV contêm apenas versão, nome, origem, classificação e indicação de não reexecução.
- Não incluem o SQL executado, hashes, dados, utilizadores ou ficheiros.
- Um registo de migration não prova que o ficheiro SQL correspondente esteja disponível no GitHub.
- As entradas do Dev incluem operações de clonagem e não devem ser confundidas com migrations de produto reproduzíveis.
- Não foram inventados nem reconstruídos ficheiros SQL antigos.
- Estes catálogos não são uma pasta de migrations, não devem ser passados à CLI e não devem ser usados para repor ou sincronizar bases de dados.

Para recuperar uma migration antiga em falta, é necessário localizar o SQL original em fonte confiável, comparar com o estado real do schema e submetê-lo a revisão independente. Nunca recriar SQL por suposição.
