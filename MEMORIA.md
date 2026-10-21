# MEMÓRIA DO PROJETO TALAZA

## objetivo_geral
Evoluir a aplicação Talaza existente, preservando a estrutura e o design atuais, sem reconstruir do zero.

## objetivo_da_tarefa_atual
Reforçar o envio e a revisão dos comprovativos de pagamento, além de manter o painel administrativo, suporte e notificações a funcionar.

## o_que_ja_fizemos
- Mantida a utilização da tabela `payment_submissions` para comprovativos, aprovação e rejeição de pagamentos.
- O envio de comprovativos confirma que a sessão ainda corresponde ao utilizador autenticado e usa nomes de ficheiro únicos dentro da pasta do utilizador no bucket privado `payment-proofs`.
- Se a base de dados ainda não tiver `proof_image_url` e `proof_file_url`, o formulário tenta um formato compatível com a estrutura antiga e conserva os caminhos de ambos os ficheiros.
- Se o registo do pagamento falhar após o upload, o formulário tenta remover os ficheiros enviados para evitar resíduos no Storage.
- O painel administrativo reconhece comprovativos guardados nas colunas separadas, em caminhos antigos ou no formato JSON de compatibilidade; também tenta gerar links temporários e mostrar a pré-visualização da imagem no cartão do pagamento.
- As páginas `pages/seller.js` e `pages/impulsionar.js` consultam `payment_submissions` para detetar pedidos pendentes, em vez da tabela antiga `subscription_requests`.
- No painel `pages/admin.js`, os botões de aprovação/rejeição de pagamentos e publicações indicam quando estão a guardar, para evitar cliques repetidos.
- O painel permite atualizar manualmente os dados; as submissões da Comunidade mostram também o nome do autor quando disponível.
- O formulário administrativo envia notificações para todos os utilizadores ( `user_id = NULL` ) ou para um utilizador escolhido.
- A página `pages/notificacoes.js` e o componente `components/NotificationsPanel.js` usam o campo `body` e incluem avisos gerais e notificações individuais.
- O ficheiro `supabase_admin_support_notifications.sql` foi atualizado com migração compatível com uma tabela `notifications` já existente, permissões de leitura de avisos gerais e política para marcar notificações privadas como lidas.
- Mantida a caixa de entrada `support_messages` no painel, com ações para marcar mensagens como analisadas.
- O painel mostra as publicações submetidas em `community_posts`, com aprovação/rejeição por moderação.

## o_que_ja_retificamos
- Corrigida a incompatibilidade entre `content` e `body` no sistema de notificações.
- A consulta das notificações inclui `user_id IS NULL` (avisos gerais) ou o ID do utilizador autenticado (mensagens privadas).
- As notificações gerais são apresentadas sem permitir que um utilizador as marque como lidas para toda a gente.
- A permissão de atualização de notificações fica limitada à coluna `is_read`.
- O script SQL mantém RLS ativo e limita o envio de notificações a contas registadas em `admin_users`.

## o_que_falta_fazer
- Executar no Supabase SQL Editor a versão atualizada de `supabase_admin_support_notifications.sql`, caso a migração ainda não tenha sido executada.
- Testar com contas reais: enviar um comprovativo (imagem, PDF e ambos), confirmar que aparece no painel e que os ficheiros abrem; confirmar que mudar de plano fica bloqueado enquanto o pedido está pendente; aprovar/rejeitar o pagamento e verificar a ativação do negócio. Se a pré-visualização falhar, confirmar no Supabase que a política `Talaza admins view payment proofs` foi aplicada ao bucket privado `payment-proofs`. Depois testar a moderação da Comunidade.
- Testar uma mensagem no Suporte Talaza e enviar uma notificação geral e outra privada, confirmando que cada uma aparece no destinatário correto.
- Revalidar a implantação no Vercel quando o limite de builds permitir.

## erros_atuais
- O estado de verificação do Vercel no commit `a46b1de11561679d40d9eb98d1f6c5a5476f5640` devolveu `build-rate-limit` nos projetos `talaza-app` e `talaza-app2`. A compilação e o funcionamento real ainda não foram confirmados por esse motivo.
- O envio de comprovativo não apresentou erro no teste recente relatado pelo utilizador, mas ainda é necessário confirmar que o registo foi guardado e que o administrador consegue abrir os ficheiros.
- O Supabase e a interface do utilizador não foram testados em tempo real nesta sessão; não assumir que as políticas SQL já foram executadas na base de dados.

