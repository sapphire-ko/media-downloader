export class Database {
	private instance: Database | null = null;

	private constructor() {}

	public createInstance() {
		if(this.instance !== null) {
			throw new Error('cannot create instance');
		}
		this.instance = new Database();
	}

	public getInstance(): Database {
		if(this.instance === null) {
			throw new Error('instance is null');
		}
		return this.instance;
	}
}
