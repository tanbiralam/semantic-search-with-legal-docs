import { handleBootstrapping } from "@/app/services/bootstrap";
import { NextRequest, NextResponse } from "next/server";

export async function POST(req: NextRequest) {
  const { targetIndex } = await req.json();

  //handle the bootstrapping logic here
  await handleBootstrapping(targetIndex);

  //return a response
  return NextResponse.json({ success: true }, { status: 200 });
}
