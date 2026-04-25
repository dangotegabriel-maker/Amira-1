import React from 'react';
import { WebView } from 'react-native-webview';

const PaystackWebView = ({ source, onNavigationStateChange, onLoadStart, onLoadEnd, startInLoadingState, renderLoading, email }) => {
  // Pass the email prop to the WebView if needed, e.g. for analytics or direct injection
  // console.log('Initializing Paystack for:', email);

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
