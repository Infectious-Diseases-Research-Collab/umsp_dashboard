import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { sendEmail } from '@/lib/email/send';

// Approve or deny a pending request. Admin-only (middleware guards /api/admin,
// and review_access_request() re-checks is_admin() in its own body).
export async function POST(request: NextRequest, { params }: { params: { id: string } }) {
  const id = Number(params.id);
  const body = await request.json().catch(() => null);
  if (!Number.isInteger(id) || typeof body?.approve !== 'boolean') {
    return NextResponse.json({ error: 'Invalid request' }, { status: 400 });
  }
  const note = typeof body.note === 'string' ? body.note.trim().slice(0, 2000) : '';

  const supabase = createServerSupabaseClient();
  const { data, error } = await supabase
    .rpc('review_access_request', { p_id: id, p_approve: body.approve, p_note: note || null })
    .single<{ email: string; full_name: string; status: string }>();

  if (error) {
    const status = error.code === '42501' ? 403 : error.code === 'P0002' ? 409 : 500;
    return NextResponse.json({ error: error.message }, { status });
  }

  const approved = data.status === 'approved';
  const notified = await sendEmail(
    data.email,
    `UMSP dashboard: your full access request was ${approved ? 'approved' : 'declined'}`,
    [
      `Hello ${data.full_name},`,
      '',
      approved
        ? 'Your request for full access to the UMSP dashboard has been approved. You can now view the data tables, download CSV files and generate PDF reports.'
        : 'Your request for full access to the UMSP dashboard was not approved. You still have standard access to the charts and maps.',
      ...(note ? ['', `Note from the administrator: ${note}`] : []),
      '',
      `${request.nextUrl.origin}/dashboard`,
    ].join('\n')
  );

  return NextResponse.json({ ...data, notified });
}
