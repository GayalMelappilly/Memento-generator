export async function downloadBlob(blob: Blob, filename: string): Promise<void> {
  const url = URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  
  // Revoke after a short timeout to ensure the browser has started the download
  setTimeout(() => URL.revokeObjectURL(url), 1000);
}

export const delay = (ms: number) => new Promise(res => setTimeout(res, ms));
