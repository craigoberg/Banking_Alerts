export async function unpackTransactions<T>(body: {
  transactions: T[];
  transactionsGzip?: string | null;
}): Promise<T[]> {
  if (!body.transactionsGzip) return body.transactions;
  const binary = Uint8Array.from(atob(body.transactionsGzip), (char) => char.charCodeAt(0));
  const stream = new Blob([binary]).stream().pipeThrough(new DecompressionStream("gzip"));
  const text = await new Response(stream).text();
  const rows = JSON.parse(text) as T[];
  if (!Array.isArray(rows)) throw new Error("Could not read transactions.");
  return rows;
}
