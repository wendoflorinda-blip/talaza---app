import { useState } from "react";

const paises = [
  { nome: "Angola", codigo: "AO", ddi: "+244", bandeira: "🇦🇴" },
  { nome: "Brasil", codigo: "BR", ddi: "+55", bandeira: "🇧🇷" },
  { nome: "Portugal", codigo: "PT", ddi: "+351", bandeira: "🇵🇹" },
];

export default function Signup() {
  const [etapa, setEtapa] = useState(1);
  const [pais, setPais] = useState(paises[0]);
  const [telefone, setTelefone] = useState("");
  const [email, setEmail] = useState("");
  const [nome, setNome] = useState("");
  const [codigo, setCodigo] = useState("");
  const [tipoPerfil, setTipoPerfil] = useState("cliente");

  const enviarCodigo = () => {
    if (!telefone ||!email ||!nome) {
      alert("Preencha tudo");
      return;
    }
    alert(`Código enviado para ${pais.ddi}${telefone}. Código de teste é 123456`);
    setEtapa(2);
  };

  const confirmarCodigo = () => {
    if (codigo!== "123456") {
      alert("Código errado");
      return;
    }
    const novaConta = {
      nome,
      email,
      telefone: pais.ddi + telefone,
      telefoneVerificado: true,
      pais: pais.nome,
      paisCodigo: pais.codigo,
      ddi: pais.ddi,
      tipo: tipoPerfil,
    };
    console.log("Conta criada:", novaConta);
    alert(`Conta criada! País travado: ${pais.nome}`);
  };

  return (
    <div style={{ maxWidth: "400px", margin: "auto", padding: "20px" }}>
      {etapa === 1? (
        <>
          <h2>Criar conta na Talaza</h2>
          <input placeholder="Nome completo" value={nome} onChange={e => setNome(e.target.value)} style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
          <div style={{ display: "flex", gap: "5px", marginBottom: "10px" }}>
            <select value={pais.ddi} onChange={e => setPais(paises.find(p => p.ddi === e.target.value))} style={{ padding: "10px" }}>
              {paises.map(p => <option key={p.codigo} value={p.ddi}>{p.bandeira} {p.ddi}</option>)}
            </select>
            <input placeholder="Número de telemóvel" value={telefone} onChange={e => setTelefone(e.target.value)} style={{ flex: 1, padding: "10px" }} />
          </div>
          <input placeholder="Email" value={email} onChange={e => setEmail(e.target.value)} style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
          <div style={{ marginBottom: "10px" }}>
            <label><input type="radio" checked={tipoPerfil === "cliente"} onChange={() => setTipoPerfil("cliente")} /> Sou Cliente</label>
            <label style={{ marginLeft: "15px" }}><input type="radio" checked={tipoPerfil === "vendedor"} onChange={() => setTipoPerfil("vendedor")} /> Sou Vendedor</label>
          </div>
          <button onClick={enviarCodigo} style={{ width: "100%", padding: "12px", background: "black", color: "white" }}>Seguinte</button>
        </>
      ) : (
        <>
          <h2>Insira o código</h2>
          <p>Enviamos um SMS para {pais.ddi} {telefone} (app Mensagens)</p>
          <input placeholder="Código 123456" value={codigo} onChange={e => setCodigo(e.target.value)} style={{ width: "100%", padding: "10px", marginBottom: "10px" }} />
          <button onClick={confirmarCodigo} style={{ width: "100%", padding: "12px", background: "black", color: "white" }}>Confirmar</button>
          <button onClick={() => setEtapa(1)} style={{ width: "100%", padding: "10px", marginTop: "10px" }}>Voltar</button>
        </>
      )}
    </div>
  );
}
