import { useEffect } from 'react';
import { useRouter } from 'next/router';
export default function OldAdminStoreSignupRoute() {
  const router = useRouter();
  useEffect(() => { router.replace('/admin/painel'); }, [router]);
  return <main style={{ padding: 32, fontFamily: 'Arial,sans-serif' }}>O cadastro da Loja do Administrador é feito em /admin/painel.</main>;
}
