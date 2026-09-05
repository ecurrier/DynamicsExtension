import { browser } from 'wxt/browser'

export const PAGE_SCRIPT_FILE = '/page.js'

export const ensurePageBridge = async (tabId: number): Promise<void> => {
  await browser.scripting.executeScript({ target: { tabId }, world: 'MAIN', files: [PAGE_SCRIPT_FILE] })
}
