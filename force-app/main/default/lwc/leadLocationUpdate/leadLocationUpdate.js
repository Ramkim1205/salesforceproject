import { LightningElement, api, track, wire } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { refreshApex } from '@salesforce/apex';
import updateLeadRecord from '@salesforce/apex/LeadAddressUpdater.updateLeadRecord';
// Lead 객체의 커스텀 필드
import LATITUDE_FIELD from '@salesforce/schema/Lead.Latitude__c';
import LONGITUDE_FIELD from '@salesforce/schema/Lead.Longitude__c';
import ADDRESS_FIELD from '@salesforce/schema/Lead.Address__c';
import DISTRICT_FIELD from '@salesforce/schema/Lead.District__c';

export default class LeadLocationUpdate extends LightningElement {
    @api recordId; // 리드 레코드 페이지에서 자동 주입
    @track searchKey = '';
    @track results;
    @track selectedAddress = '';
    @track selectedLat = '';
    @track selectedLon = '';
    @track district = '';

    // Lead의 현재 값을 가져오려면 getRecord를 사용할 수 있음 (옵션)
    @wire(getRecord, {
        recordId: '$recordId',
        fields: [LATITUDE_FIELD, LONGITUDE_FIELD, ADDRESS_FIELD, DISTRICT_FIELD]
    })
    wiredLead({ error, data }) {
        if (data) {
            console.log('✅ 기존 리드 데이터:', data);
            // 기존 값은 필요에 따라 사용할 수 있습니다.
        } else if (error) {
            console.error('❌ 리드 데이터 가져오기 실패:', error);
        }
    }

    handleChange(event) {
        this.searchKey = event.target.value;
    }

    // Nominatim API를 호출하여 검색 결과를 가져옴
    handleSearch() {
        if (this.searchKey) {
            const endpoint = `https://nominatim.openstreetmap.org/search?format=json&q=${encodeURIComponent(this.searchKey)}`;
            fetch(endpoint, {
                headers: { 'Accept': 'application/json' }
            })
            .then(response => response.json())
            .then(data => {
                this.results = data;
            })
            .catch(error => {
                console.error('검색 중 오류 발생:', error);
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Error',
                    message: '검색 중 오류가 발생했습니다.',
                    variant: 'error'
                }));
            });
        }
    }

    // 검색 결과 목록에서 항목을 클릭하면 선택한 주소 정보를 저장
    handleSelect(event) {
        const index = event.currentTarget.dataset.index;
        const selectedResult = this.results[index];

        this.selectedAddress = selectedResult.display_name;
        this.selectedLat = selectedResult.lat;
        this.selectedLon = selectedResult.lon;

        // 쉼표로 구분된 주소에서 구(구역) 정보 추출
        const addressParts = this.selectedAddress.split(',').map(part => part.trim());
        if (addressParts.length >= 4) {
            this.district = addressParts[addressParts.length - 4];
        } else {
            this.district = '알 수 없음';
        }
    }

    // "주소 입력" 버튼 클릭 시 Apex를 호출하여 리드를 업데이트
    handleUpdate() {
        updateLeadRecord({
            leadId: this.recordId,
            lat: this.selectedLat,
            lon: this.selectedLon,
            address: this.selectedAddress,
            district: this.district
        })
        .then(result => {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Success',
                message: '리드가 성공적으로 업데이트되었습니다.',
                variant: 'success'
            }));
            window.location.reload();
        })
        .catch(error => {
            console.error('리드 업데이트 오류:', error);
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error',
                message: '리드 업데이트 중 오류가 발생했습니다.',
                variant: 'error'
            }));
        });
    }
}