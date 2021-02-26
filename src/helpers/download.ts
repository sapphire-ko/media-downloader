import fs from 'fs';
import https from 'https';

export const download = async (url: string, filePath: string) => {
	await new Promise<void>((resolve, reject) => {
		https.get(url, { rejectUnauthorized: false }, response => {
			if (response.statusCode !== 200) {
				return reject(new Error(`${response.statusCode}`));
			}
			const stream = fs.createWriteStream(filePath);
			response.pipe(stream);
			// content-length might not exist on header
			// const size = parseInt(response.headers['content-length']!, 10);
			// if (isNaN(size)) {
			// 	log(`response.headers`, response.headers);
			// }

			const timeout = setTimeout(() => {
				stream.destroy();
				reject(new Error('timeout'));
			}, 10 * 60 * 1000); // 10 minutes

			stream.on('finish', () => {
				clearTimeout(timeout);
				resolve();
			});
		});
	});
};
