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
