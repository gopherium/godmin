// SPDX-License-Identifier: Apache-2.0

import { dateI18n, getSettings, setSettings } from '@wordpress/date'
import { resetLocaleData, setLocaleData } from '@wordpress/i18n'
import { afterEach, expect, test, vi } from 'vitest'

import { LIST_CHROME_DOMAIN, listChromeCatalogFor, listDate, startListDates } from '../src/index'

/** The date settings the date package starts with, restored after each test. */
const DATE_DEFAULTS = getSettings()

/** A summer moment, when Madrid keeps UTC+2. */
const SUMMER = '2026-10-13T15:04:00Z'

/** A winter moment, when Madrid keeps UTC+1. */
const WINTER = '2026-01-05T08:09:00Z'

/** An August noon in UTC, when Madrid keeps UTC+2. */
const AUGUST = '2026-08-16T12:00:00Z'

/** A December evening, when Madrid keeps UTC+1. */
const DECEMBER = '2026-12-01T16:30:00Z'

/** A moment before 1946, when the Chatham Islands kept UTC+12:15. */
const BEFORE_1946 = '1940-06-01T00:00:00Z'

/** A few Spanish date words and the Spanish abbreviated format, as a catalogue holds them. */
const SPANISH_WORDS = {
	'January abbreviation\u0004Jan': ['Ene'],
	Monday: ['lunes'],
	'M j, Y g:i a': ['j M Y H:i'],
}

/** The words WordPress es_ES writes for the calendar, in the order the date package reads them. */
const SPANISH_CALENDAR = {
	months: [
		'enero',
		'febrero',
		'marzo',
		'abril',
		'mayo',
		'junio',
		'julio',
		'agosto',
		'septiembre',
		'octubre',
		'noviembre',
		'diciembre',
	],
	monthsShort: ['Ene', 'Feb', 'Mar', 'Abr', 'May', 'Jun', 'Jul', 'Ago', 'Sep', 'Oct', 'Nov', 'Dic'],
	weekdays: ['domingo', 'lunes', 'martes', 'miércoles', 'jueves', 'viernes', 'sábado'],
	weekdaysShort: ['Dom', 'Lun', 'Mar', 'Mié', 'Jue', 'Vie', 'Sáb'],
	meridiem: { am: 'am', pm: 'pm', AM: 'AM', PM: 'PM' },
}

/** The words WordPress fr_FR writes for the calendar, in the order the date package reads them. */
const FRENCH_CALENDAR = {
	months: [
		'janvier',
		'février',
		'mars',
		'avril',
		'mai',
		'juin',
		'juillet',
		'août',
		'septembre',
		'octobre',
		'novembre',
		'décembre',
	],
	monthsShort: ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'],
	weekdays: ['dimanche', 'lundi', 'mardi', 'mercredi', 'jeudi', 'vendredi', 'samedi'],
	weekdaysShort: ['Dim', 'Lun', 'Mar', 'Mer', 'Jeu', 'Ven', 'Sam'],
	meridiem: { am: 'am', pm: 'pm', AM: 'AM', PM: 'PM' },
}

/**
 * Loads a Spanish catalogue holding the given entries into the domain the list dates read.
 * @param entries - The translations by lookup key.
 */
function loadCatalogue(entries: Record<string, string[]>): void {
	const header = { lang: 'es-ES', 'plural-forms': 'nplurals=2; plural=(n != 1);' }
	setLocaleData({ '': header, ...entries }, LIST_CHROME_DOMAIN)
}

afterEach(() => {
	setSettings(DATE_DEFAULTS)
	resetLocaleData()
	vi.useRealTimers()
	vi.unstubAllEnvs()
})

test('writes a summer moment as WordPress lists do, on the Madrid clock', () => {
	startListDates('en-US', 'Europe/Madrid')

	expect(listDate(new Date(SUMMER))).toBe('Oct 13, 2026 5:04 pm')
})

test('writes a winter moment an hour closer to UTC, as Madrid keeps standard time', () => {
	startListDates('en-US', 'Europe/Madrid')

	expect(listDate(new Date(WINTER))).toBe('Jan 5, 2026 9:09 am')
})

test('shows the moment in the time zone it is given', () => {
	startListDates('en-US', 'Asia/Kolkata')
	expect(listDate(new Date(SUMMER))).toBe('Oct 13, 2026 8:34 pm')

	startListDates('en-US', 'America/St_Johns')
	expect(listDate(new Date(SUMMER))).toBe('Oct 13, 2026 12:34 pm')
})

