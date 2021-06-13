import fs from 'fs';
import https from 'https';
import { log } from './log';

export const download = async (url: string, filePath: string) => {
	await new Promise<void>((resolve, reject) => {
		const request = https.get(url, { rejectUnauthorized: false }, response => {
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

			stream.on('error', error => {
				log('error', 'request', error.name);
				reject(error);
			})
		});
		request.on('error', error => {
			log('error', 'request', error.name);
			reject(error);
		});
	});
};
