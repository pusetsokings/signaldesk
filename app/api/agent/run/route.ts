import { NextResponse } from "next/server";
import { mockAgentRun } from "@/lib/mock-agent-run";

export async function POST() {
  return NextResponse.json(mockAgentRun);
}

export async function GET() {
  return NextResponse.json(mockAgentRun);
}

