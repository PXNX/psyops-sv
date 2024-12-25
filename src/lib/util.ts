import type { RecordId } from "surrealdb";

export const shareLink = (title: string, url = window.location.href) => {
	if (navigator.share) {
		navigator
			.share({
				title: title,
				url: url
			})
			.then(() => {
				console.log("Thanks for sharing!");
			})
			.catch(console.error);
	} else {
		// fallback
	}
};

export const extractId = (recordId: RecordId<string>): string => recordId.id.toString();

export const FILETYPE_PATTERN = /\.(png|webp|jpg|jpeg|svg)$/;
