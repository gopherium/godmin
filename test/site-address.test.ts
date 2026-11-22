// SPDX-License-Identifier: Apache-2.0

import { expect, test } from 'vitest'

import { siteAddress } from '../src/site-address.js'

test.each([
	['www.example.com', 'example.com'],
	['WWW.example.com', 'example.com'],
	['www.example.com:8080', 'example.com:8080'],
	['example.com', 'example.com'],
	['localhost:8080', 'localhost:8080'],
	['wwwexample.com', 'wwwexample.com'],
	['admin.www.example.com', 'admin.www.example.com'],
])('shows the host %s as %s, dropping a leading www. as WordPress shows a site address', (host, shown) => {
	expect(siteAddress(host)).toBe(shown)
})
