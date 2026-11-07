export interface Clock {
  now(): Date;
  nowMs(): number;
  nowIso(): string;
}

export class SystemClock implements Clock {
  now(): Date {
    return new Date();
  }
  nowMs(): number {
    return Date.now();
  }
  nowIso(): string {
    return new Date().toISOString();
  }
}

export class DeterministicClock implements Clock {
  private currentMs: number;

  constructor(initialIsoOrMs: string | number = '2026-09-30T10:00:00.000Z') {
    this.currentMs = typeof initialIsoOrMs === 'string'
      ? new Date(initialIsoOrMs).getTime()
      : initialIsoOrMs;
  }

  now(): Date {
    return new Date(this.currentMs);
  }

  nowMs(): number {
    return this.currentMs;
  }

  nowIso(): string {
    return new Date(this.currentMs).toISOString();
  }

  advanceMinutes(mins: number): void {
    this.currentMs += mins * 60 * 1000;
  }

  advanceHours(hrs: number): void {
    this.currentMs += hrs * 60 * 60 * 1000;
  }

  advanceDays(days: number): void {
    this.currentMs += days * 24 * 60 * 60 * 1000;
  }

  setMs(ms: number): void {
    this.currentMs = ms;
  }
}
