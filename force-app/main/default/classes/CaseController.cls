public with sharing class CaseController {
    @AuraEnabled
    public static Id createCase(String email, String type, String scheduledDate, String description, String accountId) {
        Case newCase = new Case();
        
        if (String.isBlank(email)) {
            throw new AuraHandledException('이메일이 필요합니다.');
        }
        
        // Account ID 연결
        if (!String.isBlank(accountId)) {
            newCase.AccountId = accountId;
        }
        
        newCase.Origin = 'Web'; // Web-to-Case
        newCase.Type = type;
        newCase.Description = description;
        
        // Case 소유자를 "OmniQueue" 큐에 할당
        Group queueGroup = [SELECT Id FROM Group WHERE Type = 'Queue' AND Name = 'OmniQueue' LIMIT 1];
        if (queueGroup != null) {
            newCase.OwnerId = queueGroup.Id;
        }
        
        if (!String.isBlank(scheduledDate)) {
            try {
                scheduledDate = scheduledDate.replace('T', ' ') + ':00'; // "2025-02-27 14:18" -> "2025-02-27 14:18:00"
                
                // 년, 월, 일, 시, 분, 초를 분리하여 DateTime 생성
                Integer year = Integer.valueOf(scheduledDate.substring(0, 4));
                Integer month = Integer.valueOf(scheduledDate.substring(5, 7));
                Integer day = Integer.valueOf(scheduledDate.substring(8, 10));
                Integer hour = Integer.valueOf(scheduledDate.substring(11, 13));
                Integer minute = Integer.valueOf(scheduledDate.substring(14, 16));
                Integer second = Integer.valueOf(scheduledDate.substring(17, 19));
                
                newCase.Scheduled_Date__c = DateTime.newInstance(year, month, day, hour, minute, second);
            } catch (Exception e) {
                throw new AuraHandledException('올바른 날짜 형식이 아닙니다: ' + scheduledDate);
            }
        }
        
        insert newCase;
        return newCase.Id;
    }
}