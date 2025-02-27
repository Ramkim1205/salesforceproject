public with sharing class LeadAddressUpdater {
    @AuraEnabled
    public static void updateLeadRecord(Id leadId, String lat, String lon, String address, String district) {
        // Lead 레코드를 쿼리합니다.
        List<Lead> leads = [SELECT Id, Latitude__c, Longitude__c, Address__c, District__c
                            FROM Lead
                            WHERE Id = :leadId
                            LIMIT 1];
        
        if (leads.isEmpty()) {
            throw new AuraHandledException('해당 리드 레코드를 찾을 수 없습니다.');
        }
        
        Lead leadRec = leads[0];
        
        // 위도, 경도 문자열을 Decimal로 변환합니다.
        try {
            leadRec.Latitude__c = Decimal.valueOf(lat);
            leadRec.Longitude__c = Decimal.valueOf(lon);
        } catch (Exception e) {
            // 변환 실패 시 기본값 0을 할당합니다.
            leadRec.Latitude__c = 0;
            leadRec.Longitude__c = 0;
        }
        
        leadRec.Address__c = address;
        leadRec.District__c = district;
        
        update leadRec;
    }
}