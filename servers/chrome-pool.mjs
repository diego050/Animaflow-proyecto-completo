import { openBrowser } from "@remotion/renderer";

const RECYCLE_AFTER_RENDERS = 50;
const MAX_RSS_MEMORY_BYTES = 3 * 1024 * 1024 * 1024; // 3GB

let browserInstance = null;
let renderCount = 0;

export async function getBrowser() {
  const currentRss = process.memoryUsage().rss;
  
  if (browserInstance && (renderCount >= RECYCLE_AFTER_RENDERS || currentRss > MAX_RSS_MEMORY_BYTES)) {
    console.log(`Recycling browser. Renders: ${renderCount}, RSS: ${Math.round(currentRss / 1024 / 1024)}MB`);
    try {
      await browserInstance.close();
    } catch (error) {
      console.error("Error closing browser:", error);
    }
    browserInstance = null;
    renderCount = 0;
  }

  if (!browserInstance) {
    console.log("Opening new browser instance...");
    browserInstance = await openBrowser("chrome");
  }

  renderCount++;
  return browserInstance;
}
