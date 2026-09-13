import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { supabase } from '../lib/supabaseClient';

const CATEGORY_OPTIONS = {
  loja: ['Roupas','Calçados','Ateliês','Farmácias','Supermercados','Cosméticos','Móveis','Material Escolar','Material de Construção','Automóveis','Peças','Informática','Eletrónica','Armazéns','Joalharias','Outras'],
  empresa: ['Construção','Tecnologia','Saúde','Educação','Agricultura','Consultoria','Energia','Telecomunicações','Financeiras','Indústria','Outras'],
  servico: ['Fotógrafos','Videomakers','Designers','Programadores','Eletricistas','Canalizadores','Mecânicos','Advogados','Arquitetos','Contabilistas','Professores','Costureiras','Pintores','Jardineiros','Limpeza','Outros'],
  transporte: ['Táxis','Mototáxis','Transporte Interprovincial','Transporte Escolar','Entrega ao Domicílio','Estafetas','Mudanças','Aluguer de Viaturas','Empresas de Transporte','Logística'],
};

export default function PostBusiness() {
  const router = useRouter();
  const [userId, setUserId] = useState(null);
  const [provinces, setProvinces] = useState([]);
  const [form, setForm] = useState({
    type: 'loja', name: '', category: '', description: '',
    province_id: '', municipality: '', neighborhood: '', phone: '', whatsapp: '',
  });
  const [error, setError] = useState('');

  useEffect(() => {
    supabase.auth.getUser().then(({ data }) => {
      if (!data.user) { router.push('/login'); return; }
      setUserId(data.user.id);
    });
    supabase.from('provinces').select('*').then(({ data }) => setProvinces(data || []));
  }, []);

  function update(field, value) {
    if (field === 'type') setForm(f => ({ ...f, type: value, category: '' }));
    else setForm(f => ({ ...f, [field]: value }));
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');
    const { data: basePlan } = await supabase.from('plans').select('id').eq('name', 'Base').single();
    const { error: insertError } = await supabase.from('businesses').insert({
      owner_id: userId,
      plan_id: basePlan?.id,
      ...form,
    });
    if (insertError) setError(insertError.message);
    else router.push('/');
  }

  return (
    <div className="container" style={{ maxWidth: 520 }}>
      <h1 style={{ fontSize: 22, marginTop: 30 }}>Criar o perfil do seu negócio</h1>
      <p style={{ color: 'var(--ink-soft)', fontSize: 13 }}>Perfil público gratuito no Plano Base. Pode atualizar para o Plano Profissional depois.</p>

      <form onSubmit={handleSubmit} style={{ marginTop: 16 }}>
        <label style={{ fontSize: 12, fontWeight: 600 }}>Tipo de perfil</label>
        <select className="input" value={form.type} onChange={e => update('type', e.target.value)}>
          <option value="loja">🏪 Loja</option>
          <option value="empresa">🏢 Empresa</option>
          <option value="servico">🛠️ Serviço</option>
          <option value="transporte">🚖 Transporte</option>
        </select>

        <input className="input" placeholder="Nome do negócio" value={form.name} onChange={e => update('name', e.target.value)} required />

        <label style={{ fontSize: 12, fontWeight: 600 }}>Categoria</label>
        <select className="input" value={form.category} onChange={e => update('category', e.target.value)} required>
          <option value="">Selecione a categoria</option>
          {CATEGORY_OPTIONS[form.type].map(c => <option key={c} value={c}>{c}</option>)}
        </select>

        <textarea className="input" placeholder="Descrição breve" value={form.description} onChange={e => update('description', e.target.value)} rows={3} />

        <select className="input" value={form.province_id} onChange={e => update('province_id', e.target.value)} required>
          <option value="">Selecione a província</option>
          {provinces.map(p => <option key={p.id} value={p.id}>{p.name}</option>)}
        </select>
        <input className="input" placeholder="Município (opcional)" value={form.municipality} onChange={e => update('municipality', e.target.value)} />
        <input className="input" placeholder="Bairro (opcional)" value={form.neighborhood} onChange={e => update('neighborhood', e.target.value)} />
        <input className="input" placeholder="WhatsApp" value={form.whatsapp} onChange={e => update('whatsapp', e.target.value)} />
        <input className="input" placeholder="Telefone" value={form.phone} onChange={e => update('phone', e.target.value)} />

        {error && <p style={{ color: '#D92D20', fontSize: 13 }}>{error}</p>}
        <button className="btn btn-brand" style={{ width: '100%', justifyContent: 'center' }}>Criar perfil no Plano Base</button>
      </form>
    </div>
  );
}
