export const log = (...message: any[]) => {
	const date = new Date();
	console.log(date, ...message);
};
