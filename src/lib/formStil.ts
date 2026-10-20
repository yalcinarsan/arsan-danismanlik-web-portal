// Form alanlarının ortak görünümü. Daha önce altı bileşende ayrı ayrı yazılıydı
// (denetim 18 Eki, bulgu 8); biri değişince öbürleri geride kalıyordu.

const alanTemel = 'w-full rounded-md border bg-white px-3 py-2 text-ink focus:outline-none';

export const inputCls = `${alanTemel} border-warm-border focus:border-accent`;
export const labelCls = 'block text-sm font-medium text-ink mb-1.5';

/** Zorunlu olup boş bırakılan metin/seçim alanı: kırmızı çerçeve. */
export const eksikInputCls = `${alanTemel} border-red-600 ring-1 ring-red-600 focus:border-red-600`;

/** Zorunlu olup boş bırakılan seçenek grubu (düğmeler, radyo, onay kutusu).
 *  Çerçeve gölgeyle çizilir, yer kaplamaz; grup kaymaz. */
export const eksikGrupCls = 'rounded-md ring-2 ring-red-600 ring-offset-8 ring-offset-paper';
