'use client';

import { Download } from 'lucide-react';
import { Button } from '@/components/ui/button';

interface DownloadButtonProps {
  onClick: () => void;
  label: string;
  variant?: 'default' | 'outline' | 'secondary' | 'ghost';
  size?: 'default' | 'sm' | 'lg' | 'icon';
  disabled?: boolean;
}

export function DownloadButton({ onClick, label, variant = 'outline', size = 'sm', disabled }: DownloadButtonProps) {
  return (
    <Button variant={variant} size={size} onClick={onClick} disabled={disabled}>
      <Download className="w-4 h-4 mr-2" />
      {label}
    </Button>
  );
}
