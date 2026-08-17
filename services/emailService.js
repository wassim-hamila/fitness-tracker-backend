const nodemailer = require('nodemailer');

let transporter = null;
let transporterVerified = false;
let lastTransportError = null;

const getEmailUser = () => (process.env.EMAIL_USER || '').trim();
const getEmailPass = () => (process.env.EMAIL_PASS || '').replace(/\s+/g, '');

const buildResetUrl = (resetToken) => {
  const frontendUrl = (process.env.FRONTEND_URL || 'http://localhost:3000').replace(/\/$/, '');
  return `${frontendUrl}/reset-password/${resetToken}`;
};

const createGmailTransport = (port) => {
  const user = getEmailUser();
  const pass = getEmailPass();
  if (!user || !pass) return null;

  const use465 = port === 465;
  return nodemailer.createTransport({
    host: process.env.EMAIL_HOST || 'smtp.gmail.com',
    port,
    secure: use465,
    requireTLS: !use465,
    auth: { user, pass },
  });
};

const getTransporter = async () => {
  if (transporter && transporterVerified) return transporter;

  const user = getEmailUser();
  const pass = getEmailPass();
  if (!user || !pass) {
    lastTransportError = 'EMAIL_USER ou EMAIL_PASS manquant dans .env';
    return null;
  }

  // Essayer 465 puis 587
  const ports = [Number(process.env.EMAIL_PORT || 465), 587];
  const tried = new Set();

  for (const port of ports) {
    if (tried.has(port)) continue;
    tried.add(port);
    const candidate = createGmailTransport(port);
    if (!candidate) continue;
    try {
      await candidate.verify();
      transporter = candidate;
      transporterVerified = true;
      lastTransportError = null;
      console.log(`[email] SMTP Gmail OK (port ${port})`);
      return transporter;
    } catch (err) {
      lastTransportError = err.message;
      console.warn(`[email] Échec SMTP port ${port}:`, err.message);
    }
  }

  transporter = null;
  transporterVerified = false;
  return null;
};

/**
 * Envoi via Resend (optionnel) — https://resend.com
 * RESEND_API_KEY=re_xxxx dans .env
 */
const sendViaResend = async ({ to, subject, html, text, resetUrl }) => {
  const apiKey = (process.env.RESEND_API_KEY || '').trim();
  if (!apiKey) return null;

  const from =
    process.env.EMAIL_FROM ||
    process.env.RESEND_FROM ||
    'Fitness Tracker <onboarding@resend.dev>';

  const res = await fetch('https://api.resend.com/emails', {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ from, to: [to], subject, html, text }),
  });

  const data = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(data?.message || `Resend HTTP ${res.status}`);
  }

  console.log('[email] Envoyé via Resend id=', data.id);
  return { sent: true, resetUrl, provider: 'resend', messageId: data.id };
};

const buildEmailContent = (resetUrl) => {
  const subject = 'Réinitialisation de votre mot de passe — Fitness Tracker';
  const text = [
    'Réinitialiser votre mot de passe',
    '',
    'Vous avez demandé à réinitialiser votre mot de passe Fitness Tracker.',
    `Ouvrez ce lien (valide 1 heure) : ${resetUrl}`,
    '',
    "Si vous n'avez pas fait cette demande, ignorez cet email.",
  ].join('\n');

  const html = `
    <div style="font-family: Arial, sans-serif; max-width: 520px; margin: 0 auto; padding: 24px; background: #050505; border-radius: 16px;">
      <h2 style="color: #c5ff00; margin: 0 0 12px;">Réinitialiser votre mot de passe</h2>
      <p style="color: #c8c8c8; line-height: 1.6; margin: 0 0 8px;">
        Vous avez demandé à réinitialiser votre mot de passe Fitness Tracker.
        Cliquez sur le bouton ci-dessous pour en choisir un nouveau.
      </p>
      <a href="${resetUrl}" style="display: inline-block; margin: 24px 0; padding: 14px 28px; background: #c5ff00; color: #0a0a0f; text-decoration: none; font-weight: bold; border-radius: 10px;">
        Réinitialiser mon mot de passe
      </a>
      <p style="color: #888; font-size: 13px; line-height: 1.5;">
        Ce lien expire dans 1 heure. Si vous n'avez pas fait cette demande, ignorez cet email.
      </p>
      <p style="color: #666; font-size: 12px; word-break: break-all;">${resetUrl}</p>
    </div>
  `;

  return { subject, text, html };
};

exports.verifyEmailConfig = async () => {
  if ((process.env.RESEND_API_KEY || '').trim()) {
    console.log('[email] Resend API key détectée — emails de reset prêts');
    return true;
  }

  const mailer = await getTransporter();
  if (!mailer) {
    console.warn(
      '[email] SMTP non prêt.',
      lastTransportError || '',
      '\n→ Gmail refuse le mot de passe normal. Crée un "Mot de passe d\'application" :',
      '\n  https://myaccount.google.com/apppasswords',
      '\n→ Colle les 16 caractères dans EMAIL_PASS du fichier .env puis redémarre le backend.',
      '\n→ Ou ajoute RESEND_API_KEY (gratuit) depuis https://resend.com',
      '\n→ En attendant, le lien de reset s\'affichera dans l\'app pour ne pas bloquer le flux.'
    );
    return false;
  }

  console.log('[email] SMTP prêt — emails de reset activés');
  return true;
};

exports.sendPasswordResetEmail = async (email, resetToken) => {
  const resetUrl = buildResetUrl(resetToken);
  const { subject, text, html } = buildEmailContent(resetUrl);

  // 1) Resend si configuré
  try {
    const resendResult = await sendViaResend({ to: email, subject, html, text, resetUrl });
    if (resendResult?.sent) return resendResult;
  } catch (err) {
    console.error('[email] Resend échoué:', err.message);
    lastTransportError = err.message;
  }

  // 2) Gmail SMTP
  const mailer = await getTransporter();
  if (!mailer) {
    console.warn('[email] Pas de transport — lien de reset:', resetUrl);
    return {
      sent: false,
      resetUrl,
      reason: 'missing_or_invalid_config',
      error: lastTransportError || 'Config email manquante',
    };
  }

  const fromAddress =
    process.env.EMAIL_FROM || `"Fitness Tracker" <${getEmailUser()}>`;

  try {
    const info = await mailer.sendMail({
      from: fromAddress,
      to: email,
      subject,
      text,
      html,
    });
    console.log('[email] Reset envoyé à', email, 'id=', info.messageId);
    return { sent: true, resetUrl, provider: 'gmail', messageId: info.messageId };
  } catch (err) {
    console.error('[email] Envoi Gmail échoué:', err.message);
    transporter = null;
    transporterVerified = false;
    lastTransportError = err.message;
    return {
      sent: false,
      resetUrl,
      reason: 'send_failed',
      error: err.message,
    };
  }
};

exports.getLastTransportError = () => lastTransportError;
exports.isEmailReady = () => transporterVerified || !!(process.env.RESEND_API_KEY || '').trim();
