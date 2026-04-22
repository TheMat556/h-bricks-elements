import {
	Body,
	Column,
	Container,
	Head,
	Heading,
	Hr,
	Html,
	Img,
	Link,
	Preview,
	Row,
	Section,
	Text,
} from "@react-email/components";

export interface BookingEmailTemplateProps {
	primaryColor: string;
	backgroundColor: string;
	greeting: string;
	body: string;
	footer: string;
	showBookingDetails: boolean;
	logoUrl: string;
	logoWidth: number;
	logoHeight: number;
	customerName: string;
	calendarName: string;
	date: string;
	time: string;
	service: string;
	cancelUrl: string;
}

function resolveVars(text: string, vars: Record<string, string>): string {
	return Object.entries(vars).reduce(
		(acc, [k, v]) => acc.replaceAll(k, v),
		text,
	);
}

/** Converts a hex colour like #2563eb to rgba(r,g,b,opacity) */
function hexToRgba(hex: string, opacity: number): string {
	const clean = hex.replace("#", "");
	const r = parseInt(clean.slice(0, 2), 16);
	const g = parseInt(clean.slice(2, 4), 16);
	const b = parseInt(clean.slice(4, 6), 16);
	if (Number.isNaN(r)) return `rgba(37,99,235,${opacity})`;
	return `rgba(${r},${g},${b},${opacity})`;
}

