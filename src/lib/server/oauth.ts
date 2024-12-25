import { BASE_URL, GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET } from "$env/static/private";
import { Google } from "arctic";

export const googleProvider = new Google(
	GOOGLE_CLIENT_ID,
	GOOGLE_CLIENT_SECRET,
	`http://${BASE_URL}:5173/login/google/callback`

	//http://redirectmeto.com/
);