test('describes the zone it is given as WordPress does', () => {
	vi.useFakeTimers({ toFake: ['Date'], now: new Date(SUMMER) })

	startListDates('en-US', 'Asia/Kolkata')
	expect(getSettings().timezone).toEqual({ offset: 5.5, offsetFormatted: '5:30', string: 'Asia/Kolkata', abbr: 'IST' })

	startListDates('en-US', 'America/St_Johns')
	expect(getSettings().timezone).toEqual({
		offset: -2.5,
		offsetFormatted: '-2:30',
		string: 'America/St_Johns',
		abbr: 'NDT',
	})

	startListDates('en-US', 'Asia/Kathmandu')
	expect(getSettings().timezone).toEqual({
		offset: 5.75,
		offsetFormatted: '5:45',
		string: 'Asia/Kathmandu',
		abbr: '+0545',
	})

	startListDates('en-US', 'Europe/Madrid')
	expect(getSettings().timezone).toEqual({ offset: 2, offsetFormatted: '2', string: 'Europe/Madrid', abbr: 'CEST' })

	vi.setSystemTime(new Date(WINTER))
	startListDates('en-US', 'Europe/Madrid')
	expect(getSettings().timezone).toEqual({ offset: 1, offsetFormatted: '1', string: 'Europe/Madrid', abbr: 'CET' })

	vi.setSystemTime(new Date(BEFORE_1946))
	startListDates('en-US', 'Pacific/Chatham')
	expect(getSettings().timezone).toEqual({
		offset: 12.25,
		offsetFormatted: '12:15',
		string: 'Pacific/Chatham',
		abbr: '+1215',
	})
})

test('takes the browser time zone when it is given none', () => {
	vi.stubEnv('TZ', 'Europe/Madrid')

	startListDates('en-US')

	expect(getSettings().timezone.string).toBe('Europe/Madrid')
	expect(listDate(new Date(WINTER))).toBe('Jan 5, 2026 9:09 am')
})

test('writes a Date and the text a server stored alike', () => {
	startListDates('en-US', 'Europe/Madrid')

	for (const at of [new Date(SUMMER), '2026-10-13T15:04:00Z', '2026-10-13T15:04:05.123456Z']) {
		expect(listDate(at), String(at)).toBe('Oct 13, 2026 5:04 pm')
	}
})

test('reads text with no offset on the clock of the zone it booted', () => {
	startListDates('en-US', 'Europe/Madrid')

	expect(listDate('2026-10-13T17:04')).toBe('Oct 13, 2026 5:04 pm')
})

test('keeps the date settings it does not own', () => {
	startListDates('en-US', 'Europe/Madrid')

	expect(getSettings().formats.date).toBe('F j, Y')
	expect(getSettings().formats.time).toBe('g:i a')
	expect(getSettings().l10n.relative).toEqual(DATE_DEFAULTS.l10n.relative)
})

test('hands the calendars the reader language', () => {
	startListDates('de-DE')

	expect(new Intl.Locale(getSettings().l10n.locale).baseName).toBe('de-DE')
})

test('writes the catalogue words when the language name was registered before with other words', () => {
	const monthsShort = SPANISH_CALENDAR.monthsShort.map((short) => short.toLowerCase())
	setSettings({ ...DATE_DEFAULTS, l10n: { ...DATE_DEFAULTS.l10n, locale: 'es-MX', monthsShort } })
	loadCatalogue(SPANISH_WORDS)

	startListDates('es-MX', 'Europe/Madrid')

	expect(listDate(new Date(WINTER))).toBe('5 Ene 2026 09:09')
})

test('reads the month and weekday words and the formats from the loaded catalogue', () => {
	loadCatalogue(SPANISH_WORDS)

	startListDates('es-ES', 'Europe/Madrid')

	expect(listDate(new Date(WINTER))).toBe('5 Ene 2026 09:09')
	expect(getSettings().l10n.weekdays).toEqual([
		'Sunday',
		'lunes',
		'Tuesday',
		'Wednesday',
		'Thursday',
		'Friday',
		'Saturday',
	])
})

