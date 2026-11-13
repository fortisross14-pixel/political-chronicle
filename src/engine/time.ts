import { getOffice } from '../data';
import type { Career, Clock, Office } from './types';

export const NORMAL_YEAR_TURNS = 3;
export const ELECTION_YEAR_TURNS = 4;

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

export function isOfficeElectionYear(office: Office, year: number): boolean {
  return year % office.cycle.every === office.cycle.offset;
}

/** Next year >= `fromYear` in which this office holds an election. */
export function nextElectionYear(office: Office, fromYear: number): number {
  let year = fromYear;
  while (!isOfficeElectionYear(office, year)) year++;
  return year;
}

/**
 * An election year is any year in which a race the player holds or is running for is
 * decided (DESIGN §2.1).
 */
export function isElectionYear(career: Career, year: number): boolean {
  if (career.race && career.race.electionYear === year) return true;
  if (career.office && career.office.termEndsYear === year) {
    return isOfficeElectionYear(getOffice(career.office.officeId), year);
  }
  return false;
}

export function turnsInYear(career: Career, year: number): number {
  return isElectionYear(career, year) ? ELECTION_YEAR_TURNS : NORMAL_YEAR_TURNS;
}

/** Length of a turn in months: 4 in a normal year, 3 in an election year. */
export function monthsPerTurn(turnsThisYear: number): number {
  return 12 / turnsThisYear;
}

/** Scale for anything that accrues over time (income, upkeep, decay). 1.0 = a 3-month turn. */
export function monthsFactor(clock: Clock): number {
  return monthsPerTurn(clock.turnsThisYear) / 3;
}

export function turnMonths(clock: Clock): { startMonth: number; endMonth: number } {
  const length = monthsPerTurn(clock.turnsThisYear);
  const startMonth = clock.turn * length;
  return { startMonth, endMonth: startMonth + length - 1 };
}

/** e.g. "May–Aug 2027" */
export function turnLabel(clock: Clock): string {
  const { startMonth, endMonth } = turnMonths(clock);
  return `${MONTHS[startMonth]}–${MONTHS[endMonth]} ${clock.year}`;
}

export function isElectionTurn(clock: Clock, career: Career): boolean {
  return isElectionYear(career, clock.year) && clock.turn === clock.turnsThisYear - 1;
}
