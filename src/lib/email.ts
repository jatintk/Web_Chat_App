import { Resend } from 'resend';
import type { Booking } from './bookings';
import { getUserContact, getUserProfile } from './users';

declare global {
  // eslint-disable-next-line no-var
  var _resendClient: Resend | undefined;
}

// Constructed lazily (not at module load) because Resend's constructor
// throws synchronously on a missing API key -- doing this eagerly would take
// down every route that imports this module (e.g. POST /api/bookings) any
// time RESEND_API_KEY isn't set yet, not just the email feature itself.
function getResendClient(): Resend | null {
  if (!process.env.RESEND_API_KEY) return null;
  if (!global._resendClient) {
    global._resendClient = new Resend(process.env.RESEND_API_KEY);
  }
  return global._resendClient;
}

function notProvided(value: string | null | undefined): string {
  return value && value.trim() ? value : 'Not provided';
}

export async function sendBookingNotificationEmail(params: {
  expertEmail: string;
  clientName: string | null;
  dateOfBirth: string | null;
  timeOfBirth: string | null;
  placeOfBirth: string | null;
  note: string | null;
  sessionStartsAt: string;
}): Promise<void> {
  const resendClient = getResendClient();
  if (!resendClient) {
    console.error('Booking notification email skipped: RESEND_API_KEY is not set.');
    return;
  }

  const attachmentText = [
    `Client: ${notProvided(params.clientName)}`,
    `Date of birth: ${notProvided(params.dateOfBirth)}`,
    `Time of birth: ${notProvided(params.timeOfBirth)}`,
    `Place of birth: ${notProvided(params.placeOfBirth)}`,
    '',
    'Note from client:',
    notProvided(params.note),
  ].join('\n');

  await resendClient.emails.send({
    from: 'AstroChat <onboarding@resend.dev>',
    to: params.expertEmail,
    subject: `New booking -- session on ${new Date(params.sessionStartsAt).toLocaleString()}`,
    text: 'You have a new client session booked. See the attached details.',
    attachments: [{ filename: 'client-details.txt', content: attachmentText }],
  });
}

// Best-effort trigger, called from POST /api/bookings after createBooking
// succeeds -- failures are swallowed by the caller (console.error only),
// mirroring how sendMessage treats a Pusher trigger() failure.
export async function notifyExpertOfBooking(clientUserId: string, booking: Booking): Promise<void> {
  if (!booking.expert_id) return;

  const [expert, clientProfile] = await Promise.all([
    getUserContact(booking.expert_id),
    getUserProfile(clientUserId),
  ]);
  if (!expert) return;

  await sendBookingNotificationEmail({
    expertEmail: expert.email,
    clientName: clientProfile?.name ?? null,
    dateOfBirth: clientProfile?.dateOfBirth ?? null,
    timeOfBirth: clientProfile?.timeOfBirth ?? null,
    placeOfBirth: clientProfile?.placeOfBirth ?? null,
    note: booking.note,
    sessionStartsAt: booking.starts_at,
  });
}
