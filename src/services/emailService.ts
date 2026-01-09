import emailjs from '@emailjs/browser';

// Configuración de EmailJS
// IMPORTANTE: Debes crear una cuenta en https://www.emailjs.com/ y obtener tus credenciales
const EMAILJS_SERVICE_ID = 'service_mopc'; // Reemplazar con tu Service ID
const EMAILJS_TEMPLATE_ID = 'template_nuevo_usuario'; // Reemplazar con tu Template ID
const EMAILJS_PUBLIC_KEY = 'YOUR_PUBLIC_KEY'; // Reemplazar con tu Public Key

/**
 * Enviar email de bienvenida a nuevo usuario
 */
export async function sendWelcomeEmail(userData: {
  name: string;
  username: string;
  email: string;
  password: string;
  role: string;
}) {
  try {
    // Parámetros del template
    const templateParams = {
      to_email: userData.email,
      to_name: userData.name,
      username: userData.username,
      password: userData.password,
      role: userData.role,
      platform_url: 'https://core-mopc.vercel.app',
      from_name: 'MOPC - Sistema de Gestión',
      subject: '¡Bienvenido a MOPC - Tu cuenta ha sido creada!'
    };

    console.log('📧 Enviando email a:', userData.email);

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      EMAILJS_TEMPLATE_ID,
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    console.log('✅ Email enviado exitosamente:', response.status, response.text);
    return { success: true, message: 'Email enviado correctamente' };
  } catch (error: any) {
    console.error('❌ Error enviando email:', error);
    return { success: false, error: error.message || 'Error al enviar email' };
  }
}

/**
 * Enviar email de verificación completada
 */
export async function sendVerificationEmail(userData: {
  name: string;
  email: string;
}) {
  try {
    const templateParams = {
      to_email: userData.email,
      to_name: userData.name,
      platform_url: 'https://core-mopc.vercel.app',
      from_name: 'MOPC - Sistema de Gestión',
      subject: '¡Tu cuenta ha sido verificada!'
    };

    const response = await emailjs.send(
      EMAILJS_SERVICE_ID,
      'template_verificacion', // Crear este template
      templateParams,
      EMAILJS_PUBLIC_KEY
    );

    console.log('✅ Email de verificación enviado:', response.status);
    return { success: true };
  } catch (error: any) {
    console.error('❌ Error enviando email de verificación:', error);
    return { success: false, error: error.message };
  }
}
