public with sharing class AccountDetails {
    
    //method used to fetch the list of accounts
    @AuraEnabled (cacheable=true)
    public static List<Account> fetchAccounts(){
        return [SELECT Id, Name,Industry,AnnualRevenue FROM Account LIMIT 2000];
    }
}