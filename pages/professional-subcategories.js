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

    const receivedCategory = Array.isArray(
      router.query.category
    )
      ? router.query.category[0]
      : router.query.category;

    const receivedCountry = Array.isArray(
      router.query.country
    )
      ? router.query.country[0]
      : router.query.country;

    const receivedProvince = Array.isArray(
      router.query.province
    )
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
      /* PAÍS */
      const {
        data: countryData,
        error: countryError,
      } = await supabase
        .from('countries')
        .select('id, name')
        .eq('id', receivedCountry)
        .single();

      if (countryError) {
        console.error(
          'ERRO PAÍS:',
          countryError
        );
        throw countryError;
      }

      /* PROVÍNCIA */
      const {
        data: province


