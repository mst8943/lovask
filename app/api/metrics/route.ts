import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET(req: Request) {
  const secret = process.env.HEALTH_SECRET;
  if (secret) {
    const auth = req.headers.get('authorization') || '';
    const token = auth && auth.startsWith('Bearer ') ? auth.slice('Bearer '.length) : '';
    if (token !== secret) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }
  }
  const mem = process.memoryUsage();
  return NextResponse.json({
    ok: true,
    uptime: process.uptime(),
    memory: {
      rss: mem.rss,
      heapTotal: mem.heapTotal,
      heapUsed: mem.heapUsed,
      external: mem.external,
    },
    timestamp: new Date().toISOString(),
  });
}
