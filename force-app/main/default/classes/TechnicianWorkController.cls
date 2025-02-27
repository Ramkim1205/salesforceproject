public with sharing class TechnicianWorkController {
    @AuraEnabled(cacheable=true)
    public static List<Work__c> getWorksForDate(Date selectedDate) {
        // 현재 로그인한 사용자의 Technician 레코드를 찾습니다.
        Technician__c tech = [
            SELECT Id 
            FROM Technician__c 
            WHERE User__c = :UserInfo.getUserId() 
            LIMIT 1
        ];
        
        // 선택한 날짜의 00:00:00부터 다음 날 00:00:00 전까지의 범위를 생성합니다.
        DateTime startDT = DateTime.newInstance(selectedDate, Time.newInstance(0, 0, 0, 0));
        DateTime endDT = startDT.addDays(1);
        
        // 지정된 기간에 해당하는 Work 레코드를 조회합니다.
        // "작업완료" 상태인 레코드는 제외합니다.
        return [
            SELECT Id, Name, District__c, Scheduled_Date__c, Status__c,
                   Latitude__c, Longitude__c, Address__c
            FROM Work__c
            WHERE Technician__c = :tech.Id 
              AND Scheduled_Date__c >= :startDT
              AND Scheduled_Date__c < :endDT
              AND Status__c != '작업완료'
            ORDER BY Scheduled_Date__c ASC
        ];
    }
}