import { LightningElement, wire } from 'lwc';
import { loadScript } from 'lightning/platformResourceLoader';
import jquery from '@salesforce/resourceUrl/jquery';
import getProducts from '@salesforce/apex/ProductController.getProducts';

// **[추가]** NavigationMixin을 사용해 상세 페이지로 이동할 수 있도록 했습니다.
// (Experience Cloud 내에서 페이지 전환에 필요합니다)
// import { NavigationMixin } from 'lightning/navigation'; 
// 아래와 같이 내보내기 시 NavigationMixin을 믹스인합니다.
import { NavigationMixin } from 'lightning/navigation';

export default class CarSlider extends NavigationMixin(LightningElement) {
    products = [];
    jqueryInitialized = false;
    _rendered = false; // renderedCallback 한 번만 실행하기 위한 플래그

    @wire(getProducts)
    wiredProducts({ data, error }) {
        if (data) {
            // **[수정]** 각 제품에 data-index 속성을 위해 map() 내에서 index 사용
            // 첫 번째 슬라이드에 active 클래스를 부여하여 초기 active 상태를 설정합니다.
            this.products = data.map((prod, index) => ({
                Id: prod.Id,
                Name: prod.Name,
                // **[수정]** DisplayUrl를 별도 속성로 저장(추후 상세 페이지 전달용)
                DisplayUrl: prod.DisplayUrl,
                backgroundStyle: `background-image: url('${prod.DisplayUrl}');`,
                activeClass: index === 0 ? 'active' : '',
                // **[추가]** data-index 정보는 HTML 템플릿에서 사용하므로 여기서 index를 저장합니다.
                index: index
            }));
        } else if (error) {
            console.error('Error fetching products:', error);
        }
    }

    connectedCallback() {
        loadScript(this, jquery)
            .then(() => {
                console.log('jQuery Loaded');
                this.jqueryInitialized = true;
            })
            .catch(error => {
                console.error('Failed to load jQuery:', error);
            });
    }

    renderedCallback() {
        // 렌더링 후 한 번만 실행되도록 처리
        if (!this._rendered && this.jqueryInitialized) {
            const firstSlide = this.template.querySelector('.slide');
            if (firstSlide) {
                // 첫 번째 슬라이드에 active 클래스가 없는 경우 추가합니다.
                if (!firstSlide.classList.contains('active')) {
                    $(firstSlide).addClass('active');
                }
            }
            this._rendered = true;
        }
    }

    // **[수정]** handleSlide() 메서드에서 active 슬라이드가 다시 클릭되면 상세 페이지로 이동하도록 함.
    handleSlide(event) {
        if (!this.jqueryInitialized) {
            return;
        }
        const clickedElement = event.currentTarget;
        const clickedIndex = clickedElement.dataset.index;
        // 만약 이미 active 상태라면 해당 제품의 상세 페이지로 이동
        if (clickedElement.classList.contains('active')) {
            const product = this.products[clickedIndex];
            // **[추가]** NavigationMixin을 사용해 Experience Cloud 내 상세 페이지로 이동
            this[NavigationMixin.Navigate]({
                type: 'standard__webPage',
                attributes: {
                    url: 'productsdetail?recordId=' + product.Id
                }
            });
        } else {
            // active 상태가 아니라면 해당 슬라이드를 active로 변경
            const slides = this.template.querySelectorAll('.slide');
            $(slides).removeClass('active');
            $(clickedElement).addClass('active');

            this.products = this.products.map((prod, index) => ({
                ...prod,
                activeClass: index == clickedIndex ? 'active' : ''
            }));
        }
    }

    // 기존의 상세보기 버튼은 필요없으므로 제거하거나 다른 용도로 사용할 수 있습니다.
    handleDetail() {
        window.open('https://www.salesforce.com', '_blank');
    }
}