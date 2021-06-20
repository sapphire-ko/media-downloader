import fs from 'fs';
import { log } from './log';

export const exists = async (dirPath: string): Promise<boolean> => {
	try {
		await fs.promises.lstat(dirPath);
		return true;
	}
	catch (error) {
		switch (error.code) {
			case 'ENOENT': {
				return false;
			}
			default: {
				log('error', error);
				throw error;
			}
		}
	}
}

export async function mkdir(dirPath: string) {
	if (await exists(dirPath)) {
		return;
	}
	await fs.promises.mkdir(dirPath);
}

export async function readFile(filePath: string): Promise<string> {
	const buffer = await fs.promises.readFile(filePath);
	return buffer.toString();
}

export async function writeFile(filePath: string, data: string) {
	await fs.promises.writeFile(filePath, data);
}
