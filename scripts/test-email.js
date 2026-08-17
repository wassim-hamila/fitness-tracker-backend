require('dotenv').config();
const nodemailer = require('nodemailer');

const user = (process.env.EMAIL_USER || '').trim();
const pass = (process.env.EMAIL_PASS || '').replace(/\s+/g, '');
const host = process.env.EMAIL_HOST || 'smtp.gmail.com';
const port = Number(process.env.EMAIL_PORT || 465);

console.log('USER =', user);
console.log('PASS_LEN =', pass.length);
console.log('HOST =', host, 'PORT =', port);

async function main() {
  const transporter = nodemailer.createTransport({
    host,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    auth: { user, pass },
  });

  await transporter.verify();
  console.log('SMTP verify OK');

  const info = await transporter.sendMail({
    from: `"Fitness Tracker" <${user}>`,
    to: user,
    subject: 'Test Fitness Tracker — email OK',
    html: '<p>Ça marche ! Les emails de reset peuvent être envoyés.</p>',
  });

  console.log('SEND_OK', info.messageId);
}

main().catch((err) => {
  console.error('FAIL', err.message);
  process.exit(1);
});
