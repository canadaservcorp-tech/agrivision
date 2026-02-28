"""
AgriVision Backend Services: WhatsApp Alerts + PDF Reports
===========================================================

1. WhatsApp Alerts via Twilio API (disease detections, sensor alerts, weekly summaries)
2. PDF Report Generator (weekly farm health, detection log, sensor analytics)

© 2026 PCTA S.A.
"""

import asyncio
import logging
import os
from datetime import datetime, timedelta
from io import BytesIO

# ============================================================
# WHATSAPP ALERT SERVICE (Twilio)
# ============================================================

logger = logging.getLogger("services")

TWILIO_SID = os.getenv("TWILIO_ACCOUNT_SID", "")
TWILIO_TOKEN = os.getenv("TWILIO_AUTH_TOKEN", "")
TWILIO_WHATSAPP = os.getenv("TWILIO_WHATSAPP_NUMBER", "whatsapp:+14155238886")


class WhatsAppService:
    """Send alerts via Twilio WhatsApp Business API."""

    def __init__(self):
        self.enabled = bool(TWILIO_SID and TWILIO_TOKEN)
        self.client = None
        if self.enabled:
            try:
                from twilio.rest import Client
                self.client = Client(TWILIO_SID, TWILIO_TOKEN)
            except ImportError:
                logger.warning("twilio not installed. pip install twilio")
                self.enabled = False

    async def send_message(self, to_phone: str, body: str, media_url: str = None) -> bool:
        """Send WhatsApp message. Phone format: +971501234567"""
        if not self.enabled:
            logger.debug(f"WhatsApp disabled. Would send to {to_phone}: {body[:50]}...")
            return False

        try:
            params = {
                "from_": TWILIO_WHATSAPP,
                "to": f"whatsapp:{to_phone}",
                "body": body,
            }
            if media_url:
                params["media_url"] = [media_url]

            # Run in executor since Twilio SDK is synchronous
            loop = asyncio.get_event_loop()
            message = await loop.run_in_executor(
                None, lambda: self.client.messages.create(**params)
            )
            logger.info(f"WhatsApp sent to {to_phone}: {message.sid}")
            return True
        except Exception as e:
            logger.error(f"WhatsApp send failed: {e}")
            return False

    async def send_disease_alert(self, farmer_phone: str, farmer_name: str,
                                  disease: str, severity: str, confidence: float,
                                  camera_serial: str, treatment: str,
                                  image_url: str = None):
        """Send formatted disease detection alert."""
        emoji = {"critical": "🔴", "high": "🟠", "medium": "🟡", "low": "🟢"}.get(severity.lower(), "⚪")

        body = (
            f"🚨 *AgriVision Disease Alert*\n\n"
            f"Hi {farmer_name},\n\n"
            f"{emoji} *{disease}* detected\n"
            f"📷 Camera: {camera_serial}\n"
            f"📊 Confidence: {confidence:.0%}\n"
            f"⚡ Severity: {severity.upper()}\n\n"
            f"💊 *Treatment:*\n{treatment}\n\n"
            f"👉 View details: https://theagrivision.com/dashboard/detections"
        )
        return await self.send_message(farmer_phone, body, image_url)

    async def send_sensor_alert(self, farmer_phone: str, alert_type: str,
                                 value: float, threshold: float, unit: str):
        """Send sensor threshold alert."""
        body = (
            f"⚠️ *AgriVision Sensor Alert*\n\n"
            f"*{alert_type}*: {value}{unit}\n"
            f"Threshold: {threshold}{unit}\n\n"
            f"Check your dashboard for details."
        )
        return await self.send_message(farmer_phone, body)

    async def send_weekly_summary(self, farmer_phone: str, farmer_name: str,
                                   detections: int, images: int,
                                   avg_temp: float, avg_soil: float,
                                   camera_uptime: float):
        """Send weekly farm summary."""
        body = (
            f"📊 *Weekly Farm Report*\n\n"
            f"Hi {farmer_name}, here's your week:\n\n"
            f"🔬 Detections: {detections}\n"
            f"📸 Images: {images:,}\n"
            f"🌡️ Avg Temp: {avg_temp:.1f}°C\n"
            f"💧 Avg Soil: {avg_soil:.0f}%\n"
            f"📷 Uptime: {camera_uptime:.0f}%\n\n"
            f"📄 Full report: https://theagrivision.com/dashboard/reports"
        )
        return await self.send_message(farmer_phone, body)


# ============================================================
# PDF REPORT GENERATOR
# ============================================================

