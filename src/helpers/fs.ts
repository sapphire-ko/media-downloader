import fs from 'fs';
import { log } from './log';

export async function mkdir(dirPath: string) {
	try {
		await fs.promises.lstat(dirPath);
	}
	catch(error) {
		switch(error.code) {
			case 'ENOENT': {
				await fs.promises.mkdir(dirPath);
				break;
			}
			default: {
				log('error', error);
				throw error;
			}
		}
	}
}

export async function readFile(filePath: string): Promise<string> {
	const buffer = await fs.promises.readFile(filePath);
	return buffer.toString();
}

export async function writeFile(filePath: string, data: string) {
	await fs.promises.writeFile(filePath, data);
}
