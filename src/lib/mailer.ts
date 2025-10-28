import * as nodemailer from 'nodemailer';

export interface WelcomeEmailParams {
  to: string;
  name: string;
  email: string;
  password: string;
}

function getTransport() {
  if (!process.env.SMTP_HOST || !process.env.SMTP_USER || !process.env.SMTP_PASS) {
    // Fallback to JSON transport for dev if SMTP not configured
    return nodemailer.createTransport({ jsonTransport: true });
  }

  return nodemailer.createTransport({
    host: process.env.SMTP_HOST,
    port: Number(process.env.SMTP_PORT || 587),
    secure: Boolean(process.env.SMTP_SECURE === '1' || process.env.SMTP_SECURE === 'true'),
    auth: {
      user: process.env.SMTP_USER,
      pass: process.env.SMTP_PASS,
    },
  });
}

export async function sendWelcomeEmail(params: WelcomeEmailParams) {
  const { to, name, email, password } = params;
  const transporter = getTransport();

  const html = `
    <div style="font-family:Arial,sans-serif;line-height:1.4;color:#111">
      <h2>¡Bienvenido(a) al sistema TodoFru!</h2>
      <p>Hola <strong>${name}</strong>, tu cuenta de administrador ha sido creada correctamente.</p>
      <p>
        Puedes ingresar al sistema con las siguientes credenciales:<br/>
        <strong>Usuario:</strong> ${email}<br/>
        <strong>Contraseña temporal:</strong> ${password}
      </p>
      <p>Por seguridad, te recomendamos cambiar tu contraseña en el primer inicio de sesión.</p>
      <hr/>
      <small>Este es un mensaje automático, por favor no responder.</small>
    </div>
  `;

  const info = await transporter.sendMail({
    from: process.env.SMTP_FROM || 'no-reply@todofru.local',
    to,
    subject: 'Bienvenido(a) - Cuenta de Administrador creada',
    html,
  });

  return info;
}