class PdfReportService:
    """Generate weekly farm health PDF reports using ReportLab."""

    def __init__(self):
        try:
            from reportlab.lib.pagesizes import A4
            from reportlab.lib.units import mm
            self.available = True
        except ImportError:
            logger.warning("reportlab not installed. pip install reportlab")
            self.available = False

    def generate_weekly_report(self, farm_data: dict) -> BytesIO:
        """
        Generate a PDF weekly report.
        
        farm_data = {
            "farm_name": "Al-Rashidi Farm",
            "farmer_name": "Ahmed",
            "period": "Feb 17-23, 2026",
            "detections": [...],
            "sensor_summary": {...},
            "camera_status": [...],
            "images_captured": 1234,
            "uptime_percent": 98.5,
        }
        """
        from reportlab.lib.pagesizes import A4
        from reportlab.lib.units import mm
        from reportlab.lib.colors import HexColor
        from reportlab.platypus import SimpleDocTemplate, Paragraph, Spacer, Table, TableStyle, Image
        from reportlab.lib.styles import getSampleStyleSheet, ParagraphStyle
        from reportlab.lib.enums import TA_CENTER, TA_LEFT

        buffer = BytesIO()
        doc = SimpleDocTemplate(buffer, pagesize=A4,
                                leftMargin=20*mm, rightMargin=20*mm,
                                topMargin=20*mm, bottomMargin=20*mm)

        # Colors
        primary = HexColor("#1e3a2f")
        accent = HexColor("#16a34a")
        muted = HexColor("#6b7280")
        bg_light = HexColor("#f0fdf4")

        # Styles
        styles = getSampleStyleSheet()
        title_style = ParagraphStyle("Title", parent=styles["Title"],
                                      fontSize=24, textColor=primary, spaceAfter=6)
        subtitle_style = ParagraphStyle("Subtitle", parent=styles["Normal"],
                                         fontSize=12, textColor=muted, spaceAfter=20)
        heading_style = ParagraphStyle("Heading", parent=styles["Heading2"],
                                        fontSize=14, textColor=primary, spaceBefore=20, spaceAfter=10)
        body_style = ParagraphStyle("Body", parent=styles["Normal"],
                                     fontSize=10, textColor=HexColor("#374151"), leading=14)

        elements = []

        # Header
        elements.append(Paragraph("🌱 AgriVision", title_style))
        elements.append(Paragraph(f"Weekly Farm Report — {farm_data.get('period', '')}", subtitle_style))
        elements.append(Paragraph(f"<b>{farm_data.get('farm_name', 'Farm')}</b> • {farm_data.get('farmer_name', 'Farmer')}", body_style))
        elements.append(Spacer(1, 20))

        # Summary stats table
        elements.append(Paragraph("📊 Summary", heading_style))
        stats = [
            ["Metric", "Value"],
            ["📸 Images Captured", f"{farm_data.get('images_captured', 0):,}"],
            ["🔬 Disease Detections", str(len(farm_data.get('detections', [])))],
            ["📷 Camera Uptime", f"{farm_data.get('uptime_percent', 0):.1f}%"],
            ["🌡️ Avg Temperature", f"{farm_data.get('sensor_summary', {}).get('avg_temp', '--')}°C"],
            ["💧 Avg Soil Moisture", f"{farm_data.get('sensor_summary', {}).get('avg_soil', '--')}%"],
            ["☀️ Avg Light", f"{farm_data.get('sensor_summary', {}).get('avg_light', '--')} lux"],
        ]
        
        t = Table(stats, colWidths=[120*mm, 50*mm])
        t.setStyle(TableStyle([
            ("BACKGROUND", (0, 0), (-1, 0), primary),
            ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
            ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
            ("FONTSIZE", (0, 0), (-1, -1), 10),
            ("ALIGN", (1, 0), (1, -1), "RIGHT"),
            ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#e5e7eb")),
            ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#ffffff"), bg_light]),
            ("TOPPADDING", (0, 0), (-1, -1), 8),
            ("BOTTOMPADDING", (0, 0), (-1, -1), 8),
            ("LEFTPADDING", (0, 0), (-1, -1), 10),
        ]))
        elements.append(t)
        elements.append(Spacer(1, 20))

        # Detections list
        detections = farm_data.get("detections", [])
        if detections:
            elements.append(Paragraph("🔬 Disease Detections", heading_style))
            det_data = [["Date", "Disease", "Severity", "Camera", "Confidence"]]
            for d in detections[:20]:  # Max 20
                det_data.append([
                    d.get("detected_at", "")[:10],
                    d.get("disease_name", ""),
                    d.get("severity", "").upper(),
                    d.get("camera_serial", ""),
                    f"{d.get('confidence', 0):.0%}",
                ])
            
            dt = Table(det_data, colWidths=[28*mm, 45*mm, 22*mm, 30*mm, 25*mm])
            dt.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), primary),
                ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#e5e7eb")),
                ("ROWBACKGROUNDS", (0, 1), (-1, -1), [HexColor("#ffffff"), bg_light]),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]))
            elements.append(dt)
            elements.append(Spacer(1, 20))

        # Camera status
        cameras = farm_data.get("camera_status", [])
        if cameras:
            elements.append(Paragraph("📷 Camera Fleet Status", heading_style))
            cam_data = [["Serial", "Status", "Battery", "Signal", "Images"]]
            for c in cameras:
                status = "✅ Online" if c.get("online") else "❌ Offline"
                cam_data.append([
                    c.get("serial", ""),
                    status,
                    f"{c.get('battery', 0)}%",
                    c.get("signal_quality", "?"),
                    str(c.get("images_today", 0)),
                ])
            
            ct = Table(cam_data, colWidths=[30*mm, 25*mm, 22*mm, 22*mm, 22*mm])
            ct.setStyle(TableStyle([
                ("BACKGROUND", (0, 0), (-1, 0), primary),
                ("TEXTCOLOR", (0, 0), (-1, 0), HexColor("#ffffff")),
                ("FONTNAME", (0, 0), (-1, 0), "Helvetica-Bold"),
                ("FONTSIZE", (0, 0), (-1, -1), 9),
                ("GRID", (0, 0), (-1, -1), 0.5, HexColor("#e5e7eb")),
                ("TOPPADDING", (0, 0), (-1, -1), 6),
                ("BOTTOMPADDING", (0, 0), (-1, -1), 6),
            ]))
            elements.append(ct)

        # Footer
        elements.append(Spacer(1, 30))
        footer_style = ParagraphStyle("Footer", parent=body_style, fontSize=8, textColor=muted, alignment=TA_CENTER)
        elements.append(Paragraph("AgriVision — AI-Powered Agricultural Monitoring", footer_style))
        elements.append(Paragraph("© 2026 Performance Cristal Technologies Avancées S.A. | info@theagrivision.com", footer_style))

        doc.build(elements)
        buffer.seek(0)
        return buffer
