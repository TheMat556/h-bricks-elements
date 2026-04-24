import { CheckCircleOutlined, ClockCircleOutlined } from "@ant-design/icons";
import { Badge, Card, List, Space, Typography, theme } from "antd";
import dayjs from "dayjs";
import { tr } from "./i18n";

export interface BookingEvent {
	id: string;
	title: string;
	description?: string;
	start: Date;
	end: Date;
	color?: string;
	status?: string;
	calendarId?: number;
	timezone?: string;
}

export function sortEvents(events: BookingEvent[]): BookingEvent[] {
	return [...events].sort(
		(left, right) => left.start.getTime() - right.start.getTime(),
	);
}

export function RightPanel({
	events,
	visible,
}: {
	events: BookingEvent[];
	visible: boolean;
}) {
	const { token } = theme.useToken();
	const todayEvents = sortEvents(
		events.filter((event) => dayjs(event.start).isSame(dayjs(), "day")),
	);
	const nextWeekBoundary = dayjs().add(1, "week").endOf("isoWeek");
	const upcomingEvents = sortEvents(
		events.filter(
			(event) =>
				dayjs(event.start).isAfter(dayjs().endOf("day")) &&
				(dayjs(event.start).isBefore(nextWeekBoundary) ||
					dayjs(event.start).isSame(nextWeekBoundary, "minute")),
		),
	);

	return (
		<div
			style={{
				width: visible ? 260 : 0,
				flexShrink: 0,
				height: "100%",
				borderLeft: visible
					? `1px solid ${token.colorBorderSecondary}`
					: "none",
				background: token.colorBgContainer,
				display: "flex",
				flexDirection: "column",
				overflow: "hidden",
				transition: "width 0.25s cubic-bezier(0.4, 0, 0.2, 1)",
			}}
		>
			<div
				style={{
					width: 260,
					height: "100%",
					display: "flex",
					flexDirection: "column",
				}}
			>
				<div
					style={{
						padding: "14px 16px",
						borderBottom: `1px solid ${token.colorBorderSecondary}`,
						flexShrink: 0,
					}}
				>
					<Typography.Text strong style={{ fontSize: 14 }}>
						{tr("Overview")}
					</Typography.Text>
				</div>

				<div
					style={{
						flex: 1,
						overflowY: "auto",
						padding: 16,
						display: "flex",
						flexDirection: "column",
						gap: 16,
					}}
				>
					<div>
						<div style={{ marginBottom: 12 }}>
							<Typography.Text strong style={{ fontSize: 13 }}>
								<ClockCircleOutlined style={{ marginRight: 12 }} />
								{tr("Today")}
							</Typography.Text>
						</div>

						<Space direction="vertical" style={{ width: "100%" }} size={8}>
							{todayEvents.map((event) => (
								<Card
									key={event.id}
									size="small"
									bordered={false}
									style={{
										background: token.colorFillAlter,
										borderLeft: `3px solid ${event.color ?? token.colorPrimary}`,
										borderRadius: token.borderRadius,
									}}
								>
									<Typography.Text
										strong
										style={{ fontSize: 12, display: "block" }}
									>
										{event.title}
									</Typography.Text>
									<Typography.Text
										style={{
											fontSize: 11,
											color: token.colorTextTertiary,
										}}
									>
										{dayjs(event.start).format("HH:mm")} –{" "}
										{dayjs(event.end).format("HH:mm")}
									</Typography.Text>
									{event.description && (
										<Typography.Text
											style={{
												display: "block",
												fontSize: 11,
												marginTop: 4,
												color: token.colorTextSecondary,
											}}
										>
											{event.description}
										</Typography.Text>
									)}
								</Card>
							))}
							{todayEvents.length === 0 && (
								<Typography.Text
									style={{ fontSize: 12, color: token.colorTextTertiary }}
								>
									{tr("No bookings today")}
								</Typography.Text>
							)}
						</Space>
					</div>

					<div>
						<div>
							<Typography.Text strong style={{ fontSize: 13 }}>
								<CheckCircleOutlined
									style={{ color: token.colorPrimary, marginRight: 12 }}
								/>
								{tr("Upcoming")}
							</Typography.Text>
						</div>

						<List
							dataSource={upcomingEvents}
							locale={{ emptyText: tr("No upcoming bookings") }}
							renderItem={(item) => (
								<List.Item
									style={{
										padding: "8px 0",
										borderBottom: `1px solid ${token.colorBorderSecondary}`,
									}}
								>
									<List.Item.Meta
										avatar={<Badge color={item.color} />}
										title={
											<Typography.Text
												style={{ fontSize: 12, fontWeight: 600 }}
											>
												{item.title}
											</Typography.Text>
										}
										description={
											<Typography.Text
												style={{
													fontSize: 11,
													color: token.colorTextTertiary,
												}}
											>
												{dayjs(item.start).format("ddd, DD.MM. HH:mm")}
											</Typography.Text>
										}
									/>
								</List.Item>
							)}
						/>
					</div>
				</div>
			</div>
		</div>
	);
}
