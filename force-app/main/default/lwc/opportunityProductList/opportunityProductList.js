import { LightningElement, api, wire, track } from 'lwc';
import getOpportunityLineItems from '@salesforce/apex/OpportunityController.getOpportunityLineItems';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';

export default class OpportunityProductList extends LightningElement {
    @api recordId;      // Opportunity 레코드 페이지에서 전달되는 Id
    @track lineItems;   // OpportunityLineItem 레코드 목록
    @track error;

    @wire(getOpportunityLineItems, { oppId: '$recordId' })
    wiredLineItems({ data, error }) {
        if (data) {
            this.lineItems = data;
            this.error = undefined;
        } else if (error) {
            this.error = error;
            this.lineItems = undefined;
            this.dispatchEvent(
                new ShowToastEvent({
                    title: 'Error loading products',
                    message: error.body ? error.body.message : 'Unknown error',
                    variant: 'error'
                })
            );
        }
    }

    // getter: 제품이 하나라도 있으면 true
    get hasProducts() {
        return this.lineItems && this.lineItems.length > 0;
    }
}