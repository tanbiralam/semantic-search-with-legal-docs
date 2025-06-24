import { NextResponse } from "next/server";
import { startKeepAlive } from "../../services/keepAlive";

// Initialize the keep-alive service in production
if (process.env.NODE_ENV === "production") {
  startKeepAlive();
}

export async function GET() {
  return NextResponse.json({ status: "initialized" }, { status: 200 });
}
