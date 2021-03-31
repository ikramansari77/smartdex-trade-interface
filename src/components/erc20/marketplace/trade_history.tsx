import { assetDataUtils, BigNumber, SignedOrder } from '0x.js';
import React from 'react';
import { connect } from 'react-redux';
import styled from 'styled-components';

import { themeDimensions } from '../../../themes/commons';

import { UI_DECIMALS_DISPLAYED_PRICE_ETH } from '../../../common/constants';
import { getBaseToken, getQuoteToken, getWeb3State, getOverallHistory } from '../../../store/selectors';
import { tokenAmountInUnits, tokenAmountInUnitsToBigNumber } from '../../../util/tokens';
import { OrderSide, StoreState, Token, Web3State } from '../../../util/types';
import { CardBase } from '../../common/card_base';
import { EmptyContent } from '../../common/empty_content';
import { LoadingWrapper } from '../../common/loading';
import { CustomTD, Table, TH, THead, TR } from '../../common/table';

import { getKnownTokens } from '../../../util/known_tokens';

interface StateProps {
    baseToken: Token | null;
    overallHistory: SignedOrder[];
    quoteToken: Token | null;
    web3State?: Web3State;
}

type Props = StateProps;

const SideTD = styled(CustomTD) <{ side: OrderSide }>`
    color: ${props =>
        props.side === OrderSide.Buy ? props.theme.componentsTheme.green : props.theme.componentsTheme.red};
`;

const CardWrapper = styled(CardBase)`
    display: flex;
    flex-direction: column;
    margin-bottom: ${themeDimensions.verticalSeparationSm};
    max-height: 100%;

    &:last-child {
        margin-bottom: 0;
    }
`;

const CardHeader = styled.div`
    align-items: center;
    display: flex;
    flex-grow: 0;
    flex-shrink: 0;
    justify-content: space-between;
    padding: 11px 16px;
`;

const CardTitle = styled.h1`
    color: #fff;
    font-size: 16px;
    font-style: normal;
    font-weight: 600;
    line-height: 1.2;
    margin: 0;
    padding: 0 20px 0 0;
    width: 100%;
`;

const CardBody = styled.div`
    margin: 0;
    /* overflow-x: auto; */
    padding: ${themeDimensions.verticalPadding} ${themeDimensions.horizontalPadding};
    position: relative;
    max-height: calc(100% - 55px);
    overflow-y: auto;
`;

const allOrderHistoryToRow = (order: any, index: number, baseToken: Token) => {
    const sideLabel = order.side ? 'Buy' : 'Sell';

    const size = order.amount ? parseFloat(order.amount.toString()).toFixed(baseToken.displayDecimals) : 0;

    const price = order.avg_price ? parseFloat(order.avg_price.toString()).toFixed(UI_DECIMALS_DISPLAYED_PRICE_ETH) : 0;

    const time = new Date();
    time.setTime(order.dt);

    return (
        <TR key={index}>
            <SideTD styles={{ textAlign: 'left', tabular: true }} side={sideLabel === 'Buy' ? OrderSide.Buy : OrderSide.Sell}>{price}</SideTD>
            <CustomTD styles={{ textAlign: 'right', tabular: true }}>{size}</CustomTD>
            <CustomTD styles={{ textAlign: 'right', tabular: true }}>{time.toTimeString().slice(0, 8)}</CustomTD>
        </TR>
    );
};

interface State {
    myhistory: Array<any>;
}

class TradeHistory extends React.Component<Props, State> {
    public state: State = {
        myhistory: []
    }

    public render = () => {
        const { baseToken, quoteToken, web3State, overallHistory } = this.props;

        let content: React.ReactNode;
        switch (web3State) {
            case Web3State.Locked:
            case Web3State.NotInstalled:
            case Web3State.Loading: {
                content = <EmptyContent alignAbsoluteCenter={true} text="There are no orders to show" />;
                break;
            }
            default: {
                if (web3State !== Web3State.Error && (!baseToken || !quoteToken)) {
                    content = <LoadingWrapper minHeight="120px" />;
                } else if (!overallHistory.length || !baseToken || !quoteToken) {
                    content = <EmptyContent alignAbsoluteCenter={true} text="There are no orders to show" />;
                } else {
                    content = (
                        <Table isResponsive={true}>
                            <THead>
                                <TR>
                                    <TH styles={{ textAlign: 'center' }}>Price ({quoteToken.symbol})</TH>
                                    <TH styles={{ textAlign: 'center' }}>Amount ({baseToken.symbol})</TH>
                                    <TH styles={{ textAlign: 'center' }}>Time</TH>
                                    {/* <TH>&nbsp;</TH> */}
                                </TR>
                            </THead>
                            <tbody>{overallHistory.map((order, index) => allOrderHistoryToRow(order, index, baseToken))}</tbody>
                        </Table>
                    );
                }
                break;
            }
        }

        return (
            <CardWrapper style={{ height: 'calc(100% - 670px)', maxHeight: 'calc(100% - 610px)', minHeight: '310px', position: 'relative' }}>
                <CardHeader>
                    <CardTitle>
                        <span style={{ color: '#fff' }}>Trade History</span>
                    </CardTitle>
                </CardHeader>
                <CardBody>{content}</CardBody>
            </CardWrapper>
        )
    };
}

const mapStateToProps = (state: StoreState): StateProps => {
    return {
        baseToken: getBaseToken(state),
        overallHistory: getOverallHistory(state),
        quoteToken: getQuoteToken(state),
        web3State: getWeb3State(state),
    };
};

const TradeHistoryContainer = connect(mapStateToProps)(TradeHistory);

export { TradeHistory, TradeHistoryContainer };
