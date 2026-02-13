import { NextRequest, NextResponse } from 'next/server';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import ReactPDF from '@react-pdf/renderer';
import { ReportDocument } from './report-document';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    const { reportType, sections } = body;

    const supabase = createServerSupabaseClient();

    // Fetch data for report
    const [
      { data: monthlyData },
      { data: activeSites },
    ] = await Promise.all([
      supabase.from('umsp_monthly_data').select('*').order('monthyear'),
      supabase.from('active_sites').select('site'),
    ]);

    const allData = monthlyData ?? [];
    const sites = [...new Set(allData.map((d) => d.site))];
    const regions = [...new Set(allData.map((d) => d.region))];
    const dates = allData.map((d) => d.monthyear).sort();
    const dateRange = dates.length ? `${dates[0]} to ${dates[dates.length - 1]}` : 'N/A';

    const incidenceValues = allData
      .map((d) => d.malaria_incidence_per_1000_py)
      .filter((v): v is number => v != null && isFinite(v));
    const tprValues = allData
      .map((d) => d.tpr_cases_all)
      .filter((v): v is number => v != null && isFinite(v));

    const avgIncidence = incidenceValues.length
      ? incidenceValues.reduce((a, b) => a + b, 0) / incidenceValues.length
      : 0;
    const avgTpr = tprValues.length
      ? tprValues.reduce((a, b) => a + b, 0) / tprValues.length
      : 0;

    // Regional averages
    const regionalStats: Record<string, { incidence: number[]; tpr: number[] }> = {};
    for (const row of allData) {
      if (!regionalStats[row.region]) regionalStats[row.region] = { incidence: [], tpr: [] };
      if (row.malaria_incidence_per_1000_py != null && isFinite(row.malaria_incidence_per_1000_py)) {
        regionalStats[row.region].incidence.push(row.malaria_incidence_per_1000_py);
      }
      if (row.tpr_cases_all != null && isFinite(row.tpr_cases_all)) {
        regionalStats[row.region].tpr.push(row.tpr_cases_all);
      }
    }

    const regionalSummary = Object.entries(regionalStats)
      .map(([region, stats]) => ({
        region,
        avgIncidence: stats.incidence.length
          ? stats.incidence.reduce((a, b) => a + b, 0) / stats.incidence.length
          : 0,
        avgTpr: stats.tpr.length
          ? stats.tpr.reduce((a, b) => a + b, 0) / stats.tpr.length
          : 0,
      }))
      .sort((a, b) => b.avgIncidence - a.avgIncidence);

    const reportData = {
      reportType,
      sections,
      totalSites: sites.length,
      activeSites: (activeSites ?? []).length,
      avgIncidence,
      avgTpr,
      dateRange,
      totalRecords: allData.length,
      regions,
      regionalSummary,
      generatedDate: new Date().toLocaleDateString('en-US', { year: 'numeric', month: 'long', day: 'numeric' }),
    };

    const pdfStream = await ReactPDF.renderToStream(
      ReportDocument({ data: reportData })
    );

    const chunks: Buffer[] = [];
    for await (const chunk of pdfStream) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }
    const pdfBuffer = Buffer.concat(chunks);

    return new NextResponse(pdfBuffer, {
      headers: {
        'Content-Type': 'application/pdf',
        'Content-Disposition': `attachment; filename="malaria_surveillance_report_${reportType}_${new Date().toISOString().split('T')[0]}.pdf"`,
      },
    });
  } catch (error) {
    console.error('Report generation error:', error);
    return NextResponse.json({ error: 'Failed to generate report' }, { status: 500 });
  }
}
