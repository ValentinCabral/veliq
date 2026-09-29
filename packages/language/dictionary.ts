export const roots = [
  [1001,'va','Entity'],[1002,'ki','Action'],[1003,'lum','Information'],[1004,'mir','Memory'],
  [1005,'sen','Analyze'],[1006,'vek','Error'],[1007,'nar','Fix'],[1008,'sel','Verify'],
  [1009,'tor','Goal'],[1010,'nu','Negation'],[1011,'ri','Reference'],[1012,'zen','Complete'],
  [1013,'dar','Transfer'],[1014,'mak','Create'],[1015,'val','Value'],[1016,'tem','Time'],
  [1017,'kon','Condition'],[1018,'kal','Cause'],[1019,'res','Result'],[1020,'sav','Persist'],
  [1021,'lok','Location'],[1022,'yun','Union'],[1023,'dis','Difference'],[1024,'pre','Before'],[1025,'pos','After'],
  [1026,'agn','Agent'],[1027,'lit','Literal'],[1028,'evd','Evidence'],[1029,'pro','Prohibition'],
  [1030,'obl','Obligation'],[1031,'per','Permission'],[1032,'hyp','Hypothesis'],[1033,'seq','Sequence'],
  [1034,'par','Parallel'],[1035,'qty','Quantity'],[1036,'unt','Unit'],[1037,'dur','Duration'],
  [1038,'sta','State'],[1039,'prop','Property'],[1040,'rel','Relation'],[1041,'col','Collection'],
  [1042,'opq','OpaqueData'],[1043,'del','Delete']
] as const;
export const byWord = new Map(roots.map(([id,word,type]) => [word,{id,type}]));
export const byId = new Map(roots.map(([id,word,type]) => [id,{word,type}]));
export const dictionaryVersion = '0.1';
