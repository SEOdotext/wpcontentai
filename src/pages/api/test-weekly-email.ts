import { NextApiRequest, NextApiResponse } from 'next';
import { sendTestEmail } from '@/api/sendgrid';

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    await sendTestEmail();
    res.status(200).json({ success: true, message: 'Test email sent' });
  } catch (error) {
    console.error('Error sending test email:', error);
    res.status(500).json({ error: 'Failed to send test email' });
  }
} 