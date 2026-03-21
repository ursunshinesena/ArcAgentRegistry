/**
 * Fire-and-forget toast.
 * Uses CustomEvent so it works from any client component without threading context.
 */
export function toast(
  message: string,
  type: "success" | "info" | "error" = "success"
): void {
  if (typeof window === "undefined") return;
  window.dispatchEvent(
    new CustomEvent("arc:toast", { detail: { message, type } })
  );
}

/** Write text to clipboard and show a success toast */
export async function copyToClipboard(
  text: string,
  label = "Copied to clipboard"
): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    toast(label, "success");
  } catch {
    // fallback for environments without clipboard API
    const el = document.createElement("textarea");
    el.value = text;
    el.style.position = "fixed";
    el.style.opacity = "0";
    document.body.appendChild(el);
    el.select();
    document.execCommand("copy");
    document.body.removeChild(el);
    toast(label, "success");
  }
}
