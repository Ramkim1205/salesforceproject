public with sharing class AccountController {
    @AuraEnabled(cacheable=true)
    public static List<Account> getAccountsByEmail(String email) {
        if (String.isBlank(email)) {
            return new List<Account>();  // 빈 이메일 입력 시 빈 리스트 반환
        }
        
        return [
            SELECT Id, Name, Industry, Type, BillingCity
            FROM Account
            WHERE Email__c LIKE :('%' + email + '%')
            LIMIT 10
        ];
    }
}