import { useEffect, useMemo, useState } from 'react';

const MONTHS = ['Janeiro','Fevereiro','Março','Abril','Maio','Junho','Julho','Agosto','Setembro','Outubro','Novembro','Dezembro'];
const baseStyle = { width:'100%', boxSizing:'border-box', padding:'13px 10px', border:'1px solid #DDE3EC', borderRadius:12, background:'#FFFFFF', color:'#182238', fontSize:14, minWidth:0 };

export default function DateOfBirthFields({ value, onChange, inputStyle = baseStyle }) {
  const initial = (value || '').match(/^(\\d{4})-(\\d{2})-(\\d{2})$/);
  const [year,setYear] = useState(initial ? initial[1] : '');
  const [month,setMonth] = useState(initial ? String(Number(initial[2])) : '');
  const [day,setDay] = useState(initial ? String(Number(initial[3])) : '');
  const currentYear = new Date().getFullYear();
  const years = useMemo(() => Array.from({length:currentYear-1900+1},(_,i)=>String(currentYear-i)),[currentYear]);
  const maxDay = year && month ? new Date(Number(year),Number(month),0).getDate() : 31;
  useEffect(() => {
    if (!year || !month || !day) return;
    const safeDay = Math.min(Number(day),maxDay);
    if (safeDay !== Number(day)) setDay(String(safeDay));
    onChange(`${year}-${String(Number(month)).padStart(2,'0')}-${String(safeDay).padStart(2,'0')}`);
  },[year,month,day,maxDay,onChange]);
  const selectStyle = inputStyle || baseStyle;
  return <div style={{display:'grid',gridTemplateColumns:'0.8fr 1.35fr 1fr',gap:8}}>
    <select aria-label="Dia de nascimento" value={day} onChange={e=>setDay(e.target.value)} style={selectStyle}><option value="">Dia</option>{Array.from({length:maxDay},(_,i)=>i+1).map(n=><option key={n} value={String(n)}>{n}</option>)}</select>
    <select aria-label="Mês de nascimento" value={month} onChange={e=>setMonth(e.target.value)} style={selectStyle}><option value="">Mês</option>{MONTHS.map((m,i)=><option key={i+1} value={String(i+1)}>{m}</option>)}</select>
    <select aria-label="Ano de nascimento" value={year} onChange={e=>setYear(e.target.value)} style={selectStyle}><option value="">Ano</option>{years.map(y=><option key={y} value={y}>{y}</option>)}</select>
  </div>;
}
