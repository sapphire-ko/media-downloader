import { compress } from './src/helpers/zlib';
import tweet from './tweet.json';

const main = async () => {
	const x = await compress(tweet);
	x.
};

(async () => {
	try {
		await main();
	}
	catch (error) {
		console.log(error);
	}
})();
