from fastapi import APIRouter, HTTPException
from pydantic import BaseModel, EmailStr
import os
import httpx

from app.core.config import settings

router = APIRouter(prefix="/api", tags=["contact"])


class ContactRequest(BaseModel):
    email: EmailStr
    name: str
    message: str = ""


@router.post("/send")
async def send_contact_email(req: ContactRequest):
    """Send contact form email via Resend."""
    resend_api_key = settings.RESEND_API_KEY
    if not resend_api_key:
        raise HTTPException(
            status_code=503, detail="Email service not configured"
        )

    to_email = settings.RESEND_TO_EMAIL
    if not to_email:
        raise HTTPException(
            status_code=503, detail="Email recipient not configured"
        )

    try:
        async with httpx.AsyncClient() as client:
            response = await client.post(
                "https://api.resend.com/emails",
                headers={"Authorization": f"Bearer {resend_api_key}"},
                json={
                    "from": "onboarding@resend.dev",
                    "to": [to_email],
                    "subject": f"Nuevo contacto de {req.name}",
                    "html": f"""
                    <h2>Nuevo mensaje desde AnimaFlow</h2>
                    <p><strong>Nombre:</strong> {req.name}</p>
                    <p><strong>Email:</strong> {req.email}</p>
                    <p><strong>Mensaje:</strong> {req.message}</p>
                    """,
                },
                timeout=10,
            )
            response.raise_for_status()
        return {"message": "Email sent successfully"}
    except httpx.HTTPError as e:
        raise HTTPException(
            status_code=500, detail=f"Failed to send email: {str(e)}"
        )
