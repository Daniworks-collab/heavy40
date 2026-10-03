import { motion } from 'motion/react';
import { Camera, Columns2, ImagePlus, Lock, Trash2 } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { db, useLive, type PhotoRecord } from '@/db';
import { shortDate } from '@/lib/dates';
import { compressImage } from '@/lib/photos';
import { useUnits } from '@/lib/units';
import { useApp } from '@/store/app';
import { SectionTitle } from './ui/Page';
import { Sheet } from './ui/Sheet';

/** URL temporal para un Blob; se libera al desmontar. */
function useObjectUrl(blob?: Blob): string | undefined {
  const [url, setUrl] = useState<string>();
  useEffect(() => {
    if (!blob) return setUrl(undefined);
    const u = URL.createObjectURL(blob);
    setUrl(u);
    return () => URL.revokeObjectURL(u);
  }, [blob]);
  return url;
}

function Thumb({ photo, onOpen, selected }: { photo: PhotoRecord; onOpen: () => void; selected?: boolean }) {
  const url = useObjectUrl(photo.blob);
  return (
    <button
      onClick={onOpen}
      className={`press relative aspect-[3/4] overflow-hidden rounded-lg border bg-raised ${selected ? 'border-ember ring-2 ring-ember' : 'border-line'}`}
      aria-label={`Foto del ${shortDate(photo.date)}`}
    >
      {url && <img src={url} alt="" className="h-full w-full object-cover" loading="lazy" decoding="async" />}
      <span className="num absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 to-transparent px-2 pb-1.5 pt-5 text-left text-[11px] font-semibold text-white">
        {shortDate(photo.date)}
      </span>
    </button>
  );
}

export function PhotosSection() {
  const photos = useLive(() => db.photos.orderBy('date').toArray(), []);
  const bw = useApp((s) => s.profile.bodyweight);
  const fileRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [viewId, setViewId] = useState<number | null>(null);
  const [compare, setCompare] = useState(false);
  const list = photos ?? [];
  const viewing = list.find((p) => p.id === viewId);

  const onFiles = async (files: FileList | null) => {
    if (!files?.length) return;
    setBusy(true);
    setError(null);
    try {
      for (const f of Array.from(files)) {
        const blob = await compressImage(f);
        await db.photos.add({ date: new Date().toISOString(), blob, weightKg: bw || undefined });
      }
    } catch {
      setError('No se pudo guardar la foto. Prueba con otra imagen.');
    } finally {
      setBusy(false);
      if (fileRef.current) fileRef.current.value = '';
    }
  };

  return (
    <section className="mt-6" aria-label="Fotos de progreso">
      <SectionTitle
        right={
          <div className="flex gap-2">
            {list.length >= 2 && (
              <button className="chip min-h-[40px]" onClick={() => setCompare(true)}>
                <Columns2 size={14} aria-hidden /> Comparar
              </button>
            )}
            <button className="chip min-h-[40px]" onClick={() => fileRef.current?.click()} disabled={busy}>
              <ImagePlus size={14} aria-hidden /> {busy ? 'Guardando…' : 'Agregar'}
            </button>
          </div>
        }
      >
        Fotos
      </SectionTitle>
      <input ref={fileRef} type="file" accept="image/*" multiple className="sr-only" tabIndex={-1} aria-hidden onChange={(e) => onFiles(e.target.files)} />
      {error && (
        <p role="alert" className="mb-2 text-sm text-warn">
          {error}
        </p>
      )}
      {list.length === 0 ? (
        <button
          onClick={() => fileRef.current?.click()}
          className="press flex w-full flex-col items-center gap-2 rounded-xl border border-dashed border-line2 px-4 py-8 text-center"
        >
          <Camera size={28} className="text-ember" aria-hidden />
          <span className="font-semibold">Tu primera foto de progreso</span>
          <span className="max-w-xs text-xs text-muted">Misma luz, misma pose, cada 2-4 semanas. Después podrás compararlas lado a lado.</span>
        </button>
      ) : (
        <div className="grid grid-cols-3 gap-2 sm:grid-cols-4 lg:grid-cols-6">
          {[...list].reverse().map((p) => (
            <Thumb key={p.id} photo={p} onOpen={() => setViewId(p.id!)} />
          ))}
        </div>
      )}
      <p className="mt-2 flex items-center gap-1.5 text-xs text-muted">
        <Lock size={12} aria-hidden /> Se guardan sólo en este dispositivo; no se suben a ningún lado ni van en el respaldo.
      </p>

      <PhotoViewer photo={viewing} onClose={() => setViewId(null)} />
      <CompareSheet open={compare} photos={list} onClose={() => setCompare(false)} />
    </section>
  );
}

