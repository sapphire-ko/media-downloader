import { stringifyDate } from './stringifyDate';

export const log = (type: 'info' | 'error', ...message: any[]) => {
	if (process.env.NODE_ENV === 'production') {
		switch (type) {
			case 'info': {
				return;
			}
		}
	}
	const date = new Date();
	const dateText = stringifyDate(date);
	console.log(dateText, ...message);
};
