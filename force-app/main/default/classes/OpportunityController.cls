public with sharing class OpportunityController {
    @AuraEnabled
    public static void addProductsToOpportunity(String opportunityId, List<CartItem> cartItems, Decimal totalAmount) {
        // 표준 Pricebook 조회 (리스트로 받아서 안전하게 처리)
        List<Pricebook2> pbList = [SELECT Id FROM Pricebook2 WHERE IsStandard = true LIMIT 1];
        if (pbList.isEmpty()) {
            throw new AuraHandledException('Standard Pricebook not found.');
        }
        Pricebook2 standardPB = pbList[0];
        
        // Opportunity 조회 및 Pricebook2Id 설정 확인
        List<Opportunity> oppList = [SELECT Id, Amount, Pricebook2Id FROM Opportunity WHERE Id = :opportunityId];
        if (oppList.isEmpty()){
            throw new AuraHandledException('Opportunity not found.');
        }
        Opportunity opp = oppList[0];
        if (opp.Pricebook2Id == null) {
            opp.Pricebook2Id = standardPB.Id;
            update opp;
        }
        
        // CartItem에 있는 제품 Id 수집
        Set<Id> productIds = new Set<Id>();
        for (CartItem item : cartItems) {
            productIds.add(item.productId);
        }
        
        // 표준 Pricebook에 해당하는 PricebookEntry 쿼리
        List<PricebookEntry> pbeList = [SELECT Id, Product2Id FROM PricebookEntry 
                                        WHERE Pricebook2Id = :standardPB.Id 
                                        AND Product2Id IN :productIds];
        Map<Id, PricebookEntry> prodToPbeMap = new Map<Id, PricebookEntry>();
        for (PricebookEntry pbe : pbeList) {
            prodToPbeMap.put(pbe.Product2Id, pbe);
        }
        
        List<OpportunityLineItem> oliList = new List<OpportunityLineItem>();
        for (CartItem item : cartItems) {
            PricebookEntry pbe = prodToPbeMap.get(item.productId);
            if (pbe != null) {
                OpportunityLineItem oli = new OpportunityLineItem();
                oli.OpportunityId = opportunityId;
                oli.PricebookEntryId = pbe.Id;  // PricebookEntryId 사용
                oli.UnitPrice = item.price;
                oli.Quantity = item.quantity;
                oliList.add(oli);
            }
        }
        if (!oliList.isEmpty()) {
            insert oliList;
        }
        
        // Opportunity 업데이트: 총합(totalAmount)에 12와 3을 곱한 값을 Amount에 할당
        opp.Amount = totalAmount * 12 * 3;
        opp.StageName = '협상';
        update opp;
    }
    
    // 내부 클래스: CartItem (wrapper 없이)
    public class CartItem {
        @AuraEnabled public String productId { get; set; }
        @AuraEnabled public Decimal price { get; set; }
        @AuraEnabled public Integer quantity { get; set; }
    }
}