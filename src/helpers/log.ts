export const log = (...message: (string | number)[]) => {
	const date = new Date();
	console.log(`[${date.toISOString()}] ${message.join(' ')}`);
};
