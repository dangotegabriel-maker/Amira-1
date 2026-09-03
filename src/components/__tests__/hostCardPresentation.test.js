jest.mock('../../services/discoveryService',()=>({discoveryService:{isNewHost:()=>true}}));
import { getHostCardLabels } from '../HostCard';
const host={isDemo:true,hostProfile:{rateTier:'ENTRY',videoRateCredits:25}};
test('card omits pricing tier but retains rate',()=>{const labels=getHostCardLabels(host,{isDev:true});expect(labels.rate).toBe('25/min');expect(labels.rate).not.toContain('ENTRY');});
test('For You card does not display NEW badge',()=>expect(getHostCardLabels(host,{showNewBadge:false,isDev:true}).showNew).toBe(false));
test('demo badge is release-safe',()=>expect(getHostCardLabels(host,{isDev:false}).showDemo).toBe(false));
