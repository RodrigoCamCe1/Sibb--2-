import { clsx, type ClassValue } from 'clsx';
import { twMerge } from 'tailwind-merge';

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}

const BOB_FORMATTER = new Intl.NumberFormat('es-BO', {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

export function formatBOB(value: number | null | undefined, withSymbol = true) {
  if (value == null || isNaN(value)) return withSymbol ? 'Bs 0,00' : '0,00';
  const formatted = BOB_FORMATTER.format(value);
  return withSymbol ? `Bs ${formatted}` : formatted;
}

export function formatNumber(value: number | null | undefined, decimals = 2) {
  if (value == null || isNaN(value)) return '0';
  return value.toLocaleString('es-BO', {
    minimumFractionDigits: decimals,
    maximumFractionDigits: decimals,
  });
}

const UNITS = ['', 'UN', 'DOS', 'TRES', 'CUATRO', 'CINCO', 'SEIS', 'SIETE', 'OCHO', 'NUEVE'];
const TEEN = ['DIEZ', 'ONCE', 'DOCE', 'TRECE', 'CATORCE', 'QUINCE', 'DIECISÉIS', 'DIECISIETE', 'DIECIOCHO', 'DIECINUEVE'];
const TENS = ['', '', 'VEINTE', 'TREINTA', 'CUARENTA', 'CINCUENTA', 'SESENTA', 'SETENTA', 'OCHENTA', 'NOVENTA'];
const HUNDREDS = ['', 'CIENTO', 'DOSCIENTOS', 'TRESCIENTOS', 'CUATROCIENTOS', 'QUINIENTOS', 'SEISCIENTOS', 'SETECIENTOS', 'OCHOCIENTOS', 'NOVECIENTOS'];

function threeDigitsToWords(n: number): string {
  if (n === 0) return '';
  if (n === 100) return 'CIEN';
  let out = '';
  const h = Math.floor(n / 100);
  const rest = n % 100;
  if (h > 0) out += HUNDREDS[h] + ' ';
  if (rest >= 10 && rest < 20) {
    out += TEEN[rest - 10];
  } else if (rest >= 20) {
    const t = Math.floor(rest / 10);
    const u = rest % 10;
    if (t === 2 && u > 0) {
      out += 'VEINTI' + UNITS[u].toLowerCase();
    } else {
      out += TENS[t];
      if (u > 0) out += ' Y ' + UNITS[u];
    }
  } else if (rest > 0) {
    out += UNITS[rest];
  }
  return out.trim().toUpperCase();
}

/**
 * Convierte número a literal en español boliviano.
 * Soporta hasta millones. Útil para Formulario B-1 "Precio Total (Literal)".
 */
export function numberToWordsBOB(value: number): string {
  if (value === 0) return 'CERO 00/100 BOLIVIANOS';
  const isNeg = value < 0;
  const abs = Math.abs(value);
  const entero = Math.floor(abs);
  const decimal = Math.round((abs - entero) * 100);

  let palabras = '';
  const millones = Math.floor(entero / 1_000_000);
  const miles = Math.floor((entero % 1_000_000) / 1000);
  const resto = entero % 1000;

  if (millones > 0) {
    palabras += millones === 1 ? 'UN MILLÓN ' : threeDigitsToWords(millones) + ' MILLONES ';
  }
  if (miles > 0) {
    palabras += miles === 1 ? 'MIL ' : threeDigitsToWords(miles) + ' MIL ';
  }
  if (resto > 0) {
    palabras += threeDigitsToWords(resto) + ' ';
  }
  palabras = palabras.trim();
  palabras += ` ${decimal.toString().padStart(2, '0')}/100 BOLIVIANOS`;
  return (isNeg ? 'MENOS ' : '') + palabras;
}

export function formatDate(d: string | Date | null | undefined) {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  return date.toLocaleDateString('es-BO', { day: '2-digit', month: 'short', year: 'numeric' });
}

export function timeAgo(d: string | Date | null | undefined) {
  if (!d) return '—';
  const date = typeof d === 'string' ? new Date(d) : d;
  const seconds = Math.floor((Date.now() - date.getTime()) / 1000);
  if (seconds < 60) return 'hace segundos';
  if (seconds < 3600) return `hace ${Math.floor(seconds / 60)} min`;
  if (seconds < 86400) return `hace ${Math.floor(seconds / 3600)}h`;
  if (seconds < 604800) return `hace ${Math.floor(seconds / 86400)}d`;
  return formatDate(date);
}