## decisoes_e_regras
- O nome do projeto é sempre Talaza.
- Trabalhar apenas na branch `Dev`; não alterar `main`.
- Preservar a aplicação existente, sem recomeçar do zero.
- Manter RLS ativo no Supabase e não tornar os comprovativos privados públicos.
- Os avisos gerais usam `user_id = NULL`; mensagens individuais usam o ID da conta destinatária.
- A Comunidade Talaza é gratuita; as publicações enviadas por utilizadores aguardam moderação antes de aparecerem publicamente.
- Não declarar uma compilação, implantação ou teste como concluído sem confirmação real.


## Atualização — painel administrativo (2026-10-20)
- O painel `pages/admin.js` foi reorganizado com navegação por secções: Vendedores, Pagamentos e hospedagens, Eventos, Oportunidades, Comunidade Talaza e Suporte Talaza.
- Foi adicionada moderação de Eventos e Oportunidades usando as tabelas existentes `events` e `job_posts`; não foram criadas tabelas duplicadas.
- As recusas de cadastro de vendedor, comprovativo/pagamento, publicações da Comunidade Talaza, eventos e oportunidades pedem motivo e tentam enviá-lo numa notificação individual ao utilizador. A recusa de pagamento também guarda o motivo em `payment_submissions.notes`.
- O painel inclui o nome/ID do responsável, pré-visualização de comprovativos através de URL temporário e ações para abrir imagem/PDF.
- Eventos aprovados sem pagamento confirmado ficam em `approved_pending_payment`, não publicados automaticamente.
- O ficheiro `supabase_admin_support_notifications.sql` foi atualizado com políticas administrativas para listar/atualizar eventos e oportunidades, restrição de leitura de `admin_users` ao próprio administrador e valores de tipo de notificação. Estas alterações SQL ainda precisam de ser executadas no Supabase; a alteração no GitHub não muda a base de dados automaticamente.
- Commits mais recentes na branch `Dev`: `9a6c440`, `79ce009`, `4c18ef2`, `e7a6bad`.
- Ainda não está confirmado que o Vercel construiu/publicou estes commits. Testar após executar a migração SQL e verificar políticas RLS de `payment_submissions`, `businesses`, `events`, `job_posts`, `notifications` e Storage `payment-proofs`.

- As novas oportunidades em `pages/contratar.js` passam a ser criadas como `pending_review` e `is_active: false`, para só aparecerem publicamente após aprovação no painel. O administrador pode aprovar (publicar/ativar) ou recusar (desativar e notificar).
- A aprovação administrativa de eventos usa a coluna `events.admin_approved` (adicionada pela migração) para não confundir aprovação com pagamento; eventos sem pagamento confirmado não são publicados.


## Atualização — imagens do painel do vendedor (2026-10-20)
- Em `pages/seller.js`, o carregamento de logo, imagem principal e alterações do perfil passa a guardar ficheiros no Storage `business-media` dentro da pasta cujo nome é o ID do negócio, alinhado com a regra de propriedade pretendida.
- Commit: `e8f122d559b43e4c35d0cf75568e471b64354165`.
- **Atenção:** a política RLS atualmente partilhada pelo utilizador parece consultar `storage.foldername(b.name)` em vez do caminho do ficheiro (`storage.objects.name`). A política SQL de upload precisa de ser corrigida no Supabase; a alteração de código, sozinha, não corrige a política da base de dados.
- Ainda falta implementar a galeria de 3 imagens principais, a galeria de imagens de painel com preços/descrições e os modos de visualização vertical, deslize e normal. Não afirmar que estas funcionalidades já estão concluídas.
- Regra de produto: negócios comuns aparecem apenas na vitrine da respetiva subcategoria. Só planos específicos de destaque podem dar visibilidade na vitrine principal, na área Destaques Premium e/ou nas notificações da província. Município e bairro não devem aparecer diretamente no cartão/cabeçalho da loja; devem servir como filtros de pesquisa.


