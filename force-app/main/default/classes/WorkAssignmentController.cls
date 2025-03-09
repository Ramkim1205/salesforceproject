public with sharing class WorkAssignmentController {
    
    @AuraEnabled(cacheable=true)
    public static List<Work__c> getWorksWaitingAssignment() {
        return [
            SELECT Id, Name, District__c, Scheduled_Date__c, Status__c
            FROM Work__c
            WHERE Status__c = '기사배정대기'
            ORDER BY Scheduled_Date__c ASC
        ];
    }
    
    @AuraEnabled(cacheable=true)
    public static List<Map<String, Object>> getTechniciansByWorkDistrictAll_NoWrapper(Id workId) {
        List<Map<String, Object>> resultList = new List<Map<String, Object>>();
        
        // 1. 선택한 Work 레코드 조회
        Work__c workRecord = [
            SELECT Id, District__c, Scheduled_Date__c 
            FROM Work__c 
            WHERE Id = :workId 
            LIMIT 1
        ];
        if (workRecord.Scheduled_Date__c == null) {
            return resultList;
        }
        DateTime workStart = workRecord.Scheduled_Date__c;
        DateTime workEnd = workStart.addHours(2);
        
        // 2. 후보 기사 조회: Assigned_Districts__c에 Work의 District__c 포함
        // User__r.SmallPhotoUrl 필드를 추가하여 사진 URL도 가져옵니다.
        List<Technician__c> candidates = [
            SELECT Id, Name, Assigned_Districts__c, User__r.SmallPhotoUrl
            FROM Technician__c
            WHERE Assigned_Districts__c INCLUDES(:workRecord.District__c)
        ];
        if (candidates.isEmpty()) {
            return resultList;
        }
        Set<Id> candidateIds = new Set<Id>();
        for (Technician__c t : candidates) {
            candidateIds.add(t.Id);
        }
        
        // 3. 해당 날짜에 배정된 작업 조회 ('작업완료' 제외)
        Date workDate = workStart.date();
        DateTime dayStart = DateTime.newInstance(workDate, Time.newInstance(0, 0, 0, 0));
        DateTime dayEnd = dayStart.addDays(1);
        List<Work__c> assignments = [
            SELECT Id, Technician__c, Scheduled_Date__c
            FROM Work__c
            WHERE Technician__c IN :candidateIds
              AND Scheduled_Date__c >= :dayStart
              AND Scheduled_Date__c < :dayEnd
              AND Status__c != '작업완료'
        ];
        Map<Id, List<DateTime>> techAssignments = new Map<Id, List<DateTime>>();
        for (Work__c w : assignments) {
            if (w.Scheduled_Date__c != null) {
                if (!techAssignments.containsKey(w.Technician__c)) {
                    techAssignments.put(w.Technician__c, new List<DateTime>());
                }
                techAssignments.get(w.Technician__c).add(w.Scheduled_Date__c);
            }
        }
        
        // 4. 기술자 근무시간 조회 (가정: Technician_Working_Hours__c 오브젝트 사용)
        String dayShort = workStart.format('E');
        String dayType = (dayShort == 'Sat' || dayShort == 'Sun') ? 'Weekend' : 'Weekday';
        List<Technician_Working_Hours__c> workHoursList = [
            SELECT Technician__c, Day_Type__c, Start_Time__c, End_Time__c
            FROM Technician_Working_Hours__c
            WHERE Technician__c IN :candidateIds
              AND Day_Type__c = :dayType
        ];
        Map<Id, Technician_Working_Hours__c> techWorkingHours = new Map<Id, Technician_Working_Hours__c>();
        for (Technician_Working_Hours__c wh : workHoursList) {
            techWorkingHours.put(wh.Technician__c, wh);
        }
        
        // 5. Availability 계산: 시간 충돌 및 근무시간 체크 + progress 계산 (최대 5개 기준)
        Time workStartTime = workStart.time();
        Time workEndTime = workEnd.time();
        for (Technician__c tech : candidates) {
            String availability = '가능';
            Boolean conflict = false;
            if (techAssignments.containsKey(tech.Id)) {
                for (DateTime assignStart : techAssignments.get(tech.Id)) {
                    DateTime assignEnd = assignStart.addHours(2);
                    if (assignStart < workEnd && assignEnd > workStart) {
                        conflict = true;
                        break;
                    }
                }
            }
            if (conflict) {
                availability = '다른작업중';
            } else if (techWorkingHours.containsKey(tech.Id)) {
                Technician_Working_Hours__c wh = techWorkingHours.get(tech.Id);
                if (!(wh.Start_Time__c <= workStartTime && wh.End_Time__c >= workEndTime)) {
                    availability = '근무시간 아님';
                }
            } else {
                availability = '근무시간 아님';
            }
            // progress 계산: 해당 날짜에 배정된 work 수 / 5 (최대 5개)
            Integer count = techAssignments.containsKey(tech.Id) ? techAssignments.get(tech.Id).size() : 0;
            Integer progress = Math.min(Math.round((Decimal.valueOf(count) / 5) * 100), 100);
            
            Map<String, Object> techMap = new Map<String, Object>();
            techMap.put('technicianId', tech.Id);
            techMap.put('Name', tech.Name);
            techMap.put('Assigned_Districts__c', tech.Assigned_Districts__c);
            techMap.put('availability', availability);
            techMap.put('photoUrl', tech.User__r != null ? tech.User__r.SmallPhotoUrl : null);
            techMap.put('progress', progress);
            resultList.add(techMap);
        }
        return resultList;
    }
    
    @AuraEnabled
    public static String assignWorkToTechnician(Id workId, Id technicianId) {
        Work__c workRecord = [
            SELECT Id, Status__c 
            FROM Work__c 
            WHERE Id = :workId 
            LIMIT 1
        ];
        if (workRecord.Status__c != '기사배정대기') {
            throw new AuraHandledException('해당 작업은 이미 배정되었거나 배정할 수 없는 상태입니다.');
        }
        workRecord.Technician__c = technicianId;
        workRecord.Status__c = '배정완료';
        update workRecord;
        return '작업이 성공적으로 배정되었습니다.';
    }
}