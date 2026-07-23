// Adapted from 21st.dev — kokonutd/bento-grid (hover-lift cards with dotted texture overlay)
import { motion } from 'framer-motion';
import { cn } from '@/lib/utils';

export interface BentoItem {
  title: string;
  description: string;
  icon: React.ReactNode;
  status?: string;
  meta?: string;
  colSpan?: number;
  hasPersistentHover?: boolean;
}

interface BentoGridProps {
  items: BentoItem[];
  className?: string;
}

export function BentoGrid({ items, className }: BentoGridProps) {
  return (
    <div className={cn('grid grid-cols-1 gap-3 md:grid-cols-3', className)}>
      {items.map((item, index) => (
        <motion.div
          key={index}
          initial={{ opacity: 0, transform: 'translateY(16px)' }}
          animate={{ opacity: 1, transform: 'translateY(0px)' }}
          transition={{ duration: 0.4, delay: 0.1 + index * 0.07, ease: [0.23, 1, 0.32, 1] }}
          className={cn(
            'group relative overflow-hidden rounded-3xl border border-border bg-card p-4 transition-[transform,border-color,box-shadow] duration-300',
            'hover:-translate-y-1 hover:border-primary/30 hover:shadow-xl hover:shadow-primary/10 will-change-transform',
            item.colSpan === 2 ? 'md:col-span-2' : 'col-span-1',
            item.hasPersistentHover && '-translate-y-1 border-primary/30 shadow-xl shadow-primary/10'
          )}
        >
          <div
            className={cn(
              'absolute inset-0 transition-opacity duration-300',
              item.hasPersistentHover ? 'opacity-100' : 'opacity-0 group-hover:opacity-100'
            )}
            aria-hidden="true"
          >
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,rgba(5,150,105,0.04)_1px,transparent_1px)] bg-[length:5px_5px]" />
          </div>
          <div className="relative flex flex-col gap-1.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex min-w-0 items-center gap-2">
                <div className="flex h-8 w-8 shrink-0 items-center justify-center rounded-xl bg-primary/10 text-primary transition-colors duration-300 group-hover:bg-primary/15">
                  {item.icon}
                </div>
                <h3 className="font-serif text-base font-semibold tracking-tight text-foreground sm:text-lg">
                  {item.title}
                  {item.meta && <span className="ml-2 text-sm font-normal text-muted-foreground">{item.meta}</span>}
                </h3>
              </div>
              {item.status && (
                <span className="shrink-0 rounded-full bg-muted px-2.5 py-1 text-xs font-semibold text-muted-foreground">
                  {item.status}
                </span>
              )}
            </div>
            <p className="text-xs leading-snug text-muted-foreground">{item.description}</p>
          </div>
        </motion.div>
      ))}
    </div>
  );
}
