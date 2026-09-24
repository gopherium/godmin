// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'

import { keyFromLabel } from '../src/keys.js'

test.each([
	['Birth Date', 'birthDate'],
	['HTTP Status', 'httpStatus'],
	['  Next   call -- date!  ', 'nextCallDate'],
	['Café Visit', 'cafeVisit'],
	['Résumé Link', 'resumeLink'],
	['2nd Phone', 'field2ndPhone'],
	['???', 'field'],
	['', 'field'],
])('turns the label %j into the camel key %j', (label, key) => {
	expect(keyFromLabel(label, { style: 'camel' })).toBe(key)
})

test.each([
	['Birth Date', 'birth-date'],
	['  Next   call -- date!  ', 'next-call-date'],
	['Résumé Link', 'resume-link'],
	['2nd Phone', 'field-2nd-phone'],
	['???', 'field'],
])('turns the label %j into the kebab key %j', (label, key) => {
	expect(keyFromLabel(label, { style: 'kebab' })).toBe(key)
})

test.each([
	["Customer's email", 'customersEmail', 'customers-email'],
	['Customer’s email', 'customersEmail', 'customers-email'],
	['Customer‘s email', 'customersEmail', 'customers-email'],
	['Customerʼs email', 'customersEmail', 'customers-email'],
	['Customer`s email', 'customersEmail', 'customers-email'],
	['Customer´s email', 'customersEmail', 'customers-email'],
	['Hawaiʻi trip', 'hawaiiTrip', 'hawaii-trip'],
	['Temperature (ºC)', 'temperatureC', 'temperature-c'],
	['Order Nº', 'orderNo', 'order-no'],
	['Acme™ Plan', 'acmePlan', 'acme-plan'],
	['ℹ️ Notes', 'notes', 'notes'],
	['Revenue 2025¹', 'revenue2025', 'revenue-2025'],
	['1½ hours', 'field1Hours', 'field-1-hours'],
	['Area 10²³', 'area10', 'area-10'],
	['m² area', 'm2Area', 'm2-area'],
	['Encyclopædia entry', 'encyclopaediaEntry', 'encyclopaedia-entry'],
	['Manœuvre notes', 'manoeuvreNotes', 'manoeuvre-notes'],
	['Þe olde shop', 'theOldeShop', 'the-olde-shop'],
	['Proﬁle', 'profile', 'profile'],
])('keeps the words of the label %j whole', (label, camel, kebab) => {
	expect(keyFromLabel(label, { style: 'camel' })).toBe(camel)
	expect(keyFromLabel(label, { style: 'kebab' })).toBe(kebab)
})

test.each([
	['ß', 'ss'],
	['ẞ', 'ss'],
	['æ', 'ae'],
	['Æ', 'ae'],
	['œ', 'oe'],
	['ø', 'o'],
	['Ø', 'o'],
	['ł', 'l'],
	['Ł', 'l'],
	['ı', 'i'],
	['İ', 'i'],
	['đ', 'd'],
	['ð', 'd'],
	['þ', 'th'],
	['ħ', 'h'],
	['ŧ', 't'],
	['ƒ', 'f'],
	['ŀ', 'l'],
	['ə', 'e'],
	['Ə', 'e'],
	['ŋ', 'n'],
	['Ŋ', 'n'],
	['·', ''],
	['­', ''],
	['​', ''],
	['⁠', ''],
])('folds the letter %j inside a word into %j', (letter, folded) => {
	expect(keyFromLabel(`Pre${letter}post`, { style: 'kebab' })).toBe(`pre${folded}post`)
})

test('adds the first free number when the camel key is taken', () => {
	expect(keyFromLabel('Birth Date', { style: 'camel', taken: ['birthDate'] })).toBe('birthDate2')
	expect(keyFromLabel('Birth Date', { style: 'camel', taken: new Set(['birthDate', 'birthDate2']) })).toBe('birthDate3')
})

test('adds the first free number after a hyphen when the kebab key is taken', () => {
	expect(keyFromLabel('Birth Date', { style: 'kebab', taken: ['birth-date'] })).toBe('birth-date-2')
})

test('keeps the key when only other keys are taken', () => {
	expect(keyFromLabel('Birth Date', { style: 'camel', taken: ['birthPlace'] })).toBe('birthDate')
})
