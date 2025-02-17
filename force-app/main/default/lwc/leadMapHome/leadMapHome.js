import { LightningElement, wire, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { loadScript, loadStyle } from 'lightning/platformResourceLoader';
import getLeadLocations from '@salesforce/apex/LeadLocationController.getLeadLocations';
import LEAFLET_ZIP from '@salesforce/resourceUrl/LeafletJS';

export default class LeadMapHome extends LightningElement {
    @track leads = [];
    map;
    isLeafletLoaded = false;
    
    @wire(getLeadLocations)
    wiredLeads({ error, data }) {
        if (data) {
            this.leads = data;
            console.log('✅ 가져온 리드 데이터:', this.leads);
            if (this.isLeafletLoaded && this.map) {
                this.addMarkers();
            }
        } else if (error) {
            console.error('❌ 리드 데이터 로드 실패:', error);
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error',
                message: '리드 데이터를 불러올 수 없습니다.',
                variant: 'error'
            }));
        }
    }

    renderedCallback() {
        if (this.isLeafletLoaded) return;

        Promise.all([
            loadStyle(this, LEAFLET_ZIP + '/leaflet.css'),
            loadScript(this, LEAFLET_ZIP + '/leaflet.js')
        ])
        .then(() => {
            console.log('✅ Leaflet.js 로드 성공');
            if (!window.L) {
                console.error('❌ Leaflet.js가 로드되었지만 L 객체가 없습니다.');
                return;
            }

            this.isLeafletLoaded = true;
            this.initMap();
        })
        .catch(error => {
            console.error('❌ Leaflet.js 로드 실패:', error);
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error',
                message: '지도 라이브러리를 불러올 수 없습니다.',
                variant: 'error'
            }));
        });
    }

    initMap() {
        console.log('✅ 지도 초기화 시작');

        // 지도 컨테이너 가져오기
        const mapContainer = this.template.querySelector('.map-container');
        if (!mapContainer) {
            console.error('❌ 지도 컨테이너를 찾을 수 없습니다.');
            return;
        }

        // Leaflet이 정상적으로 로드되었는지 확인
        if (!window.L) {
            console.error('❌ Leaflet이 아직 로드되지 않았습니다.');
            return;
        }

        // 지도 초기화
        this.map = L.map(mapContainer).setView([37.5665, 126.9780], 12); // 서울 기본 중심 좌표
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(this.map);

        console.log('✅ 지도 생성 완료');

        // 지도 리사이징 (혹시라도 Leaflet이 올바르게 표시되지 않을 경우 대비)
        setTimeout(() => {
            this.map.invalidateSize();
        }, 500);

        // 마커 추가
        this.addMarkers();
    }

    addMarkers() {
        if (!this.map) {
            console.error('❌ 지도 객체가 초기화되지 않았습니다.');
            return;
        }

        console.log('📌 마커 추가 시작');
        this.leads.forEach(lead => {
            const lat = parseFloat(lead.Latitude__c);
            const lng = parseFloat(lead.Longitude__c);

            if (!isNaN(lat) && !isNaN(lng)) {
                L.marker([lat, lng]).addTo(this.map)
                    .bindPopup(`<b>${lead.Name}</b><br>${lead.Add__c}`)
                    .openPopup();
                console.log(`✅ 마커 추가 완료: ${lead.Name} (${lat}, ${lng})`);
            } else {
                console.warn(`⚠️ 잘못된 좌표 - ${lead.Name}: (${lead.Latitude__c}, ${lead.Longitude__c})`);
            }
        });
    }
}