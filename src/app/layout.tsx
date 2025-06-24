import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { useEffect } from "react";

const inter = Inter({ subsets: ["latin"] });

// Keep-alive interval in milliseconds (5 minutes)
const KEEP_ALIVE_INTERVAL = 5 * 60 * 1000;

// Function to ping the health endpoint
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

export const metadata: Metadata = {
  title: "Legal semantic search",
  description:
    "A sample app demonstrating how to use Pinecone and Langchain to build a knowledge base of landmark legal cases and run semantic search over them",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  useEffect(() => {
    // Initial health check
    pingHealthCheck();

    // Set up interval for subsequent health checks
    const interval = setInterval(pingHealthCheck, KEEP_ALIVE_INTERVAL);

    // Cleanup interval on component unmount
    return () => clearInterval(interval);
  }, []);

  return (
    <html lang="en">
      <body className={inter.className}>{children}</body>
    </html>
  );
}
