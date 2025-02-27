trigger OpportunityClosedWonToWorkTrigger on Opportunity (after update) {
    if (Trigger.isAfter && Trigger.isUpdate) {
        OpportunityClosedWonToWorkHandler.handleAfterUpdate(Trigger.new, Trigger.oldMap);
    }
}