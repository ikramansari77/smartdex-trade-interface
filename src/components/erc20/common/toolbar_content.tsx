import React from 'react';
import { connect } from 'react-redux';
import ReactSVG from 'react-svg';
import styled, { withTheme } from 'styled-components';

import { ReactComponent as LogoSvg } from '../../../assets/icons/erc20_logo.svg';
import { Config } from '../../../common/config';
import { UI_GENERAL_TITLE, ARKANE_CLIENTID, ARKANE_ENV } from '../../../common/constants';
import { Logo } from '../../../components/common/logo';
import { separatorTopbar, ToolbarContainer } from '../../../components/common/toolbar';
import { NotificationsDropdownContainer } from '../../../components/notifications/notifications_dropdown';
import { goToHome, goToWallet } from '../../../store/actions';
import { Theme, themeBreakPoints } from '../../../themes/commons';
import { Button } from '../../common/button';
import { WalletConnectionContentContainer } from '../account/wallet_connection_content';

import { MarketsDropdownContainer } from './markets_dropdown';

interface DispatchProps {
    onGoToHome: () => any;
    onGoToWallet: () => any;
}

interface OwnProps {
    theme: Theme;
}

type Props = DispatchProps & OwnProps;

const MyWalletLink = styled.a`
    align-items: center;
    color: ${props => props.theme.componentsTheme.myWalletLinkColor};
    display: flex;
    font-size: 16px;
    font-weight: 500;
    text-decoration: none;

    &:hover {
        text-decoration: underline;
    }

    ${separatorTopbar}
`;

const LogoHeader = styled(Logo)`
    ${separatorTopbar}
`;

const LogoSVGStyled = styled(LogoSvg)`
    path {
        fill: ${props => props.theme.componentsTheme.logoERC20Color};
    }
`;

const MarketsDropdownHeader = styled<any>(MarketsDropdownContainer)`
    align-items: center;
    display: flex;

    ${separatorTopbar}
`;

const WalletDropdown = styled(WalletConnectionContentContainer)`
    display: none;

    @media (min-width: ${themeBreakPoints.sm}) {
        align-items: center;
        display: flex;

        ${separatorTopbar}
    }
`;

const ToolbarContent = (props: Props) => {
    const handleLogoClick: React.EventHandler<React.MouseEvent> = e => {
        e.preventDefault();
        props.onGoToHome();
    };
    const generalConfig = Config.getConfig().general;
    // const logo = <LogoSVGStyled />;
    const logo = null;
    const startContent = (
        <>
            <LogoHeader
                image={logo}
                onClick={handleLogoClick}
                text="smartdex"
                textColor={props.theme.componentsTheme.logoERC20TextColor}
            />
            <MarketsDropdownHeader shouldCloseDropdownBodyOnClick={false} />
        </>
    );

    const handleMyWalletClick: React.EventHandler<React.MouseEvent> = e => {
        e.preventDefault();
        props.onGoToWallet();
    };
    const endContent = (
        <>
            <Button onClick={() => {
                window.arkaneConnect = new ArkaneConnect(ARKANE_CLIENTID, {environment: ARKANE_ENV});
            }}>Connect to Arkane</Button>
            <MyWalletLink href="/my-wallet" onClick={handleMyWalletClick}>
                My Wallet
            </MyWalletLink>
            <WalletDropdown />
            <NotificationsDropdownContainer />
        </>
    );

    return <ToolbarContainer startContent={startContent} endContent={endContent} />;
};

const mapDispatchToProps = (dispatch: any): DispatchProps => {
    return {
        onGoToHome: () => dispatch(goToHome()),
        onGoToWallet: () => dispatch(goToWallet()),
    };
};

const ToolbarContentContainer = withTheme(
    connect(
        null,
        mapDispatchToProps,
    )(ToolbarContent),
);

export { ToolbarContent, ToolbarContentContainer };
