import { stringifyDate } from './stringifyDate';

export const log = (...message: any[]) => {
	const date = new Date();
	const dateText = stringifyDate(date);
	console.log(dateText, ...message);
};
