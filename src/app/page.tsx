import Image from 'next/image';
import Link from 'next/link';
import { ArrowRight } from 'lucide-react';
import { Button } from '@/components/ui/button';

const stats = [
  { value: '42', label: 'Active Malaria Reference Centers' },
  { value: '80', label: 'Total MRCs in database' },
  { value: '60,000+', label: 'Patient visits added per month' },
  { value: '6.3M+', label: 'Patient visits in database' },
  { value: 'April 2017', label: 'Database coverage start' },
];

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-[#071a2e] via-[#0c2e48] to-[#0d3d38] text-white">
      <header className="border-b border-white/10 backdrop-blur-sm">
        <div className="container mx-auto flex items-center justify-between px-6 py-4">
          <Image
            src="/logo/idrc_logo.png"
            alt="IDRC logo"
            width={120}
            height={40}
            className="h-10 w-auto object-contain"
            priority
          />
          <Button asChild variant="outline" className="border-white/30 bg-white/5 text-white hover:bg-white/15 hover:text-white">
            <Link href="/login">Sign In</Link>
          </Button>
        </div>
      </header>

      <section className="container mx-auto px-6 pb-10 pt-14 text-center md:pt-16">
        <h1 className="text-balance text-4xl font-bold leading-tight tracking-tight md:text-5xl">
          Uganda Malaria Surveillance Programme
        </h1>
        <p className="mx-auto mt-4 max-w-3xl text-balance text-base text-white/80 md:text-lg">
          Enhanced health facility-based surveillance across 42 active Malaria Reference Centers,
          generating data to guide evidence-based malaria control.
        </p>
      </section>

      <section className="container mx-auto px-6 pb-10">
        <div className="grid grid-cols-2 gap-3 md:grid-cols-3 lg:grid-cols-5">
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center justify-center rounded-2xl border border-white/15 bg-white/8 px-4 py-4 text-center backdrop-blur-sm"
            >
              <span className="text-2xl font-bold text-[#f4b63e] md:text-3xl">{stat.value}</span>
              <span className="mt-1.5 text-xs leading-snug text-white/70">{stat.label}</span>
            </div>
          ))}
        </div>
      </section>

      {/* Uganda sites map */}
      <section className="container mx-auto px-6 pb-16">
        <div className="grid grid-cols-1 items-center gap-8 lg:grid-cols-2 lg:gap-12">
          <div className="flex flex-col gap-3">
            <h2 className="text-center text-2xl font-bold tracking-tight md:text-3xl">
              Active and Prior MRCs
            </h2>
            <Image
              src="/logo/screenshot.png"
              alt="Map of active and prior Malaria Reference Centers across Uganda"
              width={0}
              height={0}
              sizes="50vw"
              className="h-auto w-full rounded-2xl border border-white/15 shadow-2xl shadow-black/40"
            />
          </div>
          <div className="flex flex-col justify-center gap-16">
            <p className="text-lg leading-relaxed text-white/75">
              The Uganda Malaria Surveillance Programme (UMSP) was established in 2006 to collect
              high-quality malaria surveillance data at government-run health centers. These Malaria
              Reference Centers (MRCs) are Level III and IV health centers that generally see
              1,000–3,000 outpatients per month. At each MRC, individual-level data from standardized
              MOH outpatient department registers are entered into an electronic database by on-site
              data officers, quality controlled, and compiled monthly by IDRC in Kampala.
            </p>
            <div className="flex flex-col gap-6">
              <div className="space-y-3 text-lg leading-relaxed text-white/75">
                <p>
                  UMSP collects data at two levels: the <strong className="text-white">facility level</strong> (all
                  outpatients presenting to each MRC) and the <strong className="text-white">target area level</strong> (residents
                  within a defined target area surrounding each facility, enabling malaria incidence
                  estimation with a population denominator).
                </p>
                <p>
                  <Link href="/dashboard/methods" className="underline underline-offset-4 text-[#f4b63e] hover:text-[#e7a934] transition-colors">
                    Learn more about facility and target area indicators →
                  </Link>
                </p>
              </div>
              <div className="flex justify-center pt-6">
                <Button asChild size="lg" className="bg-[#f4b63e] text-slate-900 hover:bg-[#e7a934]">
                  <Link href="/dashboard">
                    Access Dashboard <ArrowRight className="ml-2 h-5 w-5" />
                  </Link>
                </Button>
              </div>
            </div>
          </div>
        </div>
      </section>

      <footer className="border-t border-white/10 bg-black/20 py-6 text-center text-sm text-white/55">
        <p>Uganda Malaria Surveillance Programme · Infectious Diseases Research Collaboration · Ministry of Health Uganda</p>
      </footer>
    </div>
  );
}
