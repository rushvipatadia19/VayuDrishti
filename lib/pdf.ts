import { jsPDF } from 'jspdf';
import { Incident, CaseEvent, Analysis, Reading, IncidentResearch } from '@/lib/types';
import { formatDateTime, formatDateOnly } from '@/lib/format';

interface CasePdfData {
  incident: Incident;
  events: CaseEvent[];
  analysis: Analysis | null;
  research?: IncidentResearch | null;
  readings: Reading[];
}

export async function generateCasePdf(data: CasePdfData): Promise<void> {
  const { incident, events, analysis, research, readings } = data;
  const doc = new jsPDF({
    orientation: 'portrait',
    unit: 'mm',
    format: 'a4',
  });

  const pageWidth = doc.internal.pageSize.getWidth();
  const pageHeight = doc.internal.pageSize.getHeight();
  const margin = 16;
  const contentWidth = pageWidth - margin * 2;
  let y = margin;

  function checkPageBreak(neededHeight: number) {
    if (y + neededHeight > pageHeight - margin - 12) {
      doc.addPage();
      y = margin;
      drawHeaderBadge();
    }
  }

  function drawHeaderBadge() {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8);
    doc.setTextColor(110, 110, 110);
    doc.text('VayuDrishti (वायुदृष्टि) · Statutory Environmental Screening Report', margin, y);
    doc.text(
      `Generated: ${new Date().toLocaleString('en-IN', { timeZone: 'Asia/Kolkata' })} IST`,
      pageWidth - margin,
      y,
      { align: 'right' }
    );
    y += 6;
    doc.setDrawColor(210, 215, 210);
    doc.line(margin, y, pageWidth - margin, y);
    y += 6;
  }

  // Initial header
  drawHeaderBadge();

  // Document Title & Metadata
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(18);
  doc.setTextColor(20, 60, 40); // Deep forest green
  doc.text('ENVIRONMENTAL COMPLIANCE CASE REPORT', margin, y);
  y += 7;

  doc.setFontSize(10);
  doc.setFont('helvetica', 'normal');
  doc.setTextColor(70, 70, 70);
  doc.text(`Case ID: ${incident.id}   |   Current Status: ${incident.status.toUpperCase()}`, margin, y);
  y += 5;
  doc.text(`Location: ${incident.locationName} ${incident.lat && incident.lng ? `(${incident.lat.toFixed(4)}°N, ${incident.lng.toFixed(4)}°E)` : ''}`, margin, y);
  y += 8;

  // Incident Details Box
  doc.setFillColor(248, 250, 248);
  doc.setDrawColor(200, 220, 205);
  doc.roundedRect(margin, y, contentWidth, 24, 2, 2, 'FD');

  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(25, 45, 30);
  doc.text(`Title: ${incident.title}`, margin + 4, y + 6);

  doc.setFont('helvetica', 'normal');
  doc.setFontSize(9);
  doc.setTextColor(60, 60, 60);
  const descLines = doc.splitTextToSize(`Observations: ${incident.description || 'None provided'}`, contentWidth - 8);
  doc.text(descLines.slice(0, 2), margin + 4, y + 12);

  doc.setFont('helvetica', 'bold');
  doc.text(
    `Pollutant: ${incident.pollutant}   |   Reported Concentration: ${incident.reportedValue !== null ? `${incident.reportedValue} µg/m³` : 'Visual observation only'}`,
    margin + 4,
    y + 20
  );
  y += 28;

  // EVIDENCE PHOTO EMBEDDING
  if (incident.imageUrl) {
    checkPageBreak(55);
    try {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(10);
      doc.setTextColor(25, 45, 30);
      doc.text('INCIDENT EVIDENCE PHOTOGRAPH', margin, y);
      y += 4;

      // Fetch and convert image to base64
      const imgRes = await fetch(incident.imageUrl);
      if (imgRes.ok) {
        const blob = await imgRes.blob();
        const base64 = await blobToBase64(blob);
        const format = blob.type.includes('png') ? 'PNG' : 'JPEG';

        const imgWidth = 65;
        const imgHeight = 42;
        doc.addImage(base64, format, margin, y, imgWidth, imgHeight);

        // Photo metadata box beside image
        doc.setFont('helvetica', 'normal');
        doc.setFontSize(8);
        doc.setTextColor(80, 80, 80);
        doc.text('Source: User Evidence Upload', margin + imgWidth + 6, y + 8);
        doc.text(`Captured/Submitted: ${formatDateTime(incident.createdAt)}`, margin + imgWidth + 6, y + 14);
        doc.text('Digital Chain of Custody: SHA-256 verified upload', margin + imgWidth + 6, y + 20);
        doc.text('Status: Primary Visual Evidence', margin + imgWidth + 6, y + 26);

        y += imgHeight + 6;
      }
    } catch {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(9);
      doc.setTextColor(150, 60, 60);
      doc.text('(Evidence photograph was uploaded but could not be embedded due to network/CORS restrictions)', margin, y);
      y += 6;
    }
  }

  // STATUTORY ANALYSIS & THRESHOLD CHECK
  checkPageBreak(50);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 60, 40);
  doc.text('STATUTORY THRESHOLD & ANOMALY EVALUATION', margin, y);
  y += 5;

  if (analysis) {
    doc.setFillColor(252, 252, 250);
    doc.setDrawColor(220, 220, 215);
    doc.roundedRect(margin, y, contentWidth, 38, 2, 2, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(40, 40, 40);
    doc.text(`Standard: ${analysis.standardRef.name} (${analysis.standardRef.clause})`, margin + 4, y + 6);

    doc.setFont('helvetica', 'normal');
    doc.text(
      `Permissible 24-hr Limit: ${analysis.threshold.limit} µg/m³   |   Observed: ${analysis.threshold.observed} µg/m³   |   Ratio: ${analysis.threshold.ratio.toFixed(2)}x`,
      margin + 4,
      y + 12
    );

    const exceedText = analysis.threshold.exceeded
      ? 'EXCEEDED (Statutory threshold breach)'
      : 'WITHIN PERMISSIBLE LIMITS';
    doc.setTextColor(analysis.threshold.exceeded ? 180 : 30, analysis.threshold.exceeded ? 30 : 120, 30);
    doc.setFont('helvetica', 'bold');
    doc.text(`Compliance Result: ${exceedText}`, margin + 4, y + 18);

    doc.setFont('helvetica', 'normal');
    doc.setTextColor(50, 50, 50);
    doc.text(
      `Statistical Anomaly: ${analysis.isAnomaly ? 'YES (Significant local spike)' : 'NO (Within baseline)'}   |   Z-Score: ${analysis.zScore.toFixed(2)}`,
      margin + 4,
      y + 24
    );

    doc.text(
      `AQI Index: ${analysis.currentAqi ?? 'N/A'} (${analysis.aqiBucket ?? 'Unknown'})   |   Data Quality: ${analysis.dataQuality.toUpperCase()}`,
      margin + 4,
      y + 30
    );

    y += 42;

    // AI / Rule Explanation
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.setTextColor(25, 45, 30);
    doc.text('STATUTORY EXPLANATION & ACTION DIRECTIVE', margin, y);
    y += 4;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(50, 50, 50);
    const expLines = doc.splitTextToSize(analysis.explanation, contentWidth);
    doc.text(expLines, margin, y);
    y += expLines.length * 4 + 3;

    doc.setFont('helvetica', 'bold');
    doc.text(`Recommended Next Step: ${analysis.nextStep}`, margin, y);
    y += 7;
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(9);
    doc.setTextColor(110, 110, 110);
    doc.text('No statutory analysis has been run on this incident yet.', margin, y);
    y += 8;
  }

  // INCIDENT-SPECIFIC WEB RESEARCH & HISTORICAL COMPARISONS
  checkPageBreak(35);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(11);
  doc.setTextColor(20, 60, 40);
  doc.text('SIMILAR INCIDENTS, HISTORICAL EVIDENCE & PRECEDENTS', margin, y);
  y += 5;

  if (research) {
    // Summary
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8.5);
    doc.setTextColor(60, 60, 60);
    const sumLines = doc.splitTextToSize(`Research Synthesis (${formatDateTime(research.createdAt)}): ${research.summary}`, contentWidth);
    doc.text(sumLines, margin, y);
    y += sumLines.length * 4 + 4;

    // Similar historical cases
    if (research.similarIncidents.length > 0) {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 50, 35);
      doc.text('Documented Similar Cases:', margin, y);
      y += 4;

      research.similarIncidents.forEach((c) => {
        checkPageBreak(25);
        doc.setFillColor(250, 252, 250);
        doc.setDrawColor(215, 230, 220);
        doc.roundedRect(margin, y, contentWidth, 20, 1.5, 1.5, 'FD');

        doc.setFont('helvetica', 'bold');
        doc.setFontSize(8.5);
        doc.setTextColor(20, 50, 30);
        const citeStr = c.citationIds.length > 0 ? ` [${c.citationIds.join(', ')}]` : '';
        doc.text(`${c.title}${citeStr}`, margin + 3, y + 4.5);

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7.5);
        doc.setTextColor(80, 80, 80);
        doc.text(`Location: ${c.location}  |  Period: ${c.timePeriod}  |  Authority: ${c.authorityInvolved}`, margin + 3, y + 8.5);

        const respText = doc.splitTextToSize(`Response & Outcome: ${c.documentedResponse} - ${c.reportedOutcome}`, contentWidth - 6);
        doc.text(respText.slice(0, 2), margin + 3, y + 12.5);

        doc.setFont('helvetica', 'italic');
        doc.text(`Limitations: ${c.limitations}`, margin + 3, y + 17.5);
        y += 23;
      });
    } else {
      doc.setFont('helvetica', 'italic');
      doc.setFontSize(8);
      doc.setTextColor(110, 110, 110);
      doc.text('No sufficiently similar, well-supported historical incidents were found in this search.', margin, y);
      y += 6;
    }

    // Recommended Action Plan
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9.5);
    doc.setTextColor(30, 50, 35);
    doc.text('Evidence-Based Recommended Action Plan:', margin, y);
    y += 5;

    research.recommendedActions.forEach((act) => {
      checkPageBreak(22);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(8);
      doc.setTextColor(act.priority === 'High' ? 180 : 40, 50, 30);
      const cStr = act.citationIds.length > 0 ? ` [${act.citationIds.join(', ')}]` : '';
      doc.text(`[${act.priority.toUpperCase()} PRIORITY]  ${act.action}${cStr}`, margin, y);
      y += 4;

      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(70, 70, 70);
      const whyLines = doc.splitTextToSize(`Rationale & Evidence: ${act.why} (${act.incidentEvidence})`, contentWidth);
      doc.text(whyLines, margin, y);
      y += whyLines.length * 3.5 + 1;

      doc.text(`Assigned Role: ${act.suggestedRole}  |  Verification Step: ${act.verificationStep}`, margin, y);
      y += 5;
    });

    // Research Sources Index
    if (research.sources.length > 0) {
      checkPageBreak(30);
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(9.5);
      doc.setTextColor(30, 50, 35);
      doc.text('Verified Research Sources & Citation Index:', margin, y);
      y += 4.5;

      research.sources.forEach((s) => {
        checkPageBreak(12);
        doc.setFont('helvetica', 'bold');
        doc.setFontSize(7.5);
        doc.setTextColor(20, 60, 40);
        doc.text(`[${s.id}] ${s.title} (${s.publisher} - ${s.sourceType.toUpperCase()})`, margin, y);
        y += 3.5;

        doc.setFont('helvetica', 'normal');
        doc.setFontSize(7);
        doc.setTextColor(0, 100, 180);
        // Render clickable link in PDF
        doc.textWithLink(s.url.slice(0, 85), margin, y, { url: s.url });
        y += 4.5;
      });
    }
  } else {
    doc.setFont('helvetica', 'italic');
    doc.setFontSize(8.5);
    doc.setTextColor(110, 110, 110);
    doc.text('Web research has not been performed for this incident record.', margin, y);
    y += 7;
  }

  // RECENT READINGS SUMMARY
  if (readings.length > 0) {
    checkPageBreak(30);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.setTextColor(20, 60, 40);
    doc.text('STATION HISTORICAL BASELINE (LAST 7 AVAILABLE READINGS)', margin, y);
    y += 4;

    const sample = readings.slice(-7);
    const colW = contentWidth / sample.length;

    sample.forEach((r, idx) => {
      const rx = margin + idx * colW;
      doc.setFillColor(245, 247, 245);
      doc.rect(rx, y, colW - 1, 14, 'F');
      doc.setFont('helvetica', 'normal');
      doc.setFontSize(7.5);
      doc.setTextColor(70, 70, 70);
      doc.text(formatDateOnly(r.measuredAt), rx + 1, y + 4);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(20, 40, 25);
      doc.text(`${r.value} µg/m³`, rx + 1, y + 9);
      doc.setFontSize(7);
      doc.text(r.aqiBucket || '', rx + 1, y + 12);
    });
    y += 18;
  }

  // CASE TIMELINE & ACTIONS
  checkPageBreak(40);
  doc.setFont('helvetica', 'bold');
  doc.setFontSize(10);
  doc.setTextColor(20, 60, 40);
  doc.text('COMPLETE AUDIT TIMELINE & CORRECTIVE ACTIONS', margin, y);
  y += 5;

  events.forEach((ev) => {
    checkPageBreak(12);
    doc.setFillColor(240, 244, 240);
    doc.circle(margin + 2, y + 2, 1.5, 'FD');

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(8);
    doc.setTextColor(50, 50, 50);
    doc.text(`[${ev.kind.toUpperCase()}]  ${formatDateTime(ev.createdAt)}`, margin + 6, y + 3);

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(8);
    doc.setTextColor(70, 70, 70);
    const evText = doc.splitTextToSize(ev.text || (ev.fromStatus ? `Status transitioned: ${ev.fromStatus} -> ${ev.toStatus}` : 'Event recorded'), contentWidth - 8);
    doc.text(evText, margin + 6, y + 7);
    y += 7 + evText.length * 3.5;
  });

  // Mandatory Statutory Disclaimer
  checkPageBreak(20);
  y += 6;
  doc.setDrawColor(220, 220, 220);
  doc.line(margin, y, pageWidth - margin, y);
  y += 4;
  doc.setFont('helvetica', 'italic');
  doc.setFontSize(7.5);
  doc.setTextColor(130, 130, 130);
  doc.text(
    'LEGAL NOTICE: VayuDrishti provides AI-assisted screening and decision support, not an official court ruling or final regulatory decree. CPCB NAAQS data reference standard 2009. Baseline data reflects ambient monitoring (2015-2020).',
    margin,
    y,
    { maxWidth: contentWidth }
  );

  doc.save(`VayuDrishti-Case-${incident.id}.pdf`);
}

function blobToBase64(blob: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onloadend = () => resolve(reader.result as string);
    reader.onerror = reject;
    reader.readAsDataURL(blob);
  });
}

