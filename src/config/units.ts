import type { Units } from '@/db/schema';

/**
 * Canonical storage is ALWAYS kilograms (project convention). Conversion
 * happens exactly twice per value: kg → display unit when rendering, and
 * display unit → kg once on commit. Stored values are never rounded and
 * never converted back and forth.
 */
export const LB_PER_KG = 2.2046226218;
export const KG_PER_LB = 0.45359237;

/** kg → display-unit number (unrounded; format for rendering instead). */
export function kgToDisplayUnit(kg: number, units: Units): number {
  return units === 'lb' ? kg * LB_PER_KG : kg;
}

/** display-unit number → canonical kg (stored unrounded). */
export function displayUnitToKg(value: number, units: Units): number {
  return units === 'lb' ? value * KG_PER_LB : value;
}

/** kg → display string: integers plain, otherwise one decimal place. */
export function formatWeightKg(kg: number, units: Units): string {
  const value = kgToDisplayUnit(kg, units);
  const rounded = Math.round(value * 10) / 10;
  return String(Number.isInteger(rounded) ? rounded : rounded.toFixed(1));
}

export function weightUnitLabel(units: Units): string {
  return units === 'lb' ? 'lb' : 'kg';
}

/** Apply a display-unit increment (e.g. +2.5 lb) to a canonical kg value. */
export function incrementKg(kg: number, deltaDisplayUnits: number, units: Units): number {
  const display = kgToDisplayUnit(kg, units) + deltaDisplayUnits;
  return Math.max(0, displayUnitToKg(display, units));
}
