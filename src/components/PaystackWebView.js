import React from 'react';
import { WebView } from 'react-native-webview';

const PaystackWebView = ({ source, onNavigationStateChange, onLoadStart, onLoadEnd, startInLoadingState, renderLoading, email }) => {
  // Use the email prop to customize the WebView experience or for logging
  // In a real Paystack integration, this might be used to pre-fill user details
  // via injected JavaScript or by appending it to the URL if not already done.

  const injectedJavaScript = `
    window.paystackUserEmail = "${email || ''}";
    true; // note: this is required, or you'll sometimes get silent failures
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
