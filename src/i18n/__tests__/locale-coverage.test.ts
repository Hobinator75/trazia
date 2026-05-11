import { describe, expect, it } from 'vitest';

import de from '../locales/de.json';
import en from '../locales/en.json';

type AnyObject = Record<string, unknown>;

function flatten(obj: AnyObject, prefix = ''): string[] {
  const out: string[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      out.push(...flatten(value as AnyObject, path));
    } else {
      out.push(path);
    }
  }
  return out.sort();
}

function interpolationVars(value: string): string[] {
  const out = new Set<string>();
  const re = /\{\{\s*([a-zA-Z_][a-zA-Z0-9_]*)\s*\}\}/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(value)) !== null) out.add(m[1] ?? '');
  return [...out].sort();
}

function walk(obj: AnyObject, prefix = ''): { key: string; value: string }[] {
  const out: { key: string; value: string }[] = [];
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      out.push(...walk(value as AnyObject, path));
    } else if (typeof value === 'string') {
      out.push({ key: path, value });
    }
  }
  return out;
}

describe('i18n locale coverage', () => {
  const deKeys = flatten(de as AnyObject);
  const enKeys = flatten(en as AnyObject);

  it('de.json and en.json expose the same key set', () => {
    const onlyInDe = deKeys.filter((k) => !enKeys.includes(k));
    const onlyInEn = enKeys.filter((k) => !deKeys.includes(k));
    expect(
      { onlyInDe, onlyInEn },
      `Locale bundles drifted. Missing in en: ${onlyInDe.join(', ')}. Missing in de: ${onlyInEn.join(', ')}`,
    ).toEqual({ onlyInDe: [], onlyInEn: [] });
  });

  it('every key holds a non-empty string in both locales', () => {
    const empties: string[] = [];
    for (const entry of walk(de as AnyObject)) {
      if (!entry.value.trim()) empties.push(`de:${entry.key}`);
    }
    for (const entry of walk(en as AnyObject)) {
      if (!entry.value.trim()) empties.push(`en:${entry.key}`);
    }
    expect(empties).toEqual([]);
  });

  it('matching keys use the same interpolation variables in both locales', () => {
    const deMap = new Map(walk(de as AnyObject).map((e) => [e.key, e.value]));
    const enMap = new Map(walk(en as AnyObject).map((e) => [e.key, e.value]));
    const mismatches: string[] = [];
    for (const key of deKeys) {
      const deVal = deMap.get(key);
      const enVal = enMap.get(key);
      if (typeof deVal !== 'string' || typeof enVal !== 'string') continue;
      const deVars = interpolationVars(deVal).join(',');
      const enVars = interpolationVars(enVal).join(',');
      if (deVars !== enVars) {
        mismatches.push(`${key}: de={${deVars}} en={${enVars}}`);
      }
    }
    expect(mismatches, mismatches.join('\n')).toEqual([]);
  });
});
