import { LightningElement, api, wire, track } from 'lwc';
import { getRecord } from 'lightning/uiRecordApi';
import { loadScript, loadStyle } from 'lightning/platformResourceLoader';
import LEAFLET_ZIP from '@salesforce/resourceUrl/LeafletJS';

import LATITUDE_FIELD from '@salesforce/schema/Lead.Latitude__c';
import LONGITUDE_FIELD from '@salesforce/schema/Lead.Longitude__c';
import ADDRESS_FIELD from '@salesforce/schema/Lead.Address__c';
import DISTRICT_FIELD from '@salesforce/schema/Lead.district__c';

export default class LeadLocationMap extends LightningElement {
    @api recordId;
    @track latitude;
    @track longitude;
    @track address;
    @track district;
    map;
    marker;
    leafletLoaded = false;
    userLatitude = null;
    userLongitude = null;

    connectedCallback() {
        this.getUserLocation();
    }

    @wire(getRecord, { recordId: '$recordId', fields: [LATITUDE_FIELD, LONGITUDE_FIELD, ADDRESS_FIELD, DISTRICT_FIELD] })
    wiredLead({ error, data }) {
        if (data) {
            console.log('✅ 리드 데이터 가져오기 성공:', data);
            this.latitude = data.fields.Latitude__c?.value || null;
            this.longitude = data.fields.Longitude__c?.value || null;
            this.address = data.fields.Address__c?.value || '주소 정보 없음';
            this.district = data.fields.District__c?.value || '구 정보 없음';

            if (this.latitude && this.longitude) {
                console.log('📌 위도:', this.latitude, '경도:', this.longitude);

                // Leaflet이 로드된 후에만 지도 로드
                if (this.leafletLoaded) {
                    this.loadMap();
                } else {
                    console.log('ℹ️ Leaflet이 아직 로드되지 않았음. 로드 완료 후 지도 로드 예정.');
                }
            } else {
                console.warn('⚠️ 위도/경도 값이 없습니다.');
            }
        } else if (error) {
            console.error('❌ 리드 데이터 가져오기 실패:', error);
        }
    }

    renderedCallback() {
        if (this.leafletLoaded || this.map) return;
        console.log('🚀 Leaflet.js 로드 시작');

        Promise.all([
            loadStyle(this, LEAFLET_ZIP + '/leaflet.css'),
            loadScript(this, LEAFLET_ZIP + '/leaflet.js')
        ])
        .then(() => {
            this.leafletLoaded = true;
            console.log('✅ Leaflet.js 로드 성공');

            // L이 전역 객체에 정상적으로 로드되었는지 확인 후 실행
            if (window.L) {
                this.loadMap();
            } else {
                console.error('❌ Leaflet.js가 로드되었지만 L 객체가 없습니다.');
            }
        })
        .catch(error => console.error('❌ Leaflet.js 로드 실패:', error));
    }

    loadMap() {
        if (!this.latitude || !this.longitude) {
            console.error('❌ 위도 또는 경도가 없습니다. 지도를 로드할 수 없음');
            return;
        }

        if (!window.L) {
            console.error('❌ Leaflet이 아직 로드되지 않았습니다.');
            return;
        }

        const mapContainer = this.template.querySelector('.map-container');
        if (!mapContainer) {
            console.error('❌ 지도 컨테이너를 찾을 수 없습니다.');
            return;
        }

        console.log('🚀 지도 초기화 시작');
        this.map = L.map(mapContainer).setView([this.latitude, this.longitude], 14);
        
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(this.map);

        this.marker = L.marker([this.latitude, this.longitude]).addTo(this.map)
            .bindPopup(`<b>${this.address}</b><br>${this.district}`)
            .openPopup();
    }

    getUserLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition(
                (position) => {
                    this.userLatitude = position.coords.latitude;
                    this.userLongitude = position.coords.longitude;
                    console.log(`📌 현재 위치 - 위도: ${this.userLatitude}, 경도: ${this.userLongitude}`);
                }, 
                (error) => {
                    console.error('❌ 현재 위치를 가져올 수 없습니다:', error);
                },
                { enableHighAccuracy: true, timeout: 10000, maximumAge: 0 }
            );
        } else {
            console.error('❌ Geolocation을 지원하지 않는 브라우저입니다.');
        }
    }

    openKakaoMap() {
        console.log('현재위치', this.userLatitude, this.userLongitude);
        console.log('목적지', this.latitude, this.longitude);

        if (!this.userLatitude || !this.userLongitude || !this.latitude || !this.longitude) {
            console.error('❌ 출발지 또는 도착지의 위도/경도가 없습니다.');
            return;
        }
        const url = `https://map.kakao.com/link/from/출발지,${this.userLatitude},${this.userLongitude}/to/목적지,${this.latitude},${this.longitude}`;
        window.open(url, '_blank');
    }
}