export function BookingEmailTemplate({
	primaryColor,
	backgroundColor: _backgroundColor,
	greeting,
	body,
	footer,
	showBookingDetails,
	logoUrl,
	logoWidth,
	logoHeight,
	customerName,
	calendarName,
	date,
	time,
	service,
	cancelUrl,
}: BookingEmailTemplateProps) {
	const vars: Record<string, string> = {
		"{{customerName}}": customerName,
		"{{calendarName}}": calendarName,
		"{{date}}": date,
		"{{time}}": time,
		"{{service}}": service,
	};

	const cardBg = hexToRgba(primaryColor, 0.08);
	const cardGradient = `radial-gradient(circle at bottom right, ${hexToRgba(primaryColor, 0.45)} 0%, transparent 65%)`;
	const primaryDark = primaryColor; // used for label text

	const detailCols: Array<{ label: string; value: string }> = [
		...(service ? [{ label: "Service", value: service }] : []),
	];

	return (
		<Html lang="en">
			<Head />
			<Preview>Booking confirmed!</Preview>
			<Body
				style={{
					backgroundColor: "#ffffff",
					fontFamily:
						'-apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, Helvetica, Arial, sans-serif',
					margin: 0,
					padding: 0,
				}}
			>
				<Container
					style={{
						margin: "0 auto",
						width: "100%",
						maxWidth: 600,
						padding: 0,
					}}
				>
					{/* Header — logo only, no calendar name */}
					<Section style={{ padding: "32px 32px 0", textAlign: "center" }}>
						{logoUrl ? (
							<Img
								src={logoUrl}
								alt="Logo"
								width={logoWidth}
								height={logoHeight}
								style={{
									margin: "0 auto",
									display: "block",
									maxWidth: "100%",
									height: "auto",
									objectFit: "contain",
								}}
							/>
						) : null}
					</Section>

					{/* Hero */}
					<Section style={{ padding: "32px 32px 0", textAlign: "center" }}>
						<Heading
							as="h1"
							style={{
								fontSize: 36,
								fontWeight: 600,
								color: "#111827",
								margin: "0 0 16px 0",
								lineHeight: "1.2",
								textAlign: "center",
							}}
						>
							Booking confirmed!
						</Heading>
						<Text
							style={{
								fontSize: 16,
								color: "#6b7280",
								margin: "0 auto",
								maxWidth: 440,
								textAlign: "center",
								lineHeight: "1.7",
							}}
						>
							{resolveVars(greeting, vars)}
						</Text>
					</Section>

					{/* Booking details card */}
					{showBookingDetails && (
						<Section style={{ padding: "24px 32px 0" }}>
							<Section
								style={{
									backgroundColor: cardBg,
									backgroundImage: cardGradient,
									borderRadius: 16,
									padding: "32px",
									textAlign: "center",
								}}
							>
								<Text
									style={{
										fontSize: 11,
										fontWeight: 600,
										color: primaryDark,
										margin: "0 0 12px 0",
										textTransform: "uppercase",
										letterSpacing: "0.1em",
										textAlign: "center",
									}}
								>
									Your appointment
								</Text>
								<Text
									style={{
										fontSize: 40,
										fontWeight: 700,
										color: "#111827",
										margin: "0 0 4px 0",
										lineHeight: "1",
										textAlign: "center",
									}}
								>
									{date}
								</Text>
								<Text
									style={{
										fontSize: 22,
										fontWeight: 500,
										color: "#374151",
										margin: "0",
										textAlign: "center",
									}}
								>
									{time}
								</Text>

								{detailCols.length > 0 && (
									<>
										<Hr
											style={{
												marginTop: 24,
												borderColor: hexToRgba(primaryColor, 0.3),
											}}
										/>
										<Text
											style={{
												fontSize: 11,
												fontWeight: 600,
												color: primaryDark,
												margin: "12px 0 16px 0",
												textTransform: "uppercase",
												letterSpacing: "0.1em",
												textAlign: "center",
											}}
										>
											Details
										</Text>
										<Row>
											{detailCols.map((col) => (
												<Column
													key={col.label}
													style={{
														width: `${Math.floor(100 / detailCols.length)}%`,
														textAlign: "center",
													}}
												>
													<Text
														style={{
															fontSize: 11,
															color: primaryDark,
															margin: "0 0 4px 0",
															fontWeight: 600,
															textTransform: "uppercase",
															letterSpacing: "0.07em",
														}}
													>
														{col.label}
													</Text>
													<Text
														style={{
															fontSize: 16,
															color: "#111827",
															margin: 0,
															fontWeight: 600,
														}}
													>
														{col.value}
													</Text>
												</Column>
											))}
										</Row>
									</>
								)}
							</Section>
						</Section>
					)}

					{/* Body message */}
					{body && (
						<Section style={{ padding: "24px 32px 0", textAlign: "center" }}>
							<Text
								style={{
									fontSize: 16,
									color: "#374151",
									margin: "0 auto",
									maxWidth: 480,
									textAlign: "center",
									lineHeight: "1.7",
								}}
							>
								{resolveVars(body, vars)}
							</Text>
						</Section>
					)}

					{/* Cancel booking */}
					{cancelUrl && (
						<Section style={{ padding: "32px 32px 0", textAlign: "center" }}>
							<Text
								style={{
									fontSize: 13,
									color: "#9ca3af",
									margin: "0 0 12px 0",
									textAlign: "center",
								}}
							>
								Need to cancel your appointment?
							</Text>
							<Link
								href={cancelUrl}
								style={{
									display: "inline-block",
									backgroundColor: "#111827",
									color: "#ffffff",
									fontSize: 14,
									fontWeight: 600,
									textDecoration: "none",
									borderRadius: 999,
									padding: "12px 32px",
								}}
							>
								Cancel booking
							</Link>
						</Section>
					)}

					{/* Footer */}
					<Section style={{ padding: "40px 32px 32px", textAlign: "center" }}>
						<Hr style={{ borderColor: "#e5e7eb", marginBottom: 24 }} />
						<Text
							style={{
								fontSize: 13,
								color: "#9ca3af",
								margin: "0 0 8px 0",
								textAlign: "center",
								lineHeight: "1.6",
							}}
						>
							{resolveVars(footer, vars)}
						</Text>
						<Text
							style={{
								fontSize: 11,
								color: "#d1d5db",
								margin: 0,
								textAlign: "center",
							}}
						>
							This email was generated by H-Bricks Elements for WordPress.
						</Text>
					</Section>
				</Container>
			</Body>
		</Html>
	);
}