test('hands the date filters the full date and time format of the catalogue', () => {
	loadCatalogue({ 'F j, Y g:i a': ['j \\d\\e F \\d\\e Y H:i'], October: ['octubre'] })

	startListDates('es-ES', 'Europe/Madrid')

	expect(dateI18n(getSettings().formats.datetime, SUMMER)).toBe('13 de octubre de 2026 17:04')
})

test('writes am and pm in the words of the catalogue', () => {
	loadCatalogue({ pm: ['p. m.'] })

	startListDates('es-ES', 'Europe/Madrid')

	expect(listDate(new Date(SUMMER))).toBe('Oct 13, 2026 5:04 p. m.')
})

test('writes the morning and afternoon words of the catalogue in either case', () => {
	loadCatalogue({ am: ['a. m.'], pm: ['p. m.'], AM: ['A. M.'], PM: ['P. M.'] })

	startListDates('es-ES', 'Europe/Madrid')

	expect(dateI18n('a A', WINTER)).toBe('a. m. A. M.')
	expect(dateI18n('a A', SUMMER)).toBe('p. m. P. M.')
})

test.each([
	{ named: undefined, first: 1 },
	{ named: '0', first: 0 },
	{ named: '6', first: 6 },
	{ named: 'lunes', first: 1 },
])('starts the weeks on the day the catalogue names, Monday when it names none: $named', ({ named, first }) => {
	loadCatalogue(named === undefined ? {} : { 'start of week\u00041': [named] })

	startListDates('es-ES', 'Europe/Madrid')

	expect(getSettings().l10n.startOfWeek).toBe(first)
})

test('follows a language change after boot', () => {
	startListDates('en-US', 'Europe/Madrid')
	expect(listDate(new Date(WINTER))).toBe('Jan 5, 2026 9:09 am')

	loadCatalogue(SPANISH_WORDS)
	startListDates('es-ES', 'Europe/Madrid')
	expect(listDate(new Date(WINTER))).toBe('5 Ene 2026 09:09')

	resetLocaleData()
	startListDates('en-US', 'Europe/Madrid')
	expect(listDate(new Date(WINTER))).toBe('Jan 5, 2026 9:09 am')
})

test('writes the words of a second boot of the same language', () => {
	startListDates('es-ES', 'Europe/Madrid')
	expect(listDate(new Date(WINTER))).toBe('Jan 5, 2026 9:09 am')

	loadCatalogue(SPANISH_WORDS)
	startListDates('es-ES', 'Europe/Madrid')
	expect(listDate(new Date(WINTER))).toBe('5 Ene 2026 09:09')

	resetLocaleData()
	startListDates('es-ES', 'Europe/Madrid')
	expect(listDate(new Date(WINTER))).toBe('Jan 5, 2026 9:09 am')
})

test.each([
	{ at: SUMMER, written: '13 Oct 2026 17:04' },
	{ at: AUGUST, written: '16 Ago 2026 14:00' },
	{ at: WINTER, written: '5 Ene 2026 09:09' },
	{ at: DECEMBER, written: '1 Dic 2026 17:30' },
])('writes a moment as WordPress es_ES lists do for a Spanish reader: $at', async ({ at, written }) => {
	setLocaleData(await listChromeCatalogFor('es-ES'), LIST_CHROME_DOMAIN)

	startListDates('es-ES', 'Europe/Madrid')

	expect(listDate(new Date(at))).toBe(written)
})

test.each([
	{ locale: 'es-ES', calendar: SPANISH_CALENDAR },
	{ locale: 'fr-FR', calendar: FRENCH_CALENDAR },
])('hands the date package every calendar word it ships, in calendar order: $locale', async ({ locale, calendar }) => {
	setLocaleData(await listChromeCatalogFor(locale), LIST_CHROME_DOMAIN)

	startListDates(locale, 'Europe/Madrid')

	expect(getSettings().l10n).toMatchObject(calendar)
})

test.each([
	{ at: SUMMER, written: '13 octobre 2026 17h04' },
	{ at: AUGUST, written: '16 août 2026 14h00' },
	{ at: WINTER, written: '05 janvier 2026 9h09' },
	{ at: DECEMBER, written: '01 décembre 2026 17h30' },
])('writes a moment in the French words and format for a French reader: $at', async ({ at, written }) => {
	setLocaleData(await listChromeCatalogFor('fr-FR'), LIST_CHROME_DOMAIN)

	startListDates('fr-FR', 'Europe/Madrid')

	expect(listDate(new Date(at))).toBe(written)
})
