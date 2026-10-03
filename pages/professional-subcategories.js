import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Link from 'next/link';
import { supabase } from '../lib/supabaseClient';

export default function ProfessionalSubcategories() {
  const router = useRouter();

  const [categoryId, setCategoryId] = useState('');
  const [countryId, setCountryId] = useState('');
  const [provinceId, setProvinceId] = useState('');

  const [categoryName, setCategoryName] = useState('');
  const [countryName, setCountryName] = useState('');
  const [provinceName, setProvinceName] = useState('');

  const [subcategories, setSubcategories] = useState([]);

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    if (!router.isReady) return;

    const receivedCategory = Array.isArray(router.query.category)
      ? router.query.category[0]
      : router.query.category;

    const receivedCountry = Array.isArray(router.query.country)
      ? router.query.country[0]
      : router.query.country;

    const receivedProvince = Array.isArray(router.query.province)
      ? router.query.province[0]
      : router.query.province;

    if (
      !receivedCategory ||
      !receivedCountry ||
      !receivedProvince
    ) {
      router.replace('/country');
      return;
    }

    setCategoryId(receivedCategory);
    setCountryId(receivedCountry);
    setProvinceId(receivedProvince);

    loadPage(
      receivedCategory,
      receivedCountry,
      receivedProvince
    );
  }, [router.isReady]);

  async function loadPage(
    receivedCategory,
    receivedCountry,
    receivedProvince
  ) {
    setLoading(true);
    setError('');

    try {
      /*
       * PAÍS
       */
      const { data: countryData, error: countryError } =
        await supabase
          .from('countries')
          .select('id, name')
          .eq('id', receivedCountry)
          .single();

      if (countryError) {
        console.error('ERRO PAÍS:', countryError);
        throw countryError;
      }

      /*
       * PROVÍNCIA
       */
      const { data: provinceData, error: provinceError } =
        await supabase
          .from('provinces')
          .select('id, name')
          .eq('id', receivedProvince)
          .single();

      if (provinceError) {
        console.error('ERRO PROVÍNCIA:', provinceError);
        throw provinceError;
      }

      /*
       * CATEGORIA PROFISSIONAL
       */
      const { data: categoryData, error: categoryError } =
        await supabase
          .from('professional_categories')
          .select('id, name')
          .eq('id', receivedCategory)
          .single();

      if (categoryError) {
        console.error(
          'ERRO CATEGORIA PROFISSIONAL:',
          categoryError
        );
        throw categoryError;
      }

      /*
       * SUBCATEGORIAS
       *
       * A ligação é:
       *
       * professional_subcategories.category_id
       *
       * =
       *
       * professional_categories.id
       */
      const {
        data: subcategoryData,
        error: subcategoryError,
      } = await supabase
        .from('professional_subcategories')
        .select(
          'id, created_at, category_id, name, is_active, description'
        )
        .eq('category_id', receivedCategory)
        .eq('is_active', true)
        .order('name', {
          ascending: true,
        });

      if (subcategoryError) {
        console.error(
          'ERRO SUBCATEGORIAS:',
          subcategoryError
        );

        throw subcategoryError;
      }

      setCountryName(countryData?.name || '');
      setProvinceName(provinceData?.name || '');
      setCategoryName(categoryData?.name || '');
      setSubcategories(subcategoryData || []);
    } catch (err) {
      console.error(
        'ERRO COMPLETO PROFESSIONAL SUBCATEGORIES:',
        err
      );

      setError(
        'Não foi possível carregar as áreas profissionais.'
      );

      setSubcategories([]);
    } finally {
      setLoading(false);
    }
  }

  function openSubcategory(subcategoryId) {
    router.push({
      pathname: '/professional-profiles',
      query: {
        category: categoryId,
        subcategory: subcategoryId,
        country: countryId,
        province: provinceId,
      },
    });
  }

  return (
    <div
      className="container"
      style={{
        paddingBottom: 60,
      }}
    >
      {/* CABEÇALHO */}
      <nav
        className="topnav"
        style={{
          padding: '12px 0',
        }}
      >
        <Link
          href={{
            pathname: '/contratar',
            query: {
              country: countryId,
              province: provinceId,
            },
          }}
          style={{
            textDecoration: 'none',
            color: 'inherit',
            display: 'flex',
            alignItems: 'center',
            gap: 8,
          }}
        >
          <div
            className="logo"
            style={{
              background: '#075B4E',
              color: '#E6A900',
            }}
          >
            T
          </div>

          <b>Talaza</b>
        </Link>

        <Link
          href={{
            pathname: '/contratar',
            query: {
              country: countryId,
              province: provinceId,
            },
          }}
          className="btn btn-ghost"
          style={{
            fontSize: 12,
          }}
        >
          ← Voltar
        </Link>
      </nav>

      {/* LOCALIZAÇÃO */}
      <div
        style={{
          marginTop: 12,
          display: 'inline-flex',
          padding: '7px 11px',
          borderRadius: 999,
          background: '#EAF4F1',
          color: '#075B4E',
          fontSize: 11,
          fontWeight: 800,
        }}
      >
        {countryName} · {provinceName}
      </div>

      {/* CABEÇALHO
