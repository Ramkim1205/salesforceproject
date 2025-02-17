public with sharing class TechnicianDashboardHelper {
    @AuraEnabled(cacheable=true)
    public static List<Installation__c> getTechnicianInstallations() {
        try {
            // 현재 로그인한 User 정보 가져오기
            Id userId = UserInfo.getUserId();
            System.debug('🔹 Current Logged-in User ID: ' + userId);
            
            // 현재 User와 연결된 Technician 조회
            List<Technician__c> technicianList = [
                SELECT Id FROM Technician__c WHERE User__c = :userId LIMIT 1
            ];
            
            // Technician이 존재하지 않으면 빈 리스트 반환
            if (technicianList.isEmpty()) {
                System.debug('⚠️ No Technician found for User: ' + userId);
                return new List<Installation__c>();
            }
            
            Id technicianId = technicianList[0].Id;
            System.debug('✅ Found Technician ID: ' + technicianId);
            
            // Technician이 보유한 Installation 리스트 가져오기
            List<Installation__c> installations = [
                SELECT Id, Opportunity__c, Opportunity__r.Name, Scheduled_Date__c, Scheduled_Time__c, Status__c
                FROM Installation__c
                WHERE Technician__c = :technicianId
                ORDER BY Scheduled_Date__c ASC, Scheduled_Time__c ASC
            ];
            
            System.debug('✅ Found Installations: ' + installations.size());
            return installations;
            
        } catch (Exception e) {
            System.debug('❌ Error in getTechnicianInstallations: ' + e.getMessage());
            return new List<Installation__c>();
        }
    }
}