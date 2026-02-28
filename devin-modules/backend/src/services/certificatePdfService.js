const PDFDocument = require('pdfkit');
const QRCode = require('qrcode');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');

class CertificatePdfService {

  /**
   * Generate certificate PDF and save to storage
   * Returns URL/path to the generated PDF
   */
  async generateCertificatePdf(cert) {
    const buffer = await this.generateCertificatePdfBuffer(cert);
    const filename = `certificate-${cert.certificate_number}.pdf`;
    const outputDir = process.env.CERT_STORAGE_PATH || path.join(__dirname, '../../storage/certificates');

    if (!fs.existsSync(outputDir)) fs.mkdirSync(outputDir, { recursive: true });

    const filePath = path.join(outputDir, filename);
    fs.writeFileSync(filePath, buffer);

    // Return relative URL (adjust for your CDN/S3 setup)
    return `/storage/certificates/${filename}`;
  }

  /**
   * Generate PDF buffer for streaming
   */
  async generateCertificatePdfBuffer(cert) {
    return new Promise(async (resolve, reject) => {
      try {
        const doc = new PDFDocument({
          size: 'A4',
          layout: 'landscape',
          margins: { top: 40, bottom: 40, left: 50, right: 50 }
        });

        const chunks = [];
        doc.on('data', chunk => chunks.push(chunk));
        doc.on('end', () => resolve(Buffer.concat(chunks)));
        doc.on('error', reject);

        const pageW = 841.89; // A4 landscape width
        const pageH = 595.28;
        const centerX = pageW / 2;

        // === DECORATIVE BORDER ===
        doc.lineWidth(3).strokeColor('#1B5E20')
          .rect(20, 20, pageW - 40, pageH - 40).stroke();
        doc.lineWidth(1).strokeColor('#4CAF50')
          .rect(28, 28, pageW - 56, pageH - 56).stroke();

        // Corner flourishes (simple L-shapes)
        const corners = [[30, 30], [pageW - 30, 30], [30, pageH - 30], [pageW - 30, pageH - 30]];
        doc.strokeColor('#1B5E20').lineWidth(2);
        // Top-left
        doc.moveTo(30, 55).lineTo(30, 30).lineTo(55, 30).stroke();
        // Top-right
        doc.moveTo(pageW - 55, 30).lineTo(pageW - 30, 30).lineTo(pageW - 30, 55).stroke();
        // Bottom-left
        doc.moveTo(30, pageH - 55).lineTo(30, pageH - 30).lineTo(55, pageH - 30).stroke();
        // Bottom-right
        doc.moveTo(pageW - 55, pageH - 30).lineTo(pageW - 30, pageH - 30).lineTo(pageW - 30, pageH - 55).stroke();

        // === HEADER ===
        doc.fontSize(14).fillColor('#1B5E20').font('Helvetica-Bold')
          .text('AGRIVISION', 0, 55, { align: 'center', width: pageW });

        doc.fontSize(10).fillColor('#666').font('Helvetica')
          .text('AI-Powered Agricultural Monitoring Platform', 0, 73, { align: 'center', width: pageW });

        // Decorative line
        doc.moveTo(centerX - 180, 92).lineTo(centerX + 180, 92)
          .strokeColor('#4CAF50').lineWidth(1.5).stroke();

        // === TITLE ===
        const typeLabels = {
          'disease_free': 'DISEASE-FREE FARM',
          'organic_compliant': 'ORGANIC COMPLIANT',
          'sustainable': 'SUSTAINABLE FARMING',
          'premium': 'PREMIUM QUALITY'
        };

        doc.fontSize(28).fillColor('#1B5E20').font('Helvetica-Bold')
          .text('CERTIFICATE', 0, 105, { align: 'center', width: pageW });

        doc.fontSize(13).fillColor('#2E7D32').font('Helvetica')
          .text(`OF ${typeLabels[cert.certificate_type] || 'CERTIFICATION'}`, 0, 140, { align: 'center', width: pageW });

        // === MAIN CONTENT ===
        doc.fontSize(11).fillColor('#333').font('Helvetica')
          .text('This is to certify that', 0, 170, { align: 'center', width: pageW });

        // Farmer name
        doc.fontSize(22).fillColor('#1B5E20').font('Helvetica-Bold')
          .text(cert.farmer_name || 'Unknown Farmer', 0, 190, { align: 'center', width: pageW });

        // Farm name
        doc.fontSize(14).fillColor('#333').font('Helvetica')
          .text(`Operating: ${cert.farm_name}`, 0, 220, { align: 'center', width: pageW });

        doc.fontSize(11).fillColor('#333')
          .text(`Located in: ${cert.farm_location || 'N/A'}`, 0, 242, { align: 'center', width: pageW });

        // Decorative line
        doc.moveTo(centerX - 150, 262).lineTo(centerX + 150, 262)
          .strokeColor('#E0E0E0').lineWidth(1).stroke();

        // === DETAILS TABLE ===
        const detailsY = 278;
        const col1X = 120;
        const col2X = 350;
        const col3X = 560;
        const rowH = 20;

        const details = [
          [['Certificate No:', cert.certificate_number],
           ['Overall Score:', `${cert.overall_score}/100`]],
          [['Farm Area:', `${cert.farm_area_ha || 'N/A'} hectares`],
           ['Season:', (cert.season || '').replace(/_/g, ' ').toUpperCase()]],
          [['Products:', (cert.certified_products || []).join(', ')],
           ['Type:', (cert.certificate_type || '').replace(/_/g, ' ').toUpperCase()]],
          [['Valid From:', formatDate(cert.valid_from)],
           ['Valid Until:', formatDate(cert.valid_until)]],
        ];

        details.forEach((row, i) => {
          const y = detailsY + i * rowH;
          // Left column
          doc.fontSize(9).font('Helvetica-Bold').fillColor('#666')
            .text(row[0][0], col1X, y, { width: 100 });
          doc.font('Helvetica').fillColor('#333')
            .text(row[0][1], col1X + 105, y, { width: 200 });
          // Right column
          if (row[1]) {
            doc.font('Helvetica-Bold').fillColor('#666')
              .text(row[1][0], col3X, y, { width: 100 });
            doc.font('Helvetica').fillColor('#333')
              .text(row[1][1], col3X + 105, y, { width: 150 });
          }
        });

        // === CRITERIA SCORES BAR ===
        if (cert.criteria_scores) {
          const scoresY = detailsY + details.length * rowH + 15;
          doc.fontSize(9).font('Helvetica-Bold').fillColor('#1B5E20')
            .text('CERTIFICATION CRITERIA SCORES', col1X, scoresY);

          const scores = typeof cert.criteria_scores === 'string'
            ? JSON.parse(cert.criteria_scores) : cert.criteria_scores;

          let barX = col1X;
          const barY = scoresY + 15;
          const barW = 85;
          const barH = 10;
          let idx = 0;

          Object.entries(scores).forEach(([key, val]) => {
            if (key === 'overall_score') return;
            const label = key.replace(/_/g, ' ').substring(0, 14);
            const x = col1X + (idx % 6) * (barW + 15);
            const y = barY + Math.floor(idx / 6) * 30;
            const score = Math.min(parseFloat(val) || 0, 100);

            // Background bar
            doc.rect(x, y, barW, barH).fillColor('#E8F5E9').fill();
            // Score bar
            const fillW = (score / 100) * barW;
            doc.rect(x, y, fillW, barH).fillColor(score >= 70 ? '#4CAF50' : score >= 50 ? '#FF9800' : '#F44336').fill();
            // Label
            doc.fontSize(7).fillColor('#666').font('Helvetica')
              .text(`${label}: ${Math.round(score)}`, x, y + barH + 2, { width: barW });

            idx++;
          });
        }

        // === QR CODE ===
        const qrY = pageH - 165;
        try {
          const qrDataUrl = await QRCode.toDataURL(
            cert.qr_code_data || `https://agrivision.ca/verify/${cert.certificate_number}`,
            { width: 100, margin: 1, color: { dark: '#1B5E20' } }
          );
          const qrBuffer = Buffer.from(qrDataUrl.split(',')[1], 'base64');
          doc.image(qrBuffer, pageW - 170, qrY, { width: 80, height: 80 });
          doc.fontSize(7).fillColor('#666').font('Helvetica')
            .text('Scan to verify', pageW - 170, qrY + 82, { width: 80, align: 'center' });
        } catch (qrErr) {
          doc.fontSize(8).fillColor('#666')
            .text(`Verify: ${cert.certificate_number}`, pageW - 180, qrY + 30);
        }

        // === SIGNATURES ===
        const sigY = pageH - 140;

        // Left signature line
        doc.moveTo(col1X, sigY + 30).lineTo(col1X + 150, sigY + 30)
          .strokeColor('#999').lineWidth(0.5).stroke();
        doc.fontSize(9).fillColor('#666').font('Helvetica')
          .text('Agrivision AI Verification', col1X, sigY + 34, { width: 150, align: 'center' });
        doc.fontSize(7).fillColor('#999')
          .text(`Issued: ${formatDate(cert.issued_at)}`, col1X, sigY + 47, { width: 150, align: 'center' });

        // Center signature line
        doc.moveTo(centerX - 75, sigY + 30).lineTo(centerX + 75, sigY + 30)
          .strokeColor('#999').lineWidth(0.5).stroke();
        doc.fontSize(9).fillColor('#666')
          .text('Platform Director', centerX - 75, sigY + 34, { width: 150, align: 'center' });

        // === FOOTER ===
        doc.fontSize(7).fillColor('#999').font('Helvetica')
          .text(
            `Performance Cristal Technologies Avancées S.A. — NEQ: 2280629637 — Verification: ${cert.verification_hash?.substring(0, 16) || 'N/A'}`,
            0, pageH - 55, { align: 'center', width: pageW }
          );
        doc.text(
          'This certificate is issued by Agrivision based on AI-powered crop analysis. Verify authenticity at agrivision.ca/verify',
          0, pageH - 44, { align: 'center', width: pageW }
        );

        doc.end();
      } catch (err) {
        reject(err);
      }
    });
  }
}

function formatDate(dateStr) {
  if (!dateStr) return 'N/A';
  try {
    return new Date(dateStr).toLocaleDateString('en-CA', { year: 'numeric', month: 'long', day: 'numeric' });
  } catch {
    return String(dateStr).substring(0, 10);
  }
}

module.exports = new CertificatePdfService();
