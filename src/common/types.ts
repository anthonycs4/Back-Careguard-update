// Reemplaza TODO el archivo por esto
type MinimalResponse = {
  ok: boolean;
  status: number;
  text: () => Promise<string>;
};

export async function parseOrThrow(res: MinimalResponse) {
  const text = await res.text();
  try {
    const json = text ? JSON.parse(text) : null;
    if (!res.ok)
      throw new Error(
        (json && (json.message || json.error)) || text || `HTTP ${res.status}`,
      );
    return json;
  } catch (e) {
    if (!res.ok) throw new Error(text || `HTTP ${res.status}`);
    throw e;
  }
}
