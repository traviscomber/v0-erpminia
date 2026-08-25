import { ImageIcon } from 'lucide-react';

type Media = { image_url?: string | null; status?: string | null; source_type?: string | null } | null;

export function ProductPhoto({ media, name, size = 'md', showPending = false }: { media?: Media; name: string; size?: 'sm' | 'md' | 'lg'; showPending?: boolean }) {
  const classes = size === 'sm' ? 'h-10 w-10' : size === 'lg' ? 'h-32 w-32' : 'h-14 w-14';
  const canShowImage = Boolean(media?.image_url && (media?.status === 'approved' || (showPending && media?.status === 'pending')));

  if (canShowImage) {
    const pending = media?.status === 'pending';
    return (
      <div className={`${classes} relative shrink-0`}>
        <img
          src={media?.image_url || ''}
          alt={pending ? `Fotografía IA pendiente de validación de ${name}` : `Fotografía validada de ${name}`}
          className="h-full w-full rounded-md border bg-muted object-cover"
        />
        {pending ? (
          <span className="absolute bottom-1 left-1 rounded-sm bg-background/90 px-1.5 py-0.5 text-[9px] leading-none text-muted-foreground shadow-sm">
            Pendiente
          </span>
        ) : null}
      </div>
    );
  }

  return <div className={`${classes} flex shrink-0 flex-col items-center justify-center rounded-md border border-dashed bg-muted/40 text-muted-foreground`} title="Foto pendiente"><ImageIcon className="h-4 w-4"/><span className="mt-1 text-[9px] leading-none">Pendiente</span></div>;
}
