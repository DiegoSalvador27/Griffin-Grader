/**
 * Getting a file off the iPad (SPEC 4.7).
 *
 * The important part is transient activation. `navigator.share()` only works
 * while the browser still considers itself inside the user's tap, and any
 * `await` before the call can spend that activation, after which iOS Safari
 * rejects with NotAllowedError. So the File is built up front by the caller
 * and this function does no async work before calling share.
 *
 * Falls back to a Blob URL download anywhere share is unavailable, which also
 * covers Playwright's WebKit, where navigator.share does not exist.
 */

export function makeFile(name: string, contents: string, type: string): File {
  return new File([contents], name, { type });
}

export type ShareResult = 'shared' | 'downloaded' | 'cancelled';

export function shareOrDownload(file: File): Promise<ShareResult> {
  const canShare = navigator.canShare?.({ files: [file] }) ?? false;

  if (canShare && navigator.share) {
    // No await before this call: see the note above.
    return navigator
      .share({ files: [file], title: file.name })
      .then<ShareResult>(() => 'shared')
      .catch((error: unknown) => {
        // The user closing the share sheet is not a failure.
        if (error instanceof Error && error.name === 'AbortError') return 'cancelled';
        download(file);
        return 'downloaded';
      });
  }

  download(file);
  return Promise.resolve('downloaded');
}

function download(file: File): void {
  const url = URL.createObjectURL(file);
  const link = document.createElement('a');
  link.href = url;
  link.download = file.name;
  document.body.appendChild(link);
  link.click();
  link.remove();
  // Revoked on the next tick so Safari has started the download first.
  setTimeout(() => URL.revokeObjectURL(url), 0);
}
