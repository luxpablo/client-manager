import { NextResponse } from 'next/server';
import { readDb } from '@/lib/db';

export async function GET() {
  const db = readDb();
  const plans = db.pricingPlans.filter(p => p.status === 'Active');
  return NextResponse.json(plans);
}
