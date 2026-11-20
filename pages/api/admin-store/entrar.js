export default function handler(req, res) {
  return res.status(410).json({
    error: 'O acesso à Loja do Administrador usa a sessão do administrador principal. Entre em /login e abra /admin/painel.',
  });
}
