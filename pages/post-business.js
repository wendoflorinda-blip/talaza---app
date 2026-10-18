import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const MEDIA_BUCKET = 'business-media';
const MAX_FILE_SIZE = 5 * 1024 * 1024;

const C = {
  green: '#0F6E5C',
  dark: '#083F35',
  ink: '#17211F',
  muted: '#596560',
  canvas: '#F8F6F3',
  white: '#FFFFFF',
  line: '#E5E9E7',
  gold: '#DDA10A',
};

function cleanFileName(name) {
  return String(name || 'imagem')
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-zA-Z0-9._-]/g, '-');
}

export default function PostBusinesses() {
  const router = useRouter();

  const [user, setUser] = useState(null);
  const [categories, setCategories] = useState([]);
  const [subcategories, setSubcategories] = useState([]);
  const [countries, setCountries] = useState([]);
  const [provinces, setProvinces] = useState([]);

  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [categoryId, setCategoryId] = useState('');
  const [subcategoryId, setSubcategoryId] = useState('');
  const [countryId, setCountryId] = useState('');
  const [provinceId, setProvinceId] = useState('');
  const [municipality, setMunicipality] = useState('');
  const [neighborhood, setNeighborhood] = useState('');
  const [whatsapp, setWhatsapp] = useState('');

  const [logoFile, setLogoFile] = useState(null);
  const [galleryFiles, setGalleryFiles] = useState([]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState('');

  useEffect(() => {
    let active = true;

    async function initialise() {
      const { data: authData } = await supabase.auth.getUser();

      if (!active) return;

      if (!authData?.user) {
        router.replace('/login');
        return;
      }

      setUser(authData.user);

      const [categoryResult, countryResult] = await Promise.all([
        supabase.from('categories').select('id, name').order('name'),
        supabase.from('countries').select('id, name').order('name'),
      ]);

      if (!active) return;

      if (categoryResult.error || countryResult.error) {
        setError('Não foi possível carregar as categorias e os países.');
      } else {
        setCategories(categoryResult.data || []);

        // Apenas Angola fica disponível nesta fase.
        const angola = (countryResult.data || []).filter(
          (item) =>
            String(item.name || '').trim().toLocaleLowerCase('pt-AO') ===
            'angola'
        );

        setCountries(angola);
      }

      setLoading(false);
    }

    initialise();

    return () => {
      active = false;
    };
  }, [router]);

  useEffect(() => {
    let active = true;

    async function loadSubcategories() {
      setSubcategoryId('');
      setSubcategories([]);

      if (!categoryId) return;

      const { data, error: queryError } = await supabase
        .from('subcategories')
        .select('id, name')
        .eq('category_id', categoryId)
        .order('name', { ascending: true });

      if (!active) return;

      if (queryError) {
        setError('Não foi possível carregar as subcategorias.');
        return;
      }

      setSubcategories(data || []);
    }

    loadSubcategories();

    return () => {
      active = false;
    };
  }, [categoryId]);

  useEffect(() => {
    let active = true;

    async function loadProvinces() {
      setProvinceId('');
      setProvinces([]);

      if (!countryId) return;

      const { data, error: queryError } = await supabase
        .from('provinces')
        .select('id, name')
        .eq('country_id', countryId)
        .order('name', { ascending: true });

      if (!active) return;

      if (queryError) {
        setError('Não foi possível carregar as províncias.');
        return;
      }

      setProvinces(data || []);
    }

    loadProvinces();

    return () => {
      active = false;
    };
  }, [countryId]);

  function validateFiles(files) {
    for (const file of files) {
      if (!file.type.startsWith('image/')) {
        return 'Seleccione apenas ficheiros de imagem.';
      }

      if (file.size > MAX_FILE_SIZE) {
        return 'Cada imagem deve ter no máximo 5 MB.';
      }
    }

    return '';
  }

  async function uploadImage(file, folder) {
    const extension = file.name.includes('.')
      ? file.name.split('.').pop().toLowerCase()
      : 'jpg';

    const path = `${folder}/${user.id}/${Date.now()}-${Math.random()
      .toString(36)
      .slice(2)}-${cleanFileName(file.name)}`;

    const { error: uploadError } = await supabase.storage
      .from(MEDIA_BUCKET)
      .upload(path, file, {
        cacheControl: '3600',
        upsert: false,
        contentType: file.type || `image/${extension}`,
      });

    if (uploadError) {
      throw new Error(
        `Não foi possível enviar a imagem "${file.name}". ${uploadError.message}`
      );
    }

    const { data } = supabase.storage
      .from(MEDIA_BUCKET)
      .getPublicUrl(path);

    if (!data?.publicUrl) {
      throw new Error('A imagem foi enviada, mas não foi possível obter o URL.');
    }

    return data.publicUrl;
  }

  async function handleSubmit(event) {
    event.preventDefault();
    setError('');
    setSuccess('');

    if (!user) {
      setError('Inicie sessão para publicar o seu negócio.');
      return;
    }

    if (
      !name.trim() ||
      !categoryId ||
      !subcategoryId ||
      !countryId ||
      !provinceId
    ) {
      setError(
        'Preencha o nome, a categoria, a subcategoria, o país e a província.'
      );
      return;
    }

    if (!logoFile) {
      setError('Seleccione o logótipo do seu negócio.');
      return;
    }

    const fileError = validateFiles([logoFile, ...galleryFiles]);

    if (fileError) {
      setError(fileError);
      return;
    }

    setSaving(true);

    let createdBusinessId = null;
    let uploadedPaths = [];

    try {
      const logoUrl = await uploadImage(logoFile, 'logos');

      // Guardamos o caminho para permitir uma limpeza se a criação falhar.
      const logoPath = logoUrl.split(`/${MEDIA_BUCKET}/`)[1];
      if (logoPath) uploadedPaths.push(logoPath);

      const { data: business, error: businessError } = await supabase
        .from('businesses')
        .insert({
          owner_id: user.id,
          name: name.trim(),
          description: description.trim() || null,
          category_id: categoryId,
          subcategory_id: subcategoryId,
          country_id: countryId,
          province_id: provinceId,
          municipality: municipality.trim() || null,
          neighborhood: neighborhood.trim() || null,
          whatsapp: whatsapp.trim() || null,
          logo_url: logoUrl,
          is_active: false,
          approval_status: 'pending',
        })
        .select('id')
        .single();

      if (businessError) {
        throw new Error(businessError.message);
      }

      createdBusinessId = business.id;

      if (galleryFiles.length > 0) {
        const photoRows = [];

        for (const file of galleryFiles) {
          const imageUrl = await uploadImage(file, 'businesses');

          const imagePath = imageUrl.split(`/${MEDIA_BUCKET}/`)[1];
          if (imagePath) uploadedPaths.push(imagePath);

          photoRows.push({
            business_id: createdBusinessId,
            image_url: imageUrl,
          });
        }

        const { error: photosError } = await supabase
          .from('business_photos')
          .insert(photoRows);

        if (photosError) {
          throw new Error(
            `O negócio foi criado, mas não foi possível guardar a galeria: ${photosError.message}`
          );
        }
      }

      setSuccess(
        'O negócio foi enviado para aprovação. As imagens foram guardadas.'
      );

      setTimeout(() => {
        router.push('/seller');
      }, 1600);
    } catch (err) {
      setError(err.message || 'Ocorreu um erro ao publicar o negócio.');

      // Se a criação do negócio falhou antes de existir um registo,
      // tentamos apagar os ficheiros enviados nesta operação.
      if (!createdBusinessId && uploadedPaths.length > 0) {
        await supabase.storage.from(MEDIA_BUCKET).remove(uploadedPaths);
      }
    } finally {
      setSaving(false);
    }
  }

  if (loading) {
    return <main className="loading">A preparar o formulário…</main>;
  }

  return (
    <>
      <Head>
        <title>Publicar negócio | Talaza</title>
      </Head>

      <main className="page">
        <button className="back" onClick={() => router.back()}>
          ← Voltar
        </button>

        <section className="content">
          <div className="eyebrow">ÁREA DO VENDEDOR</div>
          <h1>Apresente o seu negócio</h1>
          <p className="intro">
            Preencha os dados e adicione o logótipo e as imagens da sua loja.
            Depois da aprovação, o negócio poderá aparecer na subcategoria
            correspondente.
          </p>

          {error && <div className="message error">{error}</div>}
          {success && <div className="message success">{success}</div>}

          <form onSubmit={handleSubmit}>
            <label>
              Nome do negócio *
              <input
                value={name}
                onChange={(event) => setName(event.target.value)}
                maxLength={120}
                required
                placeholder="Ex.: Loja Talaza"
              />
            </label>

            <label>
              Descrição
              <textarea
                value={description}
                onChange={(event) => setDescription(event.target.value)}
                rows={4}
                maxLength={2000}
                placeholder="Descreva o seu negócio e o que oferece."
              />
            </label>

            <div className="two">
              <label>
                Categoria *
                <select
                  value={categoryId}
                  onChange={(event) => setCategoryId(event.target.value)}
                  required
                >
                  <option value="">Escolher categoria</option>
                  {categories.map((category) => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Subcategoria *
                <select
                  value={subcategoryId}
                  onChange={(event) => setSubcategoryId(event.target.value)}
                  required
                  disabled={!categoryId}
                >
                  <option value="">Escolher subcategoria</option>
                  {subcategories.map((subcategory) => (
                    <option key={subcategory.id} value={subcategory.id}>
                      {subcategory.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="two">
              <label>
                País *
                <select
                  value={countryId}
                  onChange={(event) => setCountryId(event.target.value)}
                  required
                >
                  <option value="">Escolher país</option>
                  {countries.map((country) => (
                    <option key={country.id} value={country.id}>
                      {country.name}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                Província *
                <select
                  value={provinceId}
                  onChange={(event) => setProvinceId(event.target.value)}
                  required
                  disabled={!countryId}
                >
                  <option value="">Escolher província</option>
                  {provinces.map((province) => (
                    <option key={province.id} value={province.id}>
                      {province.name}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="two">
              <label>
                Município
                <input
                  value={municipality}
                  onChange={(event) => setMunicipality(event.target.value)}
                  maxLength={100}
                  placeholder="Município"
                />
              </label>

              <label>
                Bairro
                <input
                  value={neighborhood}
                  onChange={(event) => setNeighborhood(event.target.value)}
                  maxLength={100}
                  placeholder="Bairro"
                />
              </label>
            </div>

            <label>
              WhatsApp
              <input
                value={whatsapp}
                onChange={(event) => setWhatsapp(event.target.value)}
                maxLength={30}
                placeholder="Número de contacto"
              />
            </label>

            <div className="upload">
              <label>
                Logótipo do negócio *
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  required
                  onChange={(event) =>
                    setLogoFile(event.target.files?.[0] || null)
                  }
                />
              </label>
              {logoFile && <small>Seleccionado: {logoFile.name}</small>}
            </div>

            <div className="upload">
              <label>
                Imagens da loja
                <input
                  type="file"
                  accept="image/jpeg,image/png,image/webp"
                  multiple
                  onChange={(event) =>
                    setGalleryFiles(Array.from(event.target.files || []))
                  }
                />
              </label>
              <small>
                Cada imagem pode ter até 5 MB. Pode seleccionar várias imagens.
              </small>
              {galleryFiles.length > 0 && (
                <small>{galleryFiles.length} imagem(ns) seleccionada(s).</small>
              )}
            </div>

            <button className="submit" type="submit" disabled={saving}>
              {saving ? 'A publicar…' : 'Enviar para aprovação'}
            </button>
          </form>
        </section>
      </main>

      <style jsx>{`
        .page {
          min-height: 100vh;
          padding: 24px 20px 60px;
          background: ${C.canvas};
          color: ${C.ink};
          font-family: Arial, Helvetica, sans-serif;
        }

        .back {
          border: 0;
          padding: 0;
          background: transparent;
          color: ${C.green};
          font-weight: 700;
          cursor: pointer;
        }

        .content {
          max-width: 760px;
          margin: 40px auto;
          padding: 30px;
          border: 1px solid ${C.line};
          border-radius: 20px;
          background: ${C.white};
        }

        .eyebrow {
          color: ${C.green};
          font-size: 12px;
          font-weight: 800;
          letter-spacing: 1.4px;
        }

        h1 {
          margin: 12px 0;
          color: ${C.dark};
          font-size: clamp(29px, 5vw, 40px);
          letter-spacing: -1px;
        }

        .intro {
          margin: 0 0 25px;
          color: ${C.muted};
          line-height: 1.7;
        }

        form {
          display: grid;
          gap: 17px;
        }

        label {
          display: grid;
          gap: 8px;
          color: ${C.dark};
          font-size: 14px;
          font-weight: 700;
        }

        input,
        select,
        textarea {
          box-sizing: border-box;
          width: 100%;
          min-height: 47px;
          padding: 12px;
          border: 1px solid ${C.line};
          border-radius: 10px;
          background: white;
          color: ${C.ink};
          font: inherit;
          font-weight: 400;
        }

        textarea {
          resize: vertical;
          line-height: 1.5;
        }

        input:focus,
        select:focus,
        textarea:focus {
          outline: 2px solid #B8D9D1;
          border-color: ${C.green};
        }

        .two {
          display: grid;
          grid-template-columns: repeat(2, minmax(0, 1fr));
          gap: 14px;
        }

        .upload {
          padding: 16px;
          border: 1px dashed #C7D6D1;
          border-radius: 12px;
          background: #FBFDFC;
        }

        .upload small {
          display: block;
          margin-top: 9px;
          color: ${C.muted};
          font-size: 12px;
          line-height: 1.5;
        }

        .submit {
          min-height: 50px;
          border: 0;
          border-radius: 11px;
          background: ${C.green};
          color: white;
          font-weight: 800;
          cursor: pointer;
        }

        .submit:disabled {
          opacity: 0.65;
          cursor: wait;
        }

        .message {
          margin-bottom: 18px;
          padding: 13px 15px;
          border-radius: 10px;
          line-height: 1.5;
          font-size: 14px;
        }

        .error {
          background: #FFF1F2;
          color: #9C2936;
          border: 1px solid #E8B9BE;
        }

        .success {
          background: #E8F3F0;
          color: ${C.dark};
          border: 1px solid #B8D9D1;
        }

        .loading {
          min-height: 100vh;
          display: grid;
          place-items: center;
          background: ${C.canvas};
          color: ${C.dark};
          font-family: Arial, Helvetica, sans-serif;
        }

        @media (max-width: 620px) {
          .content {
            margin: 28px auto;
            padding: 20px;
          }

          .two {
            grid-template-columns: 1fr;
          }
        }
      `}</style>
    </>
  );
}
