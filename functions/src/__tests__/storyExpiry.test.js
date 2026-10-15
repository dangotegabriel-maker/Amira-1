const {projectHost} = require('../hostDiscoveryDomain');

test('public Story projection preserves expiry and omits expired/private media', () => {
  const now = 100000;
  const story = {id:'live',uri:'https://example.test/story',type:'video',visibility:'public',expiresAt:{toMillis:()=>now+1000}};
  const value = projectHost('h', {stories:[story,{...story,id:'expired',expiresAt:now},{...story,id:'private',visibility:'vip_only'}]}, null, now);
  expect(value.stories).toEqual([{id:'live',uri:story.uri,type:'video',visibility:'public',expiresAtMs:now+1000}]);
  expect(projectHost('h',{stories:[story]},null,now+1000).stories).toEqual([]);
});
