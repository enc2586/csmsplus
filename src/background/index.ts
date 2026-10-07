// Document viewer images are on doc.coursemos.co.kr, which the content script cannot
// fetch across origins, so the service worker downloads them and returns base64.
async function downloadImage(url: string) {
  try {
    const response = await fetch(url);
    if (!response.ok) return { success: false, status: response.status };
    const bytes = new Uint8Array(await response.arrayBuffer());
    let binary = "";
    for (const byte of bytes) binary += String.fromCharCode(byte);
    return { success: true, data: btoa(binary) };
  } catch (error) {
    return { success: false, error: (error as Error).message };
  }
}

chrome.runtime.onMessage.addListener((request, _sender, sendResponse) => {
  if (request.action !== "downloadImage") return;
  void downloadImage(request.url).then(sendResponse);
  // Keeps the message channel open for the asynchronous response.
  return true;
});

chrome.action.onClicked.addListener(() => {
  void chrome.runtime.openOptionsPage();
});
