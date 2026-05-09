import { Resend } from 'resend'

const resend = new Resend(process.env.RESEND_API_KEY)

export async function sendVerificationEmail(email: string, code: string) {
  const from = process.env.EMAIL_FROM ?? 'noreply@mobilematch.dz'

  await resend.emails.send({
    from,
    to: email,
    subject: 'Your Mobile Match Algeria verification code',
    html: `
      <div style="font-family:Arial,sans-serif;max-width:480px;margin:0 auto;padding:32px;background:#f8fafc;border-radius:12px">
        <div style="text-align:center;margin-bottom:24px">
          <h1 style="font-size:24px;color:#0f172a;margin:0">Mobile<strong>Match</strong> Algeria</h1>
          <p style="color:#475569;margin-top:8px">Email Verification</p>
        </div>
        <div style="background:#ffffff;border-radius:8px;padding:32px;border:1px solid #e2e8f0">
          <p style="color:#0f172a;font-size:16px;margin:0 0 16px">Your one-time verification code is:</p>
          <div style="text-align:center;margin:24px 0">
            <span style="font-size:42px;font-weight:700;letter-spacing:12px;color:#2563eb;font-family:monospace">${code}</span>
          </div>
          <p style="color:#475569;font-size:14px;margin:0">This code expires in <strong>3 minutes</strong>. Do not share it with anyone.</p>
        </div>
        <p style="color:#94a3b8;font-size:12px;text-align:center;margin-top:24px">If you did not create an account, you can safely ignore this email.</p>
      </div>
    `,
  })
}
