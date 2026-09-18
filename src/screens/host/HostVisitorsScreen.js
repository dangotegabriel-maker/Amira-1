import React from 'react';
import HostActivityScreen from './HostActivityScreen';
// Preserve the existing approved-Host route using the same safe visitor feed.
export default function HostVisitorsScreen(props){return <HostActivityScreen {...props} initialTab="Visitors"/>;}
