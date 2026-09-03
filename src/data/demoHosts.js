const photo = (id) => `https://images.unsplash.com/${id}?auto=format&fit=crop&w=900&q=80`;
const daysAgo = (days) => new Date(Date.now() - days * 86400000).toISOString();

// Review-only adapter data. Never written to Firestore and never enabled in production.
export const DEMO_HOSTS = [
  ['demo-ama','Ama',24,'GH','Ghana','online',['Music','Culture'],'Warm, curious and always ready to share a laugh.','photo-1494790108377-be9c29b29330',1,true,true],
  ['demo-zainab','Zainab',27,'NG','Nigeria','offline',['Movies','Travel'],'I love thoughtful chats, films and discovering new places.','photo-1534528741775-53994a69daeb',12,false,false],
  ['demo-sofia','Sofia',25,'PT','Portugal','online',['Food','Languages'],'Friendly conversations about food, languages and everyday life.','photo-1517841905240-472988babdf9',2,true,true],
  ['demo-nia','Nia',30,'KE','Kenya','busy',['Books','Wellness'],'Calm energy, good books and genuine conversations.','photo-1531123897727-8f129e1688ce',30,false,false],
  ['demo-lina','Lina',23,'MA','Morocco','online',['Fashion','Travel'],'Positive, social and excited to meet people from everywhere.','photo-1524504388940-b1c1722653e1',4,true,false],
  ['demo-abena','Abena',29,'GH','Ghana','offline',['Business','Music'],'Let’s talk ambitions, music and the little wins in life.','photo-1544005313-94ddf0286df2',60,false,true],
  ['demo-maya','Maya',26,'US','United States','online',['Gaming','Movies'],'Playful chats, great movies and an occasional game night.','photo-1529626455594-4ff0802cfb7e',6,true,false],
  ['demo-chioma','Chioma',28,'NG','Nigeria','busy',['Cooking','Culture'],'Good food, rich culture and conversations with heart.','photo-1488426862026-3ee34a7d66df',18,false,false],
  ['demo-leila','Leila',31,'AE','United Arab Emirates','online',['Travel','Wellness'],'Easygoing conversations, travel stories and positive energy.','photo-1508214751196-bcfd4ca60f91',3,true,true],
  ['demo-ruth','Ruth',22,'UG','Uganda','offline',['Dance','Music'],'Music, dance and friendly conversation make my day.','photo-1534751516642-a1af1ef26a56',40,false,false],
].map(([uid, username, age, countryCode, countryName, availability, interests, bio, imageId, approvedDaysAgo, hasActiveStory, demoFollowing], index) => ({
  uid, username, age, countryCode, countryName, role: 'host', isDemo: true, demoFollowing,
  profilePic: photo(imageId), hostApprovedAt: daysAgo(approvedDaysAgo),
  hostStatus: { isApproved: true, availability },
  hostProfile: { bio, interests, rateTier: 'ENTRY', videoRateCredits: 25, gallery: [photo(imageId), photo(index % 2 ? '1512316609839-ce289d3eba0a' : '1529139574466-a303027c1d8b')], introVideoUrl: '' },
  hasActiveStory,
  stories: hasActiveStory ? [{ id: `${uid}-story`, type: 'image', uri: photo(imageId) }] : [],
  storyThumbnail: hasActiveStory ? photo(imageId) : '', ratingsPlaceholder: index % 3 ? 4.8 : null,
}));