function PhotoViewer({ photo, onClose }: { photo?: PhotoRecord; onClose: () => void }) {
  const url = useObjectUrl(photo?.blob);
  const units = useUnits();
  const [note, setNote] = useState('');
  const [confirmDel, setConfirmDel] = useState(false);
  useEffect(() => {
    setNote(photo?.note ?? '');
    setConfirmDel(false);
  }, [photo?.id, photo?.note]);
  const save = () => photo?.id && note !== (photo.note ?? '') && db.photos.update(photo.id, { note: note.trim() || undefined });
  return (
    <Sheet
      open={!!photo}
      onClose={() => {
        save();
        onClose();
      }}
      title={photo ? shortDate(photo.date) : ''}
      eyebrow={photo?.weightKg ? `Foto de progreso · ${units.fmt(photo.weightKg)}` : 'Foto de progreso'}
      footer={
        confirmDel ? (
          <div className="flex gap-2">
            <button className="btn-ghost flex-1" onClick={() => setConfirmDel(false)}>
              Cancelar
            </button>
            <button
              className="btn-ember flex-1"
              onClick={async () => {
                if (photo?.id) await db.photos.delete(photo.id);
                onClose();
              }}
            >
              <Trash2 size={16} aria-hidden /> Borrar para siempre
            </button>
          </div>
        ) : (
          <button className="btn-ghost w-full text-warn" onClick={() => setConfirmDel(true)}>
            <Trash2 size={16} aria-hidden /> Borrar foto
          </button>
        )
      }
    >
      {url && <img src={url} alt={`Foto de progreso del ${photo ? shortDate(photo.date) : ''}`} className="mx-auto max-h-[52dvh] rounded-lg object-contain" />}
      <label className="mt-4 block">
        <span className="eyebrow mb-1 block">Nota (opcional)</span>
        <input className="field" value={note} maxLength={120} placeholder="Ej. fin de bloque, en ayunas…" onChange={(e) => setNote(e.target.value)} onBlur={save} />
      </label>
    </Sheet>
  );
}

function CompareSheet({ open, photos, onClose }: { open: boolean; photos: PhotoRecord[]; onClose: () => void }) {
  const [a, setA] = useState<number | undefined>();
  const [b, setB] = useState<number | undefined>();
  useEffect(() => {
    if (!open || photos.length < 2) return;
    setA(photos[0].id);
    setB(photos[photos.length - 1].id);
  }, [open, photos]);
  const before = photos.find((p) => p.id === a);
  const after = photos.find((p) => p.id === b);
  return (
    <Sheet open={open} onClose={onClose} title="Antes / después" eyebrow="Arrastra la línea para comparar" wide>
      {before && after && <CompareSlider before={before} after={after} />}
      <div className="mt-4 grid grid-cols-2 gap-3">
        <Picker label="Antes" photos={photos} value={a} onChange={setA} />
        <Picker label="Después" photos={photos} value={b} onChange={setB} />
      </div>
    </Sheet>
  );
}

function Picker({ label, photos, value, onChange }: { label: string; photos: PhotoRecord[]; value?: number; onChange: (id: number) => void }) {
  return (
    <label className="block">
      <span className="eyebrow mb-1 block">{label}</span>
      <select className="field" value={value ?? ''} onChange={(e) => onChange(+e.target.value)}>
        {photos.map((p) => (
          <option key={p.id} value={p.id}>
            {shortDate(p.date)}
            {p.note ? ` · ${p.note}` : ''}
          </option>
        ))}
      </select>
    </label>
  );
}

/** Comparador con divisor arrastrable (también se mueve con el teclado). */
function CompareSlider({ before, after }: { before: PhotoRecord; after: PhotoRecord }) {
  const ua = useObjectUrl(before.blob);
  const ub = useObjectUrl(after.blob);
  const box = useRef<HTMLDivElement>(null);
  const [pos, setPos] = useState(50);
  const dragging = useRef(false);
  const move = (clientX: number) => {
    const r = box.current?.getBoundingClientRect();
    if (!r) return;
    setPos(Math.max(0, Math.min(100, ((clientX - r.left) / r.width) * 100)));
  };
  return (
    <div
      ref={box}
      className="relative mx-auto aspect-[3/4] max-h-[60dvh] touch-none select-none overflow-hidden rounded-lg border border-line bg-raised"
      onPointerDown={(e) => {
        dragging.current = true;
        (e.target as HTMLElement).setPointerCapture?.(e.pointerId);
        move(e.clientX);
      }}
      onPointerMove={(e) => dragging.current && move(e.clientX)}
      onPointerUp={() => (dragging.current = false)}
      onPointerCancel={() => (dragging.current = false)}
    >
      {ub && <img src={ub} alt={`Después, ${shortDate(after.date)}`} className="absolute inset-0 h-full w-full object-cover" draggable={false} />}
      {ua && (
        <img
          src={ua}
          alt={`Antes, ${shortDate(before.date)}`}
          className="absolute inset-0 h-full w-full object-cover"
          style={{ clipPath: `inset(0 ${100 - pos}% 0 0)` }}
          draggable={false}
        />
      )}
      <span className="num absolute left-2 top-2 rounded bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">{shortDate(before.date)}</span>
      <span className="num absolute right-2 top-2 rounded bg-black/70 px-2 py-1 text-[11px] font-semibold text-white">{shortDate(after.date)}</span>
      <motion.div className="pointer-events-none absolute inset-y-0 w-0.5 bg-ember" style={{ left: `${pos}%` }} aria-hidden>
        <span className="absolute left-1/2 top-1/2 grid h-10 w-10 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full border-2 border-ember bg-bg text-ember">
          <Columns2 size={16} />
        </span>
      </motion.div>
      <input
        type="range"
        min={0}
        max={100}
        value={Math.round(pos)}
        onChange={(e) => setPos(+e.target.value)}
        className="sr-only"
        aria-label="Posición del divisor antes/después"
      />
    </div>
  );
}
