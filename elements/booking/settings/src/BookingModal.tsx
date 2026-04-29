import { Button, Modal, Space } from "antd";
import { useCallback } from "react";
import { BookingForm, type BookingFormValues } from "./BookingForm";
import { tr } from "./i18n";
import type { BookingEvent } from "./RightPanel";

interface BookingModalProps {
	open: boolean;
	confirmLoading: boolean;
	deleting: boolean;
	selectedEvent: BookingEvent | null;
	hasPendingSlot: boolean;
	use24h: boolean;
	form: ReturnType<typeof import("antd").Form.useForm<BookingFormValues>[0]>;
	onOk: () => void;
	onCancel: () => void;
	onDelete: () => void;
}

export function BookingModal({
	open,
	confirmLoading,
	deleting,
	selectedEvent,
	hasPendingSlot,
	use24h,
	form,
	onOk,
	onCancel,
	onDelete,
}: BookingModalProps) {
	const handleOk = useCallback(() => {
		void onOk();
	}, [onOk]);

	const handleDelete = useCallback(() => {
		void onDelete();
	}, [onDelete]);

	return (
		<Modal
			title={selectedEvent ? tr("Edit Booking") : tr("New Booking")}
			getContainer={() =>
				document.getElementById("react-shell-root") ??
				document.getElementById("h-bricks-admin-root") ??
				document.body
			}
			mask={false}
			zIndex={100010}
			open={open}
			onOk={handleOk}
			onCancel={onCancel}
			confirmLoading={confirmLoading}
			footer={
				<div style={{ display: "flex", justifyContent: "space-between" }}>
					{selectedEvent ? (
						<Button danger onClick={handleDelete} loading={deleting}>
							{tr("Delete")}
						</Button>
					) : (
						<span />
					)}
					<Space>
						<Button onClick={onCancel} disabled={confirmLoading || deleting}>
							{tr("Cancel")}
						</Button>
						<Button type="primary" onClick={handleOk} loading={confirmLoading}>
							{selectedEvent ? tr("Save") : tr("Create")}
						</Button>
					</Space>
				</div>
			}
		>
			<BookingForm
				form={form}
				use24h={use24h}
				selectedEvent={!!selectedEvent}
				hasPendingSlot={hasPendingSlot}
			/>
		</Modal>
	);
}
