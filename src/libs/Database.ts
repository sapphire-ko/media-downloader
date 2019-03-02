import url from 'url';

import knex from 'knex';
import qs from 'qs';

import {
	TableName,
} from '~/constants';

import {
	CommandType,
	CommandDatabase,
	CommandDatabaseInsertAccount,
	CommandDatabaseInsertTweet,
	CommandDatabaseInsertMedium,
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
				table.string('id').unique();

				switch(tableName) {
					case TableName.TWITTER_ACCOUNTS: {
						table.string('alias');
						break;
					}
					case TableName.TWITTER_TWEETS: {
						table.string('account_id').notNullable();
						table.text('data').notNullable();
						break;
					}
					case TableName.TWITTER_MEDIA: {
						table.string('account_id').notNullable();
						table.string('tweet_id').notNullable();
						table.string('url').notNullable();
						table.boolean('downloaded').notNullable();
						table.integer('retry_count').notNullable();
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
		await this.createTable(TableName.TWITTER_MEDIA);

		this.shouldProcess = true;
	}

	public pushCommand(command: CommandDatabase) {
		this.queue.push(command);
	}

	private async hasAccount(id: string): Promise<boolean> {
		const rows = await this.knex(TableName.TWITTER_ACCOUNTS).where({
			'id': id,
		});

		return rows.length > 0;
	}

	private async insertAccount(payload: CommandDatabaseInsertAccount['payload']) {
		const {
			id,
		} = payload;

		const hasAccount = await this.hasAccount(id);

		if(hasAccount === false) {
			await this.knex(TableName.TWITTER_ACCOUNTS).insert({
				'id': id,
				'alias': '',
			});
		}
	}

	public async getAccounts(): Promise<Array<{
		id: string;
		alias: string;
	}>> {
		return this.knex(TableName.TWITTER_ACCOUNTS);
	}

	private async hasTweet(id: string): Promise<boolean> {
		const rows = await this.knex(TableName.TWITTER_TWEETS).where({
			'id': id,
		});

		return rows.length > 0;
	}

	private async insertTweet(params: CommandDatabaseInsertTweet['payload']) {
		const {
			id,
			accountId,
		} = params;

		const hasTweet = await this.hasTweet(id);

		if(hasTweet === false) {
			await this.knex(TableName.TWITTER_TWEETS).insert({
				'id': id,
				'account_id': accountId,
			});
		}
	}

	private async hasMedium(url: string): Promise<boolean> {
		const rows = await this.knex(TableName.TWITTER_MEDIA).where({
			'url': url,
		});

		return rows.length > 0;
	}

	private async insertMedium(params: CommandDatabaseInsertMedium['payload']) {
		const {
			id,
			url,
			accountId,
			tweetId,
		} = params;

		const hasMedium = await this.hasMedium(url);

		if(hasMedium === false) {
			await this.knex(TableName.TWITTER_MEDIA).insert({
				'id': id,
				'url': url,
				'account_id': accountId,
				'tweet_id': tweetId,
				'downloaded': false,
				'retry_count': 0,
			});
		}
	}

	public async getMedia(): Promise<Array<{
		id: string;
		url: string;
		account_id: string;
		tweet_id: string;
		downloaded: boolean;
		retry_count: number;
	}>> {
		const rows = await this.knex(TableName.TWITTER_MEDIA).where({
			'downloaded': false,
		});

		return rows.filter((row: any) => {
			return row.retry_count < 10;
		});
	}

	public async updateMedium(params: {
		id: string;
		downloaded: boolean;
		retryCount: number;
	}) {
		const {
			id,
			downloaded,
			retryCount,
		} = params;

		await this.knex(TableName.TWITTER_MEDIA).where({
			'id': id,
		}).update({
			'downloaded': downloaded,
			'retry_count': retryCount,
		});
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

	private async process(command: CommandDatabase): Promise<true> {
		switch(command.type) {
			case CommandType.DATABASE_INSERT_ACCOUNT: {
				this.insertAccount(command.payload);
				return true;
			}
			case CommandType.DATABASE_INSERT_TWEET: {
				this.insertTweet(command.payload);
				return true;
			}
			case CommandType.DATABASE_INSERT_MEDIUM: {
				this.insertMedium(command.payload);
				return true;
			}
		}
	}

	public async close() {
		await this.knex.destroy();
	}
}
