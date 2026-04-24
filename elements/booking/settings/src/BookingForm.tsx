import { DatePicker, Form, Input, Space, TimePicker, Typography } from "antd";
import type { Dayjs } from "dayjs";
import { tr } from "./i18n";

export interface BookingFormValues {
	name: string;
	description: string;
	date: Dayjs;
	startTime: Dayjs;
	endTime: Dayjs;
}

export interface BookingFormProps {
	form: ReturnType<(typeof Form.useForm<BookingFormValues>)[0]>;
	use24h: boolean;
	selectedEvent: boolean;
	hasPendingSlot: boolean;
}

export function BookingForm({
	form,
	use24h,
	selectedEvent,
	hasPendingSlot,
}: BookingFormProps) {
	return (
		<Form form={form} layout="vertical" style={{ marginTop: 16 }}>
			<Form.Item
				name="name"
				label={tr("Name")}
				rules={[{ required: true, message: tr("Please enter a name.") }]}
			>
				<Input placeholder={tr("Booking name")} autoFocus />
			</Form.Item>

			<Form.Item
				name="description"
				label={tr("Short Description")}
				rules={[
					{
						required: true,
						message: tr("Please enter a short description."),
					},
				]}
			>
				<Input.TextArea
					placeholder={tr("Short description")}
					autoSize={{ minRows: 2, maxRows: 4 }}
					maxLength={180}
					showCount
				/>
			</Form.Item>

			<Form.Item
				name="date"
				label={tr("Date")}
				rules={[{ required: true, message: tr("Please choose a date.") }]}
			>
				<DatePicker style={{ width: "100%" }} format="DD.MM.YYYY" />
			</Form.Item>

			<Space direction="horizontal" size={12} wrap style={{ width: "100%" }}>
				<Form.Item
					name="startTime"
					label={tr("From")}
					rules={[
						{ required: true, message: tr("Please choose a start time.") },
					]}
					style={{ minWidth: 160, flex: 1 }}
				>
					<TimePicker
						format={use24h ? "HH:mm" : "h:mm A"}
						use12Hours={!use24h}
						minuteStep={15}
						style={{ width: "100%" }}
					/>
				</Form.Item>

				<Form.Item
					name="endTime"
					label={tr("To")}
					rules={[
						{ required: true, message: tr("Please choose an end time.") },
					]}
					style={{ minWidth: 160, flex: 1 }}
				>
					<TimePicker
						format={use24h ? "HH:mm" : "h:mm A"}
						use12Hours={!use24h}
						minuteStep={15}
						style={{ width: "100%" }}
					/>
				</Form.Item>
			</Space>

			{(selectedEvent || hasPendingSlot) && (
				<Typography.Text type="secondary" style={{ display: "block" }}>
					{selectedEvent
						? tr("Adjust time or details directly here.")
						: tr(
								"You can fine-tune the date and time before creating the booking.",
							)}
				</Typography.Text>
			)}
		</Form>
	);
}
