import { LightningElement, api, track } from 'lwc';
import { ShowToastEvent } from 'lightning/platformShowToastEvent';
import { createRecord } from 'lightning/uiRecordApi';
import { loadScript, loadStyle } from 'lightning/platformResourceLoader';

import LEAFLET_ZIP from '@salesforce/resourceUrl/LeafletJS';

import LEAD_OBJECT from '@salesforce/schema/Lead';
import NAME_FIELD from '@salesforce/schema/Lead.LastName';
import COMPANY_FIELD from '@salesforce/schema/Lead.Company';
import ADDRESS_FIELD from '@salesforce/schema/Lead.Address__c';
import LATITUDE_FIELD from '@salesforce/schema/Lead.Latitude__c';
import LONGITUDE_FIELD from '@salesforce/schema/Lead.Longitude__c';
import CONFIRMED_FIELD from '@salesforce/schema/Lead.TableOrder__c';
import DISTRICT_FIELD from '@salesforce/schema/Lead.District__c';  // 구 정보 필드 추가

export default class LeadMap extends LightningElement {
    @api recordId;
    @track latitude;
    @track longitude;
    @track address = '';
    @track district = '';  // 구 정보 저장
    @track company = '';
    @track isChecked = false;
    map;
    marker;
    userMarker;

    renderedCallback() {
        if (this.map) return;

        // Load Leaflet resources
        Promise.all([
            loadStyle(this, LEAFLET_ZIP + '/leaflet.css'),
            loadScript(this, LEAFLET_ZIP + '/leaflet.js')
        ])
        .then(() => {
            console.log('✅ Leaflet.js loaded successfully');
            this.initMap();
            this.getUserLocation();
        })
        .catch(error => {
            console.error('❌ Failed to load Leaflet.js:', error);
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error',
                message: 'Unable to load map library.',
                variant: 'error'
            }));
        });
    }

    initMap() {
        console.log('✅ Initializing map');
        const mapContainer = this.template.querySelector('.map-container');

        if (!mapContainer) {
            console.error('❌ Map container not found.');
            return;
        }

        this.map = L.map(mapContainer).setView([37.5665, 126.9780], 14);
        L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
            attribution: '&copy; OpenStreetMap contributors'
        }).addTo(this.map);

        // Use a different parameter name to avoid conflicts
        this.map.on('click', async (leafletEvent) => {
            try {
                const latlng = leafletEvent.latlng;
                this.latitude = latlng.lat;
                this.longitude = latlng.lng;
                console.log(`📌 Map clicked - Latitude: ${this.latitude}, Longitude: ${this.longitude}`);

                if (this.marker) {
                    this.marker.remove();
                }

                this.marker = L.marker([this.latitude, this.longitude]).addTo(this.map);
                await this.getAddressFromLatLng(this.latitude, this.longitude);
            } catch (err) {
                console.error('❌ Error during map click handling:', err);
            }
        });
    }

    getUserLocation() {
        if (navigator.geolocation) {
            navigator.geolocation.getCurrentPosition((position) => {
                this.latitude = position.coords.latitude;
                this.longitude = position.coords.longitude;
                console.log(`📌 User location - Latitude: ${this.latitude}, Longitude: ${this.longitude}`);

                if (this.userMarker) {
                    this.userMarker.remove();
                }

                this.userMarker = L.marker([this.latitude, this.longitude], {
                    icon: L.icon({
                        iconUrl: 'https://maps.google.com/mapfiles/ms/icons/red-dot.png',
                        iconSize: [32, 32],
                        iconAnchor: [16, 32]
                    })
                }).addTo(this.map).bindPopup('내 위치');

                this.map.setView([this.latitude, this.longitude], 14);
            }, (error) => {
                console.error('❌ Failed to retrieve user location:', error);
            });
        } else {
            console.error('❌ Geolocation is not supported by this browser.');
        }
    }

    async getAddressFromLatLng(lat, lng) {
        try {
            console.log(`📌 Reverse Geocoding - Latitude: ${lat}, Longitude: ${lng}`);
            const response = await fetch(`https://nominatim.openstreetmap.org/reverse?format=json&lat=${lat}&lon=${lng}`);
            if (!response.ok) {
                throw new Error(`❌ HTTP Error: ${response.status}`);
            }

            const data = await response.json();
            this.address = data.display_name || '주소를 찾을 수 없습니다.';

            // Extract district info (4th from last element)
            const addressParts = this.address.split(',').map(part => part.trim());
            if (addressParts.length >= 4) {
                this.district = addressParts[addressParts.length - 4];
            } else {
                this.district = '알 수 없음';
            }

            console.log(`✅ Address: ${this.address}`);
            console.log(`✅ District: ${this.district}`);
        } catch (error) {
            console.error('❌ Address conversion failed:', error);
            this.address = '주소를 찾을 수 없습니다.';
            this.district = '알 수 없음';
        }
    }

    handleCompanyChange(event) {
        this.company = event.target.value;
    }

    handleCheckboxChange(event) {
        this.isChecked = event.target.checked;
    }

    handleSave() {
        if (!this.company || !this.address || !this.latitude || !this.longitude) {
            this.dispatchEvent(new ShowToastEvent({
                title: 'Error',
                message: '회사명, 주소, 위도, 경도를 모두 입력해야 합니다!',
                variant: 'error'
            }));
            return;
        }

        const fields = {};
        fields[NAME_FIELD.fieldApiName] = this.company + '의 리드';
        fields[COMPANY_FIELD.fieldApiName] = this.company;
        fields[ADDRESS_FIELD.fieldApiName] = this.address;
        fields[LATITUDE_FIELD.fieldApiName] = this.latitude;
        fields[LONGITUDE_FIELD.fieldApiName] = this.longitude;
        fields[CONFIRMED_FIELD.fieldApiName] = this.isChecked;
        fields[DISTRICT_FIELD.fieldApiName] = this.district;

        createRecord({ apiName: LEAD_OBJECT.objectApiName, fields })
            .then((lead) => {
                this.dispatchEvent(new ShowToastEvent({
                    title: 'Success',
                    message: `Lead 생성 완료 (ID: ${lead.id})`,
                    variant: 'success'
                }));
            })
            .catch(error => {
                console.error('❌ Lead 생성 실패:', error);
            });
    }
}