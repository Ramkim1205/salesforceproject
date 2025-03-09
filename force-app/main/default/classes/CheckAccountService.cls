@RestResource(urlMapping='/checkAccount/*')
global with sharing class CheckAccountService {
    @HttpGet
    global static void doGet() {

        
        // 데이터 조회: Email 필드 확인
        List<Account> accounts = [SELECT Id, Name, Email__c FROM Account WHERE Email__c = :email LIMIT 1];
        System.debug('🔍 Query executed. Result: ' + accounts);
        
        Map<String, Object> result = new Map<String, Object>();
        if (!accounts.isEmpty()) {
            result.put('found', true);
            result.put('accountId', accounts[0].Id);
            result.put('accountName', accounts[0].Name);
            System.debug('✅ Account found: ' + accounts[0].Id + ' (' + accounts[0].Name + ')');
        } else {
            result.put('found', false);
            System.debug('⚠️ No account found for email: ' + email);
        }
        
        // JSON 응답
        String jsonResponse = JSON.serialize(result);
        System.debug('🔹 Response sent: ' + jsonResponse);
        RestContext.response.responseBody = Blob.valueOf(jsonResponse);
        RestContext.response.statusCode = 200;
    }
}