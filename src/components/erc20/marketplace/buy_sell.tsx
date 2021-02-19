import { BigNumber, OrderStatus } from '0x.js';
import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';

import { initWallet, startBuySellLimitSteps, startBuySellMarketSteps } from '../../../store/actions';
import { fetchTakerAndMakerFee } from '../../../store/relayer/actions';
import { 
    getCurrencyPair,
    getOrderPriceSelected,
    getWeb3State,
    getBaseToken,
    getBaseTokenBalance,
    getEthAccount,
    getQuoteToken,
    getQuoteTokenBalance,
    getTotalEthBalance,
    getUserOrders,
    getMarkets
} from '../../../store/selectors';
import { themeDimensions } from '../../../themes/commons';
import { getKnownTokens, isWeth } from '../../../util/known_tokens';
import { tokenSymbolToDisplayString, unitsInTokenAmount } from '../../../util/tokens';
import {
    ButtonIcons,
    ButtonVariant,
    CurrencyPair,
    OrderSide,
    OrderType,
    StoreState,
    Web3State,
    Token,
    TokenBalance,
    UIOrder,
    Market
} from '../../../util/types';
import { BigNumberInput } from '../../common/big_number_input';
import { Button } from '../../common/button';
import { CardBase } from '../../common/card_base';
import { CardTabSelector } from '../../common/card_tab_selector';
import { ErrorCard, ErrorIcons, FontSize } from '../../common/error_card';

import { OrderDetailsContainer } from './order_details';

interface StateProps {
    web3State: Web3State;
    currencyPair: CurrencyPair;
    orderPriceSelected: BigNumber | null;
    baseToken: Token | null;
    quoteToken: Token | null;
    ethAccount: string;
    baseTokenBalance: TokenBalance | null;
    quoteTokenBalance: TokenBalance | null;
    totalEthBalance: BigNumber;
    orders: UIOrder[];
    markets: Market[] | null;
}

interface DispatchProps {
    onSubmitLimitOrder: (amount: BigNumber, price: BigNumber, side: OrderSide, makerFee: BigNumber) => Promise<any>;
    onSubmitMarketOrder: (amount: BigNumber, side: OrderSide, takerFee: BigNumber) => Promise<any>;
    onConnectWallet: () => any;
    onFetchTakerAndMakerFee: (amount: BigNumber, price: BigNumber, side: OrderSide) => Promise<any>;
}

type Props = StateProps & DispatchProps;

interface State {
    makerAmount: BigNumber | null;
    orderType: OrderType;
    price: BigNumber | null;
    tab: OrderSide;
    error: {
        btnMsg: string | null;
        cardMsg: string | null;
    };
}

const BuySellWrapper = styled(CardBase)`
    margin-bottom: ${themeDimensions.verticalSeparationSm};
`;

const Content = styled.div`
    display: flex;
    flex-direction: column;
    padding: 20px ${themeDimensions.horizontalPadding};
`;

const TabsContainer = styled.div`
    align-items: center;
    display: flex;
    justify-content: space-between;
`;

const TabButton = styled.div<{ isSelected: boolean; side: OrderSide }>`
    align-items: center;
    background-color: ${props =>
        props.isSelected ? 'transparent' : props.theme.componentsTheme.inactiveTabBackgroundColor};
    border-bottom-color: ${props => (props.isSelected ? 'transparent' : props.theme.componentsTheme.cardBorderColor)};
    border-bottom-style: solid;
    border-bottom-width: 1px;
    border-right-color: ${props => (props.isSelected ? props.theme.componentsTheme.cardBorderColor : 'transparent')};
    border-right-style: solid;
    border-right-width: 1px;
    color: ${props =>
        props.isSelected
            ? props.side === OrderSide.Buy
                ? props.theme.componentsTheme.green
                : props.theme.componentsTheme.red
            : props.theme.componentsTheme.textLight};
    cursor: ${props => (props.isSelected ? 'default' : 'pointer')};
    display: flex;
    font-weight: 600;
    height: 47px;
    justify-content: center;
    width: 50%;

    &:first-child {
        border-top-left-radius: ${themeDimensions.borderRadius};
    }

    &:last-child {
        border-left-color: ${props => (props.isSelected ? props.theme.componentsTheme.cardBorderColor : 'transparent')};
        border-left-style: solid;
        border-left-width: 1px;
        border-right: none;
        border-top-right-radius: ${themeDimensions.borderRadius};
    }
`;

