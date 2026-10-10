/**
 * Extrai o nome do banco do caminho da URL do MongoDB.
 *   mongodb+srv://u:p@cluster.mongodb.net/petmais?x=y  -> "petmais"
 *   mongodb+srv://u:p@cluster.mongodb.net/?appName=App  -> null  (sem banco: o driver usaria "test")
 * Não usa `new URL()` porque URLs com vários hosts (h1:27017,h2:27017) não são URLs válidas para ele.
 */
export function nomeDoBancoNaUrl(url) {
  const encontrado = /^mongodb(?:\+srv)?:\/\/[^/?#]+\/([^?#]*)/.exec(String(url));
  if (!encontrado || !encontrado[1]) return null;
  try {
    return decodeURIComponent(encontrado[1]);
  } catch {
    return encontrado[1];
  }
}
