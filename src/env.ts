import { defineEnvVars } from "@sveltejs/kit/env";

// @migration-task Review usage of dynamic environment variables. They fall back to the empty string if not present, which may not be what you want.
export const variables = defineEnvVars({
	PUBLIC_TELEGRAM_BOT_USERNAME: { public: true, schema: (input) => input ?? "" },
	CRON_SECRET: { schema: (input) => input ?? "" },
	NODE_ENV: { schema: (input) => input ?? "" },
	GOOGLE_CLIENT_ID: { schema: (input) => input ?? "" },
	GOOGLE_CLIENT_SECRET: { schema: (input) => input ?? "" },
	GOOGLE_REDIRECT_URI: { schema: (input) => input ?? "" },
	TELEGRAM_BOT_TOKEN: { schema: (input) => input ?? "" },
	MOCK_API_URL: { schema: (input) => input ?? "" },
	BACKBLAZE_KEY_ID: { schema: (input) => input ?? "" },
	BACKBLAZE_APPLICATION_KEY: { schema: (input) => input ?? "" },
	BACKBLAZE_REGION: { schema: (input) => input ?? "" },
	BACKBLAZE_ENDPOINT: { schema: (input) => input ?? "" },
	BACKBLAZE_BUCKET_NAME: { schema: (input) => input ?? "" },
	DATABASE_URL: { schema: (input) => input ?? "" },
	VAPID_PUBLIC_KEY: { schema: (input) => input ?? "" },
	VAPID_PRIVATE_KEY: { schema: (input) => input ?? "" },
	VAPID_SUBJECT: { schema: (input) => input ?? "" },
	PUBLIC_TELEGRAM_BOT_ID: { public: true, schema: (input) => input ?? "" }
});
