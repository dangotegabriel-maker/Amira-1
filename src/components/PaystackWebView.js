import React from 'react';
import { WebView } from 'react-native-webview';

const PaystackWebView = ({ source, onNavigationStateChange, onLoadStart, onLoadEnd, startInLoadingState, renderLoading, email }) => {
  // In a real implementation, we could inject the email into the Paystack flow here if needed,
  // or just pass it through to the WebView.
  return (
    <WebView
      source={source}
      onNavigationStateChange={onNavigationStateChange}
      onLoadStart={onLoadStart}
      onLoadEnd={onLoadEnd}
      startInLoadingState={startInLoadingState}
      renderLoading={renderLoading}
    />
  );
};

export default PaystackWebView;
