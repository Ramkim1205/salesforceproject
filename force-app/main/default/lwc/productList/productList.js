import { LightningElement, wire } from 'lwc';
import getProducts from '@salesforce/apex/ProductController.getProducts';

export default class ProductList extends LightningElement {
    products = [];

    @wire(getProducts)
    wiredProducts({ data, error }) {
        if (data) {
            // PricebookEntries[0].UnitPrice를 추출하여 Price 속성에 저장합니다.
            this.products = data.map((prod, index) => {
                let price = 0;
                if (prod.PricebookEntries && prod.PricebookEntries.length > 0) {
                    price = prod.PricebookEntries[0].UnitPrice;
                }
                return {
                    Id: prod.Id,
                    Name: prod.Name,
                    Price: price,
                    DisplayUrl: prod.DisplayUrl,
                    index: index
                };
            });
        } else if (error) {
            console.error('Error fetching products:', error);
        }
    }

    // 드래그 시작: 제품 데이터를 JSON 문자열로 dataTransfer에 저장
    handleDragStart(event) {
        const index = event.currentTarget.dataset.index;
        const product = this.products[index];
        event.dataTransfer.setData('text/plain', JSON.stringify(product));
    }
}