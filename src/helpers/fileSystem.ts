import {
	promises as fsPromises,
} from 'fs';

export async function mkdir(dirPath: string) {
	try {
		await fsPromises.lstat(dirPath);
	}
	catch(error) {
		switch(error.code) {
			case 'ENOENT': {
				await fsPromises.mkdir(dirPath);
				break;
			}
			default: {
				console.log(error);
				throw error;
			}
		}
	}
}

export async function readFile(filePath: string): Promise<string> {
	const buffer = await fsPromises.readFile(filePath);
	return buffer.toString();
}

export async function writeFile(filePath: string, data: string) {
	await fsPromises.writeFile(filePath, data);
}
