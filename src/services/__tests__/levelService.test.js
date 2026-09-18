const mockInvoke=jest.fn();
jest.mock('firebase/functions',()=>({getFunctions:()=>({}),httpsCallable:jest.fn(()=>mockInvoke)}));
jest.mock('../firebaseService',()=>({app:{}}));jest.mock('../callService',()=>({}));
const {levelService}=require('../levelService');
beforeEach(()=>{jest.clearAllMocks();mockInvoke.mockResolvedValue({data:{level:0}});});
test('own read sends no wallet or client total',async()=>{await levelService.getOwn({wallet:99999});expect(mockInvoke).toHaveBeenCalledWith({});});
test('claim adapter forwards only the configured milestone identifier',async()=>{await levelService.claim(1,{uid:'other',qualifyingCredits:99999});expect(mockInvoke).toHaveBeenCalledWith({level:1});});
test('public badge request contains only Consumer identity',async()=>{await levelService.getConsumer('c',{level:10});expect(mockInvoke).toHaveBeenCalledWith({consumerUid:'c'});});
