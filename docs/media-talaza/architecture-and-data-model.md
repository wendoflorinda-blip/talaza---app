# MÍDIA TALAZA — arquitetura, dados e publicidade

Estado: especificação de produto para implementação na branch `Dev`.
Escopo atual: lançamento em Angola. A arquitetura deve permitir expansão internacional sem misturar dados ou regras da TALAZA Comercial e do Shopping Internacional.

## 1. Princípios

- MÍDIA TALAZA é uma área independente dentro do ecossistema TALAZA.
- Uma identidade Supabase Auth pode aceder à TALAZA Comercial e à MÍDIA, mas cada área mantém perfil, permissões, preferências, conteúdos, faturação e regras próprias.
- Não alterar `profiles.account_type` da TALAZA Comercial para representar criadores.
- Não reutilizar `professional_profiles.age/gender`: essa tabela pertence ao diretório de profissionais e tem finalidade diferente.
- A oferta de lançamento de três meses fica preparada, em estado não ativo. Não ativar nem conceder benefícios automaticamente.
- O Desafio fica reservado na MÍDIA, desativado até existir especificação funcional aprovada.
- Os planos comerciais e os seus preços, durações, benefícios e regras permanecem intocados.

## 2. Navegação principal da MÍDIA

1. **Feed** — feed orgânico personalizado, com modos Global, Local e Idioma.
2. **Descoberta** — pesquisa e descoberta de criadores, vídeos, temas e conteúdos.
3. **Seguindo** — conteúdos de contas seguidas.
4. **Mensagens** — mensagens privadas da MÍDIA, isoladas das mensagens comerciais.
5. **Notificações** — interações, seguidores, mensagens, lives, estreias e estado de conta.
6. **Perfil** — perfil público e gestão do perfil próprio.

## 3. Ferramentas e áreas de criação

- **Estúdio do Criador** — publicar e gerir vídeos, fotos, descrições, hashtags, rascunhos, privacidade e estatísticas.
- **EN LIVE** — agendamento de transmissões em direto, com as regras de monetização e links externos já definidas.
- **Estreias** — agendamento de estreias e respetiva experiência de visualização.
- **Publicidade** — criação e gestão de campanhas, orçamento, duração, segmentação, revisão e relatórios.
- **Descoberta Profissional** — filtros profissionais elegíveis por plano; não garante alcance nem altera o algoritmo orgânico.
- **Shopping Internacional** — área comercial separada, sem misturar catálogo, pedidos ou pagamentos com o feed orgânico.
- **Desafio** — área reservada, ainda sem comportamento implementado.

## 4. Cadastro e dados do utilizador

### Dados de identidade e acesso
- Identificador interno ligado a Supabase Auth.
- E-mail ou telefone verificado, conforme o método escolhido.
- País de registo.
- Estado de verificação e segurança da conta.

### Dados demográficos e localização
- Data de nascimento (obrigatória; a plataforma calcula a idade).
- Género autodeclarado, com opção de não informar.
- País e província de residência/perfil.
- Idioma preferido da interface.

A idade mínima continua a ser 18 anos, sem limite máximo. A data de nascimento não deve ser apresentada no perfil público nem aos anunciantes. Para relatórios e segmentação, derivar faixas etárias, sem expor a data exata.

O género não pode ser inferido por imagem, nome, voz ou comportamento. O utilizador deve poder rever e alterar a resposta e escolher não a fornecer.

### Dados do perfil público
- Nome público e @username.
- Foto/avatar.
- Biografia.
- País e localização pública conforme as escolhas de privacidade.
- Ligações sociais validadas.
- Nichos e interesses selecionados.

### Preferências e sinais de utilização
Registar de forma proporcional e transparente:
- Interesses escolhidos pelo utilizador.
- Idioma declarado e idioma detetado do conteúdo.
- Tempo de visualização, conclusão e repetição.
- Ignorar/avançar, gostar, guardar, partilhar e comentar.
- Seguir/deixar de seguir, pesquisas e indicação “não tenho interesse”.
- Preferências de feed e controlos de personalização.

Não transformar estes sinais em exposição pública do histórico individual. Disponibilizar controlos para rever e gerir personalização, de acordo com a política de privacidade.

