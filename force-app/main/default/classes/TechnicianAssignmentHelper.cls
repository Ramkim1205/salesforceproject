public with sharing class TechnicianAssignmentHelper {
    
    @InvocableMethod(label='Assign Technician to Installation' description='Finds and assigns the best technician')
    public static void assignTechnicianToInstallation(List<Id> oppIds) {
        if (oppIds == null || oppIds.isEmpty()) return;
        
        System.debug('🔹 Received Opportunity IDs: ' + oppIds);
        List<Installation__c> installationsToInsert = new List<Installation__c>();
        List<TechnicianSchedule__c> schedulesToInsert = new List<TechnicianSchedule__c>();
        
        // 1️⃣ Opportunity 데이터 가져오기
        List<Opportunity> oppList = [
            SELECT Id, District__c, Scheduled_Date__c, Scheduled_Time__c
            FROM Opportunity 
            WHERE Id IN :oppIds
        ];
        
        for (Opportunity opp : oppList) {
            if (opp.District__c == null || opp.Scheduled_Date__c == null || opp.Scheduled_Time__c == null) {
                System.debug('⚠️ Missing Scheduling Data for Opportunity: ' + opp.Id);
                continue;
            }
            
            System.debug('🔹 Processing Opportunity: ' + opp.Id + ', District: ' + opp.District__c);
            
            // 2️⃣ 해당 District를 담당하는 Technician 조회 (Multi-Picklist 지원)
            List<Technician__c> availableTechnicians = [
                SELECT Id, Name, User__c, District__c, Assigned_Installations__c 
                FROM Technician__c
                WHERE District__c INCLUDES (:opp.District__c)
            ];
            
            if (availableTechnicians.isEmpty()) {
                System.debug('⚠️ No available Technicians for District: ' + opp.District__c);
                continue;
            }
            
            System.debug('✅ Found ' + availableTechnicians.size() + ' available Technicians');
            
            // 3️⃣ 해당 시간에 설치가 배정되지 않은 Technician 찾기
            Set<Id> technicianIds = new Set<Id>();
            for (Technician__c tech : availableTechnicians) {
                technicianIds.add(tech.Id);
            }
            
            // 해당 Technician들에게 이미 배정된 Installation 중, 같은 날짜 + 같은 시간에 진행되는 작업 조회
            Map<Id, Integer> assignedInstallationCounts = new Map<Id, Integer>();
            for (AggregateResult ar : [
                SELECT Technician__c, COUNT(Id) assignedCount
                FROM Installation__c
                WHERE Technician__c IN :technicianIds
                AND Scheduled_Date__c = :opp.Scheduled_Date__c
                AND Scheduled_Time__c = :opp.Scheduled_Time__c
                GROUP BY Technician__c
            ]) {
                assignedInstallationCounts.put((Id) ar.get('Technician__c'), (Integer) ar.get('assignedCount'));
            }
            
            // 4️⃣ 설치가 가능한 Technician 필터링 (이미 해당 시간대에 Installation이 없는 Technician)
            List<Technician__c> availableForTimeSlot = new List<Technician__c>();
            for (Technician__c tech : availableTechnicians) {
                if (!assignedInstallationCounts.containsKey(tech.Id)) {
                    availableForTimeSlot.add(tech);
                }
            }
            
            // 5️⃣ 가장 적은 Installation을 가진 Technician 선택
            Technician__c assignedTechnician;
            Decimal minInstallations = 20000.0;
            for (Technician__c tech : availableForTimeSlot) {
                Integer assignedCount = tech.Assigned_Installations__c != null ? tech.Assigned_Installations__c.intValue() : 0;
                if (assignedCount < minInstallations) {
                    minInstallations = assignedCount;
                    assignedTechnician = tech;
                }
            }
            
            if (assignedTechnician == null) {
                System.debug('⚠️ No Technician assigned for Opportunity: ' + opp.Id);
                continue;
            }
            
            System.debug('✅ Assigned Technician: ' + assignedTechnician.Id);
            
            // 6️⃣ Installation 생성 (`Technician__c` 필드에 배정)
            Installation__c newInstallation = new Installation__c(
                Opportunity__c = opp.Id,
            Technician__c = assignedTechnician.Id,
            Scheduled_Date__c = opp.Scheduled_Date__c,
            Scheduled_Time__c = opp.Scheduled_Time__c,
            Status__c = 'Scheduled'
                );
            installationsToInsert.add(newInstallation);
            
            // 7️⃣ Technician의 스케줄 추가 (`TechnicianSchedule__c`)
            TechnicianSchedule__c newSchedule = new TechnicianSchedule__c(
                Technician__c = assignedTechnician.Id,
            Schedule_Date__c = opp.Scheduled_Date__c,
            Schedule_Time__c = opp.Scheduled_Time__c
                );
            schedulesToInsert.add(newSchedule);
        }
        
        if (!installationsToInsert.isEmpty()) {
            insert installationsToInsert;
            System.debug('✅ Inserted ' + installationsToInsert.size() + ' new Installation records');
        }
        
        if (!schedulesToInsert.isEmpty()) {
            insert schedulesToInsert;
            System.debug('✅ Inserted ' + schedulesToInsert.size() + ' new Technician Schedule records');
        }
    }
}