
import { LightningElement, api, wire, track } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import { CurrentPageReference } from 'lightning/navigation';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import addProductsToOpportunity from '@salesforce/apex/OpportunityController.addProductsToOpportunity';
import ID_FIELD from '@salesforce/schema/Opportunity.Id';

export default class CustomerProductsToOrder extends LightningElement {
    @api recordId; // Opportunity 레코드 페이지에 배치되면 자동 전달됨.
    @track cartItems = [];
    @track totalPrice = 0;
    @track opportunityId;

    // getRecord를 통해 Opportunity 레코드를 가져와 opportunityId에 저장
    @wire(getRecord, { recordId: '$recordId', fields: [ID_FIELD] })
    wiredOpportunity({ data, error }) {
        if (data) {
            console.log('getRecord data:', JSON.stringify(data));
            this.opportunityId = data.fields.Id.value;
            console.log('Fetched Opportunity Id from getRecord:', this.opportunityId);
        } else if (error) {
            console.error('Error fetching Opportunity record:', error);
        }
    }

    // URL 파라미터에서 recordId를 추출 (fallback)
    @wire(CurrentPageReference)
    pageRefHandler(pageRef) {
        console.log('Page Reference:', JSON.stringify(pageRef));
        if (!this.opportunityId && pageRef && pageRef.state) {
            if (pageRef.state.recordId) {
                this.opportunityId = pageRef.state.recordId;
                console.log('Fetched Opportunity Id from URL (recordId):', this.opportunityId);
            } else if (pageRef.state.opportunityId) {
                this.opportunityId = pageRef.state.opportunityId;
                console.log('Fetched Opportunity Id from URL (opportunityId):', this.opportunityId);
            }
        }
    }

    handleDragOver(event) {
        event.preventDefault();
    }

    handleDrop(event) {
        event.preventDefault();
        const data = event.dataTransfer.getData('text/plain');
        if (data) {
            try {
                const product = JSON.parse(data);
                this.addToCart(product);
            } catch (e) {
                console.error('Error parsing dropped product data', e);
            }
        }
    }

    addToCart(product) {
        const existing = this.cartItems.find(item => item.Id === product.Id);
        if (existing) {
            existing.quantity += 1;
        } else {
            product.quantity = 1;
            this.cartItems = [...this.cartItems, product];
        }
        this.calculateTotal();
    }

    calculateTotal() {
        this.totalPrice = this.cartItems.reduce((sum, item) => {
            return sum + (item.Price * item.quantity);
        }, 0);
    }

    handleQuantityChange(event) {
        const productId = event.target.dataset.productId;
        const newQuantity = parseInt(event.target.value, 10);
        const item = this.cartItems.find(item => item.Id === productId);
        if (item) {
            item.quantity = newQuantity;
            this.calculateTotal();
        }
    }

    handleDelete(event) {
        const productId = event.target.dataset.productId;
        this.cartItems = this.cartItems.filter(item => item.Id !== productId);
        this.calculateTotal();
    }

    handleConfirm() {
        console.log('Opportunity Id on Confirm:', this.opportunityId);
        if (!this.opportunityId) {
            alert('Opportunity Id is not set.');
            return;
        }
        const items = this.cartItems.map(item => ({
            productId: item.Id,
            price: item.Price,
            quantity: item.quantity
        }));
        addProductsToOpportunity({ 
            opportunityId: this.opportunityId, 
            cartItems: items, 
            totalAmount: this.totalPrice 
        })
            .then(() => {
                this.dispatchEvent(
                    new ShowToastEvent({
                        title: 'Success',
                        message: 'Products added to Opportunity successfully!',
                        variant: 'success'
                    })
                );
                this.cartItems = [];
                this.totalPrice = 0;
                window.location.reload();
            })
            .catch(error => {
                console.error('Error adding products to opportunity:', error);
            });
    }
}