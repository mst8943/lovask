"use client"

import { useEffect, useState } from "react";
import { Button } from "@/components/ui/Button";
import { useToast } from "@/components/ui/Toast";

export default function PwaDiagnosticsPage() {
  const [hasSw, setHasSw] = useState(false);
  const [isSecure, setIsSecure] = useState(false);
  const [subscribed, setSubscribed] = useState(false);
  const [vapidReady, setVapidReady] = useState(false);
  const [subCount, setSubCount] = useState(0);
  const toast = useToast();

  useEffect(() => {
    setIsSecure(window.isSecureContext);
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker.getRegistration().then((reg) => {
        setHasSw(!!reg);
        reg?.pushManager.getSubscription().then((sub) => {
          setSubscribed(!!sub);
        });
      });
    }
    fetch("/api/push/status")
      .then((r) => r.json())
      .then((data) => {
        setVapidReady(!!data?.hasVapid);
        setSubCount(Number(data?.subscriptions || 0));
      })
      .catch(() => null);
  }, []);

  const sendTest = async () => {
    try {
      const res = await fetch("/api/push/send", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type: "test" }),
      });
      if (!res.ok) throw new Error(await res.text());
      toast.push("Test bildirimi gonderildi.", "success");
    } catch (err: unknown) {
      toast.push(err instanceof Error ? err.message : "Test bildirimi basarisiz.", "error");
    }
  };

  const refreshStatus = async () => {
    try {
      const data = await fetch("/api/push/status").then((r) => r.json());
      setVapidReady(!!data?.hasVapid);
      setSubCount(Number(data?.subscriptions || 0));
    } catch {
      // ignore
    }
  };

  return (
    <div className="space-y-4 pb-8">
      <div className="glass-panel p-4 rounded-2xl space-y-2">
        <div className="text-sm font-semibold">PWA Durumu</div>
        <div className="text-xs text-gray-400">Hizli tanilama ve test</div>
      </div>

      <div className="glass-panel p-4 rounded-2xl space-y-2 text-sm">
        <div>Secure Context: {isSecure ? "Evet" : "Hayir"}</div>
        <div>Service Worker: {hasSw ? "Var" : "Yok"}</div>
        <div>Push Subscription: {subscribed ? "Aktif" : "Yok"}</div>
        <div>VAPID Anahtari: {vapidReady ? "Hazir" : "Eksik"}</div>
        <div>Sub sayisi: {subCount}</div>
      </div>

      <Button onClick={sendTest} variant="secondary" className="w-full">
        Test bildirimi gonder
      </Button>
      <Button onClick={refreshStatus} variant="secondary" className="w-full">
        Durumu yenile
      </Button>
    </div>
  );
}
