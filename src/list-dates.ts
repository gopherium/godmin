// SPDX-License-Identifier: Apache-2.0

import { dateI18n, getDate, getSettings, setSettings } from '@wordpress/date'
import type { L10nSettings, TimezoneConfig } from '@wordpress/date'
import { __, _x } from '@wordpress/i18n'

/** The days a week may start on, Sunday first, as the date settings number them. */
const WEEK_DAYS = [0, 1, 2, 3, 4, 5, 6] as const

/** The word sets each language was booted with, each kept under a private name of its own. */
const wordSets = new Map<string, string[]>()

/**
 * Returns the month names of the loaded catalogue, January first.
 * @returns The twelve month names.
 */
function monthNames(): string[] {
	return [
		__('January'),
		__('February'),
		__('March'),
		__('April'),
		__('May'),
		__('June'),
		__('July'),
		__('August'),
		__('September'),
		__('October'),
		__('November'),
		__('December'),
	]
}

/**
 * Returns the month abbreviations of the loaded catalogue, January first.
 * @returns The twelve month abbreviations.
 */
function monthAbbreviations(): string[] {
	return [
		_x('Jan', 'January abbreviation'),
		_x('Feb', 'February abbreviation'),
		_x('Mar', 'March abbreviation'),
		_x('Apr', 'April abbreviation'),
		_x('May', 'May abbreviation'),
		_x('Jun', 'June abbreviation'),
		_x('Jul', 'July abbreviation'),
		_x('Aug', 'August abbreviation'),
		_x('Sep', 'September abbreviation'),
		_x('Oct', 'October abbreviation'),
		_x('Nov', 'November abbreviation'),
		_x('Dec', 'December abbreviation'),
	]
}

/**
 * Returns the weekday names of the loaded catalogue, Sunday first.
 * @returns The seven weekday names.
 */
function weekdayNames(): string[] {
	return [__('Sunday'), __('Monday'), __('Tuesday'), __('Wednesday'), __('Thursday'), __('Friday'), __('Saturday')]
}

/**
 * Returns the weekday abbreviations of the loaded catalogue, Sunday first.
 * @returns The seven weekday abbreviations.
 */
function weekdayAbbreviations(): string[] {
	return [__('Sun'), __('Mon'), __('Tue'), __('Wed'), __('Thu'), __('Fri'), __('Sat')]
}

/**
 * Returns the am and pm words of the loaded catalogue.
 * @returns The lower and upper case words.
 */
function meridiem(): L10nSettings['meridiem'] {
	return { am: __('am'), pm: __('pm'), AM: __('AM'), PM: __('PM') }
}

/**
 * Returns the first weekday the loaded catalogue names, Monday when it names none.
 * @returns The first day of the week, Sunday being 0.
 */
function startOfWeek(): L10nSettings['startOfWeek'] {
	const named = _x('1', 'start of week')
	return WEEK_DAYS.find((day) => String(day) === named) ?? 1
}

/**
 * Returns an hour offset written as WordPress writes it, such as 5:30.
 * @param offset - The offset in hours.
 * @returns The offset with its fraction written as minutes.
 */
function offsetText(offset: number): string {
	return String(offset).replace('.25', ':15').replace('.5', ':30').replace('.75', ':45')
}

/**
 * Returns the time zone settings of a zone at this moment, as WordPress hands them to the date package.
 * @param zone - The IANA time zone.
 * @returns The offset, its written form, the zone and its abbreviation.
 */
function zoneSettings(zone: string): TimezoneConfig {
	const now = new Date()
	const offset = Number(dateI18n('Z', now, zone)) / 3600
	return { offset, offsetFormatted: offsetText(offset), string: zone, abbr: dateI18n('T', now, zone) }
}

/**
 * Returns the private name the date package keeps a word set under, so no language registered elsewhere holds it.
 * @param locale - The language the reader settled on.
 * @param words - The words of this boot, as JSON.
 * @returns The language with a private use suffix naming this word set.
 */
function localeName(locale: string, words: string): string {
	const sets = wordSets.get(locale) ?? []
	if (!sets.includes(words)) {
		sets.push(words)
	}
	wordSets.set(locale, sets)
	return `${locale}-x-g${sets.indexOf(words)}`
}

/**
 * Hands the date package the WordPress words and formats of the loaded catalogue, the first weekday and a time zone.
 * @param locale - The language the reader settled on, such as es-ES.
 * @param timeZone - The IANA time zone list dates show, the browser's own when left out.
 */
export function startListDates(locale: string, timeZone?: string): void {
	const held = getSettings()
	const words = {
		months: monthNames(),
		monthsShort: monthAbbreviations(),
		weekdays: weekdayNames(),
		weekdaysShort: weekdayAbbreviations(),
		meridiem: meridiem(),
	}
	setSettings({
		...held,
		formats: { ...held.formats, datetime: __('F j, Y g:i a'), datetimeAbbreviated: __('M j, Y g:i a') },
		l10n: {
			...held.l10n,
			...words,
			locale: localeName(locale, JSON.stringify(words)),
			startOfWeek: startOfWeek(),
		},
		timezone: zoneSettings(timeZone ?? Intl.DateTimeFormat().resolvedOptions().timeZone),
	})
}

/**
 * Returns a moment in the abbreviated date and time WordPress lists show.
 * @param at - The moment, as a Date or as the text a server stored.
 * @returns The date and time, such as Oct 13, 2026 5:04 pm.
 */
export function listDate(at: Date | string): string {
	return dateI18n(getSettings().formats.datetimeAbbreviated, typeof at === 'string' ? getDate(at) : at)
}
