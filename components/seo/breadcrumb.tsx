// components/seo/breadcrumb.tsx
import Link from 'next/link';
import Script from 'next/script';
import { breadcrumbSchema } from '@/lib/schema-markup';

interface BreadcrumbItem {
  name: string;
  url?: string;
}

interface BreadcrumbProps {
  items: BreadcrumbItem[];
}

export function Breadcrumb({ items }: BreadcrumbProps) {
  const breadcrumbs = [
    { name: 'Inicio', url: '/' },
    ...items,
  ];

  const schemaItems = breadcrumbs.map((item) => ({
    name: item.name,
    url: item.url || '#',
  }));

  return (
    <>
      <Script
        id="breadcrumb-schema"
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(breadcrumbSchema(schemaItems)) }}
        strategy="afterInteractive"
      />
      <nav className="flex items-center text-sm text-muted-foreground mb-6">
        {breadcrumbs.map((item, index) => (
          <div key={index} className="flex items-center">
            {index > 0 && <span className="mx-2">/</span>}
            {item.url ? (
              <Link href={item.url} className="hover:text-foreground transition-colors">
                {item.name}
              </Link>
            ) : (
              <span>{item.name}</span>
            )}
          </div>
        ))}
      </nav>
    </>
  );
}
