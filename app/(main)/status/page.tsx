"use client"

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";

export default function StatusPage() {
  const [health, setHealth] = useState<{ ok: boolean; uptime: number; timestamp: string } | null>(null);
  const [metrics, setMetrics] = useState<{ memory: { rss: number; heapTotal: number; heapUsed: number } } | null>(null);

  const load = async () => {
    const h = await fetch("/api/health").then((r) => r.json());
    const m = await fetch("/api/metrics").then((r) => r.json());
    setHealth(h);
    setMetrics(m);
  };

  useEffect(() => {
    const id = setTimeout(() => {
      void load();
    }, 0);
    const interval = setInterval(() => {
      void load();
    }, 30000);
    return () => {
      clearTimeout(id);
      clearInterval(interval);
    };
  }, []);

  return (
    <div className="space-y-4 pb-8">
      <div className="glass-panel p-4 rounded-2xl">
        <div className="text-sm font-semibold">Sistem Durumu</div>
        <div className="text-xs text-gray-400">Temel saglik ve metrikler</div>
      </div>

      <div className="glass-panel p-4 rounded-2xl text-sm space-y-2">
        <div>Health: {health?.ok ? "OK" : "—"}</div>
        <div>Uptime: {health ? Math.round(health.uptime) + "s" : "—"}</div>
        <div>Zaman: {health?.timestamp || "—"}</div>
      </div>

      <div className="glass-panel p-4 rounded-2xl text-sm space-y-2">
        <div>RSS: {metrics ? Math.round(metrics.memory.rss / 1024 / 1024) + " MB" : "—"}</div>
        <div>Heap Total: {metrics ? Math.round(metrics.memory.heapTotal / 1024 / 1024) + " MB" : "—"}</div>
        <div>Heap Used: {metrics ? Math.round(metrics.memory.heapUsed / 1024 / 1024) + " MB" : "—"}</div>
      </div>

      <Button onClick={load} variant="secondary" className="w-full">
        Yenile
      </Button>
    </div>
  );
}
