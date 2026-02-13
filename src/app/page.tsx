import Link from "next/link";
import { ArrowRight, BarChart3, Map, FileText, Database, Activity } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";

const features = [
  {
    icon: BarChart3,
    title: "Overview Dashboard",
    description: "Key metrics, regional summaries, and data quality monitoring at a glance.",
  },
  {
    icon: Map,
    title: "Interactive Map",
    description: "6 overlay types including heatmaps, choropleths, and trend analysis across Uganda.",
  },
  {
    icon: Activity,
    title: "Time Series Analysis",
    description: "Temporal trends, seasonal patterns, and statistical summaries for all indicators.",
  },
  {
    icon: Database,
    title: "Data Explorer",
    description: "Browse, filter, sort, and export surveillance data with full column control.",
  },
  {
    icon: FileText,
    title: "Surveillance Reports",
    description: "Generate PDF reports with executive summaries, KPIs, and recommendations.",
  },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-b from-[#00016B] via-[#1A237E] to-[#283593]">
      <header className="border-b border-white/10">
        <div className="container mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[#26A69A] flex items-center justify-center">
              <Activity className="w-6 h-6 text-white" />
            </div>
            <span className="text-white font-bold text-lg">IDRC Malaria GIS Dashboard</span>
          </div>
          <nav className="flex items-center gap-4">
            <Button asChild variant="outline" className="border-white/30 text-white hover:bg-white/10">
              <Link href="/login">Sign In</Link>
            </Button>
          </nav>
        </div>
      </header>

      <section className="container mx-auto px-6 py-24 text-center">
        <h1 className="text-4xl md:text-6xl font-bold text-white mb-6 leading-tight">
          Uganda Malaria Surveillance<br />Programme Dashboard
        </h1>
        <p className="text-lg md:text-xl text-white/80 max-w-3xl mx-auto mb-10">
          Advanced geospatial analytics and integrated temporal analysis for malaria surveillance
          across health facilities in Uganda. Monitoring incidence, test positivity rates,
          and key indicators to support evidence-based decision making.
        </p>
        <div className="flex gap-4 justify-center">
          <Button asChild size="lg" className="bg-[#26A69A] hover:bg-[#1E867C] text-white">
            <Link href="/login">
              Sign In to Dashboard <ArrowRight className="ml-2 h-5 w-5" />
            </Link>
          </Button>
        </div>
      </section>

      <section className="container mx-auto px-6 pb-24">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {features.map((feature) => (
            <Card key={feature.title} className="bg-white/10 border-white/10 backdrop-blur-sm">
              <CardHeader>
                <feature.icon className="w-10 h-10 text-[#26A69A] mb-2" />
                <CardTitle className="text-white">{feature.title}</CardTitle>
                <CardDescription className="text-white/70">{feature.description}</CardDescription>
              </CardHeader>
            </Card>
          ))}
        </div>
      </section>

      <footer className="border-t border-[#F7A800]/30 bg-black/20">
        <div className="container mx-auto px-6 py-6 text-center text-white/60 text-sm">
          <p>IDRC Enhanced Malaria Surveillance Dashboard &middot; Ministry of Health Uganda &middot; Malaria Control Program</p>
        </div>
      </footer>
    </div>
  );
}
