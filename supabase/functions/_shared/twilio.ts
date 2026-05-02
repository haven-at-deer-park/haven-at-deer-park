/**
 * Shared Twilio utility for sending SMS and WhatsApp notifications.
 * Used by contact-form and haven-concierge edge functions.
 *
 * Authentication: Uses Standard API Key (SID + Secret) via HTTP Basic Auth.
 * Channel routing: Supports preferredChannel to control primary/fallback order.
 */

interface TwilioConfig {
  accountSid: string;
  apiKeySid: string;
  apiKeySecret: string;
}

interface SendMessageParams {
  from: string;
  to: string;
  body: string;
}

interface SendResult {
  success: boolean;
  sid?: string;
  error?: string;
}

/**
 * Send a single message via the Twilio REST API.
 * Works for both SMS and WhatsApp (prefix numbers with `whatsapp:`).
 */
export async function sendTwilioMessage(
  config: TwilioConfig,
  params: SendMessageParams
): Promise<SendResult> {
  const url = `https://api.twilio.com/2010-04-01/Accounts/${config.accountSid}/Messages.json`;

  const auth = btoa(`${config.apiKeySid}:${config.apiKeySecret}`);

  const formBody = new URLSearchParams({
    From: params.from,
    To: params.to,
    Body: params.body,
  });

  try {
    const response = await fetch(url, {
      method: 'POST',
      headers: {
        'Authorization': `Basic ${auth}`,
        'Content-Type': 'application/x-www-form-urlencoded',
      },
      body: formBody.toString(),
    });

    if (!response.ok) {
      const errorBody = await response.text();
      return { success: false, error: `${response.status}: ${errorBody}` };
    }

    const data = await response.json();
    return { success: true, sid: data.sid };
  } catch (err) {
    return { success: false, error: err instanceof Error ? err.message : String(err) };
  }
}

/**
 * Read Twilio credentials from environment variables.
 * Returns null if any required credential is missing.
 */
export function getTwilioConfig(): TwilioConfig | null {
  const accountSid = Deno.env.get('TWILIO_ACCOUNT_SID');
  const apiKeySid = Deno.env.get('TWILIO_API_KEY_SID');
  const apiKeySecret = Deno.env.get('TWILIO_API_KEY_SECRET');

  if (!accountSid || !apiKeySid || !apiKeySecret) {
    return null;
  }

  return { accountSid, apiKeySid, apiKeySecret };
}

/**
 * Send a notification to Lance via Twilio.
 *
 * Channel routing:
 *   - preferredChannel = 'whatsapp' (or omitted): WhatsApp first, SMS fallback
 *   - preferredChannel = 'sms': SMS first, WhatsApp fallback
 *
 * Required Supabase secrets:
 *   TWILIO_ACCOUNT_SID, TWILIO_API_KEY_SID, TWILIO_API_KEY_SECRET,
 *   TWILIO_PHONE_NUMBER, LANCE_PHONE_NUMBER
 * Optional:
 *   TWILIO_WHATSAPP_NUMBER (sandbox or production WhatsApp-enabled number)
 */
export async function notifyLance(
  messageBody: string,
  preferredChannel?: 'whatsapp' | 'sms'
): Promise<{ channel: 'whatsapp' | 'sms' | 'none'; sid?: string; error?: string }> {
  const config = getTwilioConfig();
  if (!config) {
    console.log('Twilio not configured -- skipping notification');
    return { channel: 'none', error: 'Twilio credentials not set' };
  }

  const twilioPhone = Deno.env.get('TWILIO_PHONE_NUMBER');
  const twilioWhatsApp = Deno.env.get('TWILIO_WHATSAPP_NUMBER');
  const lancePhone = Deno.env.get('LANCE_PHONE_NUMBER');
  const lanceWhatsApp = Deno.env.get('LANCE_WHATSAPP_NUMBER') || lancePhone;

  if (!twilioPhone || !lancePhone) {
    console.log('Phone numbers not configured -- skipping notification');
    return { channel: 'none', error: 'Phone numbers not set' };
  }

  const maskedPhone = lancePhone.slice(-4).padStart(lancePhone.length, '*');
  const maskedWhatsApp = lanceWhatsApp ? lanceWhatsApp.slice(-4).padStart(lanceWhatsApp.length, '*') : maskedPhone;
  const channel = preferredChannel || 'whatsapp';

  // Determine primary and fallback based on preferred channel
  if (channel === 'sms') {
    // --- SMS first ---
    console.log(`Attempting SMS notification to ${maskedPhone} (preferred: SMS)...`);
    const smsResult = await sendTwilioMessage(config, {
      from: twilioPhone,
      to: lancePhone,
      body: messageBody,
    });

    if (smsResult.success) {
      console.log(`SMS notification sent successfully (SID: ${smsResult.sid})`);
      return { channel: 'sms', sid: smsResult.sid };
    }

    console.error(`SMS failed: ${smsResult.error}. Falling back to WhatsApp...`);

    // Fallback to WhatsApp
    if (twilioWhatsApp) {
      console.log(`Attempting WhatsApp fallback to ${maskedWhatsApp}...`);
      const wpResult = await sendTwilioMessage(config, {
        from: `whatsapp:${twilioWhatsApp}`,
        to: `whatsapp:${lanceWhatsApp}`,
        body: messageBody,
      });

      if (wpResult.success) {
        console.log(`WhatsApp fallback sent successfully (SID: ${wpResult.sid})`);
        return { channel: 'whatsapp', sid: wpResult.sid };
      }

      console.error(`WhatsApp fallback also failed: ${wpResult.error}`);
      return { channel: 'none', error: wpResult.error };
    }

    return { channel: 'none', error: smsResult.error };
  }

  // --- WhatsApp first (default) ---
  if (twilioWhatsApp) {
    console.log(`Attempting WhatsApp notification to ${maskedWhatsApp} (preferred: WhatsApp)...`);
    const wpResult = await sendTwilioMessage(config, {
      from: `whatsapp:${twilioWhatsApp}`,
      to: `whatsapp:${lanceWhatsApp}`,
      body: messageBody,
    });

    if (wpResult.success) {
      console.log(`WhatsApp notification sent successfully (SID: ${wpResult.sid})`);
      return { channel: 'whatsapp', sid: wpResult.sid };
    }

    console.error(`WhatsApp failed: ${wpResult.error}. Falling back to SMS...`);
  } else {
    console.log('TWILIO_WHATSAPP_NUMBER not set -- skipping WhatsApp, trying SMS...');
  }

  // Fallback to SMS
  console.log(`Sending SMS notification to ${maskedPhone}...`);
  const smsResult = await sendTwilioMessage(config, {
    from: twilioPhone,
    to: lancePhone,
    body: messageBody,
  });

  if (smsResult.success) {
    console.log(`SMS notification sent successfully (SID: ${smsResult.sid})`);
    return { channel: 'sms', sid: smsResult.sid };
  }

  console.error(`SMS also failed: ${smsResult.error}`);
  return { channel: 'none', error: smsResult.error };
}
