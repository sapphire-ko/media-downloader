import { App } from './App';
import { log } from './helpers';

(async () => {
	try {
		const app = new App();
		await app.initialize();
		await app.start();
	}
	catch (error) {
		log('error', error);
	}
})();
