import { isDate } from "util";

export const stringifyDate = (x: Date): string => {
	const getDate = (x: Date): string => {
		const year = x.getFullYear();
		const month = `${x.getMonth() + 1}`.padStart(2, '0');
		const date = `${x.getDate()}`.padStart(2, '0');
		return `${year}-${month}-${date}`;
	};
	const getTime = (x: Date): string => {
		const hours = `${x.getHours()}`.padStart(2, '0');
		const minutes = `${x.getMinutes()}`.padStart(2, '0');
		const seconds = `${x.getSeconds()}`.padStart(2, '0');
		const milliseconds = `${x.getMilliseconds()}`.padStart(3, '0');
		return `${hours}:${minutes}:${seconds}.${milliseconds}`;
	};
	const getOffset = (x: Date): string => {
		const offset = x.getTimezoneOffset();
		const isAhead = offset < 0;
		const hour = `${Math.floor(Math.abs(offset) / 60)}`.padStart(2, '0');
		const minute = `${Math.floor(Math.abs(offset) % 60)}`.padStart(2, '0');
		return `${isAhead ? '+' : '-'}${hour}:${minute}`;
	};

	const date = getDate(x);
	const time = getTime(x);
	const offset = getOffset(x);

	return `${date}T${time}${offset}`;
};
