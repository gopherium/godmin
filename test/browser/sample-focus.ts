// SPDX-License-Identifier: Apache-2.0

/** Records the element that holds the focus on every frame until stopped. */
export function sampleFocus(): { seen: Set<Element | null>; stop: () => void } {
	const seen = new Set<Element | null>()
	let going = true
	const sample = () => {
		seen.add(document.activeElement)
		if (going) {
			requestAnimationFrame(sample)
		}
	}
	sample()
	return { seen, stop: () => (going = false) }
}
