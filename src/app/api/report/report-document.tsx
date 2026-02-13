import React from 'react';
import { Document, Page, Text, View, StyleSheet } from '@react-pdf/renderer';

const styles = StyleSheet.create({
  page: { padding: 40, fontSize: 11, fontFamily: 'Helvetica' },
  title: { fontSize: 22, fontWeight: 'bold', marginBottom: 10, color: '#00016B', textAlign: 'center' },
  subtitle: { fontSize: 14, color: '#1A237E', textAlign: 'center', marginBottom: 20 },
  sectionTitle: { fontSize: 16, fontWeight: 'bold', color: '#1A237E', marginTop: 20, marginBottom: 8, borderBottom: '2px solid #26A69A', paddingBottom: 4 },
  subTitle: { fontSize: 13, fontWeight: 'bold', color: '#333', marginTop: 12, marginBottom: 6 },
  text: { fontSize: 11, lineHeight: 1.5, marginBottom: 4, color: '#333' },
  bold: { fontWeight: 'bold' },
  kpiBox: { flexDirection: 'row', justifyContent: 'space-between', marginBottom: 15, flexWrap: 'wrap' },
  kpiItem: { width: '48%', backgroundColor: '#F5F6F5', padding: 10, borderRadius: 4, marginBottom: 8 },
  kpiLabel: { fontSize: 9, color: '#666', marginBottom: 2 },
  kpiValue: { fontSize: 16, fontWeight: 'bold', color: '#00016B' },
  tableRow: { flexDirection: 'row', borderBottom: '1px solid #E0E0E0', paddingVertical: 4 },
  tableHeader: { flexDirection: 'row', borderBottom: '2px solid #00016B', paddingVertical: 6, backgroundColor: '#F5F6F5' },
  tableCell: { flex: 1, fontSize: 9, paddingHorizontal: 4 },
  tableCellBold: { flex: 1, fontSize: 9, paddingHorizontal: 4, fontWeight: 'bold' },
  bullet: { marginLeft: 15, marginBottom: 3 },
  footer: { position: 'absolute', bottom: 30, left: 40, right: 40, textAlign: 'center', fontSize: 8, color: '#999', borderTop: '1px solid #F7A800', paddingTop: 8 },
});

interface ReportData {
  reportType: string;
  sections: string[];
  totalSites: number;
  activeSites: number;
  avgIncidence: number;
  avgTpr: number;
  dateRange: string;
  totalRecords: number;
  regions: string[];
  regionalSummary: { region: string; avgIncidence: number; avgTpr: number }[];
  generatedDate: string;
}

