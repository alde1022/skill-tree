import { NextResponse } from 'next/server';
import { buildSpec } from '@/lib/build';
import { getSupabaseAdmin } from '@/lib/supabase';

const CROCKFORD = '0123456789ABCDEFGHJKMNPQRSTVWXYZ';
function shortId() { let out = ''; for (let i = 0; i < 8; i++) out += CROCKFORD[Math.floor(Math.random() * CROCKFORD.length)]; return out.toLowerCase(); }

export async function POST(req: Request) {
  const body = await req.json();
  const id = shortId();
  const allocated = body.allocated ?? ['birth'];
  const title = buildSpec(allocated).title;
  const supabase = getSupabaseAdmin();
  if (!supabase) return NextResponse.json({ shortId: id, persisted: false });
  const { error } = await supabase.from('builds').insert({ short_id: id, allocated, points_total: body.pointsTotal ?? 25, title, description: body.description ?? null });
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ shortId: id, persisted: true });
}
