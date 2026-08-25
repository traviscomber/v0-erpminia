import { ImageIcon } from 'lucide-react';

type Media = { image_url?: string | null; status?: string | null; source_type?: string | null } | null;

export function ProductPhoto({ media, name, size = 'md' }: { media?: Media; name: string; size?: 'sm' | 'md' | 'lg' }) {
  const classes = size === 'sm' ? 'h-10 w-10' : size === 'lg' ? 'h-32 w-32' : 'h-14 w-14';
  if (media?.status === 'approved' && media.image_url) {
    return <img src={media.image_url} alt={`Fotografía validada de ${name}`} className={`${classes} shrink-0 rounded-md border bg-muted object-cover`} />;
  }
  return <div className={`${classes} flex shrink-0 flex-col items-center justify-center rounded-md border border-dashed bg-muted/40 text-muted-foreground`} title="Foto pendiente"><ImageIcon className="h-4 w-4"/><span className="mt-1 text-[9px] leading-none">Pendiente</span></div>;
}
