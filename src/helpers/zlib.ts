import zlib from 'zlib';

export function compress<T>(data: T): Promise<Buffer> {
	const jsonStr = JSON.stringify(data);
	const buffer = Buffer.from(jsonStr);

	return new Promise((resolve, reject) => {
		zlib.deflate(buffer, (err, result) => {
			if (err) {
				reject(err);
			}
			else {
				resolve(result);
			}
		});
	});
}

export function decompress<T>(data: Buffer): Promise<T> {
	return new Promise((resolve, reject) => {
		zlib.inflate(data, (err, result) => {
			if (err) {
				reject(err);
			}
			else {
				resolve(JSON.parse(result.toString()));
			}
		});
	});
}
