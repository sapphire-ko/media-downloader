import {
	App,
} from './App';

(async () => {
	try {
		const app = new App();
		await app.initialize();
		app.start();
	}
	catch(error) {
		console.log(error);
	}
})();
