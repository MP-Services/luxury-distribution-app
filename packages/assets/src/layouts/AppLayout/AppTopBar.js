import React from 'react';
import {Button, Icon, LegacyStack, Link, Text, Thumbnail, TopBar} from '@shopify/polaris';
import PropTypes from 'prop-types';
import {BugIcon, MenuIcon, PaymentIcon, XIcon} from '@shopify/polaris-icons';
import isLocal from '@assets/helpers/isLocal';
import {docLink} from '@assets/config/menuLink';
import InfoIcon from '@assets/resources/icons/info.svg';
import NotificationIcon from '@assets/resources/icons/notification.svg';
import {LOGO_URL, LOGO_WIDTH} from '@assets/config/theme';
import '@assets/styles/layout/topbar.scss';
import {isShopUpgradable} from '@assets/services/shopService';
import {useStore} from '@assets/reducers/storeReducer';
import useConfirmSheet from '@assets/hooks/popup/useConfirmSheet';
import AppNewsSheet from '@assets/components/AppNews/AppNewsSheet';

/**
 * @param {boolean} isNavOpen
 * @param {function} toggleOpenNav
 * @return {JSX.Element}
 * @constructor
 */
export default function AppTopBar({isNavOpen, toggleOpenNav}) {
  const {state} = useStore();
  const {shop} = state;

  const {sheet: newsSheet, openSheet: openNewsSheet} = useConfirmSheet({Content: AppNewsSheet});

  return (
    <TopBar
      secondaryMenu={
        <div className="Avada-TopBar__Wrapper">
          <div className="Avada-TopBar__Title">
            <Button onClick={toggleOpenNav} variant="plain">
              <Icon source={isNavOpen ? XIcon : MenuIcon} />
            </Button>
            <img alt="Avada App Name" src={LOGO_URL} width={LOGO_WIDTH} />
            <Text variant="headingLg" as="p">
              <Link url="/" removeUnderline>
                App Name
              </Link>
            </Text>
            {isLocal && (
              <LegacyStack alignment="center">
                <Button url="/dev_zone" icon={BugIcon} variant="plain" />
              </LegacyStack>
            )}
          </div>
          <div className="Avada-TopBar__Icons">
            <LegacyStack alignment="center" spacing="extraTight">
              <Button url={docLink} external variant="plain">
                <Thumbnail source={InfoIcon} size="small" alt="" />
              </Button>
              <Button onClick={() => openNewsSheet()} variant="plain">
                <Thumbnail source={NotificationIcon} size="small" alt="" />
              </Button>
            </LegacyStack>
          </div>
          {isShopUpgradable(shop) && (
            <Button url="/subscription">
              <LegacyStack alignment="center">
                <Icon source={PaymentIcon} />
                <LegacyStack.Item>Subscription</LegacyStack.Item>
              </LegacyStack>
            </Button>
          )}
          {newsSheet}
        </div>
      }
    />
  );
}

AppTopBar.propTypes = {
  isNavOpen: PropTypes.bool,
  toggleOpenNav: PropTypes.func
};
