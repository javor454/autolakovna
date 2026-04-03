/**
 * Routing check: GET /api/health → {"ok":true}
 * Use the object + `fetch` export shape from Vercel’s Node fetch handlers (not a bare default function).
 */
export const config = {
  maxDuration: 10,
};

export default function health(req, res) {
  if (req.method !== 'GET') {
    res.status(405).setHeader('Allow', 'GET').send('Method Not Allowed');
    return;
  }
  res.json({ ok: true });
}
