import { Config } from './config';

export interface TokenMetaData {
    addresses: { [key: number]: string };
    symbol: string;
    decimals: number;
    name: string;
    primaryColor: string;
    icon?: string;
    displayDecimals?: number;
}
export const KNOWN_TOKENS_META_DATA: TokenMetaData[] = Config.getConfig().tokens;
export const DEPOSIT_TOKENS_META_DATA: TokenMetaData[] = Config.getConfig().depositTokens;
