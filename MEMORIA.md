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
- O painel administrativo reconhece comprovativos guardados nas colunas separadas, em caminhos antigos ou no formato JSON de compatibilidade.
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
- Testar com contas reais: enviar um comprovativo (imagem, PDF e ambos), confirmar que aparece no painel e que os ficheiros abrem; aprovar/rejeitar o pagamento e verificar a ativação do negócio. Depois testar a moderação da Comunidade.
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
