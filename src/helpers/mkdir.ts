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
