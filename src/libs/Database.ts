import knex from 'knex';

import {
	TableName,
} from '~/constants';

import {
	CommandType,
	CommandDatabase,
	Tweet,
} from '~/models';

import {
	sleep,
} from '~/helpers';

export class Database {
	private static instance: Database | null = null;

	private queue: CommandDatabase[] = [];
	private shouldProcess: boolean = false;

	private knex: knex;

	private constructor() {
		this.knex = knex(__knex);
	}

	public static createInstance() {
		if(this.instance !== null) {
			throw new Error('cannot create instance');
		}
		this.instance = new Database();
	}

	public static getInstance(): Database {
		if(this.instance === null) {
			throw new Error('instance is null');
		}
		return this.instance;
	}

	private async createTable<T extends TableName>(tableName: T) {
		const exists = await this.knex.schema.hasTable(tableName);
		if(exists === false) {
			await this.knex.schema.createTable(tableName, (table) => {
				table.bigInteger('id').unique();

				switch(tableName) {
					case TableName.TWITTER_ACCOUNTS: {
						break;
					}
					case TableName.TWITTER_TWEETS: {
						table.boolean('hasMedia').notNullable();
						table.boolean('downloaded').notNullable();
						break;
					}
				}

				table.timestamps(true, true);
			});
		}
	}

	public async initialize() {
		await this.createTable(TableName.TWITTER_ACCOUNTS);
		await this.createTable(TableName.TWITTER_TWEETS);

		this.shouldProcess = true;
	}

	public pushCommand(command: CommandDatabase) {
		this.queue.push(command);
	}

	private async hasTweet(tweet: Tweet): Promise<boolean> {
		const rows = await this.knex(TableName.TWITTER_TWEETS).where({
			'id': tweet.id_str,
		});

		return rows.length > 0;
	}

	private async insertTweet(tweet: Tweet) {
		const hasTweet = await this.hasTweet(tweet);

		if(hasTweet === false) {
			await this.knex(TableName.TWITTER_TWEETS).insert({
				'id': tweet.id_str,
				'hasMedia': '',
				'downloaded': false,
			});
		}
	}

	public async start() {
		do {
			await sleep(10);

			if(this.queue.length === 0) {
				continue;
			}

			const command = this.queue.shift()!;

			await this.process(command);
		}
		while(this.shouldProcess);
	}

	public async stop() {
		this.shouldProcess = false;
	}

	private async process(command: CommandDatabase) {
		switch(command.type) {
			case CommandType.DATABASE_INSERT_TWEET: {
				const {
					payload,
				} = command;

				this.insertTweet(payload.tweet);

				break;
			}
		}
	}
}
