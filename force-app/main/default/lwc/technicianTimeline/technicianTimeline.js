import { LightningElement, wire, track } from 'lwc';
import getTechnicianInstallations from '@salesforce/apex/TechnicianDashboardHelper.getTechnicianInstallations';
import { NavigationMixin } from 'lightning/navigation';

export default class TechnicianInstallationList extends NavigationMixin(LightningElement) {
    @track installations = [];
    @track errorMessage = ''; // ✅ 오류 메시지를 저장하는 변수 추가

    @wire(getTechnicianInstallations)
    wiredInstallations({ data, error }) {
        if (data) {
            console.log('Installation Data:', data);
            this.installations = data.map(install => ({
                Id: install.Id,
                OpportunityName: install.Opportunity__r ? install.Opportunity__r.Name : 'No Opportunity',
                Scheduled_Date__c: install.Scheduled_Date__c,
                Scheduled_Time__c: install.Scheduled_Time__c,
                Status__c: install.Status__c
            }));
            this.errorMessage = ''; // ✅ 성공 시 오류 메시지 초기화
        } else if (error) {
            console.error('Error fetching installations', error);
            this.errorMessage = 'Error loading installation data. Please contact your administrator.'; // ✅ 오류 메시지 설정
        }
    }

    navigateToRecord(event) {
        const recordId = event.target.dataset.id;
        this[NavigationMixin.Navigate]({
            type: 'standard__recordPage',
            attributes: {
                recordId: recordId,
                objectApiName: 'Installation__c',
                actionName: 'view'
            }
        });
    }
}