## Atualização — mensagens entre utilizadores (2026-10-21)
- Confirmado que a versão anterior de `pages/mensagens.js` guardava mensagens apenas no estado local do navegador; não entregava mensagens a outros utilizadores.
- Corrigido `pages/_app.js`: a barra inferior fixa deixa de ser exibida em `/mensagens`, para não tapar o campo de escrita.
- Substituída `pages/mensagens.js` por uma interface ligada às tabelas Supabase `conversations`, `conversation_participants` e `messages`. Inclui lista de conversas, envio persistente de texto, origem da conversa e subscrição Realtime para novas mensagens.
- O botão de mensagem no perfil público `pages/businesses/[id].js` abre agora a conversa interna da Talaza com o proprietário do negócio; o WhatsApp continua separado quando existe contacto.
- Criado `supabase_messaging.sql` com tabelas, índices e políticas RLS para participantes, mensagens e verificação da província principal. O script está no GitHub, mas ainda precisa ser executado manualmente no Supabase SQL Editor.
- Commits desta implementação na branch `Dev`: `e1154f9` (barra inferior), `416b473` (primeira versão SQL), `829fb45` (mensagens Supabase), `3683ce3` e `90bff60` (ajustes de segurança SQL), `cd3984e` (botão de mensagem do perfil público), `d749c2a` (preservar destinatário no login).
- Não está confirmado que o Vercel publicou os commits nem que o SQL foi executado. Após executar o script, testar com duas contas reais na mesma província: iniciar conversa pelo perfil de um negócio, enviar mensagem de cada lado e confirmar que as mensagens persistem após recarregar. Testar também que contas de províncias diferentes não conseguem iniciar/ler a mesma conversa.
- Limitações atuais: esta primeira fase envia texto; anexos, áudio, notificações de mensagens não lidas e links de mensagem a partir de comentários/publicações da Comunidade, Contratar, Oportunidades e Eventos ainda precisam de integração. A atualização em tempo real depende de Realtime estar ativo para a tabela `messages` no Supabase.


## Atualização — perfil pessoal e mensagens (2026-10-21)
- Em `pages/perfil.js`, a fotografia de perfil passa a ter o botão `+` sempre visível e pode ser alterada diretamente ao tocar na imagem, sem abrir primeiro “Editar perfil”. O envio guarda a URL na tabela `profiles` e apresenta erros explícitos conforme o tipo de falha do Storage.
- No perfil pessoal, a conta que tem um negócio associado não pode alterar o e-mail de acesso. O campo fica bloqueado e explica que a conta única é usada tanto no painel do negócio como ao explorar a Talaza. Foi acrescentado campo de nova palavra-passe opcional com botão Mostrar/Ocultar; a palavra-passe atual nunca é apresentada.
- Em `pages/mensagens.js`, a consulta ao perfil deixou de exigir um conjunto de colunas opcionais (como `full_name`, `photo_url` e `photo`) que podem não existir na tabela real; usa a linha de perfil existente e regista o erro técnico no console em vez de bloquear toda a página. A caixa de escrita fica sempre visível, mesmo sem conversa selecionada, com instrução clara de que é preciso escolher um destinatário antes de enviar.
- Foram acrescentados controlos de anexos e gravação de áudio. Para envio/abertura real, a migração precisa ser executada no Supabase: acrescenta `storage_path`, `attachment_name`, `message_type`, permite mensagens sem texto quando têm anexo, cria o bucket privado `message-attachments` e políticas limitadas aos participantes. Os ficheiros são enviados até 15 MB e as URLs são assinadas para acesso privado.
- O mesmo `supabase_messaging.sql` inclui configuração do bucket público `avatars` (máximo 5 MB) e políticas para cada utilizador gerir apenas a pasta com o seu próprio ID. Executar a migração atualizada é necessário para corrigir a falha de fotografia e ativar anexos/áudio.
- Commits nesta etapa na branch `Dev`: `34dc37b` (perfil), `1577400` e `80c9b51` (mensagens), `181663b`, `4a10eb5`, `de1be18`, `b219c33`, `80fc6b3` (migração de mensagens, anexos e avatars).
- Ainda não foi executado o SQL no Supabase e não foi confirmado um build verde/publicação no Vercel. Testar após executar a migração: editar perfil com conta ligada a negócio, trocar foto sem abrir edição, alterar palavra-passe com Mostrar/Ocultar, abrir mensagens sem perfil completo, enviar texto, ficheiro e áudio entre duas contas da mesma província e confirmar que os anexos não ficam públicos.