const LabelContainer = styled.div`
    align-items: flex-end;
    display: flex;
    justify-content: space-between;
    margin-bottom: 10px;
`;

const Label = styled.label<{ color?: string }>`
    color: ${props => props.color || props.theme.componentsTheme.textColorCommon};
    font-size: 14px;
    font-weight: 500;
    line-height: normal;
    margin: 0;
`;

const InnerTabs = styled(CardTabSelector)`
    font-size: 14px;
`;

const FieldContainer = styled.div`
    height: ${themeDimensions.fieldHeight};
    margin-bottom: 25px;
    position: relative;
`;

const BigInputNumberStyled = styled<any>(BigNumberInput)`
    background-color: ${props => props.theme.componentsTheme.textInputBackgroundColor};
    border-radius: ${themeDimensions.borderRadius};
    border: 1px solid ${props => props.theme.componentsTheme.textInputBorderColor};
    color: ${props => props.theme.componentsTheme.textInputTextColor};
    font-feature-settings: 'tnum' 1;
    font-size: 16px;
    height: 100%;
    padding-left: 14px;
    padding-right: 60px;
    position: absolute;
    width: 100%;
    z-index: 1;
`;

const TokenContainer = styled.div`
    display: flex;
    position: absolute;
    right: 14px;
    top: 50%;
    transform: translateY(-50%);
    z-index: 12;
`;

const TokenText = styled.span`
    color: ${props => props.theme.componentsTheme.textInputTextColor};
    font-size: 14px;
    font-weight: normal;
    line-height: 21px;
    text-align: right;
`;

const PercentContainer = styled.div`
    display: flex;
    width: 100%;
`;

const PercentBox = styled.button`
    margin: 6px;
    background-color: transparent;
    border-radius: 4px;
    border: 1px solid #fff;
    text-align: center;
    color: #fff;
    width: 25%;
    padding: 2px;
    cursor: pointer;

    &:hover {
        border-color: #666;
    }

    &:active {
        background-color: #fff;
        color: #000;
    }
`;

const BigInputNumberTokenLabel = (props: { tokenSymbol: string }) => (
    <TokenContainer>
        <TokenText>{tokenSymbolToDisplayString(props.tokenSymbol)}</TokenText>
    </TokenContainer>
);

const TIMEOUT_BTN_ERROR = 2000;
const TIMEOUT_CARD_ERROR = 4000;

class BuySell extends React.Component<Props, State> {
    public state: State = {
        makerAmount: null,
        price: null,
        orderType: OrderType.Market,
        tab: OrderSide.Buy,
        error: {
            btnMsg: null,
            cardMsg: null,
        },
    };

    public componentDidUpdate = async (prevProps: Readonly<Props>) => {
        const newProps = this.props;
        if (newProps.orderPriceSelected !== prevProps.orderPriceSelected && this.state.orderType === OrderType.Limit) {
            this.setState({
                price: newProps.orderPriceSelected,
            });
        }
    };

