const shareLink = (title: string, url = window.location.href) => {
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
