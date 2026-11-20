import { useEffect } from 'react';
import { useRouter } from 'next/router';
export default function OldAdminStoreLoginRoute() {
  const router = useRouter();
  useEffect(() => { router.replace('/login?redirect=' + encodeURIComponent('/admin/painel')); }, [router]);
  return <main style={{ padding: 32, fontFamily: 'Arial,sans-serif' }}>Entre com a conta do administrador principal.</main>;
}