    public render = () => {
        const { currencyPair, web3State } = this.props;
        const { makerAmount, price, tab, orderType, error } = this.state;

        const buySellInnerTabs = [
            {
                active: orderType === OrderType.Market,
                onClick: this._switchToMarket,
                text: 'Market',
            },
            {
                active: orderType === OrderType.Limit,
                onClick: this._switchToLimit,
                text: 'Limit',
            },
        ];

        const isMakerAmountEmpty = makerAmount === null || makerAmount.isZero();
        const isPriceEmpty = price === null || price.isZero();

        const orderTypeLimitIsEmpty = orderType === OrderType.Limit && (isMakerAmountEmpty || isPriceEmpty);
        const orderTypeMarketIsEmpty = orderType === OrderType.Market && isMakerAmountEmpty;

        const btnPrefix = tab === OrderSide.Buy ? 'Buy ' : 'Sell ';
        const btnText = error && error.btnMsg ? 'Error' : btnPrefix + tokenSymbolToDisplayString(currencyPair.base);

        const decimals = getKnownTokens().getTokenBySymbol(currencyPair.base).decimals;

        return (
            <>
                <BuySellWrapper>
                    <TabsContainer>
                        <TabButton
                            isSelected={tab === OrderSide.Buy}
                            onClick={this.changeTab(OrderSide.Buy)}
                            side={OrderSide.Buy}
                        >
                            Buy
                        </TabButton>
                        <TabButton
                            isSelected={tab === OrderSide.Sell}
                            onClick={this.changeTab(OrderSide.Sell)}
                            side={OrderSide.Sell}
                        >
                            Sell
                        </TabButton>
                    </TabsContainer>
                    <Content>
                        <LabelContainer>
                            <Label>Amount</Label>
                            <InnerTabs tabs={buySellInnerTabs} />
                        </LabelContainer>
                        <FieldContainer>
                            <BigInputNumberStyled
                                decimals={decimals}
                                min={new BigNumber(0)}
                                onChange={this.updateMakerAmount}
                                value={makerAmount}
                                placeholder={'0.00'}
                            />
                            <BigInputNumberTokenLabel tokenSymbol={currencyPair.base} />
                        </FieldContainer>
                        {orderType === OrderType.Limit && (
                            <>
                                <LabelContainer>
                                    <Label>Price per token</Label>
                                </LabelContainer>
                                <FieldContainer>
                                    <BigInputNumberStyled
                                        decimals={0}
                                        min={new BigNumber(0)}
                                        valueFixedDecimals={7}
                                        onChange={this.updatePrice}
                                        value={price}
                                        placeholder={'0.00'}
                                    />
                                    <BigInputNumberTokenLabel tokenSymbol={currencyPair.quote} />
                                </FieldContainer>
                            </>
                        )}
                        <PercentContainer>
                            <PercentBox onClick={() => this.updateMakerAmountbyPercent(0.25)}>25%</PercentBox>
                            <PercentBox onClick={() => this.updateMakerAmountbyPercent(0.5)}>50%</PercentBox>
                            <PercentBox onClick={() => this.updateMakerAmountbyPercent(0.75)}>75%</PercentBox>
                            <PercentBox onClick={() => this.updateMakerAmountbyPercent(1)}>100%</PercentBox>
                        </PercentContainer>
                        <OrderDetailsContainer
                            orderType={orderType}
                            orderSide={tab}
                            tokenAmount={makerAmount || new BigNumber(0)}
                            tokenPrice={price || new BigNumber(0)}
                            currencyPair={currencyPair}
                        />
                        <Button
                            disabled={web3State !== Web3State.Done || orderTypeLimitIsEmpty || orderTypeMarketIsEmpty}
                            icon={error && error.btnMsg ? ButtonIcons.Warning : undefined}
                            onClick={this.submit}
                            variant={
                                error && error.btnMsg
                                    ? ButtonVariant.Error
                                    : tab === OrderSide.Buy
                                    ? ButtonVariant.Buy
                                    : ButtonVariant.Sell
                            }
                        >
                            {btnText}
                        </Button>
                    </Content>
                </BuySellWrapper>
                {error && error.cardMsg ? (
                    <ErrorCard fontSize={FontSize.Large} text={error.cardMsg} icon={ErrorIcons.Sad} />
                ) : null}
            </>
        );
    };

    public changeTab = (tab: OrderSide) => () => this.setState({ tab });

    public updateMakerAmountbyPercent = (percent: number) => {
        const {
            baseToken,
            quoteToken,
            quoteTokenBalance,
            baseTokenBalance,
            totalEthBalance,
            orders,
            markets
        } = this.props;
        const { tab, orderType } = this.state;

        if (baseToken && baseTokenBalance && quoteToken && quoteTokenBalance) {
            let baseTokenBalanceAmount = isWeth(baseToken.symbol) ? totalEthBalance : baseTokenBalance.balance;
            let quoteTokenBalanceAmount = quoteTokenBalance.balance;

            orders && orders.map((cur: UIOrder) => {
                if (cur.status === OrderStatus.Fillable) {
                    if (cur.side === OrderSide.Sell) {
                        baseTokenBalanceAmount = baseTokenBalanceAmount.minus(cur.size);
                    }
                    else {
                        const priceInQuoteBaseUnits = unitsInTokenAmount(cur.price.toString(), quoteToken.decimals);
                        const baseTokenAmountInUnits = unitsInTokenAmount(cur.size.toString(), baseToken.decimals);
            
                        quoteTokenBalanceAmount = quoteTokenBalanceAmount.minus(baseTokenAmountInUnits.multipliedBy(priceInQuoteBaseUnits));
                    }
                }
            })

            if (tab === OrderSide.Buy) {
                let price = new BigNumber(0);

                if (orderType === OrderType.Limit) {
                    if (this.state.price) {
                        price = this.state.price;
                    }
                }
                else {
                    markets && markets.map((market: Market) => {
                        if (market.currencyPair.base === baseToken.symbol && market.currencyPair.quote === quoteToken.symbol) {
                            if (market.price) {
                                price = market.price;
                            }
                        }
                    })    
                }

                if (!price.isZero()) {
                    const priceInQuoteBaseUnits = unitsInTokenAmount(price.toString(), quoteToken.decimals);
                    this.setState({
                        makerAmount: unitsInTokenAmount(quoteTokenBalanceAmount.multipliedBy(new BigNumber(0.97 * percent)).dividedBy(priceInQuoteBaseUnits).toFixed(baseToken.decimals), baseToken.decimals)
                    })
                }
            }
            else {
                this.setState({
                    makerAmount: baseTokenBalanceAmount.multipliedBy(new BigNumber(percent))
                })
            }
        }
    }

