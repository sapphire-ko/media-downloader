import puppeteer from 'puppeteer';

(async () => {
	const browser = await puppeteer.launch({
		'headless': false,
		'executablePath': '/Applications/Google\ Chrome.app/Contents/MacOS/Google\ Chrome',
	});
	const page = await browser.newPage();
	await page.setViewport({
		'width': 1280,
		'height': 1280,
	});
	await page.goto('https://twitter.com/o_takei/media', {
		'waitUntil': 'networkidle2',
	});
	let prev = -1;
	let curr = 0;
	while(prev !== curr) {
		prev = await page.evaluate(() => {
			return document.body.scrollHeight;
		});
		await page.evaluate(() => {
			window.scrollBy(0, document.body.scrollHeight);
		});
		await new Promise((resolve) => {
			setTimeout(resolve, 3000);
		});
		curr = await page.evaluate(() => {
			return document.body.scrollHeight;
		});
		console.log(prev + ' ' + curr);
	}
	await page.screenshot({path: 'example.png'});

	await browser.close();
})();