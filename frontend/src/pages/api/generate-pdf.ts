import { NextApiRequest, NextApiResponse } from "next";
import { jsPDF } from "jspdf";
import QRCode from "qrcode";

export default async function handler(req: NextApiRequest, res: NextApiResponse) {
  if (req.method !== 'POST') {
    return res.status(405).json({ error: 'Method not allowed' });
  }

  try {
    const { 
      tokenId, 
      shareUrl, 
      nftImage, 
      recipientName, 
      message, 
      senderName,
      amount 
    } = req.body;

    if (!tokenId || !shareUrl) {
      return res.status(400).json({ 
        error: 'Missing required parameters: tokenId, shareUrl' 
      });
    }

    // Create new PDF document
    const doc = new jsPDF({
      orientation: 'portrait',
      unit: 'mm',
      format: 'a4'
    });

    // Set up the document
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    
    // Colors
    const primaryColor = '#3B82F6'; // Blue
    const secondaryColor = '#8B5CF6'; // Purple
    const textColor = '#1F2937'; // Dark gray

    // Background gradient (simulated with rectangles)
    doc.setFillColor(59, 130, 246); // Blue
    doc.rect(0, 0, pageWidth, 60, 'F');
    
    doc.setFillColor(139, 92, 246); // Purple
    doc.rect(0, 50, pageWidth, 60, 'F');

    // Header - CryptoGift Wallets Logo
    doc.setTextColor(255, 255, 255);
    doc.setFontSize(24);
    doc.setFont('helvetica', 'bold');
    doc.text('🎁 CryptoGift Wallets', pageWidth / 2, 25, { align: 'center' });
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'normal');
    doc.text('Regala el Futuro', pageWidth / 2, 35, { align: 'center' });

    // Gift Certificate Title
    doc.setTextColor(31, 41, 55);
    doc.setFontSize(20);
    doc.setFont('helvetica', 'bold');
    doc.text('Certificado de Regalo Cripto', pageWidth / 2, 80, { align: 'center' });

    // NFT Info Section
    let yPosition = 100;
    
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('Detalles del Regalo:', 20, yPosition);
    
    yPosition += 10;
    doc.setFontSize(11);
    doc.setFont('helvetica', 'normal');
    
    // NFT ID
    doc.text(`Token ID: #${tokenId}`, 25, yPosition);
    yPosition += 8;
    
    // Amount
    if (amount) {
      doc.text(`Valor: $${amount} USDC`, 25, yPosition);
      yPosition += 8;
    }
    
    // Network
    doc.text('Red: Base Blockchain', 25, yPosition);
    yPosition += 8;
    
    // Creation date
    doc.text(`Fecha: ${new Date().toLocaleDateString('es-ES')}`, 25, yPosition);
    yPosition += 15;

    // Personal Message Section
    if (recipientName || message || senderName) {
      doc.setFontSize(14);
      doc.setFont('helvetica', 'bold');
      doc.text('Mensaje Personal:', 20, yPosition);
      yPosition += 10;
      
      doc.setFontSize(11);
      doc.setFont('helvetica', 'normal');
      
      if (recipientName) {
        doc.text(`Para: ${recipientName}`, 25, yPosition);
        yPosition += 8;
      }
      
      if (message) {
        // Wrap long messages
        const lines = doc.splitTextToSize(message, pageWidth - 50);
        doc.text(lines, 25, yPosition);
        yPosition += lines.length * 5 + 5;
      }
      
      if (senderName) {
        doc.text(`De: ${senderName}`, 25, yPosition);
        yPosition += 15;
      }
    }

    // QR Code Section
    try {
      const qrCodeDataUrl = await QRCode.toDataURL(shareUrl, {
        width: 150,
        margin: 2,
        color: {
          dark: '#000000',
          light: '#FFFFFF'
        }
      });

      // Add QR code
      const qrSize = 40;
      const qrX = pageWidth - qrSize - 20;
      const qrY = yPosition;
      
      doc.addImage(qrCodeDataUrl, 'PNG', qrX, qrY, qrSize, qrSize);
      
      // QR Code instructions
      doc.setFontSize(10);
      doc.setFont('helvetica', 'bold');
      doc.text('Escanea para reclamar:', qrX, qrY - 5);
      
      // URL below QR
      doc.setFontSize(8);
      doc.setFont('helvetica', 'normal');
      const shortUrl = shareUrl.replace('https://', '').replace('http://', '');
      const urlLines = doc.splitTextToSize(shortUrl, qrSize);
      doc.text(urlLines, qrX, qrY + qrSize + 5);
      
    } catch (qrError) {
      console.error('Error generating QR code:', qrError);
      // Continue without QR code
    }

    // Instructions Section
    yPosition += 60;
    doc.setFontSize(14);
    doc.setFont('helvetica', 'bold');
    doc.text('¿Cómo reclamar tu regalo?', 20, yPosition);
    
    yPosition += 10;
    doc.setFontSize(10);
    doc.setFont('helvetica', 'normal');
    
    const instructions = [
      '1. Escanea el código QR con tu teléfono o visita el link',
      '2. Conecta tu wallet (MetaMask, Coinbase, etc.)',
      '3. Haz clic en "Reclamar Regalo"',
      '4. ¡Disfruta de tu NFT y los fondos incluidos!',
      '',
      '• El NFT tiene una wallet integrada con criptomonedas reales',
      '• Puedes usar los fondos inmediatamente',
      '• Todas las transacciones tienen gas gratis',
      '• Puedes cambiar entre diferentes criptomonedas'
    ];

    instructions.forEach(instruction => {
      doc.text(instruction, 25, yPosition);
      yPosition += 5;
    });

    // Security & Trust Section
    yPosition += 10;
    doc.setFillColor(248, 250, 252); // Light gray background
    doc.rect(15, yPosition - 5, pageWidth - 30, 25, 'F');
    
    doc.setFontSize(12);
    doc.setFont('helvetica', 'bold');
    doc.setTextColor(59, 130, 246);
    doc.text('🔒 Seguridad Garantizada', 20, yPosition + 5);
    
    doc.setFontSize(9);
    doc.setFont('helvetica', 'normal');
    doc.setTextColor(75, 85, 99);
    doc.text('✓ Contratos auditados por OpenZeppelin', 25, yPosition + 12);
    doc.text('✓ Fondos almacenados on-chain en Base blockchain', 25, yPosition + 17);
    doc.text('✓ Sin custodia - tú controlas tus fondos', 25, yPosition + 22);

    // Footer
    doc.setFontSize(8);
    doc.setTextColor(156, 163, 175);
    doc.text(`CryptoGift Wallets - ${process.env.NEXT_PUBLIC_SITE_URL || process.env.VERCEL_URL ? `https://${process.env.VERCEL_URL}` : 'Production Site'}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
    doc.text('Hecho con ❤️ para el futuro descentralizado', pageWidth / 2, pageHeight - 5, { align: 'center' });

    // Generate the PDF as base64
    const pdfBase64 = doc.output('datauristring');
    const pdfBuffer = doc.output('arraybuffer');

    res.status(200).json({
      success: true,
      pdf: pdfBase64,
      filename: `cryptogift-wallet-${tokenId}.pdf`,
      size: pdfBuffer.byteLength,
    });

  } catch (error) {
    console.error('PDF generation error:', error);
    res.status(500).json({
      error: 'PDF generation failed',
      message: error instanceof Error ? error.message : 'Unknown error',
    });
  }
}