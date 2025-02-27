import { LightningElement, api, wire } from 'lwc';
import { CurrentPageReference } from 'lightning/navigation';
import getProductDetail from '@salesforce/apex/ProductController.getProductDetail';

export default class ProductDetailEC extends LightningElement {
    @api recordId;
    product;
    unitPrice; // 단일 값으로 미리 계산한 가격

    @wire(CurrentPageReference)
    getStateParameters(currentPageReference) {
         if (currentPageReference && currentPageReference.state.recordId) {
             this.recordId = currentPageReference.state.recordId;
         }
    }

    @wire(getProductDetail, { recordId: '$recordId' })
    wiredProduct({ data, error }) {
         if (data) {
             this.product = data;
             // PricebookEntries 배열에서 첫 번째 값의 UnitPrice를 추출
             if(data.PricebookEntries && data.PricebookEntries.length > 0) {
                 this.unitPrice = data.PricebookEntries[0].UnitPrice;
             }
         } else if (error) {
             console.error('Error fetching product detail:', error);
         }
    }

    handleBuyNow() {
         console.log('Buy Now clicked');
    }
}