import Image from 'next/image';

const indicators = [
  {
    label: 'Test positivity rate (TPR)',
    definition: 'Proportion of tested outpatients with a positive malaria result; calculated as confirmed cases ÷ total tested.',
    facility: true,
    target: true,
  },
  {
    label: 'Malaria incidence (cases per 1,000 PY)',
    definition: 'Confirmed malaria cases among target area residents per 1,000 person-years at risk. Requires population denominator from target area census.',
    facility: false,
    target: true,
  },
  {
    label: 'Number of visits',
    definition: 'Total outpatient visits recorded at the MRC in the period.',
    facility: true,
    target: false,
  },
  {
    label: 'Suspected malaria cases',
    definition: 'Outpatients for whom malaria was clinically suspected by the attending health worker, regardless of test result.',
    facility: true,
    target: false,
  },
  {
    label: 'Proportion suspected malaria',
    definition: 'Share of all outpatient visits in which malaria was clinically suspected; calculated as suspected cases ÷ total visits.',
    facility: true,
    target: false,
  },
  {
    label: 'Proportion tested',
    definition: 'Share of clinically suspected malaria cases who received a diagnostic test; calculated as total tested ÷ suspected cases.',
    facility: true,
    target: false,
  },
  {
    label: 'Proportion visits from target area',
    definition: 'Share of all facility visits made by residents of the defined target area; used to assess target area representativeness.',
    facility: true,
    target: false,
  },
];

export default function MethodsPage() {
  return (
    <div className="space-y-10">

      {/* Page heading */}
      <div className="border-b border-border/60 pb-6">
        <h1 className="text-2xl font-bold tracking-tight text-foreground md:text-3xl">
          Malaria Indicators at MRCs: Facility vs Target Areas
        </h1>
        <p className="mt-1 text-sm text-muted-foreground">
          Understanding the two levels of UMSP surveillance data and which indicators each supports.
        </p>
      </div>

      {/* Two-column: map + explanation */}
      <div className="grid grid-cols-1 items-start gap-8 lg:grid-cols-2 lg:gap-12">

        {/* Left: Ayipe map */}
        <div className="flex flex-col gap-3">
          <Image
            src="/logo/ayipe-catchment.png"
            alt="Ayipe HCIII target area map"
            width={0}
            height={0}
            sizes="50vw"
            className="h-auto w-full rounded-xl border border-border/70 shadow-sm"
          />
          <p className="text-xs text-muted-foreground">
            Figure: Ayipe HCIII with target area boundary and enumeration area villages.
          </p>
        </div>

        {/* Right: explanatory text */}
        <div className="space-y-4 text-base leading-relaxed text-muted-foreground">
          <p>
            UMSP collects individual-level data on all outpatients presenting to each MRC, including
            whether malaria was suspected, the diagnostic test performed, and the result. From these
            data, facility-level metrics such as test positivity rate (TPR) and total confirmed
            malaria cases can be calculated for any MRC.
          </p>
          <p>
            However, these metrics lack a population denominator and cannot be used to estimate
            malaria incidence. To address this limitation, UMSP has developed a system to define
            target areas around each MRC — a set of adjacent villages with no other public health
            facility, in the same sub-county, with similar malaria incidence, and a minimum
            population of 1,200 persons.
          </p>
          <p>
            All households within each target area have been enumerated and mapped, providing the
            denominator needed to estimate malaria incidence as confirmed cases per unit time per
            population at risk.
          </p>
        </div>
      </div>

      {/* Indicator comparison table */}
      <div className="space-y-4">
        <h2 className="text-lg font-semibold tracking-tight text-foreground">
          Indicator availability by data level
        </h2>

        <div className="overflow-x-auto rounded-xl border border-border/70 bg-white">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-border/60">
                <th className="w-[22%] px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Indicator
                </th>
                <th className="w-[40%] px-5 py-4 text-left text-xs font-semibold uppercase tracking-wide text-muted-foreground">
                  Definition
                </th>
                <th className="px-5 py-4 text-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-slate-100 px-3 py-1 text-xs font-semibold text-slate-600">
                    <span className="h-2 w-2 rounded-full bg-slate-400" />
                    Facility Level
                  </span>
                </th>
                <th className="px-5 py-4 text-center">
                  <span className="inline-flex items-center gap-1.5 rounded-full bg-emerald-50 px-3 py-1 text-xs font-semibold text-emerald-700">
                    <span className="h-2 w-2 rounded-full bg-emerald-500" />
                    Target Area Level
                  </span>
                </th>
              </tr>
            </thead>
            <tbody>
              {indicators.map((row, i) => (
                <tr
                  key={row.label}
                  className={`border-b border-border/40 last:border-0 ${i % 2 === 0 ? '' : 'bg-muted/10'}`}
                >
                  <td className="px-5 py-3.5 font-medium text-foreground">{row.label}</td>
                  <td className="px-5 py-3.5 text-muted-foreground">{row.definition}</td>
                  <td className="px-5 py-3.5 text-center">
                    {row.facility ? (
                      <span className="text-lg font-bold text-emerald-500">✓</span>
                    ) : (
                      <span className="text-lg text-muted-foreground/40">—</span>
                    )}
                  </td>
                  <td className="px-5 py-3.5 text-center">
                    {row.target ? (
                      <span className="text-lg font-bold text-emerald-500">✓</span>
                    ) : (
                      <span className="text-lg text-muted-foreground/40">—</span>
                    )}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  );
}
