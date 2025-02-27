public with sharing class ProductController {
    @AuraEnabled(cacheable=true)
    public static List<Product2> getProducts() {
        // 활성화된 Product만 가져오도록 쿼리합니다.
        return [SELECT Id, Name,DisplayUrl,(SELECT UnitPrice FROM PricebookEntries WHERE Pricebook2.IsStandard = true LIMIT 1) FROM Product2 WHERE IsActive = TRUE];
    }
    @AuraEnabled(cacheable=true)
    public static Product2 getProductDetail(String recordId) {
        return [
            SELECT Id, Name, Description, DisplayUrl,
                (SELECT UnitPrice FROM PricebookEntries WHERE Pricebook2.IsStandard = true LIMIT 1)
            FROM Product2
            WHERE Id = :recordId
            LIMIT 1
        ];
    }
}