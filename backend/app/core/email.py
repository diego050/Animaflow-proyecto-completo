"""Email service for sending transactional emails via Gmail SMTP."""
import smtplib
import ssl
from email.mime.text import MIMEText
from email.mime.multipart import MIMEMultipart
from app.core.config import settings
from app.core.logging import get_logger

logger = get_logger("email")


def send_password_reset_email(to_email: str, reset_token: str) -> bool:
    """
    Send password reset email with a link containing the reset token.
    
    Args:
        to_email: Recipient email address
        reset_token: The JWT token (not hashed) to include in the reset link
    
    Returns:
        True if email was sent successfully, False otherwise
    """
    gmail_email = settings.GMAIL_EMAIL
    gmail_password = settings.GMAIL_APP_PASSWORD
    
    if not gmail_email or not gmail_password:
        logger.warning("GMAIL_EMAIL or GMAIL_APP_PASSWORD not configured. Email not sent.")
        return False
    
    # Build reset link — frontend will handle the token
    reset_link = f"{settings.FRONTEND_URL}/reset-password?token={reset_token}"
    
    # Create message
    msg = MIMEMultipart("alternative")
    msg["Subject"] = "AnimaFlow — Restablecer contraseña"
    msg["From"] = gmail_email
    msg["To"] = to_email
    
    # Plain text version
    text_content = f"""
Hola,

Recibimos una solicitud para restablecer tu contraseña de AnimaFlow.

Haz clic en el siguiente enlace para crear una nueva contraseña:
{reset_link}

Este enlace expira en 1 hora y solo se puede usar una vez.

Si no solicitaste este cambio, puedes ignorar este email.

Saludos,
El equipo de AnimaFlow
"""
    
    # HTML version
    html_content = f"""
<!DOCTYPE html>
<html>
<head>
    <meta charset="utf-8">
    <style>
        body {{ font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; background: #f5f5f5; margin: 0; padding: 20px; }}
        .container {{ max-width: 600px; margin: 0 auto; background: white; border-radius: 8px; overflow: hidden; box-shadow: 0 2px 8px rgba(0,0,0,0.1); }}
        .header {{ background: #2C3E50; color: white; padding: 24px; text-align: center; }}
        .header h1 {{ margin: 0; font-size: 24px; }}
        .content {{ padding: 32px 24px; }}
        .content p {{ color: #333; line-height: 1.6; }}
        .button {{ display: inline-block; background: #FF8C00; color: white; padding: 14px 32px; text-decoration: none; border-radius: 6px; font-weight: 600; margin: 16px 0; }}
        .button:hover {{ background: #e07b00; }}
        .footer {{ background: #f9f9f9; padding: 16px 24px; text-align: center; color: #888; font-size: 12px; }}
        .warning {{ background: #fff3cd; border: 1px solid #ffc107; border-radius: 4px; padding: 12px; margin-top: 16px; font-size: 14px; }}
    </style>
</head>
<body>
    <div class="container">
        <div class="header">
            <h1>AnimaFlow</h1>
        </div>
        <div class="content">
            <p>Hola,</p>
            <p>Recibimos una solicitud para restablecer tu contraseña de AnimaFlow.</p>
            <p style="text-align: center;">
                <a href="{reset_link}" class="button">Restablecer contraseña</a>
            </p>
            <p>O copia y pega este enlace en tu navegador:</p>
            <p style="word-break: break-all; color: #666; font-size: 14px;">{reset_link}</p>
            <div class="warning">
                ⚠️ Este enlace expira en <strong>1 hora</strong> y solo se puede usar <strong>una vez</strong>.
            </div>
            <p style="margin-top: 24px;">Si no solicitaste este cambio, puedes ignorar este email.</p>
            <p>Saludos,<br>El equipo de AnimaFlow</p>
        </div>
        <div class="footer">
            © 2026 AnimaFlow. Todos los derechos reservados.
        </div>
    </div>
</body>
</html>
"""
    
    msg.attach(MIMEText(text_content, "plain", "utf-8"))
    msg.attach(MIMEText(html_content, "html", "utf-8"))
    
    try:
        context = ssl.create_default_context()
        with smtplib.SMTP_SSL("smtp.gmail.com", 465, context=context) as server:
            server.login(gmail_email, gmail_password)
            server.sendmail(gmail_email, to_email, msg.as_string())
        
        logger.info("Password reset email sent to %s", to_email)
        return True
        
    except smtplib.SMTPException as e:
        logger.error("Failed to send password reset email to %s: %s", to_email, e)
        return False
    except Exception as e:
        logger.exception("Unexpected error sending email to %s: %s", to_email, e)
        return False