## 5. Modelo de dados proposto (não criado ainda)

Separar as entidades para limitar acesso e permitir políticas RLS específicas:

- `media_profiles`: perfil da MÍDIA e dados públicos.
- `media_private_demographics`: data de nascimento e género, com acesso restrito ao titular e aos serviços autorizados.
- `media_user_locations`: país/província e respetiva finalidade (residência, localização pública ou preferência de feed).
- `media_user_interests`: interesses e nichos selecionados.
- `media_user_preferences`: idioma, privacidade e personalização.
- `media_content`: publicações, idioma, país de origem e estado de visibilidade.
- `media_interactions`: eventos necessários ao feed e aos relatórios, com retenção e minimização definidas.
- `media_followers` e `media_conversations`: relações e mensagens exclusivas da MÍDIA.
- `media_advertisers`, `media_ad_campaigns`, `media_ad_audiences`, `media_ad_creatives`, `media_ad_reviews` e `media_ad_reports`: sistema de publicidade isolado.
- `media_entitlements` / subscrições: direitos profissionais e histórico de concessões.

Este modelo é uma proposta arquitetural; não representa tabelas existentes nem uma migração aplicada.

## 6. Segmentação de anúncios

A interface do anunciante poderá configurar, quando permitido:
- País e província.
- Faixas etárias (por exemplo: 18–24, 25–34, 35–44, 45–54, 55–64, 65+).
- Género, com opção “todos” e apenas para campanhas em que a segmentação seja legal e adequada.
- Idioma.
- Interesses e categorias.
- Orçamento, duração, objetivo e formato do anúncio.

O anunciante recebe estimativas e métricas agregadas. Não recebe nomes, e-mails, telefones, datas de nascimento, género individual ou listas identificáveis de utilizadores.

Criar salvaguardas para impedir discriminação ou segmentação indevida, sobretudo em emprego, habitação, crédito, saúde e outras categorias sensíveis. As regras concretas devem ser validadas para cada país antes da expansão.

## 7. Separação do algoritmo orgânico e anúncios

- O algoritmo orgânico é o mesmo para Explorador, Vendedor e Criador.
- Interesses, idioma, localização escolhida e sinais de utilização podem melhorar relevância, mas nenhum tipo de conta recebe vantagem orgânica.
- A segurança e elegibilidade de recomendação são verificadas antes do ranking.
- Anúncios pagos são identificados como patrocinados e entregues através de um sistema separado.
- Comprar publicidade ou ferramentas profissionais não garante visualizações, seguidores ou posição orgânica.

## 8. Privacidade, segurança e retenção

- Aplicar RLS em todas as tabelas expostas.
- Data de nascimento e género não devem ser públicos.
- Nunca confiar em metadados editáveis pelo utilizador para decisões de autorização.
- Não expor chaves de serviço no cliente.
- Separar permissões de perfil, moderação, publicidade e administração.
- Definir consentimento, finalidade, retenção, exportação e eliminação de dados antes de lançar os formulários e a publicidade.
- Não usar dados demográficos para inferir atributos sensíveis.
- Fazer avaliação jurídica e de proteção de dados antes de lançar segmentação por género ou categorias especiais em cada país.

## 9. Ordem recomendada de implementação

1. Fechar o modelo de dados e os limites de privacidade.
2. Criar perfil e cadastro MÍDIA, com país, província, nascimento, género opcional, idioma e interesses.
3. Criar navegação e estrutura das áreas principais.
4. Criar publicação, feed, descoberta, seguindo e perfil.
5. Integrar moderação e elegibilidade de recomendação antes da distribuição.
6. Implementar mensagens e notificações.
7. Implementar Estúdio, EN LIVE e Estreias.
8. Construir o gestor de publicidade e segmentação com limites legais e relatórios agregados.
9. Integrar Shopping Internacional separadamente.
10. Especificar e implementar Desafio apenas depois da definição funcional.

## 10. Estado técnico observado antes desta especificação

