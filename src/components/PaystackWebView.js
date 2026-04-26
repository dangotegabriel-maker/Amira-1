import React from 'react';
import { WebView } from 'react-native-webview';

const PaystackWebView = ({ source, onNavigationStateChange, onLoadStart, onLoadEnd, startInLoadingState, renderLoading, email }) => {
  // Use the email prop to customize the WebView experience or for logging
  // Safe string injection for email
  const safeEmail = (email || '').replace(/"/g, '\\"');

  const injectedJavaScript = `
    window.paystackUserEmail = "${safeEmail}";
    true;
  `;

  return (
    <WebView
      source={source}
      onNavigationStateChange={onNavigationStateChange}
      onLoadStart={onLoadStart}
      onLoadEnd={onLoadEnd}
      startInLoadingState={startInLoadingState}
      renderLoading={renderLoading}
      injectedJavaScript={injectedJavaScript}
    />
  );
};

export default PaystackWebView;
