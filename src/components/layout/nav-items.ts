import { BarChart3, BookOpen, Building2, Dna, FileText } from 'lucide-react';

const BASE_NAV_ITEMS = [
  { href: '/dashboard/methods', label: 'Malaria Indicators', icon: BookOpen },
  { href: '/dashboard/site-summary', label: 'Site Summary', icon: Building2 },
  { href: '/dashboard', label: 'Epi Dashboard', icon: BarChart3 },
  { href: '/dashboard/genomic-data', label: 'Genomic Dashboard', icon: Dna },
];

const REPORTS_NAV_ITEM = { href: '/dashboard/reports', label: 'Reports', icon: FileText };

/** Sidebar/mobile nav entries; Reports is a Full-access feature. */
export function getNavItems(hasFullAccess: boolean) {
  return hasFullAccess ? [...BASE_NAV_ITEMS, REPORTS_NAV_ITEM] : BASE_NAV_ITEMS;
}
