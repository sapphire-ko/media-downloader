import {
	ServiceType,
} from '~/models';

export interface ConfigurationTwitter {
	type: ServiceType.TWITTER;
	userAgent: string;
	bearerToken: string;
	csrfToken: string;
	cookie: string;
}

export type Configuration = (
	| ConfigurationTwitter
);
