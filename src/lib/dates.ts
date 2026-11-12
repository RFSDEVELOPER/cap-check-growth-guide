/** Brazil (America/Sao_Paulo) has been on UTC-3 all year since 2019. */
const BR_OFFSET_HOURS = 3;

/**
 * ISO instant of the first moment of the current month in Brazil time, so "this month" in the
 * admin does not depend on the time zone of the browser or the server.
 */
export function monthStartBR(now: Date = new Date()): string {
  const local = new Date(now.getTime() - BR_OFFSET_HOURS * 3_600_000);
  return new Date(
    Date.UTC(local.getUTCFullYear(), local.getUTCMonth(), 1, BR_OFFSET_HOURS),
  ).toISOString();
}

/** Brazilian short date (31/12/2026). Plain dates (YYYY-MM-DD) are read at noon to avoid time zone shifts. */
export const dateBR = (iso: string | null | undefined): string =>
  iso ? new Date(iso.length === 10 ? `${iso}T12:00:00` : iso).toLocaleDateString("pt-BR") : "—";
