"""
AgriVision Email Templates
HTML email templates for transactional emails.
Used by the backend email service (aiosmtplib + Jinja2).
"""

# ============================================================
# BASE TEMPLATE
# ============================================================

BASE_TEMPLATE = """
<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8">
  <meta name="viewport" content="width=device-width, initial-scale=1">
  <style>
    body {{ margin: 0; padding: 0; font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', sans-serif; background: #f5f7f3; }}
    .container {{ max-width: 560px; margin: 0 auto; background: #fff; border-radius: 12px; overflow: hidden; margin-top: 20px; margin-bottom: 20px; box-shadow: 0 2px 10px rgba(0,0,0,0.06); }}
    .header {{ background: #1e3a2f; padding: 24px; text-align: center; }}
    .header h1 {{ color: #fff; margin: 0; font-size: 20px; }}
    .header .logo {{ font-size: 28px; margin-bottom: 4px; }}
    .body {{ padding: 32px 28px; color: #374151; font-size: 14px; line-height: 1.7; }}
    .body h2 {{ color: #1e3a2f; font-size: 18px; margin-top: 0; }}
    .btn {{ display: inline-block; background: #16a34a; color: #fff; padding: 12px 28px; border-radius: 8px; text-decoration: none; font-weight: 700; font-size: 14px; margin: 16px 0; }}
    .info-box {{ background: #f0fdf4; border: 1px solid #bbf7d0; border-radius: 8px; padding: 16px; margin: 16px 0; }}
    .info-box .label {{ font-size: 11px; color: #6b7280; text-transform: uppercase; letter-spacing: 0.5px; }}
    .info-box .value {{ font-size: 18px; font-weight: 800; color: #1e3a2f; }}
    .divider {{ height: 1px; background: #e5e7eb; margin: 20px 0; }}
    .footer {{ padding: 20px 28px; background: #f9fafb; text-align: center; font-size: 11px; color: #9ca3af; }}
    .footer a {{ color: #16a34a; text-decoration: none; }}
    .table {{ width: 100%; border-collapse: collapse; margin: 12px 0; }}
    .table td {{ padding: 8px 0; border-bottom: 1px solid #f3f4f6; font-size: 13px; }}
    .table .right {{ text-align: right; font-weight: 600; }}
    .severity-critical {{ color: #dc2626; font-weight: 800; }}
    .severity-high {{ color: #f59e0b; font-weight: 700; }}
  </style>
</head>
<body>
  <div class="container">
    <div class="header">
      <div class="logo">🌱</div>
      <h1>AgriVision</h1>
    </div>
    <div class="body">
      {content}
    </div>
    <div class="footer">
      <p>AgriVision — AI-Powered Agricultural Monitoring</p>
      <p>© 2026 Performance Cristal Technologies Avancées S.A.</p>
      <p><a href="https://theagrivision.com">theagrivision.com</a> | <a href="mailto:info@theagrivision.com">info@theagrivision.com</a></p>
    </div>
  </div>
</body>
</html>
"""


# ============================================================
# WELCOME EMAIL
# ============================================================

WELCOME_EMAIL = BASE_TEMPLATE.format(content="""
<h2>Welcome to AgriVision, {name}! 👋</h2>
<p>Thank you for joining {farmer_count}+ farmers using AI to protect their crops.</p>
<p>Here's how to get started:</p>

<div class="info-box">
  <div class="label">Your Next Step</div>
  <div class="value">Configure Your System</div>
  <p style="margin: 8px 0 0; font-size: 12px; color: #6b7280;">
    Use our smart configurator to calculate exactly what cameras and equipment your farm needs.
  </p>
</div>

<a href="https://theagrivision.com/configurator" class="btn">Configure Your System →</a>

<div class="divider"></div>

<p><strong>Quick Links:</strong></p>
<p>📊 <a href="https://theagrivision.com/dashboard" style="color: #16a34a;">Dashboard</a> — Monitor your farm</p>
<p>📖 <a href="https://theagrivision.com/docs" style="color: #16a34a;">Documentation</a> — Setup guides</p>
<p>💬 <a href="https://wa.me/14388313611" style="color: #16a34a;">WhatsApp Support</a> — We're here to help</p>
""")


# ============================================================
# ORDER CONFIRMATION
# ============================================================

