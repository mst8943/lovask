import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function GET() {
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
