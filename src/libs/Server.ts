export class Server {
	private instance: Server | null = null;

	private constructor() {}

	public createInstance() {
		if(this.instance !== null) {
			throw new Error('cannot create instance');
		}
		this.instance = new Server();
	}

	public getInstance(): Server {
		if(this.instance === null) {
			throw new Error('instance is null');
		}
		return this.instance;
	}
}
