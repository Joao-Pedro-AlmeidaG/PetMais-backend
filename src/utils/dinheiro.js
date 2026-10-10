export const paraCentavos = (reais) => Math.round(reais * 100);
export const deCentavos = (centavos) => centavos / 100;

export function somar(valores) {
  return deCentavos(valores.reduce((acc, valor) => acc + paraCentavos(valor), 0));
}
export function temNoMaximoDuasCasas(valor) {
  return Number.isFinite(valor) && Math.abs(valor * 100 - Math.round(valor * 100)) < 1e-6;
}
