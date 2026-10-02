import { motion } from 'framer-motion';

/** Logotipo tipográfico HEAVY·40. El punto es un lingote de brasa. */
export function Logo({ size = 28, className = '' }: { size?: number; className?: string }) {
  return (
    <span className={`inline-flex items-baseline font-display font-black uppercase leading-none ${className}`} style={{ fontSize: size }} aria-label="HEAVY·40">
      <span className="tracking-[0.02em]">Heavy</span>
      <span aria-hidden className="mx-[0.1em] inline-block" style={{ transform: 'translateY(-0.3em)' }}>
        <motion.span
          className="block bg-ember"
          style={{ width: size * 0.19, height: size * 0.19 }}
          initial={{ scale: 0, rotate: 0 }}
          animate={{ scale: 1, rotate: 45 }}
          transition={{ type: 'spring', stiffness: 420, damping: 18, delay: 0.1 }}
        />
      </span>
      <span className="text-ember">40</span>
    </span>
  );
}

export function LogoMark({ size = 40 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 64 64" aria-hidden>
      <rect width="64" height="64" rx="14" fill="rgb(var(--surface))" stroke="rgb(var(--line))" />
      <path d="M14 18h7v11h8V18h7v28h-7V35h-8v11h-7z" fill="rgb(var(--fg))" />
      <rect x="40" y="40" width="9" height="9" transform="rotate(45 44.5 44.5)" fill="rgb(var(--ember))" />
    </svg>
  );
}