- A base de dados consultada não contém atualmente tabelas públicas com nomes de MÍDIA, Criador, anúncios ou audiências.
- `profiles` da TALAZA Comercial tem país e província, mas não tem data de nascimento ou género.
- `professional_profiles` já contém idade e género para o diretório profissional; não deve ser reutilizada como perfil de MÍDIA.
- O fluxo `media-creator-signup.js` ainda cria candidaturas e pede categoria, idioma, biografia e ligações sociais.
- `media-payment.js` e `admin/media.js` dependem do fluxo antigo de candidaturas/pagamentos.
- `lib/media/moderation/policy.js` e `lib/media/recommendations/ranking.js` existem como bases de lógica, mas não constituem por si só um serviço completo de IA, moderação persistente ou recomendação em produção.

Nenhuma alteração de schema, autenticação, perfil comercial, pagamento ou produção é autorizada por este documento.


## 11. Integração futura com os três cadastros do ecossistema

A recolha de dados comuns deve ser integrada nos três percursos sem substituir nem reescrever os fluxos atuais da TALAZA Comercial:

- Explorador TALAZA Comercial.
- Vendedor TALAZA Comercial.
- Criador de Conteúdos MÍDIA TALAZA.

### Dados comuns a recolher

- Data de nascimento (guardar a data completa em área privada; calcular idade/faixa etária no servidor).
- Género autodeclarado, com opção explícita "Prefiro não informar".
- País.
- Província.
- Idioma preferido.
- E-mail ou telefone verificado, conforme o método de autenticação.

A data de nascimento e o género não são campos públicos. Não disponibilizar estes valores a vendedores, criadores, outros utilizadores ou anunciantes. Não inferir género através de nome, fotografia, voz, vídeo ou comportamento.

### Interesses por tipo de conta

- Explorador: temas e categorias que deseja descobrir/seguir na MÍDIA e, separadamente, preferências de descoberta da TALAZA Comercial. Não misturar os dois conjuntos.
- Vendedor: categorias e subcategorias comerciais já existentes permanecem a fonte da classificação do negócio. Acrescentar, em área separada e opcional, interesses de conteúdo da MÍDIA, se o vendedor também utilizar a MÍDIA.
- Criador: múltiplos nichos/temas de criação, sem limite artificial; idioma(s) do conteúdo são independentes do país e do idioma da interface.

Os interesses selecionados pelo utilizador são diferentes dos sinais de comportamento recolhidos pelo feed (visualização, conclusão, repetição, gostos, guardados, partilhas, comentários, pesquisas e "não tenho interesse"). Manter estas fontes distintas.

### Contas existentes

Não bloquear nem interromper contas atuais para exigir imediatamente novos dados. Criar um fluxo progressivo de completar perfil, com explicação da finalidade e pedido de consentimento quando aplicável. Não sobrescrever os valores atuais de país/província nem alterar a província principal da TALAZA Comercial por causa de filtros de exploração da MÍDIA.

### Compatibilidade e proteção

- Não alterar `profiles.account_type`, políticas RLS, tabelas comerciais, login ou formulários existentes como parte da simples recolha de requisitos.
- Não reutilizar `professional_profiles.age/gender` como dados demográficos de MÍDIA.
- A implementação deverá ser aditiva, com tabelas próprias de dados privados e relações ao utilizador autenticado.
- Definir validação de idade, consentimento, finalidade, retenção, correção e eliminação antes de publicar os novos campos.
- A regra de maioridade já definida para MÍDIA aplica-se ao cadastro MÍDIA. Não impor automaticamente a mesma regra às contas comerciais existentes.

## 12. Shopping Internacional no menu global

O **Shopping Internacional** ficará no menu global da TALAZA, no mesmo menu onde já aparecem opções como "Suporte TALAZA" e "Terminar sessão". Não será um item da navegação principal do feed MÍDIA nem uma opção escondida apenas dentro do perfil do criador.

A entrada do menu abre uma área própria de Shopping Internacional, com navegação, catálogo, vendedores, produtos, pedidos, pagamentos e regras comerciais independentes. A integração visual no menu não mistura os dados nem os sistemas da TALAZA Comercial e da MÍDIA.

A inclusão do item no menu deve ser feita de forma aditiva, preservando todas as opções existentes, a ordem e o comportamento atual de logout e suporte. Antes de editar o menu real, inspecionar o componente partilhado e confirmar os destinos e permissões.
