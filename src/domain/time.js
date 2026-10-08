// Utilidades de fecha puras (sin DOM). Las fechas se guardan en ISO/UTC y
// "hoy" se calcula en la zona del gimnasio. Equivale a Carbon::now($tz).

export const APP_TIMEZONE = 'America/Caracas'

const partsFormatters = new Map()

function zonedParts(date, timeZone) {
  let fmt = partsFormatters.get(timeZone)
  if (!fmt) {
    fmt = new Intl.DateTimeFormat('en-US', {
      timeZone,
      hourCycle: 'h23',
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    })
    partsFormatters.set(timeZone, fmt)
  }
  const out = {}
  for (const { type, value } of fmt.formatToParts(date)) {
    if (type !== 'literal') out[type] = Number(value)
  }
  return out
}

/** Diferencia en ms entre la hora local de `timeZone` y UTC en ese instante. */
function zoneOffsetMs(date, timeZone) {
  const p = zonedParts(date, timeZone)
  const asUtc = Date.UTC(p.year, p.month - 1, p.day, p.hour, p.minute, p.second)
  return asUtc - Math.floor(date.getTime() / 1000) * 1000
}

/** 'YYYY-MM-DD' del día calendario de `date` en `timeZone`. */
export function zonedDayKey(date, timeZone = APP_TIMEZONE) {
  const p = zonedParts(new Date(date), timeZone)
  return `${p.year}-${String(p.month).padStart(2, '0')}-${String(p.day).padStart(2, '0')}`
}

/**
 * Instante (Date) del último milisegundo del día local `now + addDays` en
 * `timeZone`. Ej.: endOfZonedDay(now, 0) = hoy a las 23:59:59.999 en Caracas.
 */
export function endOfZonedDay(now, addDays = 0, timeZone = APP_TIMEZONE) {
  const p = zonedParts(new Date(now), timeZone)
  const localEnd = Date.UTC(p.year, p.month - 1, p.day + addDays, 23, 59, 59, 999)
  // Aproximamos con el offset actual y corregimos con el offset de ese instante.
  const guess = new Date(localEnd - zoneOffsetMs(new Date(now), timeZone))
  return new Date(localEnd - zoneOffsetMs(guess, timeZone))
}

/** Días calendario (en `timeZone`) entre hoy y `target`. Negativo si ya pasó. */
export function calendarDaysBetween(now, target, timeZone = APP_TIMEZONE) {
  const a = Date.parse(zonedDayKey(now, timeZone) + 'T00:00:00Z')
  const b = Date.parse(zonedDayKey(target, timeZone) + 'T00:00:00Z')
  return Math.round((b - a) / 86_400_000)
}
