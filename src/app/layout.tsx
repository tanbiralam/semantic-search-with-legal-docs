import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import KeepAlive from "@/components/KeepAlive";

const inter = Inter({ subsets: ["latin"] });

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
  return (
    <html lang="en">
      <body className={inter.className}>
        <KeepAlive />
        {children}
      </body>
    </html>
  );
}
