/**
 * i18n translation function for frontend.
 * Translations are passed from PHP via wp_localize_script() as window.hbookingl10n.
 */

declare global {
	interface Window {
		hbookingl10n: Record<string, string>;
	}
}

/**
 * Translates a string.
 * @param original - The original English string.
 * @returns Translated string if available, otherwise the original.
 */
export function __(original: string): string {
	if (
		typeof window !== "undefined" &&
		window.hbookingl10n &&
		window.hbookingl10n[original]
	) {
		return window.hbookingl10n[original];
	}
	return original;
}
