import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { fetchAdminEmails } from '@/lib/supabase/admin';
import { sendEmail } from '@/lib/email/send';
import { getRole, hasFullAccess } from '@/lib/auth/roles';

const LIMITS = { full_name: 200, institution: 200, reason: 2000 } as const;

// File a request for Full access as the signed-in user, then email every admin.
// The insert runs under the user's own session, so RLS (not this route) is what
// stops a user filing for someone else or pre-approving themselves.
export async function POST(request: NextRequest) {
  const supabase = createServerSupabaseClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user?.email) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }
  if (hasFullAccess(getRole(user))) {
    return NextResponse.json({ error: 'You already have full access.' }, { status: 400 });
  }

  const body = await request.json().catch(() => null);
  const fields = {} as Record<keyof typeof LIMITS, string>;
  for (const [key, max] of Object.entries(LIMITS) as [keyof typeof LIMITS, number][]) {
    const value = typeof body?.[key] === 'string' ? body[key].trim() : '';
    if (!value || value.length > max) {
      return NextResponse.json(
        { error: `${key.replace('_', ' ')} is required (max ${max} characters).` },
        { status: 400 }
      );
    }
    fields[key] = value;
  }

  const { data: inserted, error } = await supabase
    .from('access_requests')
    .insert({ user_id: user.id, email: user.email, ...fields })
    .select()
    .single();

  if (error) {
    if (error.code === '23505') {
      return NextResponse.json({ error: 'You already have a pending request.' }, { status: 409 });
    }
    console.error('access_requests insert failed:', error.message);
    return NextResponse.json({ error: 'Could not submit your request.' }, { status: 500 });
  }

  try {
    const adminEmails = await fetchAdminEmails();
    await sendEmail(
      adminEmails,
      `UMSP dashboard: full access request from ${fields.full_name}`,
      [
        `${fields.full_name} <${user.email}> has requested full access to the UMSP dashboard.`,
        '',
        `Institution: ${fields.institution}`,
        '',
        'Reason:',
        fields.reason,
        '',
        `Review it at ${request.nextUrl.origin}/admin/access-requests`,
      ].join('\n')
    );
  } catch (notifyError) {
    console.error('Admin notification failed:', notifyError);
  }

  return NextResponse.json(inserted, { status: 201 });
}