    public updateMakerAmount = (newValue: BigNumber) => {
        this.setState({
            makerAmount: newValue,
        });
    };

    public updatePrice = (price: BigNumber) => {
        this.setState({ price });
    };

    public submit = async () => {
        const orderSide = this.state.tab;
        const makerAmount = this.state.makerAmount || new BigNumber(0);
        const price = this.state.price || new BigNumber(0);

        const { makerFee, takerFee } = await this.props.onFetchTakerAndMakerFee(makerAmount, price, this.state.tab);
        if (this.state.orderType === OrderType.Limit) {
            await this.props.onSubmitLimitOrder(makerAmount, price, orderSide, makerFee);
        } else {
            try {
                await this.props.onSubmitMarketOrder(makerAmount, orderSide, takerFee);
            } catch (error) {
                this.setState(
                    {
                        error: {
                            btnMsg: 'Error',
                            cardMsg: error.message,
                        },
                    },
                    () => {
                        // After a timeout both error message and button gets cleared
                        setTimeout(() => {
                            this.setState({
                                error: {
                                    ...this.state.error,
                                    btnMsg: null,
                                },
                            });
                        }, TIMEOUT_BTN_ERROR);
                        setTimeout(() => {
                            this.setState({
                                error: {
                                    ...this.state.error,
                                    cardMsg: null,
                                },
                            });
                        }, TIMEOUT_CARD_ERROR);
                    },
                );
            }
        }
        this._reset();
    };

    private readonly _reset = () => {
        this.setState({
            makerAmount: null,
            price: null,
        });
    };

    private readonly _switchToMarket = () => {
        this.setState({
            orderType: OrderType.Market,
        });
    };

    private readonly _switchToLimit = () => {
        this.setState({
            orderType: OrderType.Limit,
        });
    };
}

const mapStateToProps = (state: StoreState): StateProps => {
    return {
        web3State: getWeb3State(state),
        currencyPair: getCurrencyPair(state),
        orderPriceSelected: getOrderPriceSelected(state),
        baseToken: getBaseToken(state),
        quoteToken: getQuoteToken(state),
        ethAccount: getEthAccount(state),
        quoteTokenBalance: getQuoteTokenBalance(state),
        baseTokenBalance: getBaseTokenBalance(state),
        totalEthBalance: getTotalEthBalance(state),
        orders: getUserOrders(state),
        markets: getMarkets(state),
    };
};

const mapDispatchToProps = (dispatch: any): DispatchProps => {
    return {
        onSubmitLimitOrder: (amount: BigNumber, price: BigNumber, side: OrderSide, makerFee: BigNumber) =>
            dispatch(startBuySellLimitSteps(amount, price, side, makerFee)),
        onSubmitMarketOrder: (amount: BigNumber, side: OrderSide, takerFee: BigNumber) =>
            dispatch(startBuySellMarketSteps(amount, side, takerFee)),
        onConnectWallet: () => dispatch(initWallet()),
        onFetchTakerAndMakerFee: (amount: BigNumber, price: BigNumber, side: OrderSide) =>
            dispatch(fetchTakerAndMakerFee(amount, price, side)),
    };
};

const BuySellContainer = connect(
    mapStateToProps,
    mapDispatchToProps,
)(BuySell);

export { BuySell, BuySellContainer };