export function ReportDocument({ data }: { data: ReportData }) {
  const typeLabel = {
    monthly: 'Monthly', quarterly: 'Quarterly', annual: 'Annual',
    regional: 'Regional', site: 'Site',
  }[data.reportType] || data.reportType;

  return (
    <Document>
      <Page size="A4" style={styles.page}>
        <Text style={styles.title}>IDRC Malaria Surveillance Report</Text>
        <Text style={styles.subtitle}>{typeLabel} Report - Uganda Malaria Surveillance Programme</Text>

        {/* Executive Summary */}
        {data.sections.includes('summary') && (
          <View>
            <Text style={styles.sectionTitle}>Executive Summary</Text>
            <Text style={styles.text}>
              This report presents findings from the Uganda Malaria Surveillance Programme (UMSP) covering{' '}
              {data.totalSites} surveillance sites ({data.activeSites} currently active) across{' '}
              {data.regions.length} regions.
            </Text>
            <View style={styles.kpiBox}>
              <View style={styles.kpiItem}>
                <Text style={styles.kpiLabel}>Average Incidence Rate</Text>
                <Text style={styles.kpiValue}>{data.avgIncidence.toFixed(1)} per 1,000 PY</Text>
              </View>
              <View style={styles.kpiItem}>
                <Text style={styles.kpiLabel}>Average TPR</Text>
                <Text style={styles.kpiValue}>{data.avgTpr.toFixed(1)}%</Text>
              </View>
              <View style={styles.kpiItem}>
                <Text style={styles.kpiLabel}>Total Records</Text>
                <Text style={styles.kpiValue}>{data.totalRecords.toLocaleString()}</Text>
              </View>
              <View style={styles.kpiItem}>
                <Text style={styles.kpiLabel}>Data Period</Text>
                <Text style={styles.kpiValue}>{data.dateRange}</Text>
              </View>
            </View>
          </View>
        )}

        {/* KPI Section */}
        {data.sections.includes('kpi') && (
          <View>
            <Text style={styles.sectionTitle}>Key Performance Indicators</Text>
            <Text style={styles.subTitle}>National Averages</Text>
            <Text style={styles.text}>Mean incidence rate: {data.avgIncidence.toFixed(2)} per 1,000 PY</Text>
            <Text style={styles.text}>Mean TPR: {data.avgTpr.toFixed(2)}%</Text>
            <Text style={styles.text}>Unique reporting sites: {data.totalSites}</Text>
            <Text style={styles.text}>Active sites: {data.activeSites}</Text>
          </View>
        )}

        {/* Regional Analysis */}
        {data.sections.includes('trends') && (
          <View>
            <Text style={styles.sectionTitle}>Regional Analysis</Text>
            <View style={styles.tableHeader}>
              <Text style={styles.tableCellBold}>Region</Text>
              <Text style={styles.tableCellBold}>Avg Incidence</Text>
              <Text style={styles.tableCellBold}>Avg TPR</Text>
            </View>
            {data.regionalSummary.slice(0, 15).map((r, i) => (
              <View key={i} style={styles.tableRow}>
                <Text style={styles.tableCell}>{r.region}</Text>
                <Text style={styles.tableCell}>{r.avgIncidence.toFixed(1)}</Text>
                <Text style={styles.tableCell}>{r.avgTpr.toFixed(1)}%</Text>
              </View>
            ))}
          </View>
        )}

        {/* Data Quality */}
        {data.sections.includes('quality') && (
          <View>
            <Text style={styles.sectionTitle}>Data Quality Assessment</Text>
            <Text style={styles.text}>
              The surveillance system covers {data.totalSites} health facilities with{' '}
              {data.totalRecords.toLocaleString()} monthly observations.
            </Text>
            <Text style={styles.text}>
              {data.activeSites} of {data.totalSites} sites are currently active ({((data.activeSites / data.totalSites) * 100).toFixed(0)}% reporting completeness).
            </Text>
          </View>
        )}

        {/* Recommendations */}
        {data.sections.includes('alerts') && (
          <View>
            <Text style={styles.sectionTitle}>Recommendations</Text>
            <Text style={styles.subTitle}>Immediate Actions</Text>
            <Text style={[styles.text, styles.bullet]}>1. Strengthen diagnostic capacity in high-burden areas</Text>
            <Text style={[styles.text, styles.bullet]}>2. Target vector control interventions during peak transmission seasons</Text>
            <Text style={[styles.text, styles.bullet]}>3. Improve reporting completeness from health facilities</Text>
            <Text style={styles.subTitle}>Strategic Priorities</Text>
            <Text style={[styles.text, styles.bullet]}>1. Regular data validation and verification</Text>
            <Text style={[styles.text, styles.bullet]}>2. Prioritize high-burden regions for resource allocation</Text>
            <Text style={[styles.text, styles.bullet]}>3. Strengthen collaboration with implementing partners</Text>
          </View>
        )}

        {/* Footer */}
        <View style={styles.footer} fixed>
          <Text>Report Generated: {data.generatedDate} | IDRC Enhanced Malaria Surveillance Dashboard</Text>
          <Text>Ministry of Health Uganda | Malaria Control Program</Text>
        </View>
      </Page>
    </Document>
  );
}
