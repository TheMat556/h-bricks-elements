import {
	Button,
	Card,
	ConfigProvider,
	Flex,
	Result,
	Typography,
	theme,
} from "antd";
import { createRoot } from "react-dom/client";

interface CancelData {
	state: "confirm" | "success" | "error";
	message: string;
	action: string;
	nonce: string;
	nonceField: string;
	homeUrl: string;
	logoUrl: string;
	siteName: string;
}

type AdminTheme = "light" | "dark";

interface HBricksWindow {
	hbeCancelData?: CancelData;
	hBricksAdmin?: {
		theme?: AdminTheme;
	};
}

declare global {
	interface Window extends HBricksWindow {}
}

function getCancelPrimaryColor(): string {
	if (typeof document === "undefined") return "#1677ff";
	return (
		getComputedStyle(document.documentElement)
			.getPropertyValue("--hbe-primary")
			.trim() || "#1677ff"
	);
}

function getCancelTheme(): AdminTheme {
	const serverTheme = window.hBricksAdmin?.theme;
	return serverTheme === "dark" || serverTheme === "light"
		? serverTheme
		: "light";
}

function Logo({ url, siteName }: { url: string; siteName: string }) {
	if (!url) return null;
	return (
		<img
			src={url}
			alt={siteName}
			style={{
				height: 40,
				maxWidth: 160,
				objectFit: "contain",
				marginBottom: 8,
			}}
		/>
	);
}

function CancelApp({ data }: { data: CancelData }) {
	const { token } = theme.useToken();

	return (
		<Flex
			align="center"
			justify="center"
			style={{
				minHeight: "100vh",
				background: token.colorBgLayout,
				padding: 24,
			}}
		>
			<Card
				style={{
					maxWidth: 520,
					width: "100%",
					textAlign: "center",
					borderRadius: token.borderRadiusLG * 2,
					boxShadow: token.boxShadowTertiary,
				}}
				styles={{ body: { padding: "48px 40px" } }}
			>
				<Flex vertical align="center" gap={4} style={{ marginBottom: 24 }}>
					<Logo url={data.logoUrl} siteName={data.siteName} />
					<Typography.Text strong style={{ fontSize: 18 }}>
						{data.siteName}
					</Typography.Text>
				</Flex>

				{data.state === "confirm" && (
					<>
						<Result
							status="warning"
							title="Cancel Booking"
							subTitle="Are you sure you want to cancel this booking?"
							style={{ padding: 0, marginBottom: 32 }}
						/>
						<Flex justify="center" align="center" gap={16} wrap>
							<form
								method="post"
								action={data.action}
								style={{ display: "inline" }}
							>
								<input type="hidden" name="hbe_confirm_cancel" value="1" />
								<input type="hidden" name="_wpnonce" value={data.nonce} />
								<Button type="primary" danger htmlType="submit" size="large">
									Yes, cancel my booking
								</Button>
							</form>
							<Button size="large" href={data.homeUrl}>
								No, keep it
							</Button>
						</Flex>
					</>
				)}

				{data.state === "success" && (
					<>
						<Result
							status="success"
							title="Booking Cancelled"
							subTitle="Your booking has been successfully cancelled. We hope to see you again soon!"
							style={{ padding: 0, marginBottom: 32 }}
						/>
						<Button type="primary" size="large" href={data.homeUrl}>
							Go back home
						</Button>
					</>
				)}

				{data.state === "error" && (
					<>
						<Result
							status="error"
							title="Something went wrong"
							subTitle={data.message || "An unexpected error occurred."}
							style={{ padding: 0, marginBottom: 32 }}
						/>
						<Button type="primary" size="large" href={data.homeUrl}>
							Go back home
						</Button>
					</>
				)}
			</Card>
		</Flex>
	);
}

export function mountCancelApp(el: HTMLElement): void {
	const data: CancelData = window.hbeCancelData ?? {
		state: "error",
		message: "No data provided.",
		action: "",
		nonce: "",
		nonceField: "",
		homeUrl: "/",
		logoUrl: "",
		siteName: "",
	};

	const themeMode = getCancelTheme();
	const algorithm =
		themeMode === "dark" ? theme.darkAlgorithm : theme.defaultAlgorithm;

	const root = createRoot(el);
	root.render(
		<ConfigProvider
			theme={{
				cssVar: true,
				algorithm,
				token: {
					colorPrimary: getCancelPrimaryColor(),
				},
			}}
		>
			<CancelApp data={data} />
		</ConfigProvider>,
	);
}
