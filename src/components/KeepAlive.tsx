"use client";

import { useEffect } from "react";

const KEEP_ALIVE_INTERVAL = 5 * 60 * 1000;

async function pingHealthCheck() {
  try {
    const response = await fetch("/api/health");
    if (!response.ok) {
      console.warn("Health check failed:", response.status);
    }
  } catch (error) {
    console.warn("Health check error:", error);
  }
}

export default function KeepAlive() {
  useEffect(() => {
    pingHealthCheck();
    const interval = setInterval(pingHealthCheck, KEEP_ALIVE_INTERVAL);
    return () => clearInterval(interval);
  }, []);

  return null;
}
