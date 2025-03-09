public with sharing class LeadLocationController {
    @AuraEnabled(cacheable=true)
    public static List<Lead> getLeadLocations() {
        return [
            SELECT Id, Name, Address__c, Latitude__c, Longitude__c, Flag__c,
                   TableOrder__c, Primary__c
            FROM Lead
            WHERE Latitude__c != null AND Longitude__c != null
            ORDER BY CreatedDate DESC
        ];
    }
    
    @AuraEnabled(cacheable=true)
    public static List<Work__c> getInstalledStoreLocations() {
        return [
            SELECT Id, Name, Address__c, Latitude__c, Longitude__c
            FROM Work__c
            WHERE Status__c = '작업완료'
              AND Latitude__c != null AND Longitude__c != null
        ];
    }
}