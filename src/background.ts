chrome.commands.onCommand.addListener(async (command) => {
  if (command !== "open-paperlens") return;
  const tabs = await chrome.tabs.query({ active: true, currentWindow: true });
  const tab = tabs[0];
  if (!tab?.id) return;
  await chrome.scripting.executeScript({
    target: { tabId: tab.id },
    func: () => window.dispatchEvent(new CustomEvent("paperlens-open"))
  });
});