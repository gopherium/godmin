// SPDX-License-Identifier: Apache-2.0

import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'

import { expect, test } from 'vitest'

/** The README npm shows beside the package. */
const readme = readFileSync(resolve(import.meta.dirname, '../README.md'), 'utf8')

test('the README tells an app of the dialogs entry to load the components stylesheet', () => {
	const row = readme.split('\n').find((line) => line.startsWith('| `@gopherium/godmin/dialogs` |'))

	expect(row).toContain('@wordpress/components/build-style/style.css')
})
