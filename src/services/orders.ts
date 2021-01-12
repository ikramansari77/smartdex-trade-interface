import { assetDataUtils, BigNumber } from '0x.js';
import { SignedOrder } from '@0x/connect';

import { getLogger } from '../util/logger';
import { getTransactionOptions } from '../util/transactions';
import { Token } from '../util/types';
import { ordersToUIOrders } from '../util/ui_orders';

import { getContractWrappers } from './contract_wrappers';
import { getRelayer } from './relayer';
import { getWeb3Wrapper } from './web3_wrapper';

import { RELAYER_URL } from '../common/constants';

const logger = getLogger('Services::Orders');

const getAllOrders = async (baseToken: Token, quoteToken: Token, makerAddresses: string[] | null) => {
    const relayer = getRelayer();
    const baseTokenAssetData = assetDataUtils.encodeERC20AssetData(baseToken.address);
    const quoteTokenAssetData = assetDataUtils.encodeERC20AssetData(quoteToken.address);
    const orders = await relayer.getAllOrdersAsync(baseTokenAssetData, quoteTokenAssetData);

    // if makerAddresses is null or empty do not filter
    if (!makerAddresses || makerAddresses.length === 0) {
        return orders;
    }

    // filter orders by existence in the makerAddresses array
    const filteredOrders = orders.filter(order => {
        const orderMakerAddress = order.makerAddress;
        return makerAddresses.includes(orderMakerAddress);
    });
    return filteredOrders;
};

const getAllOrderHistory = async (baseToken: Token, quoteToken: Token) => {
    const relayer = getRelayer();

    let recordsToReturn: SignedOrder[] = [];

    let hasMorePages = true;
    let page = 1;

    while (hasMorePages) {
        await relayer._rateLimit();
        const params = {
            base_token: baseToken.symbol,
            quote_token: quoteToken.symbol,
            page: page.toString()
        };
        const { total, records, perPage } = await (await fetch(RELAYER_URL + '/overallhistory?' + new URLSearchParams(params))).json();

        const recordsMapped = records.map((apiOrder: any) => {
            return apiOrder.order;
        });
        recordsToReturn = [...recordsToReturn, ...recordsMapped];

        page += 1;
        const lastPage = Math.ceil(total / perPage);
        hasMorePages = page <= lastPage;
    }
    return recordsToReturn;
};

export const getAllOrdersAsUIOrders = async (baseToken: Token, quoteToken: Token, makerAddresses: string[] | null) => {
    const orders: SignedOrder[] = await getAllOrders(baseToken, quoteToken, makerAddresses);
    try {
        const contractWrappers = await getContractWrappers();
        const ordersAndTradersInfo = await contractWrappers.orderValidator.getOrdersAndTradersInfoAsync(
            orders,
            orders.map(o => o.makerAddress),
        );
        return ordersToUIOrders(orders, baseToken, ordersAndTradersInfo);
    } catch (err) {
        logger.error(`There was an error getting the orders' info from exchange.`, err);
        throw err;
    }
};

export const getAllOrdersAsUIOrdersWithoutOrdersInfo = async (
    baseToken: Token,
    quoteToken: Token,
    makerAddresses: string[] | null,
) => {
    const orders: SignedOrder[] = await getAllOrders(baseToken, quoteToken, makerAddresses);
    return ordersToUIOrders(orders, baseToken);
};

export const getOverallOrders = async (
    baseToken: Token,
    quoteToken: Token
) => {
    const orders: any[] = await getAllOrderHistory(baseToken, quoteToken);
    return orders;
};

export const getUserOrders = (baseToken: Token, quoteToken: Token, ethAccount: string) => {
    const relayer = getRelayer();
    const baseTokenAssetData = assetDataUtils.encodeERC20AssetData(baseToken.address);
    const quoteTokenAssetData = assetDataUtils.encodeERC20AssetData(quoteToken.address);
    return relayer.getUserOrdersAsync(ethAccount, baseTokenAssetData, quoteTokenAssetData);
};

export const getUserOrdersAsUIOrders = async (baseToken: Token, quoteToken: Token, ethAccount: string) => {
    const myOrders = await getUserOrders(baseToken, quoteToken, ethAccount);
    try {
        const contractWrappers = await getContractWrappers();
        const ordersAndTradersInfo = await contractWrappers.orderValidator.getOrdersAndTradersInfoAsync(
            myOrders,
            myOrders.map(o => o.makerAddress),
        );
        return ordersToUIOrders(myOrders, baseToken, ordersAndTradersInfo);
    } catch (err) {
        logger.error(`There was an error getting the orders' info from exchange.`, err);
        throw err;
    }
};

export const cancelSignedOrder = async (order: SignedOrder, gasPrice: BigNumber) => {
    const contractWrappers = await getContractWrappers();
    const web3Wrapper = await getWeb3Wrapper();
    const tx = await contractWrappers.exchange.cancelOrderAsync(order, getTransactionOptions(gasPrice));
    return web3Wrapper.awaitTransactionSuccessAsync(tx);
};
