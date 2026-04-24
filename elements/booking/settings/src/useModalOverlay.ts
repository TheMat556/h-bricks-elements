import { useEffect } from "react";
import { tr } from "./i18n";
import { BOOKING_MODAL_Z_INDEX } from "./shared/constants";

const BOOKING_MODAL_OVERLAY_ID = "hbe-booking-modal-overlay";

export function getAdminModalContainer(): HTMLElement {
	return (
		document.getElementById("react-shell-root") ??
		document.getElementById("h-bricks-admin-root") ??
		document.body
	);
}

export function getParentShellRoot(): HTMLElement | null {
	if (window.parent === window) {
		return null;
	}
	try {
		return window.parent.document.getElementById("react-shell-root");
	} catch {
		return null;
	}
}

export function useModalOverlay(
	modalOpen: boolean,
	closeModal: () => void,
	maskColor?: string,
) {
	useEffect(() => {
		const shellRoot = getParentShellRoot();

		if (!modalOpen || !shellRoot) {
			shellRoot?.querySelector(`#${BOOKING_MODAL_OVERLAY_ID}`)?.remove();
			return;
		}

		const parentDocument = shellRoot.ownerDocument;
		shellRoot.querySelector(`#${BOOKING_MODAL_OVERLAY_ID}`)?.remove();

		const overlay = parentDocument.createElement("div");
		overlay.id = BOOKING_MODAL_OVERLAY_ID;
		overlay.setAttribute("aria-hidden", "true");
		Object.assign(overlay.style, {
			position: "fixed",
			inset: "0",
			display: "grid",
			gridTemplateColumns: "var(--sidebar-width, 240px) minmax(0, 1fr)",
			gridTemplateRows: "var(--shell-navbar-height, 64px) 1fr",
			gridTemplateAreas: '"sidebar navbar" "sidebar content"',
			pointerEvents: "none",
			zIndex: String(BOOKING_MODAL_Z_INDEX - 1),
		} satisfies Partial<CSSStyleDeclaration>);

		const sidebarBackdrop = parentDocument.createElement("button");
		sidebarBackdrop.type = "button";
		sidebarBackdrop.tabIndex = -1;
		sidebarBackdrop.setAttribute("aria-label", tr("Close dialog"));
		Object.assign(sidebarBackdrop.style, {
			gridArea: "sidebar",
			background: maskColor ?? "rgba(0, 0, 0, 0.45)",
			border: "0",
			padding: "0",
			margin: "0",
			cursor: "default",
			pointerEvents: "auto",
		} satisfies Partial<CSSStyleDeclaration>);
		sidebarBackdrop.addEventListener("click", closeModal);

		const navbarBackdrop = parentDocument.createElement("button");
		navbarBackdrop.type = "button";
		navbarBackdrop.tabIndex = -1;
		navbarBackdrop.setAttribute("aria-label", tr("Close dialog"));
		Object.assign(navbarBackdrop.style, {
			gridArea: "navbar",
			background: maskColor ?? "rgba(0, 0, 0, 0.45)",
			border: "0",
			padding: "0",
			margin: "0",
			cursor: "default",
			pointerEvents: "auto",
		} satisfies Partial<CSSStyleDeclaration>);
		navbarBackdrop.addEventListener("click", closeModal);

		overlay.append(sidebarBackdrop, navbarBackdrop);
		shellRoot.appendChild(overlay);

		return () => {
			sidebarBackdrop.removeEventListener("click", closeModal);
			navbarBackdrop.removeEventListener("click", closeModal);
			overlay.remove();
		};
	}, [closeModal, maskColor, modalOpen]);
}

export { BOOKING_MODAL_Z_INDEX };
