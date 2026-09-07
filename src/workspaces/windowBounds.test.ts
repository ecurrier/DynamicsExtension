import { describe, expect, it } from 'vitest'

import { growToFit } from './windowBounds'

const screen = { width: 1920, height: 1080 }

describe('growToFit', () => {
  it('grows a small window up to the workspace minimum', () => {
    expect(growToFit({ width: 720, height: 660 }, screen)).toEqual({ width: 1100, height: 720 })
  })

  it('leaves a window alone once it is large enough', () => {
    expect(growToFit({ width: 1400, height: 900 }, screen)).toBeNull()
  })

  it('only grows the side that is too small', () => {
    expect(growToFit({ width: 1400, height: 660 }, screen)).toEqual({ width: 1400, height: 720 })
  })

  it('never grows past the available screen', () => {
    expect(growToFit({ width: 720, height: 660 }, { width: 1000, height: 700 })).toEqual({ width: 1000, height: 700 })
  })

  it('does not shrink a window on a screen smaller than the minimum', () => {
    expect(growToFit({ width: 1200, height: 800 }, { width: 1000, height: 700 })).toBeNull()
  })
})
