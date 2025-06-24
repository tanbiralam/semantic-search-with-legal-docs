// Keep-alive interval in milliseconds (5 minutes)
const KEEP_ALIVE_INTERVAL = 5 * 60 * 1000;

// Get the app URL from environment variable or default to localhost in development
const APP_URL = process.env.NEXT_PUBLIC_APP_URL || "http://localhost:3000";

let keepAliveInterval: NodeJS.Timeout | null = null;

async function pingHealthCheck() {
  try {
    const response = await fetch(`${APP_URL}/api/health`);
    if (!response.ok) {
      console.warn(`Health check failed: ${response.status}`);
    } else {
      console.log("Health check successful");
    }
  } catch (error) {
    console.warn("Health check error:", error);
  }
}

export function startKeepAlive() {
  if (keepAliveInterval) {
    console.log("Keep-alive service is already running");
    return;
  }

  console.log("Starting keep-alive service...");

  // Initial health check
  pingHealthCheck();

  // Set up interval for subsequent health checks
  keepAliveInterval = setInterval(pingHealthCheck, KEEP_ALIVE_INTERVAL);
}

export function stopKeepAlive() {
  if (keepAliveInterval) {
    clearInterval(keepAliveInterval);
    keepAliveInterval = null;
    console.log("Keep-alive service stopped");
  }
}
