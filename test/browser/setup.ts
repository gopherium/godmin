// SPDX-License-Identifier: Apache-2.0

import { setProjectAnnotations } from '@storybook/react-vite'
import { cleanup } from '@testing-library/react'
import { afterEach } from 'vitest'
import { commands } from 'vitest/browser'

import preview from '../../.storybook/preview.js'

setProjectAnnotations(preview)

afterEach(async () => {
	cleanup()
	await commands.reduceMotion(false)
})
