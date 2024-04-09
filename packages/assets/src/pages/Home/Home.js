import React, {useState} from 'react';
import {Layout, Page, SettingToggle, Text} from '@shopify/polaris';
import {useStore} from '@assets/reducers/storeReducer';

/**
 * Render a home page for overview
 *
 * @return {React.ReactElement}
 * @constructor
 */
export default function Home() {
  const [enabled, setEnabled] = useState(false);
  const {dispatch} = useStore();

  return (
    <Page title="Dashboard">
      <Layout>
        <Layout.Section>
          <SettingToggle
            action={{
              content: enabled ? 'Disable' : 'Enable',
              onAction() {
                setEnabled(prev => !prev);
              }
            }}
            enabled={enabled}
          >
            <Text variant="bodyMd" as="span">
              Our app is {enabled ? 'enabled' : 'disabled'} on your store
            </Text>
          </SettingToggle>
        </Layout.Section>
      </Layout>
    </Page>
  );
}
