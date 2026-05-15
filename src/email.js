const https = require('https');
const nodemailer = require('nodemailer');

function criarTransporter() {
  const { SMTP_HOST, SMTP_PORT, SMTP_USER, SMTP_PASS } = process.env;
  if (!SMTP_HOST || !SMTP_USER || !SMTP_PASS) return null;
  const port = Number(SMTP_PORT) || 587;
  return nodemailer.createTransport({
    host: SMTP_HOST,
    port,
    secure: port === 465,
    requireTLS: port !== 465,
    family: 4,
    connectionTimeout: 10000,
    greetingTimeout: 10000,
    socketTimeout: 15000,
    auth: { user: SMTP_USER, pass: SMTP_PASS },
    tls: { rejectUnauthorized: false },
  });
}

function htmlEmail(nome, linkReset) {
  return `<!DOCTYPE html>
<html lang="pt-BR">
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;background:#F7F3ED;font-family:Inter,system-ui,sans-serif">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#F7F3ED;padding:40px 20px">
    <tr><td align="center">
      <table width="520" cellpadding="0" cellspacing="0" style="background:#fff;border:1px solid #E5DDD0;border-top:4px solid #D4AF37">
        <tr>
          <td style="padding:32px 40px 0;text-align:center">
            <p style="margin:0 0 4px;font-size:11px;font-weight:700;letter-spacing:.1em;text-transform:uppercase;color:#7A726A">Gran Marquise</p>
            <p style="margin:0;font-size:10px;letter-spacing:.08em;text-transform:uppercase;color:#B8B0A8">Suporte de TI</p>
          </td>
        </tr>
        <tr>
          <td style="padding:24px 40px 8px">
            <h1 style="margin:0 0 8px;font-size:22px;font-weight:600;color:#1C1C1C">Redefinição de senha</h1>
            <p style="margin:0;font-size:14px;color:#4A4540;line-height:1.6">
              Olá, <strong>${nome}</strong>.<br>
              Recebemos uma solicitação para redefinir a senha da sua conta no Portal de TI.
              Clique no botão abaixo para criar uma nova senha.
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:28px 40px">
            <table border="0" cellpadding="0" cellspacing="0">
              <tr>
                <td bgcolor="#D4AF37" style="padding:14px 32px">
                  <a href="${linkReset}" target="_blank"
                     style="display:inline-block;color:#0D1B2A;text-decoration:none;font-size:14px;font-weight:700;letter-spacing:.04em;font-family:Inter,Arial,sans-serif">
                    Redefinir senha
                  </a>
                </td>
              </tr>
            </table>
          </td>
        </tr>
        <tr>
          <td style="padding:0 40px 28px">
            <p style="margin:0;font-size:12px;color:#7A726A;line-height:1.6">
              Este link expira em <strong>1 hora</strong>.<br>
              Se você não solicitou a redefinição, ignore este e-mail — sua senha permanece a mesma.
            </p>
            <p style="margin:12px 0 0;font-size:11px;color:#B8B0A8;line-height:1.6;word-break:break-all">
              Se o botão não abrir, copie e cole este link no navegador:<br>
              <a href="${linkReset}" style="color:#7A726A">${linkReset}</a>
            </p>
          </td>
        </tr>
        <tr>
          <td style="padding:20px 40px;border-top:1px solid #E5DDD0;text-align:center">
            <p style="margin:0;font-size:11px;color:#B8B0A8">Hotel Gran Marquise · Fortaleza, CE</p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;
}

async function enviarViaBrevo(destinatario, nome, linkReset) {
  const apiKey = process.env.BREVO_API_KEY;
  const from = process.env.SMTP_FROM || process.env.SMTP_USER || 'tigranmarquise@gmail.com';

  const payload = JSON.stringify({
    sender: { email: from, name: 'Gran Marquise TI' },
    to: [{ email: destinatario, name: nome }],
    subject: 'Redefinição de senha — Portal TI Gran Marquise',
    htmlContent: htmlEmail(nome, linkReset),
  });

  return new Promise((resolve, reject) => {
    const req = https.request({
      hostname: 'api.brevo.com',
      path: '/v3/smtp/email',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'api-key': apiKey,
        'Content-Length': Buffer.byteLength(payload),
      },
    }, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        if (res.statusCode >= 200 && res.statusCode < 300) {
          console.log(`[Reset Senha] ✓ E-mail enviado via Brevo para ${destinatario}`);
          resolve();
        } else {
          reject(new Error(`Brevo API ${res.statusCode}: ${body}`));
        }
      });
    });
    req.on('error', reject);
    req.write(payload);
    req.end();
  });
}

async function enviarResetSenha(destinatario, nome, linkReset) {
  if (process.env.BREVO_API_KEY) {
    console.log(`[Reset Senha] Enviando via Brevo para ${destinatario}...`);
    return enviarViaBrevo(destinatario, nome, linkReset);
  }

  const transporter = criarTransporter();
  if (!transporter) {
    console.warn('[Reset Senha] ⚠ Nenhum provedor configurado (BREVO_API_KEY ou SMTP_HOST/USER/PASS).');
    console.log(`[Reset Senha] Link (apenas console): ${linkReset}`);
    return;
  }

  console.log(`[Reset Senha] Enviando via SMTP para ${destinatario} via ${process.env.SMTP_HOST}...`);
  const from = process.env.SMTP_FROM || process.env.SMTP_USER;
  const timeout = new Promise((_, reject) =>
    setTimeout(() => reject(new Error('SMTP timeout após 20s')), 20000)
  );
  await Promise.race([transporter.sendMail({
    from: `"Gran Marquise TI" <${from}>`,
    to: destinatario,
    subject: 'Redefinição de senha — Portal TI Gran Marquise',
    html: htmlEmail(nome, linkReset),
  }), timeout]);
}

module.exports = { enviarResetSenha };
