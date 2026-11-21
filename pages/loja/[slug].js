import { useRouter } from 'next/router';
import AdminPublicStore from '../loja-administrador';

export default function AdminStoreSlugPage() {
  const router = useRouter();
  const slug = router.isReady && typeof router.query.slug === 'string' ? router.query.slug : undefined;
  return <AdminPublicStore slug={slug} />;
}
