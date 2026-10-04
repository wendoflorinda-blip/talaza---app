import { useEffect } from 'react';
import { useRouter } from 'next/router';

export default function ProfessionalSubcategories() {
  const router = useRouter();

  useEffect(() => {
    if (!router.isReady) return;

    const country = Array.isArray(router.query.country)
      ? router.query.country[0]
      : router.query.country;

    const province = Array.isArray(router.query.province)
      ? router.query.province[0]
      : router.query.province;

    router.replace({
      pathname: '/contratar',
      query: {
        country: country || '',
        province: province || '',
      },
    });
  }, [router.isReady]);

  return (
    <div
      className="container"
      style={{
        padding: 30,
        textAlign: 'center',
      }}
    >
      <p
        style={{
          color: 'var(--ink-soft)',
        }}
      >
        A carregar…
      </p>
    </div>
  );
}
    

    
