public class OpportunityClosedWonToWorkHandler {
    
    public static void handleAfterUpdate(List<Opportunity> newOpportunities, Map<Id, Opportunity> oldOpportunityMap) {
        List<Work__c> worksToCreate = new List<Work__c>();
        
        for (Opportunity opp : newOpportunities) {
            Opportunity oldOpp = oldOpportunityMap.get(opp.Id);
            
            // Opportunity의 Stage가 계약 완료으로 변경된 경우에만 처리
            if (oldOpp.StageName != '계약 완료' && opp.StageName == '계약 완료') {
                Work__c work = new Work__c();
                
                // Opportunity의 필드 값을 Work에 매핑
                work.Name = opp.Name+' 설치';
                work.Address__c = opp.Address__c;
                work.District__c = opp.District__c;
                work.Latitude__c = opp.Latitude__c;
                work.Longitude__c = opp.Longitude__c;
                work.Scheduled_Date__c = opp.Installdate__c;
                
                work.Account__c = opp.AccountId;
                
                // Technicion__c는 아직 할당되지 않았으므로 null로 둠
                work.Technician__c = null;
                
                // Status__c를 기사배정대기로 설정
                work.Status__c = '기사배정대기';
                
                // Type__c를 '설치'로 설정 (레코드를 새로 만드는 경우)
                work.Type__c = '설치';
                
                worksToCreate.add(work);
            }
        }
        
        if (!worksToCreate.isEmpty()) {
            insert worksToCreate;
        }
    }
}