ORDER_CONFIRMATION = BASE_TEMPLATE.format(content="""
<h2>Order Confirmed! ✅</h2>
<p>Hi {name}, your AgriVision system order has been confirmed.</p>

<div class="info-box">
  <div class="label">Order Reference</div>
  <div class="value" style="font-family: monospace;">{reference}</div>
</div>

<table class="table">
  <tr><td>Central Hub × {hubs}</td><td class="right">${hub_total}</td></tr>
  <tr><td>Camera Nodes × {cameras}</td><td class="right">${camera_total}</td></tr>
  {repeater_row}
  <tr><td>Shipping</td><td class="right">${shipping}</td></tr>
  <tr><td>Tax</td><td class="right">${tax}</td></tr>
  <tr><td><strong>Total</strong></td><td class="right"><strong style="color: #16a34a; font-size: 16px;">${total}</strong></td></tr>
</table>

<div class="divider"></div>

<p><strong>📦 Shipping To:</strong></p>
<p style="color: #6b7280;">{shipping_name}<br>{shipping_address}<br>{shipping_city}, {shipping_country}</p>

<p>We'll send you tracking information once your order ships. Estimated delivery: 5-10 business days.</p>

<a href="https://theagrivision.com/orders/{order_id}" class="btn">Track Your Order →</a>
""")


# ============================================================
# DISEASE ALERT
# ============================================================

DISEASE_ALERT = BASE_TEMPLATE.format(content="""
<h2>🚨 Disease Detected on Your Farm</h2>

<div class="info-box" style="background: {severity_bg}; border-color: {severity_border};">
  <div class="label">Disease Detected</div>
  <div class="value" style="color: {severity_color};">{disease_name}</div>
  <p style="margin: 4px 0 0; font-size: 12px;">
    Confidence: <strong>{confidence}%</strong> | Severity: <span class="{severity_class}">{severity}</span> | Camera: {camera_serial}
  </p>
</div>

<p><strong>Crop Affected:</strong> {crop_name}</p>
<p><strong>Location:</strong> {farm_name}</p>
<p><strong>Detected:</strong> {detected_at}</p>

<div class="divider"></div>

<h3 style="color: #1e3a2f;">💊 Recommended Treatment</h3>
<div class="info-box">
  <p style="margin: 0; font-size: 13px;">{treatment}</p>
</div>

<a href="https://theagrivision.com/dashboard/detections/{detection_id}" class="btn">View Full Details →</a>

<p style="font-size: 12px; color: #6b7280;">
  You can adjust alert settings in your <a href="https://theagrivision.com/dashboard/settings" style="color: #16a34a;">dashboard settings</a>.
</p>
""")


# ============================================================
# WEEKLY REPORT SUMMARY
# ============================================================

WEEKLY_REPORT = BASE_TEMPLATE.format(content="""
<h2>📊 Weekly Farm Report</h2>
<p>Hi {name}, here's your farm summary for {period}.</p>

<table class="table">
  <tr><td>📷 Camera Uptime</td><td class="right">{uptime}%</td></tr>
  <tr><td>🔬 Detections</td><td class="right">{detections}</td></tr>
  <tr><td>🌡️ Avg Temperature</td><td class="right">{avg_temp}°C</td></tr>
  <tr><td>💧 Avg Soil Moisture</td><td class="right">{avg_soil}%</td></tr>
  <tr><td>📸 Images Captured</td><td class="right">{total_images}</td></tr>
</table>

{alert_section}

<a href="https://theagrivision.com/dashboard/reports" class="btn">View Full Report →</a>
""")


# ============================================================
# PASSWORD RESET
# ============================================================

PASSWORD_RESET = BASE_TEMPLATE.format(content="""
<h2>Reset Your Password</h2>
<p>We received a request to reset your AgriVision password.</p>
<p>Click the button below to create a new password. This link expires in 1 hour.</p>

<a href="{reset_url}" class="btn">Reset Password →</a>

<p style="font-size: 12px; color: #9ca3af;">
  If you didn't request this, please ignore this email. Your password won't be changed.
</p>
""")


# ============================================================
# SHIPPING UPDATE
# ============================================================

SHIPPING_UPDATE = BASE_TEMPLATE.format(content="""
<h2>📦 Your Order Has Shipped!</h2>
<p>Great news, {name}! Your AgriVision system is on its way.</p>

<div class="info-box">
  <div class="label">Tracking Number</div>
  <div class="value" style="font-family: monospace;">{tracking_number}</div>
</div>

<table class="table">
  <tr><td>Order</td><td class="right">{reference}</td></tr>
  <tr><td>Shipped</td><td class="right">{shipped_date}</td></tr>
  <tr><td>Estimated Delivery</td><td class="right">{estimated_delivery}</td></tr>
  <tr><td>Carrier</td><td class="right">{carrier}</td></tr>
</table>

<a href="{tracking_url}" class="btn">Track Package →</a>

<div class="divider"></div>

<p><strong>📖 While you wait:</strong></p>
<p>Review the <a href="https://theagrivision.com/docs/installation" style="color: #16a34a;">installation guide</a> so you're ready to set up when your system arrives. It takes about 30 minutes!</p>
""")
