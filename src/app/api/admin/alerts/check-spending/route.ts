import { NextResponse } from "next/server";
import { checkAllCustomerSpending } from "@/lib/alerts/spending-check";

export async function GET(request: Request) {
  const authHeader = request.headers.get("authorization");
  const cronSecret = process.env.CRON_SECRET;

  if (!cronSecret || authHeader !== `Bearer ${cronSecret}`) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const result = await checkAllCustomerSpending();
  return NextResponse.json(result);
}
