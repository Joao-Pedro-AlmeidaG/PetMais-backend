/** Remove tudo que não é dígito. Aceita "529.982.247-25" ou "52998224725". */
export function limparCpf(valor) {
  return String(valor ?? '').replace(/\D/g, '');
}
export function cpfValido(valor) {
  const cpf = limparCpf(valor);
  if (cpf.length !== 11) return false;
  if (/^(\d)\1{10}$/.test(cpf)) return false;

  const digitos = cpf.split('').map(Number);

  const digitoVerificador = (base) => {
    let soma = 0;
    let peso = base.length + 1;
    for (let i = 0; i < base.length; i += 1) {
      soma += base[i] * peso;
      peso -= 1;
    }
    const resto = soma % 11;
    return resto < 2 ? 0 : 11 - resto;
  };

  const base9 = digitos.slice(0, 9);
  const dv1 = digitoVerificador(base9);
  const dv2 = digitoVerificador([...base9, dv1]);

  return dv1 === digitos[9] && dv2 === digitos[10];
}
export function mascararCpf(valor) {
  const d = limparCpf(valor);
  if (d.length !== 11) return null;
  return `***.${d.slice(3, 6)}.${d.slice(6, 9)}-**`;
}
