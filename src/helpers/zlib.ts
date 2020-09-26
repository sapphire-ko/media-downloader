import zlib from 'zlib';

export function compress<T>(data: T): Promise<string> {
	const jsonStr = JSON.stringify(data);
	const buffer = Buffer.from(jsonStr);

	return new Promise((resolve, reject) => {
		zlib.deflate(buffer, (err, result) => {
			if (err) {
				reject(err);
			}
			else {
				resolve(result.toString('base64'));
			}
		});
	});
}

export function decompress<T>(data: string): Promise<T> {
	return new Promise((resolve, reject) => {
		zlib.inflate(Buffer.from(data, 'base64'), (err, result) => {
			if (err) {
				reject(err);
			}
			else {
				resolve(JSON.parse(result.toString()));
			}
		});
	});
}
