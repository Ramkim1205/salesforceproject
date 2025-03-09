public with sharing class WorkOpportunityProductController {
    @AuraEnabled(cacheable=true)
    public static List<OpportunityLineItem> getOpportunityProducts(Id workId) {
        // Work 레코드를 조회하여 관련 Opportunity Id를 가져옴
        Work__c workRec = [SELECT Opportunity__c FROM Work__c WHERE Id = :workId LIMIT 1];
        if (workRec.Opportunity__c == null) {
            return new List<OpportunityLineItem>();
        }
        // 해당 Opportunity의 제품들을 조회 (Product의 Name과 DisplayUrl 포함)
        return [
            SELECT 
                Id, 
                Quantity, 
                TotalPrice, 
                UnitPrice, 
                PricebookEntry.Product2.Name,
                PricebookEntry.Product2.DisplayUrl
            FROM OpportunityLineItem 
            WHERE OpportunityId = :workRec.Opportunity__c
        ];
    }
}