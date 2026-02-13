import Link from 'next/link';
import { ArrowRight, BarChart3, Map, FileText, Database, Activity } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

const features = [
  {
    icon: BarChart3,
    title: 'Overview Dashboard',
    description: 'Key metrics, regional summaries, and data quality monitoring at a glance.',
  },
  {
    icon: Map,
    title: 'Interactive Map',
    description: 'Six overlay types including heatmaps, choropleths, and trend analysis across Uganda.',
  },
  {
    icon: Activity,
    title: 'Time Series Analysis',
    description: 'Temporal trends, seasonal patterns, and statistical summaries for all indicators.',
  },
  {
    icon: Database,
    title: 'Data Explorer',
    description: 'Browse, filter, sort, and export surveillance data with full column control.',
  },
  {
    icon: FileText,
    title: 'Surveillance Reports',
    description: 'Generate PDF reports with executive summaries, KPIs, and recommendations.',
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#0d2f44] via-[#115664] to-[#116f5e] text-white">
      <header className="border-b border-white/15 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <div className="flex items-center gap-3">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#f4b63e] text-slate-900 shadow-lg shadow-black/25">
              <Activity className="h-6 w-6" />
            </div>
            <div>
              <p className="text-xs uppercase tracking-[0.2em] text-white/65">IDRC</p>
              <p className="text-base font-semibold md:text-lg">Malaria Intelligence Dashboard</p>
            </div>
          </div>

          <Button asChild variant="outline" className="border-white/35 bg-white/5 text-white hover:bg-white/15 hover:text-white">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </header>

      <section className="container mx-auto px-6 pb-16 pt-20 text-center md:pt-24">
        <h1 className="text-balance text-4xl font-bold leading-tight md:text-6xl">
          Uganda Malaria Surveillance Programme
        </h1>
        <p className="mx-auto mt-6 max-w-3xl text-balance text-lg text-white/80 md:text-xl">
          Geospatial and temporal analytics for incidence, test positivity, and surveillance quality across Uganda.
          Built for rapid, evidence-driven public health decisions.
        </p>
        <div className="mt-10">
          <Button asChild size="lg" className="bg-[#f4b63e] text-slate-900 hover:bg-[#e7a934]">
            <Link href="/login">
              Launch Dashboard <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="container mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {features.map((feature) => (
            <Card key={feature.title} className="border-white/20 bg-white/10 text-white backdrop-blur-md">
              <CardHeader>
                <div className="mb-2 inline-flex h-10 w-10 items-center justify-center rounded-lg bg-[#f4b63e] text-slate-900">
                  <feature.icon className="h-5 w-5" />
                </div>
                <CardTitle className="text-white">{feature.title}</CardTitle>
                <CardDescription className="text-white/75">{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-white/15 bg-black/20 py-6 text-center text-sm text-white/70">
        <p>IDRC Enhanced Malaria Surveillance Dashboard · Ministry of Health Uganda · Malaria Control Program</p>
      </footer>
    </div>
  );
}
