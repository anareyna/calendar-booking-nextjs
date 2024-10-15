import { clerkClient } from "@clerk/nextjs/server";
import "use-server";
import { google } from "googleapis";
import { endOfDay, startOfDay } from "date-fns";

export async function getCalendarEventTimes(
	clearkUserId: string,
	{ start, end }: { start: Date; end: Date }
) {
	const oAuthClient = await getOauthClient(clearkUserId);

	const events = await google.calendar("v3").events.list({
		auth: oAuthClient,
		calendarId: "primary",
		eventTypes: ["default"],
		singleEvents: true,
		timeMin: start.toISOString(),
		timeMax: end.toISOString(),
		maxResults: 2500,
	});

	return (
		events.data.items
			?.map((event) => {
				if (event?.start?.date != null && event?.end?.date != null) {
					return {
						start: startOfDay(event.start.date),
						end: endOfDay(event.end.date),
					};
				}

				if (
					event?.start?.dateTime != null &&
					event?.end?.dateTime != null
				) {
					return {
						start: new Date(event.start.dateTime),
						end: new Date(event.end.dateTime),
					};
				}
			})
			.filter((date) => date != null) || []
	);
}

async function getOauthClient(clearkUserId: string) {
	const token = await clerkClient.users.getUserOauthAccessToken(
		clearkUserId,
		"oauth_google"
	);
	{
		if (token.data.length === 0 || token.data[0].token == null) {
			return;
		}

		const client = new google.auth.OAuth2(
			process.env.GOOGLE_OAUTH_CLIENT_ID,
			process.env.GOOGLE_OAUTH_CLIENT_SECRET,
			process.env.GOOGLE_OAUTH_REDIRECT_URL
		);

		client.setCredentials({ access_token: token.data[0].token });
		return client;
	}
}
